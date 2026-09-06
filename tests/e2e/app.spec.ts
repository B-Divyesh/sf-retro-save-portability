import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("desktop UI shell has a complete keyboard-accessible empty state", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("http://127.0.0.1:4174");
  await expect(page).toHaveTitle(/Retro Save Portability/);
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Choose save folder" })).toBeVisible();
  await page.getByRole("button", { name: "Choose save folder" }).click();
  await expect(page.getByRole("status")).toContainText("Install the desktop app");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(violation => ["serious", "critical"].includes(violation.impact || ""))).toEqual([]);
  expect(errors).toEqual([]);
});

test("@claim:desktop-sample-project loads isolated sample saves", async ({ page }) => {
  await page.goto("http://127.0.0.1:4174");
  await page.evaluate(() => localStorage.setItem("rsp:real-sentinel", "unchanged"));
  await page.getByRole("button", { name: "Load sample project" }).click();
  await expect(page.getByText("Demo — sample data, nothing is saved to your real files.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "3 saves found" })).toBeVisible();
  await page.getByRole("button", { name: "Review portable bundle" }).click();
  await page.getByRole("button", { name: "Create .rspbundle" }).click();
  await expect(page.getByText("Demo bundle review is ready")).toBeVisible();
  await expect(page.getByText("Demo — sample data, nothing is saved to your real files.")).toBeVisible();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.getByRole("heading", { name: "3 saves found" })).toBeVisible();
  const storage = await page.evaluate(() => Object.keys(localStorage));
  expect(storage).toContain("demo:retro-save-portability:desktop");
  expect(storage.filter(key => key.startsWith("rsp:"))).toEqual(["rsp:real-sentinel"]);
  await page.getByRole("button", { name: "Start for real" }).click();
  await expect(page.getByRole("heading", { name: "Find saves in a selected folder." })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("demo:retro-save-portability:desktop"))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("rsp:real-sentinel"))).toBe("unchanged");
});

test("@claim:app-network-privacy sends no sample save data outside the local app", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", request => requests.push(request.url()));
  await page.goto("http://127.0.0.1:4174");
  await page.getByRole("button", { name: "Load sample project" }).click();
  await page.getByRole("button", { name: "Review portable bundle" }).click();
  await page.getByRole("button", { name: "Create .rspbundle" }).click();
  expect(requests.every(url => new URL(url).origin === "http://127.0.0.1:4174")).toBe(true);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(["demo:retro-save-portability:desktop"]);
});
