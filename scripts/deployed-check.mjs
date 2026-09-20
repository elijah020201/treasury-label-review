import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const out = JSON.parse(
  readFileSync(".local/outputs.json", "utf8"),
).TreasuryLabelReview;
const cases = JSON.parse(readFileSync("tests/fixtures/cases.json", "utf8"));
const secret = (
  await new SecretsManagerClient({ region: "us-east-1" }).send(
    new GetSecretValueCommand({ SecretId: out.ReviewerSecretArn }),
  )
).SecretString;
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const report = {
  url: out.ApplicationUrl,
  checkedAt: new Date().toISOString(),
  checks: [],
  accessibility: [],
};
const passed = (name) => {
  report.checks.push(name);
  console.log("PASS " + name);
};
const headers = {
  "content-type": "application/json",
  "x-requested-with": "LabelReviewWorkbench",
};
await page.goto(out.ApplicationUrl);
await expect(
  page.getByRole("heading", {
    name: "Every label has details. Make the differences clear.",
  }),
).toBeVisible();
const video = page.locator("video");
await video.scrollIntoViewIfNeeded();
await video.evaluate((v) => {
  v.currentTime = 25;
  return v.play();
});
await page.waitForTimeout(1400);
const media = await video.evaluate((v) => ({
  time: v.currentTime,
  duration: v.duration,
  width: v.videoWidth,
  height: v.videoHeight,
}));
expect(media.time).toBeGreaterThan(25);
expect(media.width).toBe(1920);
expect(media.duration).toBeGreaterThan(120);
passed("public narrated video loads and plays at 1080p");
await video.evaluate((v) => v.pause());
for (const width of [1440, 390]) {
  await page.setViewportSize({ width, height: 1000 });
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  report.accessibility.push({
    page: "demo",
    width,
    violations: results.violations,
  });
  expect(results.violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
}
passed("demo desktop/mobile accessibility and overflow");
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto(out.ApplicationUrl + "/workbench");
await page.getByRole("button", { name: "View example", exact: true }).click();
await expect(
  page.getByText("Precomputed example · no live extraction or measured timing"),
).toBeVisible();
passed("fresh unauthenticated example");
async function review() {
  const next = page.waitForResponse((r) => r.url().endsWith("/api/review"));
  await page.getByRole("button", { name: "Review label", exact: true }).click();
  const r = await next;
  return { status: r.status(), body: await r.json() };
}
expect((await review()).status).toBe(401);
passed("unauthenticated live processing rejected");
await page.getByLabel("Reviewer access code", { exact: true }).fill(secret);
await page
  .getByRole("button", { name: "Unlock live reviews", exact: true })
  .click();
await page
  .getByText("Live reviews unlocked for this session.")
  .waitFor({ state: "attached" });
const wine = cases.find((c) => c.name === "imported-wine");
await page.locator("#image").setInputFiles(wine.file);
const names = {
  brand: "Brand name",
  classType: "Class / type",
  alcohol: "Alcohol content",
  netContents: "Net contents",
  producer: "Producer / bottler and address",
};
for (const [key, label] of Object.entries(names))
  await page.getByLabel(label, { exact: true }).fill(wine.expected[key]);
await page.getByLabel("This is an imported product").check();
await page
  .getByLabel("Country of origin", { exact: true })
  .fill(wine.expected.origin);
let result = await review();
expect(result.status).toBe(200);
expect(result.body.mode).toBe("live");
expect(result.body.findings.find((f) => f.field === "origin").status).toBe(
  "Match",
);
passed("live imported image and application form");
const firstId = result.body.id;
result = await review();
expect(result.body.cached).toBe(true);
expect(result.body.id).toBe(firstId);
passed("duplicate reuse without new extraction");
await page.getByLabel("Alcohol content", { exact: true }).fill("10% ABV");
result = await review();
expect(result.status).toBe(200);
expect(result.body.id).not.toBe(firstId);
expect(result.body.findings.find((f) => f.field === "alcohol").status).toBe(
  "Mismatch",
);
passed("changed expectations create a distinct mismatch review");
for (const width of [1440, 390]) {
  await page.setViewportSize({ width, height: 1000 });
  const a = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  report.accessibility.push({
    page: "live-workbench",
    width,
    violations: a.violations,
  });
  expect(a.violations).toEqual([]);
}
await page.setViewportSize({ width: 1440, height: 1000 });
await page.getByRole("button", { name: "Batch review", exact: true }).click();
const beer = cases.find((c) => c.name === "beer-portrait");
const manifest = [
  { filename: "imported-wine.png", expected: wine.expected },
  { filename: "invalid.png", expected: wine.expected },
  { filename: "beer-portrait.png", expected: beer.expected },
];
await page.locator("input[multiple]").setInputFiles([
  {
    name: "imported-wine.png",
    mimeType: "image/png",
    buffer: readFileSync(wine.file),
  },
  {
    name: "invalid.png",
    mimeType: "image/png",
    buffer: Buffer.from("invalid image"),
  },
  {
    name: "beer-portrait.png",
    mimeType: "image/png",
    buffer: readFileSync(beer.file),
  },
]);
await page
  .locator('input[accept=".json,application/json"]')
  .setInputFiles({
    name: "batch.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(manifest)),
  });
await page
  .getByRole("button", { name: "Start batch review", exact: true })
  .click();
await page
  .getByText("3 of 3 finished", { exact: false })
  .waitFor({ timeout: 45000 });
expect(
  await page.getByRole("cell", { name: "Failed", exact: true }).count(),
).toBe(1);
expect(
  await page.getByRole("cell", { name: "Complete", exact: true }).count(),
).toBe(2);
const downloading = page.waitForEvent("download");
await page
  .getByRole("button", { name: "Export batch JSON", exact: true })
  .click();
await (await downloading).saveAs(".local/batch-verification.json");
passed("real batch isolates invalid image and exports complete summary");
const access = await context.request.post(out.ApplicationUrl + "/api/session", {
  headers,
  data: { code: secret },
});
expect(access.status()).toBe(200);
const cookies = await context.cookies(out.ApplicationUrl + "/api/review");
const token = cookies.find((c) => c.name === "review_session").value;
const session = JSON.parse(
  Buffer.from(token.split(".")[0], "base64url").toString(),
).id;
const db = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: "us-east-1" }),
);
const readCount = async () =>
  (
    await db.send(
      new GetCommand({
        TableName: out.ReviewsTable,
        Key: { pk: "quota:lifetime" },
        ConsistentRead: true,
      }),
    )
  ).Item?.count;
