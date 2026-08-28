import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/latest.json", route => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ version: "v0.1.0", platforms: {
      "linux-appimage": { url: "https://example.test/app.AppImage", sha256: "a".repeat(64) },
      "macos-arm64": { url: "https://example.test/app.dmg", sha256: "b".repeat(64) },
      windows: { url: "https://example.test/app.msi", sha256: "c".repeat(64) }
    } })
  }));
});

test("landing is semantic, interactive, and free of serious accessibility issues", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/");
  await expect(page).toHaveTitle(/Retro Save Portability/);
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("img")).toHaveAttribute("alt", /cassette/i);
  await expect(page.locator("#platform-download")).toHaveAttribute("href", /example\.test/);
  await page.locator(".download-ticket summary").click();
  await page.locator(".copy-button").click();
  await expect(page.locator(".copy-button")).toContainText(/Copied|Select and copy/);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(violation => ["serious", "critical"].includes(violation.impact || ""))).toEqual([]);
  expect(errors).toEqual([]);
});

test("390px layout does not overflow and keeps download reachable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile-only assertion");
  await page.goto("/");
  const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
  await page.locator("a[href='#download']").first().click();
  await expect(page.locator("#platform-download")).toBeVisible();
});

for (const path of ["/help/", "/privacy/", "/terms/"]) {
  test(`${path} has one h1 and no serious accessibility issues`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("main")).toHaveCount(1);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter(violation => ["serious", "critical"].includes(violation.impact || ""))).toEqual([]);
  });
}
