import { test, expect } from "@playwright/test";

test("playwright harness basic navigation", async ({ page }) => {
  await page.goto("https://example.com", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle(/Example Domain/);
});
