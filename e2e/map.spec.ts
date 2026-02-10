import { test, expect } from "@playwright/test";

test.describe("map interactions", () => {
  test("selecting a district opens the district panel", async ({ page }) => {
    await page.goto("/");

    // Home is protected; log in first.
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    await page.locator("#login-email").fill("Admin@cmcgo.app");
    await page.locator("#login-password").fill("Admin1234");

    const loginResponsePromise = page.waitForResponse(response => {
      return (
        response.request().method() === "POST" &&
        response.url().includes("/api/trpc/auth.login")
      );
    });
    await page.getByRole("button", { name: "Sign In" }).click();

    const loginResponse = await loginResponsePromise;
    expect(loginResponse.ok()).toBeTruthy();

    // Ensure the session cookie is present, then navigate to home.
    const cookies = await page.context().cookies();
    expect(cookies.some(c => c.name === "app_session_id")).toBeTruthy();

    await page.goto("/");

    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    const districtPath = page.locator(
      'path[id="Colorado"], path[inkscape\\:label="Colorado"]'
    );
    await expect(districtPath.first()).toBeAttached({ timeout: 10_000 });

    await districtPath.first().click({ force: true });

    await expect(page).toHaveURL(/districtId=Colorado/);
    await expect(
      page.getByRole("heading", { name: "Colorado", exact: true })
    ).toBeVisible();
  });

  test("people page redirects to login when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/people");

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/);
  });
});
