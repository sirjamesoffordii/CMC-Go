---
applyTo: "e2e/**/*.ts"
---

# Playwright E2E Test Standards for CMC Go

## Test Structure

- Tests live in `e2e/` directory
- Use descriptive test names: `test('should display district details when clicked')`
- Group related tests with `test.describe()`

## Page Object Pattern

- Create page objects for complex pages
- Keep selectors in page objects, not in tests
- Prefer `data-testid` attributes over CSS selectors

## Locators

```typescript
// Preferred: data-testid
page.getByTestId("district-panel");

// Good: accessible locators
page.getByRole("button", { name: "Save" });
page.getByLabel("Email");
page.getByText("Welcome");

// Avoid: fragile CSS selectors
page.locator(".btn-primary"); // ❌
```

## Assertions

- Use Playwright's built-in assertions
- Prefer `toBeVisible()` over `toBeTruthy()`
- Use `expect(page).toHaveURL()` for navigation checks
- Add meaningful error messages

## Waiting

- Prefer auto-waiting locators over explicit waits
- Use `waitForLoadState('networkidle')` sparingly
- Avoid `page.waitForTimeout()` - use proper locator waits instead

## Test Data

- Use predictable test data
- Clean up test data after tests when needed
- Don't depend on production data state

## Configuration

- Config lives in `playwright.config.ts`
- Tests run with `pnpm e2e`
- Smoke tests: `e2e/smoke.spec.ts`
- Global setup (`e2e/global-setup.ts`) validates server connectivity before tests run

## Server Connectivity

- The `webServer` config in `playwright.config.ts` auto-starts the dev server
- Global setup checks server availability before running tests
- If server is not reachable, tests fail fast with a clear error message
- In CI, `reuseExistingServer` is false, so server always starts fresh
- Locally, `reuseExistingServer` is true, so an existing server can be used

## CI Considerations

- Tests should be deterministic
- Avoid flaky tests with proper waiting
- Screenshot on failure for debugging

## Map-Specific Testing

- Test district selection via SVG path clicks
- Verify panel updates match selected district
- Test zoom and pan interactions
