import { chromium, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const base = "https://labels.altrosstudios.games";
const hosts = new Set();
page.on("request", (r) => {
  if (r.url().startsWith("http")) hosts.add(new URL(r.url()).host);
});
await page.goto(base);
await page.keyboard.press("Tab");
await expect(page.locator(":focus")).toHaveAttribute("href", "/");
await page.keyboard.press("Tab");
await expect(page.locator(":focus")).toHaveText("The workflow");
await page.keyboard.press("Tab");
await expect(page.locator(":focus")).toHaveText("Watch demo");
await page.keyboard.press("Tab");
await expect(page.locator(":focus")).toHaveText("Open workbench");
await page.keyboard.press("Enter");
await expect(page).toHaveURL(base + "/workbench");
await page.getByRole("button", { name: "View example", exact: true }).click();
await page.getByRole("heading", { name: "Review findings" }).waitFor();
const download = page.waitForEvent("download");
await page.getByRole("button", { name: "Export CSV", exact: true }).click();
await (await download).saveAs(".local/example-export.csv");
const csv = readFileSync(".local/example-export.csv", "utf8");
expect(csv).toContain("Warning formatting");
expect(csv).toContain("Needs review");
expect(csv).toContain("example");
const evidence = page.getByRole("button", {
  name: "Highlight evidence",
  exact: true,
});
if (await evidence.count()) await evidence.first().click();
await page.goto(base);
const vtt = await context.request.get(base + "/media/label-review-demo.vtt");
expect(vtt.status()).toBe(200);
expect(await vtt.text()).toMatch(/^WEBVTT/);
const video = page.locator("video");
await video.evaluate((v) => {
  v.currentTime = 110;
  return v.play();
});
await page.waitForTimeout(1000);
expect(
  await video.evaluate((v) => v.textTracks[0].cues.length),
).toBeGreaterThan(20);
await video.evaluate((v) => v.pause());
await page.screenshot({
  path: ".local/screenshots/deployed-demo.png",
  fullPage: true,
});
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({
  path: ".local/screenshots/deployed-demo-mobile.png",
  fullPage: true,
});
expect([...hosts]).toEqual(["labels.altrosstudios.games"]);
const existing = [];
for (const url of [
  "https://altrosstudios.games",
  "https://aegis.altrosstudios.games",
]) {
  const response = await context.request.get(url);
  expect(response.status()).toBe(200);
  existing.push({ url, status: response.status() });
}
const report = {
  checkedAt: new Date().toISOString(),
  keyboardNavigation: true,
  csvExport: true,
  captionCuesLoaded: true,
  networkHosts: [...hosts],
  existingSites: existing,
};
writeFileSync(".local/release-check.json", JSON.stringify(report, null, 2));
await browser.close();
console.log(JSON.stringify(report));
