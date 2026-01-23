import { test, expect } from "@playwright/test";

test("home page renders core navigation", async ({ page }) => {
  await page.goto("/");

  // This button is always rendered in the header and is not dependent on DB data.
  await expect(
    page.getByRole("button", { name: "Why Personal Invitations Matter" })
  ).toBeVisible();
});

test("admin console loads", async ({ page }) => {
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Admin Console" })
  ).toBeVisible();
});
