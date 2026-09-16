import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { requestSchema, VERSION, type Review } from "../src/domain";
import { compare } from "../src/compare";
import { RequestError } from "../src/queue";
import { extract, MODEL } from "./extract";
import { prepareImage } from "./image";
import { makeSession, readSession, safeEqual } from "./auth";
import * as store from "./store";
const secrets = new SecretsManagerClient({ maxAttempts: 2 }),
  s3 = new S3Client({ maxAttempts: 2 });
let secretPromise: Promise<string> | undefined;
async function secret() {
  if (!secretPromise)
    secretPromise = secrets
      .send(new GetSecretValueCommand({ SecretId: process.env.SECRET_ARN }))
      .then((r) => {
        if (!r.SecretString) throw new Error("Missing configuration");
        return r.SecretString;
      })
      .catch((e) => {
        secretPromise = undefined;
        throw e;
      });
  return secretPromise;
}
const headers = {
  "content-type": "application/json",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};
const response = (
  statusCode: number,
  body: unknown,
  cookies?: string[],
): APIGatewayProxyStructuredResultV2 => ({
  statusCode,
  headers,
  body: JSON.stringify(body),
  cookies,
});
let cold = true;
export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> {
  const started = Date.now(),
    coldStart = cold;
  cold = false;
  const requestId = event.requestContext.requestId || randomUUID();
  try {
    if (event.requestContext.http.method !== "POST")
      return response(405, { error: "Use POST." });
    if (
      event.headers["x-requested-with"] !== "LabelReviewWorkbench" ||
      !event.headers["content-type"]?.startsWith("application/json")
    )
      return response(403, {
        error: "Use the review application to make this request.",
      });
    if ((event.body?.length || 0) > 2_810_000)
      return response(413, { error: "Upload exceeds the supported size." });
    let body: unknown;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return response(400, { error: "Invalid JSON request." });
    }
    const local = process.env.LOCAL_DEV === "true";
    if (event.rawPath === "/api/session") {
      if (local) return response(200, { authenticated: true });
      await store.loginQuota(event.requestContext.http.sourceIp);
      const code =
        typeof body === "object" &&
        body !== null &&
        "code" in body &&
        typeof body.code === "string"
          ? body.code
          : "";
      if (!safeEqual(code, await secret()))
        return response(401, {
          error:
            "Access code is incorrect. Use the code supplied with the reviewer invitation.",
        });
      return response(200, { authenticated: true }, [
        `review_session=${makeSession(await secret())}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`,
      ]);
    }
    if (event.rawPath !== "/api/review")
      return response(404, { error: "Endpoint not found." });
    let session = "local";
    if (!local) {
      const cookie =
        (event.cookies || [])
          .flatMap((c) => c.split(";"))
          .map((c) => c.trim())
          .find((c) => c.startsWith("review_session="))
          ?.slice(15) || "";
      session = readSession(cookie, await secret()) || "";
      if (!session)
        return response(401, {
          error: "Enter the reviewer access code to run live extraction.",
        });
    }
    if (local && process.env.LIVE_ENABLED !== "true")
      return response(503, {
        error:
          "Local live processing is disabled. Use the clearly labeled example or enable LIVE_ENABLED after AWS cost approval.",
      });
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success)
      return response(400, {
        error:
          "Complete the required application fields and provide a supported image.",
        details: parsed.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      });
    if (
      !/^[A-Za-z0-9+/]+={0,2}$/.test(parsed.data.image) ||
      parsed.data.image.length % 4 !== 0
    )
      return response(400, { error: "Invalid image encoding." });
    let bytes: Buffer;
    try {
      bytes = await prepareImage(Buffer.from(parsed.data.image, "base64"));
    } catch (e) {
      return response(400, {
        error: e instanceof Error ? e.message : "Invalid image.",
      });
    }
    const hash = store.digest(bytes, parsed.data.expected),
      pk = `review:${session}:${hash}`;
    if (!local) {
      const prior = await store.getReview(pk);
      if (prior?.state === "complete")
        return response(200, { ...prior.review, cached: true });
    }
    const lease = local ? "" : await store.lock(pk);
    try {
      if (!local) {
        await store.quota(session);
        await s3.send(
          new PutObjectCommand({
            Bucket: process.env.IMAGE_BUCKET,
            Key: `temporary/${session}/${hash}.jpg`,
            Body: bytes,
            ContentType: "image/jpeg",
            ServerSideEncryption: "AES256",
          }),
        );
      }
      const extracted = await extract(bytes);
      const review: Review = {
        id: hash,
        mode: "live",
        version: VERSION,
        createdAt: new Date().toISOString(),
        findings: compare(
          parsed.data.expected,
          extracted.extraction,
          extracted.lines,
        ),
        imageConcerns: extracted.extraction.imageConcerns,
        timing: {
          processingMs: Date.now() - started,
          extractionMs: extracted.extractionMs,
        },
        usage: extracted.usage,
        model: MODEL,
      };
      if (!local) await store.save(pk, lease, review);
      console.log(
        JSON.stringify({
          event: "review_complete",
          requestId,
          coldStart,
          processingMs: review.timing.processingMs,
          extractionMs: review.timing.extractionMs,
          usage: review.usage,
        }),
      );
      return response(200, review);
    } catch (e) {
      if (!local) await store.unlock(pk, lease).catch(() => undefined);
      throw e;
    }
  } catch (e) {
    const name = e instanceof Error ? e.name : "UnknownError";
    console.error(
      JSON.stringify({
        event: "request_failed",
        requestId,
        errorType: name,
        coldStart,
      }),
    );
    if (e instanceof RequestError)
      return response(e.status, {
        error: e.message,
        retryable: e.retryable,
        requestId,
      });
    const transient = [
      "ThrottlingException",
      "ServiceUnavailableException",
      "InternalServerException",
      "AbortError",
      "TimeoutError",
    ].includes(name);
    return response(transient ? 503 : 502, {
      error: transient
        ? "Extraction service is busy or timed out. Retry this image shortly."
        : "Live extraction could not complete. Retry or contact the prototype owner with the request ID.",
      retryable: transient,
      requestId,
    });
  }
}
