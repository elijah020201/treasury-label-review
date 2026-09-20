import { readFile, writeFile, mkdir } from "node:fs/promises";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { fields, type Review, type Expected } from "../src/domain";
import { normalize, WARNING } from "../src/compare";
import { sampleExpected } from "../src/sample";
const outputs = JSON.parse(await readFile(".local/outputs.json", "utf8"))
  .TreasuryLabelReview as Record<string, string>;
const secret = await new SecretsManagerClient({ region: "us-east-1" }).send(
  new GetSecretValueCommand({ SecretId: outputs.ReviewerSecretArn }),
);
const auth = await fetch(outputs.ApplicationUrl + "/api/session", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-requested-with": "LabelReviewWorkbench",
  },
  body: JSON.stringify({ code: secret.SecretString }),
});
if (!auth.ok) throw new Error(`Authentication failed: ${auth.status}`);
const cookie = auth.headers
  .getSetCookie()
  .map((c) => c.split(";")[0])
  .join("; ");
const cases = JSON.parse(
  await readFile("tests/fixtures/cases.json", "utf8"),
) as { name: string; file: string; expected: Expected }[];
const results: {
  name: string;
  requestMs: number;
  review?: Review;
  error?: string;
}[] = [];
for (const item of cases) {
  const start = Date.now();
  try {
    const r = await fetch(outputs.ApplicationUrl + "/api/review", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-requested-with": "LabelReviewWorkbench",
        cookie,
      },
      body: JSON.stringify({
        expected: item.expected,
        image: (await readFile(item.file)).toString("base64"),
      }),
      signal: AbortSignal.timeout(35000),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(`${r.status}: ${data.error}`);
    results.push({
      name: item.name,
      requestMs: Date.now() - start,
      review: data,
    });
    console.log(
      `${item.name}: ${data.timing.processingMs} ms; ${data.findings.map((f: { field: string; status: string }) => `${f.field}=${f.status}`).join(", ")}`,
    );
  } catch (e) {
    results.push({
      name: item.name,
      requestMs: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    });
    console.log(`${item.name}: failed`);
  }
}
const reviews = results.flatMap((x) => (x.review ? [x.review] : []));
const durations = reviews
  .filter((r) => !r.cached)
  .map((r) => r.timing.processingMs)
  .sort((a, b) => a - b);
const percentile = (p: number) =>
  durations.length
    ? durations[Math.max(0, Math.ceil(durations.length * p) - 1)]
    : null;
let correct = 0,
  total = 0,
  falseMatch = 0,
  falseMismatch = 0,
  expectedMatch = 0,
  expectedNonmatch = 0,
  needsReview = 0,
  contentFindings = 0;
for (const item of results) {
  if (!item.review) continue;
  const expected = cases.find((c) => c.name === item.name)!.expected;
  for (const field of fields) {
    const gold =
      field === "origin"
        ? item.name === "import-origin-omitted"
          ? ""
          : expected.origin
        : field === "brand"
          ? item.name === "unseen-brand"
            ? "ORCHARD CREEK"
            : expected.brand
          : field === "alcohol"
            ? item.name === "wrong-abv"
              ? "40% Alc./Vol. (80 Proof)"
              : item.name === "inconsistent-proof"
                ? "45% Alc./Vol. (80 Proof)"
                : expected.alcohol
            : expected[field];
    const actual = item.review.findings.find((f) => f.field === field)!;
    total++;
    if (
      normalize(actual.observed === "Not found" ? "" : actual.observed) ===
      normalize(gold)
    )
      correct++;
  }
  for (const f of item.review.findings.filter(
    (f) =>
      f.field !== "formatting" && (f.field !== "origin" || expected.imported),
  )) {
    contentFindings++;
    if (f.status === "Needs review") needsReview++;
    const mismatch =
      (item.name === "wrong-abv" && f.field === "alcohol") ||
      (item.name === "unseen-brand" && f.field === "brand") ||
      (item.name === "altered-warning" && f.field === "warning") ||
      (item.name === "heading-case" &&
        ["warning", "heading"].includes(f.field));
    const missing =
      (item.name === "missing-warning" &&
        ["warning", "heading"].includes(f.field)) ||
      (item.name === "import-origin-omitted" && f.field === "origin");
    const conflict =
      item.name === "inconsistent-proof" && f.field === "alcohol";
    if (mismatch || missing || conflict) {
      expectedNonmatch++;
      if (f.status === "Match") falseMatch++;
    } else {
      expectedMatch++;
      if (f.status === "Mismatch") falseMismatch++;
    }
  }
}
const tokens = reviews.reduce(
  (a, r) => ({
    input: a.input + (r.usage?.inputTokens || 0),
    output: a.output + (r.usage?.outputTokens || 0),
  }),
  { input: 0, output: 0 },
);
const summary = {
  runAt: new Date().toISOString(),
  samples: results.length,
  successful: reviews.length,
  failed: results.length - reviews.length,
  uncachedLatencySamples: durations.length,
  processingP50Ms: percentile(0.5),
  processingP95Ms: percentile(0.95),
  fieldExactExtraction: { correct, total, rate: total ? correct / total : 0 },
  falseMatch: { count: falseMatch, denominator: expectedNonmatch },
  falseMismatch: { count: falseMismatch, denominator: expectedMatch },
  needsReview: { count: needsReview, denominator: contentFindings },
  tokens,
  estimatedAiOcrCostUsd:
    (tokens.input * 0.00006) / 1000 +
    (tokens.output * 0.00024) / 1000 +
    results.length * 0.0015,
};
await mkdir("docs/evaluation", { recursive: true });
await writeFile(
  "docs/evaluation/results.json",
  JSON.stringify({ summary, results }, null, 2),
);
await writeFile(".local/evaluation-session.json", JSON.stringify({ cookie }));
console.log(JSON.stringify(summary, null, 2));
