import { test, expect } from "@playwright/test";

test.describe("map interactions", () => {
  test("selecting a district opens the district panel", async ({ page }) => {
    await page.goto("/");

    const districtPath = page.locator(
      'path[id="Colorado"], path[inkscape\\:label="Colorado"]'
    );
    await expect(districtPath.first()).toBeAttached();

    await districtPath.first().click({ force: true });

    await expect(page).toHaveURL(/districtId=Colorado/);
    await expect(
      page.getByRole("heading", { name: "Colorado", exact: true })
    ).toBeVisible();
    await expect(page.getByText("Going:").first()).toBeVisible();
  });

  test("people page prompts login and navigates back home", async ({ page }) => {
    await page.goto("/people");

    await expect(
      page.getByText("Please log in to view people.")
    ).toBeVisible();

    await page.getByRole("button", { name: "Go to Home" }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
