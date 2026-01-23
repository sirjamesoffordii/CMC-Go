import { chromium, type FullConfig } from "@playwright/test";

/**
 * Global setup for Playwright tests.
 * Validates that the server is reachable before running any tests.
 * Fails fast with a clear error message if the server is not available.
 */
async function globalSetup(config: FullConfig) {
  // Try multiple places where baseURL might be configured
  const baseURL =
    config.use?.baseURL ||
    config.projects[0]?.use?.baseURL ||
    "http://127.0.0.1:3000";
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second

  console.log(`\n🔍 Checking server availability at ${baseURL}...`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const browser = await chromium.launch();
      const context = await browser.newContext();
      const page = await context.newPage();

      // Try to reach the readyz endpoint with a short timeout
      const response = await page.goto(`${baseURL}/readyz`, {
        timeout: 5000,
        waitUntil: "domcontentloaded",
      });

      await browser.close();

      if (response && response.ok()) {
        console.log(`✅ Server is ready at ${baseURL}\n`);
        return;
      } else {
        throw new Error(
          `Server responded with status ${response?.status() || "unknown"}`
        );
      }
    } catch (error) {
      if (attempt < maxRetries) {
        console.log(
          `⏳ Attempt ${attempt}/${maxRetries} failed, retrying in ${retryDelay}ms...`
        );
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }

      // Final attempt failed - provide clear error message
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      console.error(`\n❌ Server not reachable at ${baseURL}`);
      console.error(`   Error: ${errorMessage}\n`);
      console.error(`💡 To fix this issue:`);
      console.error(`   1. Start the development server: pnpm dev`);
      console.error(
        `   2. Wait for the server to be ready (check for "ready" message)`
      );
      console.error(`   3. Run the tests again: pnpm e2e\n`);
      console.error(
        `   Or let Playwright auto-start the server (default in CI):\n`
      );
      console.error(
        `   The webServer config in playwright.config.ts will handle this automatically.\n`
      );

      throw new Error(
        `Server not running at ${baseURL}. Please start the server with 'pnpm dev' before running tests.`
      );
    }
  }
}

export default globalSetup;
