import { test, expect } from "@playwright/test";

test("home page renders core navigation", async ({ page }) => {
  await page.goto("/");

  // This button is always rendered in the header and is not dependent on DB data.
  await expect(
    page.getByRole("button", { name: "Why Personal Invitations Matter" })
  ).toBeVisible();
});

test("admin console redirects when unauthenticated", async ({ page }) => {
  await page.goto("/admin");
  // Admin console requires CMC_GO_ADMIN role and redirects to home when not authenticated
  await expect(page).toHaveURL("/", { timeout: 5000 });
});
