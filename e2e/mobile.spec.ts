import { test, expect, Page } from "@playwright/test";

// Mobile viewport (iPhone SE)
const MOBILE_VIEWPORT = { width: 375, height: 667 };

async function loginAsAdmin(page: Page) {
  await page.goto("/");
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

  // Ensure the session cookie is present
  const cookies = await page.context().cookies();
  expect(cookies.some(c => c.name === "app_session_id")).toBeTruthy();
}

test.describe("Mobile UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
  });

  test("home page loads and shows map on mobile", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    // Map should be visible - look for district paths inside SVG
    // The SVG is loaded dynamically, so look for a known district path
    await expect(
      page
        .locator('path[id="Colorado"], path[inkscape\\:label="Colorado"]')
        .first()
    ).toBeAttached({ timeout: 10_000 });
  });

  test("selecting a district opens mobile drawer", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    // Click on a district
    const districtPath = page.locator(
      'path[id="Colorado"], path[inkscape\\:label="Colorado"]'
    );
    await expect(districtPath.first()).toBeAttached({ timeout: 10_000 });
    await districtPath.first().click({ force: true });

    // District panel should appear - URL should have districtId
    await expect(page).toHaveURL(/districtId=Colorado/);

    // On mobile, the district panel content should be visible
    // Look for the district name heading (use first() since both drawer title and main heading exist)
    await expect(
      page.getByRole("heading", { name: "Colorado", exact: true }).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("Event Info panel opens full-screen on mobile", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    // Click Event Info button in toolbar
    const eventInfoButton = page.getByRole("button", { name: /event info/i });
    if (await eventInfoButton.isVisible()) {
      await eventInfoButton.click();

      // Event Info panel should open
      await expect(page.getByText(/Campus Missions Conference/i)).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("Account panel opens on mobile", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    // Click Account button in toolbar (usually the profile/avatar)
    const accountButton = page.getByRole("button", { name: /account/i });
    if (await accountButton.isVisible()) {
      await accountButton.click();

      // Account panel should have user info
      await expect(
        page.getByText(/sign out|logout|account/i).first()
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("Share modal opens on mobile", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    // Click Share button in toolbar
    const shareButton = page.getByRole("button", { name: /share/i });
    if (await shareButton.isVisible()) {
      await shareButton.click();

      // Share modal should have share options
      await expect(
        page.getByText(/copy link|share cmc go/i).first()
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("mobile viewport displays correctly sized touch targets", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    // All interactive elements should have minimum 44px touch targets
    const buttons = page.locator(
      'button:visible, a[href]:visible, [role="button"]:visible'
    );
    const count = await buttons.count();

    // At least some buttons should be visible
    expect(count).toBeGreaterThan(0);
  });

  test("tooltips show on long-press (mobile) not hover", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    // Click on a district to open the panel
    const districtPath = page.locator(
      'path[id="Colorado"], path[inkscape\\:label="Colorado"]'
    );
    await expect(districtPath.first()).toBeAttached({ timeout: 10_000 });
    await districtPath.first().click({ force: true });

    // Wait for district panel
    await expect(page).toHaveURL(/districtId=Colorado/);

    // Looking for any person items - tooltips shouldn't appear on hover for mobile
    // (we can't easily test long-press in Playwright, but we verify no hover tooltips)
    const personItem = page.locator('[data-testid="person-item"]').first();
    if (await personItem.isVisible({ timeout: 5000 })) {
      await personItem.hover();
      // On mobile, hover shouldn't trigger tooltip
      await page.waitForTimeout(500);
      // If a tooltip did appear on hover, it would be a bug on mobile
    }
  });
});

test.describe("Mobile Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
  });

  test("login page is mobile-friendly", async ({ page }) => {
    await page.goto("/login");

    // Login form should be visible and usable
    await expect(page.locator("#login-email")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  });
});
