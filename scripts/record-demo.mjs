import { chromium, expect } from "@playwright/test";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const outputs = JSON.parse(
  readFileSync(".local/outputs.json", "utf8"),
).TreasuryLabelReview;
const scenes = JSON.parse(readFileSync(".local/video/timeline.json", "utf8"));
const expected = JSON.parse(
  readFileSync("public/samples/manifest.json", "utf8"),
)[0].expected;
const secret = await new SecretsManagerClient({ region: "us-east-1" }).send(
  new GetSecretValueCommand({ SecretId: outputs.ReviewerSecretArn }),
);
mkdirSync(".local/video/capture", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1600, height: 850 },
  recordVideo: {
    dir: ".local/video/capture",
    size: { width: 1600, height: 850 },
  },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const responses = [];
page.on("response", async (r) => {
  if (r.url().endsWith("/api/review"))
    try {
      responses.push({ status: r.status(), body: await r.json() });
    } catch {}
});
await page.goto(outputs.ApplicationUrl + "/workbench");
await page
  .getByLabel("Reviewer access code", { exact: true })
  .fill(secret.SecretString);
await page
  .getByRole("button", { name: "Unlock live reviews", exact: true })
  .click();
await page
  .getByText("Live reviews unlocked for this session.")
  .waitFor({ state: "attached" });
await page.getByRole("button", { name: "Load sample", exact: true }).click();
await page.locator(".workbench").scrollIntoViewIfNeeded();
const start = Date.now();
const pause = (ms) => page.waitForTimeout(ms);
async function review() {
  await page.getByRole("button", { name: "Review label", exact: true }).click();
  await page
    .getByRole("heading", { name: "Review findings", exact: true })
    .waitFor({ timeout: 35000 });
  // Let the app's delayed results scroll finish before composing a closer shot.
  await pause(500);
}
async function stage(index, fn) {
  const began = Date.now();
  scenes[index].captureStart = (began - start) / 1000;
  await fn();
  await pause(Math.max(0, scenes[index].seconds * 1000 - (Date.now() - began)));
  scenes[index].captureDuration = (Date.now() - began) / 1000;
  console.log(`Recorded ${scenes[index].title}`);
}
await stage(0, async () => {
  await pause(2500);
  await page.getByLabel("Brand name", { exact: true }).click();
  await pause(2500);
  await page.mouse.move(380, 450, { steps: 24 });
});
await stage(1, async () => {
  await pause(1200);
  await review();
  await page.locator(".results").scrollIntoViewIfNeeded();
  await pause(2500);
  await page
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name: /Alcohol content/ }) })
    .scrollIntoViewIfNeeded();
});
await stage(2, async () => {
  await page
    .getByLabel("Alcohol content", { exact: true })
    .fill("40% Alc./Vol. (80 Proof)");
  await pause(1800);
  await review();
  const row = page
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name: /Alcohol content/ }) });
  await row.scrollIntoViewIfNeeded();
  if (!(await row.innerText()).includes("Mismatch"))
    throw new Error("Expected live ABV discrepancy was not shown.");
});
await stage(3, async () => {
  await page
    .getByLabel("Alcohol content", { exact: true })
    .fill(expected.alcohol);
  await page
    .locator("#image")
    .setInputFiles("public/samples/altered-warning.png");
  await page.getByText("altered-warning.png", { exact: true }).waitFor();
  await pause(1000);
  await review();
  const row = page
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name: /Warning wording/ }) });
  await row.scrollIntoViewIfNeeded();
  if (!(await row.innerText()).includes("Mismatch"))
    throw new Error("Expected altered warning discrepancy was not shown.");
  await pause(500);
  await expect(row).toBeInViewport({ ratio: 1 });
});
await stage(4, async () => {
  await page.getByRole("button", { name: "Batch review", exact: true }).click();
  await page
    .locator("input[multiple]")
    .setInputFiles([
      "public/samples/complete.png",
      "public/samples/wrong-abv.png",
    ]);
  await page
    .locator('input[accept=".json,application/json"]')
    .setInputFiles({
      name: "demo-manifest.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify(
          ["complete.png", "wrong-abv.png"].map((filename) => ({
            filename,
            expected,
          })),
        ),
      ),
    });
  await pause(1400);
  await page
    .getByRole("button", { name: "Start batch review", exact: true })
    .click();
  await page
    .getByText("2 of 2 finished", { exact: false })
    .waitFor({ timeout: 35000 });
  await page.locator(".batch-panel").scrollIntoViewIfNeeded();
});
await stage(5, async () => {
  await page.getByRole("button", { name: "Single label", exact: true }).click();
  await page.locator(".results").scrollIntoViewIfNeeded();
  await pause(1500);
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON", exact: true }).click();
  await (await downloading).saveAs(".local/video/exported-review.json");
  await pause(2500);
  await page
    .getByRole("row")
    .filter({
      has: page.getByRole("rowheader", { name: /Warning formatting/ }),
    })
    .scrollIntoViewIfNeeded();
});
const elapsed = (Date.now() - start) / 1000;
const video = page.video();
await context.close();
const path = await video.path();
await browser.close();
writeFileSync(
  ".local/video/capture.json",
  JSON.stringify({ video: path, elapsed, scenes, responses }, null, 2),
);
if (responses.some((r) => r.status !== 200))
  throw new Error("Recorded workflow contained an API failure.");
console.log("Recorded six scenes against the deployed application.");
