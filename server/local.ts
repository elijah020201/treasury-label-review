import { createServer } from "node:http";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
process.env.LOCAL_DEV = "true";
const { handler } = await import("./handler");
createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 2_810_000) {
      res.writeHead(413);
      res.end("Upload too large");
      return;
    }
    chunks.push(chunk);
  }
  const headers = Object.fromEntries(
    Object.entries(req.headers).map(([k, v]) => [
      k,
      Array.isArray(v) ? v.join(",") : v,
    ]),
  );
  const event: APIGatewayProxyEventV2 = {
    version: "2.0",
    routeKey: "POST /api/{proxy+}",
    rawPath: req.url || "/",
    rawQueryString: "",
    isBase64Encoded: false,
    headers,
    body: Buffer.concat(chunks).toString(),
    requestContext: {
      accountId: "local",
      apiId: "local",
      domainName: "localhost",
      domainPrefix: "local",
      requestId: crypto.randomUUID(),
      routeKey: "POST /api/{proxy+}",
      stage: "local",
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
      http: {
        method: req.method || "POST",
        sourceIp: "127.0.0.1",
        path: req.url || "/",
        protocol: "HTTP/1.1",
        userAgent: "local",
      },
    },
    cookies: [],
  };
  const result = await handler(event);
  res.writeHead(
    result.statusCode || 200,
    result.headers as Record<string, string>,
  );
  res.end(result.body);
}).listen(8787, "127.0.0.1", () =>
  console.log(
    "Local API on http://127.0.0.1:8787; live extraction requires LIVE_ENABLED=true.",
  ),
);
