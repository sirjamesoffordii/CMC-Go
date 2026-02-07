import { test, expect } from "@playwright/test";

test("home page redirects to login when unauthenticated", async ({ page }) => {
  await page.goto("/");

  // Home page requires authentication and redirects to /login
  await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
});

test("admin console redirects when unauthenticated", async ({ page }) => {
  await page.goto("/admin");
  // Admin console requires authentication and redirects to login when not authenticated
  await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
});
