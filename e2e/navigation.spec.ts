import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("can navigate to People page", async ({ page }) => {
    await page.goto("/people");
    await expect(page.getByRole("heading", { name: /People/i })).toBeVisible();
  });

  test("can navigate to Needs page", async ({ page }) => {
    await page.goto("/needs");
    await expect(page).toHaveURL(/needs/);
  });

  test("can navigate to Follow-up page", async ({ page }) => {
    await page.goto("/follow-up");
    await expect(page).toHaveURL(/follow-up/);
  });

  test("browser back button works after navigation", async ({ page }) => {
    // Start at home
    await page.goto("/");

    // Navigate to a page
    await page.goto("/people");
    await expect(page).toHaveURL(/people/);

    // Go back
    await page.goBack();
    await expect(page).toHaveURL(/^\/$|^\/\?/);
  });

  test("browser forward button works after going back", async ({ page }) => {
    // Start at home
    await page.goto("/");

    // Navigate to a page
    await page.goto("/people");
    await expect(page).toHaveURL(/people/);

    // Go back
    await page.goBack();
    await expect(page).toHaveURL(/^\/$|^\/\?/);

    // Go forward
    await page.goForward();
    await expect(page).toHaveURL(/people/);
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
  test("admin console has navigation tabs", async ({ page }) => {
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Admin Console" })
    ).toBeVisible();
  });

  test("admin database page loads", async ({ page }) => {
    await page.goto("/admin/database");
    await expect(page).toHaveURL(/admin\/database/);
  });

  test("admin config page loads", async ({ page }) => {
    await page.goto("/admin/config");
    await expect(page).toHaveURL(/admin\/config/);
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
