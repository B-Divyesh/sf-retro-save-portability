import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://api.github.com/repos/B-Divyesh/sf-retro-save-portability/releases/latest", route => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ tag_name: "v0.1.0", html_url: "https://github.com/B-Divyesh/sf-retro-save-portability/releases/tag/v0.1.0", assets: [
      { name: "retro-save-portability_0.1.0_linux-x64.AppImage", browser_download_url: "https://github.com/example/app.AppImage", digest: `sha256:${"a".repeat(64)}` },
      { name: "retro-save-portability_0.1.0_macos-arm64.dmg", browser_download_url: "https://github.com/example/app.dmg", digest: `sha256:${"b".repeat(64)}` },
      { name: "retro-save-portability_0.1.0_windows-x64.msi", browser_download_url: "https://github.com/example/app.msi", digest: `sha256:${"c".repeat(64)}` }
    ] })
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
  await expect(page.locator("#platform-download")).toHaveAttribute("href", /github\.com\/example/);
  await page.locator(".download-ticket summary").click();
  await page.locator(".copy-button").click();
  await expect(page.locator(".copy-button")).toContainText(/Copied|Select and copy/);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(violation => ["serious", "critical"].includes(violation.impact || ""))).toEqual([]);
  expect(errors).toEqual([]);
});

test("@claim:release-api-cache reads the CORS-enabled API and uses its cached successful response", async ({ page }) => {
  let calls = 0;
  await page.route("**/repos/B-Divyesh/sf-retro-save-portability/releases/latest", route => {
    calls += 1;
    return route.fulfill({ json: { tag_name: "v9.9.9", html_url: "https://github.com/B-Divyesh/sf-retro-save-portability/releases/tag/v9.9.9", assets: [
      { name: "retro-save-portability_9.9.9_linux-x64.AppImage", browser_download_url: "https://github.com/example/demo.AppImage", digest: "sha256:abc" },
      { name: "retro-save-portability_9.9.9_macos-arm64.dmg", browser_download_url: "https://github.com/example/demo.dmg", digest: "sha256:def" },
      { name: "retro-save-portability_9.9.9_windows-x64.msi", browser_download_url: "https://github.com/example/demo.msi", digest: "sha256:ghi" }
    ] } });
  });
  await page.goto("/");
  await expect(page.locator("#platform-download")).toContainText("v9.9.9");
  await page.reload();
  await expect(page.locator("#platform-download")).toContainText("v9.9.9");
  expect(calls).toBe(1);
});

test("@claim:published-download-state handles no release without a console error", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.route("**/repos/B-Divyesh/sf-retro-save-portability/releases/latest", route => route.fulfill({ status: 404, body: "{}" }));
  await page.goto("/");
  await expect(page.locator("#download-status")).toContainText("Downloads are being published");
  await expect(page.locator("#platform-download")).toHaveAttribute("href", /github\.com\/B-Divyesh/);
  expect(pageErrors).toEqual([]);
});

test("@claim:demo-sandbox loads sample saves and keeps them in the demo namespace", async ({ page }) => {
  await page.goto("/demo/");
  await expect(page.getByText("Demo — sample data, nothing is saved to your real files.")).toBeVisible();
  await expect(page.locator("#demo-list li")).toHaveCount(3);
  await page.getByRole("button", { name: "Review portable bundle" }).click();
  await expect(page.locator("#demo-status")).toContainText("Portable bundle review ready");
  const storage = await page.evaluate(() => Object.keys(localStorage));
  expect(storage).toContain("demo:retro-save-portability:sample");
  expect(storage.some(key => key.startsWith("rsp:"))).toBe(false);
});

test("@claim:demo-privacy makes no third-party request during the sample flow", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", request => requests.push(request.url()));
  await page.goto("/demo/");
  await page.getByRole("button", { name: "Review portable bundle" }).click();
  expect(requests.every(url => new URL(url).origin === "http://127.0.0.1:4173")).toBe(true);
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
