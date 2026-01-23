import { test, expect } from "@playwright/test";

test.describe("Responsive Layout", () => {
  test("layout works at 375px width (iPhone SE)", async ({ page }) => {
    // Set viewport to iPhone SE dimensions
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Check that the page doesn't have horizontal scroll
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth
    );
    const clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth
    );
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // Check that hamburger menu is visible on mobile
    const menuButton = page
      .locator("button")
      .filter({ hasText: /menu/i })
      .or(
        page
          .locator("button")
          .filter({ has: page.locator('svg[class*="lucide-menu"]') })
      );
    await expect(menuButton.first()).toBeVisible();

    // Check that "Why Personal Invitations Matter" button is hidden on mobile
    const whyButton = page.getByRole("button", {
      name: "Why Personal Invitations Matter",
    });
    await expect(whyButton).toBeHidden();
  });

  test("layout works at 768px width (tablet)", async ({ page }) => {
    // Set viewport to tablet dimensions
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");

    // Check that the page doesn't have horizontal scroll
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth
    );
    const clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth
    );
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test("map is visible on mobile", async ({ page }) => {
    // Set viewport to mobile dimensions
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Wait for map SVG to load
    const mapSvg = page.locator("svg").first();
    await expect(mapSvg).toBeVisible();
  });
});
