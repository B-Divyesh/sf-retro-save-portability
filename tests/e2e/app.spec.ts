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
