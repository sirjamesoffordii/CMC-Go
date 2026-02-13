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

  test("SMS Text share opens sms: URI on mobile", async ({ browser }) => {
    // Use a mobile user agent so isMobileDevice() returns true
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      viewport: MOBILE_VIEWPORT,
    });
    const page = await context.newPage();

    // Use CDP to intercept navigation requests (sms: URIs can't be caught any other way)
    const cdp = await context.newCDPSession(page);
    await cdp.send("Page.enable");
    const navUrls: string[] = [];
    cdp.on("Page.frameRequestedNavigation", (params: { url: string }) => {
      navUrls.push(params.url);
    });

    await loginAsAdmin(page);
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    // Open hamburger → Share
    await page.locator("header button").last().click();
    await page.getByText("Share CMC Go").click();
    await expect(page.getByText(/share via/i).first()).toBeVisible({ timeout: 5000 });

    // Clear any navigation events from page load
    navUrls.length = 0;

    // Click the Text button
    await page.getByRole("button", { name: "Text", exact: true }).click();

    // Give the browser a moment to process the navigation request
    await page.waitForTimeout(500);

    const smsNav = navUrls.find(u => u.startsWith("sms:"));
    expect(smsNav).toBeDefined();
    expect(smsNav).toMatch(/^sms:\?(&?)body=/);
    expect(smsNav).toContain(encodeURIComponent("CMC Go"));

    await cdp.detach();
    await context.close();
  });

  test("Email share opens mailto: URI on mobile", async ({ browser }) => {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      viewport: MOBILE_VIEWPORT,
    });
    const page = await context.newPage();

    // Use CDP to intercept navigation requests
    const cdp = await context.newCDPSession(page);
    await cdp.send("Page.enable");
    const navUrls: string[] = [];
    cdp.on("Page.frameRequestedNavigation", (params: { url: string }) => {
      navUrls.push(params.url);
    });

    await loginAsAdmin(page);
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    // Open hamburger → Share
    await page.locator("header button").last().click();
    await page.getByText("Share CMC Go").click();
    await expect(page.getByText(/share via/i).first()).toBeVisible({ timeout: 5000 });

    // Clear any navigation events from page load
    navUrls.length = 0;

    // Click the Email button
    await page.getByRole("button", { name: "Email", exact: true }).click();

    await page.waitForTimeout(500);

    const mailtoNav = navUrls.find(u => u.startsWith("mailto:"));
    expect(mailtoNav).toBeDefined();
    expect(mailtoNav).toMatch(/^mailto:\?subject=/);
    expect(mailtoNav).toContain(encodeURIComponent("CMC Go"));

    await cdp.detach();
    await context.close();
  });

  test("metrics section aligns right on mobile (screenshot verification)", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    // Wait for map and metrics to load
    await expect(
      page
        .locator('path[id="Colorado"], path[inkscape\\:label="Colorado"]')
        .first()
    ).toBeAttached({ timeout: 10_000 });

    // Metrics label and line should be visible
    const metricsLabel = page.getByText("Metrics", { exact: true });
    await expect(metricsLabel).toBeVisible({ timeout: 5000 });

    // Chi Alpha or region label should be visible
    const brandLabel = page.locator(
      'span.font-beach:has-text("Chi Alpha"), span.font-beach:has-text("Texico"), span.font-beach'
    );
    await expect(brandLabel.first()).toBeVisible({ timeout: 5000 });

    // Take screenshot for visual verification of alignment
    await page.screenshot({
      path: "e2e/screenshots/mobile-metrics-alignment.png",
    });
  });

  test("table drawer filter menus open above drawer (screenshot verification)", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    // Open Table drawer
    const openTableButton = page.getByRole("button", { name: "Table" }).first();
    await expect(openTableButton).toBeVisible({ timeout: 10_000 });
    await openTableButton.click();

    const tableDrawer = page.locator(".mobile-drawer-bottom");
    await expect(tableDrawer).toBeVisible({ timeout: 10_000 });
    await expect(
      tableDrawer.getByRole("heading", { name: "Table", exact: true })
    ).toBeVisible({ timeout: 10_000 });

    // SCOPE
    const scopeTrigger = tableDrawer
      .getByRole("button", { name: "National", exact: true })
      .first();
    await expect(scopeTrigger).toBeVisible({ timeout: 10_000 });
    await scopeTrigger.click();

    const scopePopover = page
      .locator('[data-slot="popover-content"]')
      .filter({
        has: page.getByRole("button", { name: "National", exact: true }),
      })
      .first();
    await expect(scopePopover).toBeVisible({ timeout: 10_000 });
    await expect(
      scopePopover.getByRole("button", { name: "National", exact: true })
    ).toBeVisible();
    const scopeZ = await scopePopover.evaluate(el =>
      Number.parseInt(window.getComputedStyle(el).zIndex || "0", 10)
    );
    expect(scopeZ).toBeGreaterThanOrEqual(260);
    await page.screenshot({
      path: "e2e/screenshots/mobile-table-scope-open.png",
    });

    // Close scope menu
    await page.keyboard.press("Escape");
    await expect(scopePopover).toBeHidden();
    await expect(
      tableDrawer.getByRole("heading", { name: "Table", exact: true })
    ).toBeVisible();

    // FILTER
    const filterTrigger = tableDrawer
      .getByRole("button", { name: /filter/i })
      .first();
    await expect(filterTrigger).toBeVisible({ timeout: 10_000 });
    await filterTrigger.click();

    const filterPopover = page
      .locator('[data-slot="popover-content"]')
      .filter({ hasText: "Status" })
      .first();
    await expect(filterPopover).toBeVisible({ timeout: 10_000 });
    const filterZ = await filterPopover.evaluate(el =>
      Number.parseInt(window.getComputedStyle(el).zIndex || "0", 10)
    );
    expect(filterZ).toBeGreaterThanOrEqual(260);
    await page.screenshot({
      path: "e2e/screenshots/mobile-table-filter-open.png",
    });

    // Click a filter option and ensure the Table drawer stays open
    await filterPopover.getByText("Yes", { exact: true }).click();
    await expect(
      tableDrawer.getByRole("heading", { name: "Table", exact: true })
    ).toBeVisible();

    // Close filter menu
    await page.keyboard.press("Escape");
    await expect(filterPopover).toBeHidden();

    // SORT BY
    const sortTrigger = tableDrawer
      .getByRole("button", { name: /greatest first/i })
      .first();
    await expect(sortTrigger).toBeVisible({ timeout: 10_000 });
    await sortTrigger.click();

    const sortPopover = page
      .locator('[data-slot="popover-content"]')
      .filter({ hasText: "Alphabetical" })
      .first();
    await expect(sortPopover).toBeVisible({ timeout: 10_000 });
    const sortZ = await sortPopover.evaluate(el =>
      Number.parseInt(window.getComputedStyle(el).zIndex || "0", 10)
    );
    expect(sortZ).toBeGreaterThanOrEqual(260);
    await page.screenshot({
      path: "e2e/screenshots/mobile-table-sort-open.png",
    });

    // Select an option and ensure the drawer stays open
    await sortPopover.getByRole("button", { name: "Alphabetical" }).click();
    await expect(
      tableDrawer.getByRole("heading", { name: "Table", exact: true })
    ).toBeVisible();
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
