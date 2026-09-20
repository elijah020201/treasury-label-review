import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(
  (process.env.APP_URL || "http://127.0.0.1:5173").replace(/\/$/, "") +
    "/workbench",
);
await page.getByRole("button", { name: "View example", exact: true }).click();
await page.getByRole("heading", { name: "Review findings" }).waitFor();
await page
  .getByText("Precomputed example · no live extraction or measured timing")
  .waitFor();
const desktop = await new AxeBuilder({ page })
  .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
  .analyze();
mkdirSync(".local/screenshots", { recursive: true });
await page.screenshot({
  path: ".local/screenshots/desktop.png",
  fullPage: true,
});
await page.getByRole("button", { name: "Review label", exact: true }).click();
await page
  .getByRole("alert")
  .getByText(/access code|disabled/i)
  .waitFor();
await page.getByRole("button", { name: "Batch review", exact: true }).click();
await page.getByRole("heading", { name: "Review a batch of labels" }).waitFor();
await page.getByRole("button", { name: "Single label", exact: true }).click();
await page.setViewportSize({ width: 390, height: 844 });
const mobile = await new AxeBuilder({ page })
  .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
  .analyze();
await page.screenshot({
  path: ".local/screenshots/mobile.png",
  fullPage: true,
});
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth > innerWidth,
);
const report = {
  desktopViolations: desktop.violations,
  mobileViolations: mobile.violations,
  pageErrors: errors,
  mobilePageOverflow: overflow,
};
writeFileSync(".local/browser-check.json", JSON.stringify(report, null, 2));
console.log(
  JSON.stringify({
    desktopViolations: desktop.violations.length,
    mobileViolations: mobile.violations.length,
    pageErrors: errors,
    mobilePageOverflow: overflow,
  }),
);
await browser.close();
if (
  desktop.violations.length ||
  mobile.violations.length ||
  errors.length ||
  overflow
)
  process.exitCode = 1;
