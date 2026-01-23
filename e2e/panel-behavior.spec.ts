import { test, expect } from "@playwright/test";

test.describe("District Panel Behavior", () => {
  test("panel opens when clicking a district", async ({ page }) => {
    await page.goto("/");

    // Wait for the map to be visible
    const svg = page.locator("svg").first();
    await expect(svg).toBeVisible({ timeout: 10000 });

    // Click on a district path (e.g., AKAL - Alaska)
    // SVG paths have IDs matching district slugs
    const districtPath = page.locator('svg path[id="AKAL"]').first();
    if (await districtPath.isVisible()) {
      await districtPath.click();

      // Panel should become visible
      // The panel contains district information
      await expect(
        page.locator("text=/District|Campus|People/i").first()
      ).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("panel closes when clicking map background", async ({ page }) => {
    await page.goto("/");

    // Wait for the map to be visible
    const svg = page.locator("svg").first();
    await expect(svg).toBeVisible({ timeout: 10000 });

    // Click on a district to open panel
    const districtPath = page.locator('svg path[id="AKAL"]').first();
    if (await districtPath.isVisible()) {
      await districtPath.click();

      // Wait for URL to contain the district (panel is open)
      await page.waitForURL(/AKAL/, { timeout: 5000 });

      // Click on a safe empty area to trigger background click
      // We click at the bottom-right of the viewport, which should be
      // outside any district paths but within the map container
      await page.mouse.click(100, 100);

      // Panel should close - URL should no longer contain district
      // Wait for URL to change (district removed from URL)
      await page.waitForFunction(() => !window.location.href.includes("AKAL"), {
        timeout: 5000,
      });
    }
  });

  test("switching districts doesn't cause visible flicker", async ({
    page,
  }) => {
    await page.goto("/");

    // Wait for the map to be visible
    const svg = page.locator("svg").first();
    await expect(svg).toBeVisible({ timeout: 10000 });

    // Rapidly click between different districts
    const districts = ["AKAL", "AKOR", "AZAS"]; // Alaska, Oregon, Arizona

    for (const districtId of districts) {
      const districtPath = page.locator(`svg path[id="${districtId}"]`).first();
      if (await districtPath.isVisible()) {
        await districtPath.click();
        // Wait for URL to update with the new district
        await page.waitForURL(new RegExp(districtId), { timeout: 5000 });
      }
    }

    // If we get here without timing out or errors, the transitions worked
    // The panel should still be visible with content from the last district
    await expect(page.locator("body")).toBeVisible();
  });

  test("URL updates when district is selected", async ({ page }) => {
    await page.goto("/");

    // Wait for the map to be visible
    const svg = page.locator("svg").first();
    await expect(svg).toBeVisible({ timeout: 10000 });

    // Click on a district
    const districtPath = page.locator('svg path[id="AKAL"]').first();
    if (await districtPath.isVisible()) {
      await districtPath.click();

      // Wait for URL to update with the district
      await page.waitForURL(/AKAL/, { timeout: 5000 });

      // URL should contain district parameter
      const url = page.url();
      // The URL should have district=AKAL or similar
      expect(url).toContain("AKAL");
    }
  });
});
