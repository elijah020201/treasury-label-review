import { it, expect } from "vitest";
import sharp from "sharp";
import { makeSession, readSession } from "../server/auth";
import { prepareImage } from "../server/image";
import { digest } from "../server/store";
import { sampleExpected } from "../src/sample";
import { runQueue, RequestError } from "../src/queue";
it("rejects forged, expired, and altered sessions", () => {
  const token = makeSession("secret", 100000);
  expect(readSession(token, "secret", 100001)).toMatch(/^[a-f0-9]{32}$/);
  expect(readSession(token + "x", "secret", 100001)).toBeNull();
  expect(readSession(token, "other", 100001)).toBeNull();
  expect(readSession(token, "secret", 100000 + 28800001)).toBeNull();
});
it("rejects invalid content and oversized uploads before extraction", async () => {
  await expect(prepareImage(Buffer.from("<svg/>"))).rejects.toThrow();
  await expect(
    prepareImage(Buffer.alloc(2 * 1024 * 1024 + 1)),
  ).rejects.toThrow();
  await expect(
    prepareImage(Buffer.from([255, 216, 255, 0, 0])),
  ).rejects.toThrow();
});
it("decodes real images, normalizes orientation and strips EXIF", async () => {
  const bytes = await sharp({
    create: { width: 100, height: 150, channels: 3, background: "white" },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const result = await prepareImage(bytes);
  const meta = await sharp(result).metadata();
  expect(meta.width).toBe(150);
  expect(meta.height).toBe(100);
  expect(meta.exif).toBeUndefined();
});
it("rejects oversized dimensions and tiny images", async () => {
  const large = await sharp({
    create: { width: 5000, height: 5000, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  await expect(prepareImage(large)).rejects.toThrow();
  const small = await sharp({
    create: { width: 30, height: 30, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  await expect(prepareImage(small)).rejects.toThrow();
});
it("idempotency includes expected data and image", () => {
  const a = digest(Buffer.from("a"), sampleExpected);
  expect(digest(Buffer.from("a"), sampleExpected)).toBe(a);
  expect(
    digest(Buffer.from("a"), { ...sampleExpected, brand: "OTHER" }),
  ).not.toBe(a);
  expect(digest(Buffer.from("b"), sampleExpected)).not.toBe(a);
});
it("processes 300 items with bounded concurrency, independent failure and one transient retry", async () => {
  let active = 0,
    max = 0;
  const attempts = new Map<number, number>();
  const states = await runQueue(
    Array.from({ length: 300 }, (_, i) => i),
    async (i) => {
      active++;
      max = Math.max(max, active);
      attempts.set(i, (attempts.get(i) || 0) + 1);
      await Promise.resolve();
      active--;
      if (i === 4) throw new RequestError("invalid", false, 400);
      if (i === 7 && attempts.get(i) === 1)
        throw new RequestError("throttled", true, 503);
      return i;
    },
    () => {},
    2,
    async () => {},
  );
  expect(max).toBeLessThanOrEqual(2);
  expect(states.filter((s) => s.status === "Complete")).toHaveLength(299);
  expect(states[4].status).toBe("Failed");
  expect(states[7].attempts).toBe(2);
  expect(new Set(states.map((s) => s.id)).size).toBe(300);
});
it("does not retry indefinitely on a timeout", async () => {
  const states = await runQueue(
    [1],
    async () => {
      throw new RequestError("timeout", true, 503);
    },
    () => {},
    2,
    async () => {},
  );
  expect(states[0].attempts).toBe(2);
  expect(states[0].status).toBe("Failed");
});
