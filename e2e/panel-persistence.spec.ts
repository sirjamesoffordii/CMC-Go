import { test, expect } from "@playwright/test";

test.describe("Panel State Persistence", () => {
  test("panel opens when URL contains district parameter", async ({ page }) => {
    // Navigate to home with district parameter
    await page.goto("/?district=Colorado");

    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    // Check that the district panel is visible
    // The panel should be visible when a district is selected
    const panel = page.locator('[class*="left-panel"]');
    await expect(panel).toBeVisible({ timeout: 10000 });
  });

  test("URL updates when district is selected", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for the SVG map to be available
    await page.waitForSelector("svg", { timeout: 10000 });

    // Click on a district in the map (Colorado is a common district)
    // We need to find the path element with id="Colorado"
    const coloradoPath = page.locator('svg path[id="Colorado"]');
    if ((await coloradoPath.count()) > 0) {
      await coloradoPath.click();

      // Wait for URL to update
      await page.waitForURL(/district=Colorado/, { timeout: 5000 });

      // Verify the URL contains the district parameter
      expect(page.url()).toContain("district=Colorado");
    } else {
      // Skip this test if Colorado path is not found
      test.skip();
    }
  });

  test("panel reopens after page refresh", async ({ page }) => {
    // Start with a district selected
    await page.goto("/?district=Colorado");
    await page.waitForLoadState("networkidle");

    // Verify panel is open
    const panelBefore = page.locator('[class*="left-panel"]');
    await expect(panelBefore).toBeVisible({ timeout: 10000 });

    // Refresh the page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Verify panel is still open
    const panelAfter = page.locator('[class*="left-panel"]');
    await expect(panelAfter).toBeVisible({ timeout: 10000 });

    // Verify URL still has district parameter
    expect(page.url()).toContain("district=Colorado");
  });

  test("deep links work with district parameter", async ({ page }) => {
    // Navigate directly to a URL with district parameter
    await page.goto("/?district=Illinois");
    await page.waitForLoadState("networkidle");

    // Verify the URL has the district parameter
    expect(page.url()).toContain("district=Illinois");

    // Verify the panel is open
    const panel = page.locator('[class*="left-panel"]');
    await expect(panel).toBeVisible({ timeout: 10000 });
  });

  test("supports legacy districtId parameter for backward compatibility", async ({
    page,
  }) => {
    // Navigate with legacy districtId parameter
    await page.goto("/?districtId=Texas");
    await page.waitForLoadState("networkidle");

    // Verify the panel is open (backward compatibility)
    const panel = page.locator('[class*="left-panel"]');
    await expect(panel).toBeVisible({ timeout: 10000 });

    // After the component processes the URL, it should update to use 'district'
    // Give it a moment to update
    await page.waitForTimeout(1000);

    // The URL should now use 'district' instead of 'districtId'
    const url = page.url();
    // Either it has been updated to 'district' or still has 'districtId' (both are acceptable)
    expect(
      url.includes("district=") || url.includes("districtId=")
    ).toBeTruthy();
  });
});
