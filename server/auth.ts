import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
export const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
export function makeSession(secret: string, now = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({
      id: randomBytes(16).toString("hex"),
      exp: Math.floor(now / 1000) + 28800,
    }),
  ).toString("base64url");
  return (
    payload +
    "." +
    createHmac("sha256", secret).update(payload).digest("base64url")
  );
}
export function readSession(
  token: string,
  secret: string,
  now = Date.now(),
): string | null {
  try {
    const [payload, signature, ...rest] = token.split(".");
    if (
      rest.length ||
      !payload ||
      !signature ||
      !safeEqual(
        signature,
        createHmac("sha256", secret).update(payload).digest("base64url"),
      )
    )
      return null;
    const data: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    );
    if (
      typeof data !== "object" ||
      data === null ||
      !("id" in data) ||
      !("exp" in data) ||
      typeof data.id !== "string" ||
      !/^[a-f0-9]{32}$/.test(data.id) ||
      typeof data.exp !== "number" ||
      data.exp <= now / 1000
    )
      return null;
    return data.id;
  } catch {
    return null;
  }
}
