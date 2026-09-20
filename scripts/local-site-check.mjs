import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync, writeFileSync } from "node:fs";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
await page.goto("http://127.0.0.1:5173");
await expect(page.getByRole("heading", { level: 1 })).toContainText(
  "Every label has details.",
);
const reports = [];
for (const width of [1440, 390]) {
  await page.setViewportSize({ width, height: 1000 });
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  reports.push({ width, violations: result.violations });
  expect(result.violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.screenshot({
    path: `.local/screenshots/landing-${width}.png`,
    fullPage: true,
  });
}
await page.goto("http://127.0.0.1:5173/workbench");
let release;
const gate = new Promise((r) => (release = r));
let started;
const requestStarted = new Promise((r) => (started = r));
await page.route("**/samples/complete.png", async (route) => {
  started();
  await gate;
  await route.fulfill({
    contentType: "image/png",
    body: readFileSync("public/samples/complete.png"),
  });
});
await page.getByRole("button", { name: "Load sample", exact: true }).click();
await requestStarted;
await page.locator("#image").setInputFiles("public/samples/imported-wine.png");
await page.getByLabel("Brand name", { exact: true }).fill("Keep my selection");
const returned = page.waitForResponse((r) =>
  r.url().endsWith("/samples/complete.png"),
);
release();
await returned;
await page.waitForTimeout(300);
await expect(page.getByLabel("Brand name", { exact: true })).toHaveValue(
  "Keep my selection",
);
let body;
await page.route("**/api/review", async (route) => {
  body = route.request().postDataJSON();
  await route.fulfill({
    status: 401,
    contentType: "application/json",
    body: JSON.stringify({ error: "Reviewer access code required." }),
  });
});
for (const label of [
  "Class / type",
  "Alcohol content",
  "Net contents",
  "Producer / bottler and address",
])
  await page.getByLabel(label, { exact: true }).fill("Test");
await page.getByRole("button", { name: "Review label", exact: true }).click();
await page.getByRole("alert").waitFor();
expect(body.image).toBe(
  readFileSync("public/samples/imported-wine.png").toString("base64"),
);
writeFileSync(
  ".local/local-site-check.json",
  JSON.stringify(
    {
      accessibility: reports,
      sampleRace: "manual file and fields survive delayed sample response",
    },
    null,
    2,
  ),
);
await browser.close();
console.log(
  "Local landing accessibility, responsive layout and delayed-sample regression passed.",
);
