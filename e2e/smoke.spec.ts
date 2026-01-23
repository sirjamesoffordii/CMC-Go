import { test, expect } from "@playwright/test";

test("home page renders core navigation", async ({ page }) => {
  await page.goto("/");

  // The "Why Personal Invitations Matter" button is hidden on mobile (< 768px) but visible on desktop
  // Check that the hamburger menu is always visible
  const menuButton = page
    .getByRole("button")
    .filter({ has: page.locator("svg") })
    .first();
  await expect(menuButton).toBeVisible();
});

test("admin console loads", async ({ page }) => {
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Admin Console" })
  ).toBeVisible();
});