const before = await readCount();
await db.send(
  new PutCommand({
    TableName: out.ReviewsTable,
    Item: {
      pk: "quota:session:" + session,
      count: 500,
      expires: Math.floor(Date.now() / 1000) + 3600,
    },
  }),
);
const capped = await context.request.post(out.ApplicationUrl + "/api/review", {
  headers,
  data: {
    expected: wine.expected,
    image: readFileSync(wine.file).toString("base64"),
  },
});
expect(capped.status()).toBe(429);
expect(await readCount()).toBe(before);
passed("actual DynamoDB session limit prevents paid processing atomically");
const preflight = await context.request.fetch(
  out.ApplicationUrl + "/api/review",
  {
    method: "OPTIONS",
    headers: {
      origin: "https://example.org",
      "access-control-request-method": "POST",
      "access-control-request-headers": "x-requested-with,content-type",
    },
  },
);
expect(preflight.headers()["access-control-allow-origin"]).toBeUndefined();
passed("cross-origin preflight is not allowed");
const direct = await context.request.get(
  `https://${out.SiteBucket}.s3.us-east-1.amazonaws.com/index.html`,
);
expect(direct.status()).toBe(403);
passed("site bucket denies anonymous direct object access");
expect(errors).toEqual([]);
report.pageErrors = errors;
report.media = media;
mkdirSync(".local/screenshots", { recursive: true });
await page.screenshot({
  path: ".local/screenshots/deployed-batch.png",
  fullPage: true,
});
writeFileSync(".local/deployed-check.json", JSON.stringify(report, null, 2));
writeFileSync(
  ".local/REVIEWER_ACCESS.txt",
  `Label Review Workbench\nDemo: ${out.ApplicationUrl}\nApp: ${out.ApplicationUrl}/workbench\nReviewer access code: ${secret}\n\nShare this code with Treasury in the submission. Do not put it in the public repository.\n`,
);
await browser.close();
console.log("All deployed checks passed.");
