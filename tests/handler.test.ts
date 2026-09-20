import { beforeEach, it, expect, vi } from "vitest";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import sharp from "sharp";
import { sampleExpected, sampleExtraction } from "../src/sample";
import { WARNING } from "../src/compare";
import { makeSession } from "../server/auth";
const mocked = vi.hoisted(() => ({
  extract: vi.fn(),
  quota: vi.fn(),
  lock: vi.fn(),
  save: vi.fn(),
  getReview: vi.fn(),
  unlock: vi.fn(),
  s3: vi.fn(),
}));
vi.mock("../server/extract", () => ({
  MODEL: "test-model",
  extract: mocked.extract,
}));
vi.mock("../server/store", () => ({
  digest: () => "image-expectations-version-hash",
  getReview: mocked.getReview,
  lock: mocked.lock,
  save: mocked.save,
  unlock: mocked.unlock,
  quota: mocked.quota,
  loginQuota: vi.fn(),
}));
vi.mock("@aws-sdk/client-secrets-manager", () => ({
  SecretsManagerClient: class {
    send() {
      return Promise.resolve({ SecretString: "test-secret" });
    }
  },
  GetSecretValueCommand: class {},
}));
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    send() {
      return mocked.s3();
    }
  },
  PutObjectCommand: class {},
}));
const { handler } = await import("../server/handler");
function event(body: unknown, cookie = true): APIGatewayProxyEventV2 {
  return {
    version: "2.0",
    routeKey: "POST /api/{proxy+}",
    rawPath: "/api/review",
    rawQueryString: "",
    isBase64Encoded: false,
    headers: {
      "content-type": "application/json",
      "x-requested-with": "LabelReviewWorkbench",
    },
    body: JSON.stringify(body),
    cookies: cookie ? ["review_session=" + makeSession("test-secret")] : [],
    requestContext: {
      accountId: "test",
      apiId: "test",
      domainName: "test",
      domainPrefix: "test",
      requestId: "test",
      routeKey: "POST /api/{proxy+}",
      stage: "test",
      time: "now",
      timeEpoch: Date.now(),
      http: {
        method: "POST",
        sourceIp: "127.0.0.1",
        path: "/api/review",
        protocol: "HTTP/1.1",
        userAgent: "test",
      },
    },
  };
}
let image: string;
mocked.unlock.mockResolvedValue(undefined);
beforeEach(async () => {
  delete process.env.LOCAL_DEV;
  vi.clearAllMocks();
  image = (
    await sharp({
      create: { width: 100, height: 100, channels: 3, background: "white" },
    })
      .png()
      .toBuffer()
  ).toString("base64");
  mocked.getReview.mockResolvedValue(undefined);
  mocked.lock.mockResolvedValue("lease");
  mocked.extract.mockResolvedValue({
    extraction: sampleExtraction,
    lines: [
      ...Object.values(sampleExtraction.fields).flatMap((v) => v.values),
      WARNING,
    ].map((text) => ({ text, confidence: 99 })),
    extractionMs: 10,
    usage: { inputTokens: 1, outputTokens: 1 },
  });
});
it("requires authentication before any paid work", async () => {
  expect(
    (await handler(event({ expected: sampleExpected, image }, false)))
      .statusCode,
  ).toBe(401);
  expect(mocked.extract).not.toHaveBeenCalled();
  expect(mocked.quota).not.toHaveBeenCalled();
});
it("rejects simple cross-origin request headers", async () => {
  const e = event({});
  delete e.headers["x-requested-with"];
  expect((await handler(e)).statusCode).toBe(403);
  expect(mocked.extract).not.toHaveBeenCalled();
});
it("rejects invalid image before quota/storage/extraction", async () => {
  expect(
    (
      await handler(
        event({
          expected: sampleExpected,
          image: Buffer.from("not image").toString("base64"),
        }),
      )
    ).statusCode,
  ).toBe(400);
  expect(mocked.extract).not.toHaveBeenCalled();
  expect(mocked.quota).not.toHaveBeenCalled();
});
it("reuses cached results without another paid call", async () => {
  mocked.getReview.mockResolvedValue({
    state: "complete",
    review: { id: "cached" },
  });
  const r = await handler(event({ expected: sampleExpected, image }));
  expect(JSON.parse(r.body!).cached).toBe(true);
  expect(mocked.extract).not.toHaveBeenCalled();
  expect(mocked.lock).not.toHaveBeenCalled();
});
it("reserves quota before extraction and saves successful result", async () => {
  const r = await handler(event({ expected: sampleExpected, image }));
  expect(r.statusCode).toBe(200);
  expect(mocked.quota).toHaveBeenCalledOnce();
  expect(mocked.extract).toHaveBeenCalledOnce();
  expect(mocked.quota.mock.invocationCallOrder[0]).toBeLessThan(
    mocked.extract.mock.invocationCallOrder[0],
  );
  expect(mocked.save).toHaveBeenCalledOnce();
});
it("exposes timeout as failure, releases lease, never saves canned output", async () => {
  mocked.extract.mockRejectedValue(
    Object.assign(new Error("private provider text"), { name: "TimeoutError" }),
  );
  const r = await handler(event({ expected: sampleExpected, image }));
  expect(r.statusCode).toBe(503);
  expect(r.body).not.toContain("private provider text");
  expect(mocked.unlock).toHaveBeenCalledOnce();
  expect(mocked.save).not.toHaveBeenCalled();
});
it("requests a clearer image when model output violates the extraction contract", async () => {
  mocked.extract.mockRejectedValue(
    Object.assign(new Error("untrusted raw text"), { name: "ZodError" }),
  );
  const r = await handler(event({ expected: sampleExpected, image }));
  expect(r.statusCode).toBe(422);
  expect(r.body).toContain("clearer, complete label image");
  expect(r.body).not.toContain("untrusted raw text");
  expect(mocked.save).not.toHaveBeenCalled();
});
