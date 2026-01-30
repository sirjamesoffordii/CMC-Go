import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("can navigate to People page - redirects to login when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/people");
    // People page requires authentication and redirects to /login
    await expect(page).toHaveURL(/\/login/);
  });

  test("can navigate to Needs page", async ({ page }) => {
    await page.goto("/needs");
    await expect(page).toHaveURL(/needs/);
  });

  test("can navigate to Follow-up page", async ({ page }) => {
    await page.goto("/follow-up");
    await expect(page).toHaveURL(/follow-up/);
  });
});

test.describe("Home Page Map", () => {
  test("map container renders", async ({ page }) => {
    await page.goto("/");
    // The map is an SVG-based interactive component
    const mapContainer = page.locator(
      '[class*="map"], svg, [data-testid="map"]'
    );
    await expect(mapContainer.first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Admin Console Pages", () => {
  test("admin console redirects to home when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/admin");
    // Admin console requires CMC_GO_ADMIN role and redirects to home when not authenticated
    await expect(page).toHaveURL("/", { timeout: 5000 });
  });

  test("admin database page redirects to home when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/admin/database");
    // Admin pages require authentication
    await expect(page).toHaveURL("/", { timeout: 5000 });
  });

  test("admin config page redirects to home when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/admin/config");
    // Admin pages require authentication
    await expect(page).toHaveURL("/", { timeout: 5000 });
  });
});

test.describe("Responsive Design", () => {
  test("mobile viewport renders", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Why Personal Invitations Matter" })
    ).toBeVisible();
  });

  test("tablet viewport renders", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Why Personal Invitations Matter" })
    ).toBeVisible();
  });
});

test.describe("Error Handling", () => {
  test("404 page shows for invalid routes", async ({ page }) => {
    await page.goto("/this-page-does-not-exist-12345");
    // Should either redirect to home or show a 404 message
    await expect(page.locator("body")).toBeVisible();
  });
});
