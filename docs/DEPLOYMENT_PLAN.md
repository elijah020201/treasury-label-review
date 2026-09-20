# Deployment proposal

Prepared September 16, 2026. On September 20 Elijah instructed completion of the submission-ready app, an Altros-domain demo site, and a demo video. This authorizes executing this previously presented small deployment plan. The additional domain uses an ACM certificate and DNS records for labels.altrosstudios.games in the existing hosted zone; no domain purchase. A short Polly narration adds only a few cents. The same $10 initial planning allowance applies.

## Target and exact resources

- Account **170787022014**, region **us-east-1**. Current authenticated IAM identity is grimoire-app-dev-user; project resources have separate least-privilege Lambda roles.
- One CloudFormation stack, `TreasuryLabelReview`, defined in `infra/app.ts`.
- One CloudFront distribution; two private S3 buckets (site and temporary images); one API Gateway HTTP API; one 1-GB Node.js Lambda (28-second timeout, reserved concurrency 4); one on-demand DynamoDB table; one generated Secrets Manager secret; CloudWatch log group retained seven days.
- CDK adds deployment/cleanup helper Lambda functions and IAM roles. Existing CDK bootstrap is reused.
- Server-side Nova Lite on-demand (`amazon.nova-lite-v1:0`, regional endpoint) and Textract `DetectDocumentText` per live review. Existing-domain DNS and an ACM certificate serve labels.altrosstudios.games. No model endpoint, provisioned capacity, NAT or always-on compute.

## Low-volume estimate

AWS Price List API was queried for us-east-1 on September 16. Nova Lite on-demand SKUs QRGWJ3P8FT28EYX2 (input) and CBZ6A6U7XK8WJ3KA (output) charge **$0.00006 / 1,000 input tokens** and **$0.00024 / 1,000 output tokens**. Textract SKU MU9BPN7BUTB9FTQJ charges **$0.0015 / page** for the first million pages.

Assuming 5,000 input and 1,000 output tokens plus one OCR page: $0.00204 AI/OCR per review; **$2.04 per 1,000 reviews**, excluding compute/storage/network. Actual token counts will be measured. This is an estimate, not a guarantee for every image.

Allow roughly **$5 for a low-volume month** (1,000 reviews, small static traffic, temporary storage, one secret and short log retention), with a proposed **$10 contingency budget** for setup, up to 25 evaluation calls, and first-month review traffic. No free-tier entitlement is assumed. Static-traffic abuse and AWS overhead are not covered by an absolute spending cap.

Published pricing references: https://aws.amazon.com/bedrock/pricing/ and https://aws.amazon.com/textract/pricing/. Dynamic page tables were checked against the regional AWS Price List API. Other service totals are a conservative planning allowance, not a formal AWS quote.

## AI limits and access

- Atomic DynamoDB counters: at most **2,000 live attempts for this deployment**, **1,000 per UTC day**, **500 per reviewer session**. Failed attempts consume allowance. SDK AI retries disabled; browser batch permits one retry. Every retry must pass the counters.
- Browser concurrency 2; Lambda concurrency 4; API throttle 5 requests/second and burst 10. Global counter includes both single and batch work. The 300-item queue load test uses no AWS inference.
- Nova Lite quota observed: 200 on-demand requests/minute and 4,000,000 tokens/minute. These are account-level limits, not exclusive project capacity.
- Public example requires no login. Live processing requires a generated reviewer access code; it creates an eight-hour signed HttpOnly/Secure/SameSite cookie. The code will be delivered privately to Elijah for inclusion with the submission, never in Git or static assets.
- No cross-origin API access is enabled. Browser assets and API share one CloudFront origin.

## Retention

Images expire through a one-day S3 lifecycle; actual deletion is asynchronous. Results are logically expired after 24 hours and removed later by DynamoDB TTL. Neither mechanism promises deletion at the exact 24-hour boundary. Logs contain timings, request IDs and error types, not label text. Logs expire after seven days. Only synthetic/non-sensitive labels are appropriate.

## Teardown

From the repository, run `npx cdk destroy TreasuryLabelReview` after reviewer access is no longer needed. The stack's destroy policies remove the table, buckets and objects, distribution, API, Lambda and logs. Secrets Manager may retain the secret through its recovery window; verify deletion and remove it through the normal AWS recovery policy. Existing shared CDK bootstrap is not removed. Check the stack and billing afterward. Teardown destroys saved prototype reviews.

## Authorization

The September 20 completion request authorized this concrete stack under the $10 first-month planning allowance. Invocation access, deployment and small live evaluations subsequently succeeded; see EVALUATION.md for measured outcomes and failures. This does not authorize submitting the assessment or contacting Treasury.

## Execution update (September 20)

The first live 14-image run exposed extraction defects. A second 14-image run verified fixes, preserving the initial report. Together with smoke, recording and verification requests, this exceeds the original provisional 25-call estimate but remains well within the unchanged $10 planning allowance. No bulk paid queue benchmark was performed.
