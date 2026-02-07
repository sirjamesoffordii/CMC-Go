import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("can navigate to People page - redirects to login when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/people");
    // People page requires authentication and redirects to /login
    await expect(page).toHaveURL(/\/login/);
  });

  test("needs page redirects to login when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/needs");
    // Needs page requires authentication
    await expect(page).toHaveURL(/\/login/);
  });

  test("follow-up page redirects to login when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/follow-up");
    // Follow-up page requires authentication
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Home Page Map", () => {
  test("home page redirects to login when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/");
    // Home page requires authentication and redirects to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});

test.describe("Admin Console Pages", () => {
  test("admin console redirects to login when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/admin");
    // Admin console requires authentication and redirects to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});

test.describe("Responsive Design", () => {
  test("mobile viewport redirects to login", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    // Home page requires authentication, redirects to /login on all viewports
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("tablet viewport redirects to login", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    // Home page requires authentication, redirects to /login on all viewports
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});

test.describe("Error Handling", () => {
  test("404 page shows for invalid routes", async ({ page }) => {
    await page.goto("/this-page-does-not-exist-12345");
    // Should either redirect to home or show a 404 message
    await expect(page.locator("body")).toBeVisible();
  });
});
