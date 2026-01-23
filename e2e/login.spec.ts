import { test, expect } from "@playwright/test";

test.describe("Login Page", () => {
  test("should render login form at /login route", async ({ page }) => {
    await page.goto("/login");

    // Check for the main heading
    await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();

    // Check for email input
    await expect(page.getByLabel("Email")).toBeVisible();

    // Check for submit button
    await expect(page.getByRole("button", { name: /Continue/i })).toBeVisible();
  });

  test("should validate email format", async ({ page }) => {
    await page.goto("/login");

    const emailInput = page.getByLabel("Email");
    const submitButton = page.getByRole("button", { name: /Continue/i });

    // Try submitting with empty email
    await submitButton.click();
    await expect(
      page.getByText("Please enter your email address")
    ).toBeVisible();

    // Try submitting with invalid email format
    await emailInput.fill("invalid-email");
    await submitButton.click();
    await expect(
      page.getByText("Please enter a valid email address")
    ).toBeVisible();
  });

  test("should show error for non-existent user", async ({ page }) => {
    await page.goto("/login");

    const emailInput = page.getByLabel("Email");
    const submitButton = page.getByRole("button", { name: /Continue/i });

    // Try logging in with non-existent email
    const testEmail = `nonexistent-${Date.now()}@example.com`;
    await emailInput.fill(testEmail);
    await submitButton.click();

    // Should show error message
    await expect(
      page.getByText(/No account found with this email/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test("should disable submit button while loading", async ({ page }) => {
    await page.goto("/login");

    const emailInput = page.getByLabel("Email");
    const submitButton = page.getByRole("button", { name: /Continue/i });

    // Fill in a valid email
    await emailInput.fill("test@example.com");

    // Click submit
    await submitButton.click();

    // Button should show loading state
    await expect(page.getByRole("button", { name: /Logging in/i })).toBeVisible(
      { timeout: 3000 }
    );
  });
});
