import {
  App,
  Stack,
  Duration,
  RemovalPolicy,
  CfnOutput,
  aws_s3 as s3,
  aws_cloudfront as cf,
  aws_cloudfront_origins as origins,
  aws_lambda as lambda,
  aws_dynamodb as dynamodb,
  aws_secretsmanager as secrets,
  aws_iam as iam,
  aws_logs as logs,
  aws_apigatewayv2 as apigw,
  aws_apigatewayv2_integrations as integrations,
  aws_s3_deployment as deployment,
  aws_certificatemanager as acm,
  aws_route53 as route53,
  aws_route53_targets as targets,
} from "aws-cdk-lib";
import { existsSync } from "node:fs";
if (!existsSync("dist/index.html") || !existsSync("dist-server/handler.cjs"))
  throw new Error("Run npm run build before CDK synthesis or deployment.");
const app = new App();
const stack = new Stack(app, "TreasuryLabelReview", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || "170787022014",
    region: "us-east-1",
  },
  description: "Label Review Workbench take-home prototype",
});
const site = new s3.Bucket(stack, "Site", {
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  enforceSSL: true,
  encryption: s3.BucketEncryption.S3_MANAGED,
  removalPolicy: RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
});
const images = new s3.Bucket(stack, "Images", {
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  enforceSSL: true,
  encryption: s3.BucketEncryption.S3_MANAGED,
  lifecycleRules: [
    {
      expiration: Duration.days(1),
      abortIncompleteMultipartUploadAfter: Duration.days(1),
    },
  ],
  removalPolicy: RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
});
const table = new dynamodb.Table(stack, "Reviews", {
  partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  timeToLiveAttribute: "expires",
  encryption: dynamodb.TableEncryption.AWS_MANAGED,
  removalPolicy: RemovalPolicy.DESTROY,
});
const access = new secrets.Secret(stack, "ReviewerCode", {
  generateSecretString: { passwordLength: 32, excludePunctuation: true },
  description:
    "Reviewer access code and session signing secret for Treasury prototype",
});
const logGroup = new logs.LogGroup(stack, "ApiLogs", {
  retention: logs.RetentionDays.ONE_WEEK,
  removalPolicy: RemovalPolicy.DESTROY,
});
const fn = new lambda.Function(stack, "Api", {
  runtime: lambda.Runtime.NODEJS_22_X,
  architecture: lambda.Architecture.X86_64,
  handler: "handler.handler",
  code: lambda.Code.fromAsset("dist-server"),
  memorySize: 1024,
  timeout: Duration.seconds(28),
  reservedConcurrentExecutions: 4,
  logGroup,
  environment: {
    TABLE_NAME: table.tableName,
    IMAGE_BUCKET: images.bucketName,
    SECRET_ARN: access.secretArn,
    MODEL_ID: "amazon.nova-lite-v1:0",
  },
});
table.grantReadWriteData(fn);
images.grantPut(fn);
access.grantRead(fn);
fn.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ["bedrock:InvokeModel"],
    resources: [
      "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-lite-v1:0",
    ],
  }),
);
fn.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ["textract:DetectDocumentText"],
    resources: ["*"],
  }),
);
const api = new apigw.HttpApi(stack, "HttpApi");
api.addRoutes({
  path: "/api/{proxy+}",
  methods: [apigw.HttpMethod.POST],
  integration: new integrations.HttpLambdaIntegration("Handler", fn),
});
const stage = api.defaultStage!.node.defaultChild as apigw.CfnStage;
stage.defaultRouteSettings = {
  throttlingBurstLimit: 10,
  throttlingRateLimit: 5,
};
const policy = new cf.ResponseHeadersPolicy(stack, "SecurityHeaders", {
  securityHeadersBehavior: {
    contentTypeOptions: { override: true },
    frameOptions: { frameOption: cf.HeadersFrameOption.DENY, override: true },
    referrerPolicy: {
      referrerPolicy: cf.HeadersReferrerPolicy.NO_REFERRER,
      override: true,
    },
    strictTransportSecurity: {
      accessControlMaxAge: Duration.days(365),
      includeSubdomains: true,
      override: true,
    },
    contentSecurityPolicy: {
      contentSecurityPolicy:
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      override: true,
    },
  },
});
const distribution = new cf.Distribution(stack, "Web", {
  domainNames: ["labels.altrosstudios.games"],
  certificate: new acm.Certificate(stack, "Certificate", {
    domainName: "labels.altrosstudios.games",
    validation: acm.CertificateValidation.fromDns(
      route53.HostedZone.fromHostedZoneAttributes(stack, "Zone", {
        hostedZoneId: "Z07519233F8GPJ1X6LH6H",
        zoneName: "altrosstudios.games",
      }),
    ),
  }),
  defaultRootObject: "index.html",
  priceClass: cf.PriceClass.PRICE_CLASS_100,
  defaultBehavior: {
    origin: origins.S3BucketOrigin.withOriginAccessControl(site),
    viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    responseHeadersPolicy: policy,
    functionAssociations: [
      {
        eventType: cf.FunctionEventType.VIEWER_REQUEST,
        function: new cf.Function(stack, "AppRoutes", {
          code: cf.FunctionCode.fromInline(
            "function handler(event) { var r = event.request; if (r.uri === '/workbench' || r.uri === '/workbench/') r.uri = '/index.html'; return r; }",
          ),
        }),
      },
    ],
  },
  additionalBehaviors: {
    "/api/*": {
      origin: new origins.HttpOrigin(
        `${api.apiId}.execute-api.us-east-1.amazonaws.com`,
      ),
      viewerProtocolPolicy: cf.ViewerProtocolPolicy.HTTPS_ONLY,
      allowedMethods: cf.AllowedMethods.ALLOW_ALL,
      cachePolicy: cf.CachePolicy.CACHING_DISABLED,
      originRequestPolicy: cf.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      responseHeadersPolicy: policy,
    },
  },
});
const zone = route53.HostedZone.fromHostedZoneAttributes(stack, "RecordZone", {
  hostedZoneId: "Z07519233F8GPJ1X6LH6H",
  zoneName: "altrosstudios.games",
});
new route53.ARecord(stack, "DomainA", {
  zone,
  recordName: "labels",
  target: route53.RecordTarget.fromAlias(
    new targets.CloudFrontTarget(distribution),
  ),
});
new route53.AaaaRecord(stack, "DomainAAAA", {
  zone,
  recordName: "labels",
  target: route53.RecordTarget.fromAlias(
    new targets.CloudFrontTarget(distribution),
  ),
});
new deployment.BucketDeployment(stack, "Publish", {
  sources: [deployment.Source.asset("dist")],
  destinationBucket: site,
  distribution,
  distributionPaths: ["/*"],
});
new CfnOutput(stack, "ApplicationUrl", {
  value: "https://labels.altrosstudios.games",
});
new CfnOutput(stack, "CloudFrontUrl", {
  value: `https://${distribution.distributionDomainName}`,
});
new CfnOutput(stack, "SiteBucket", { value: site.bucketName });
new CfnOutput(stack, "DistributionId", { value: distribution.distributionId });
new CfnOutput(stack, "ReviewerSecretArn", { value: access.secretArn });
new CfnOutput(stack, "ApiFunction", { value: fn.functionName });
new CfnOutput(stack, "ImagesBucket", { value: images.bucketName });
new CfnOutput(stack, "ReviewsTable", { value: table.tableName });
