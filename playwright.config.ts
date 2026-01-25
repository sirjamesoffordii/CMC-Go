import { defineConfig, devices } from "@playwright/test";

// Skip auto-starting server when SKIP_WEBSERVER is set (for running against existing server)
const skipWebServer = !!process.env.SKIP_WEBSERVER;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  // Provide clear error messages when server is not available
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Only configure webServer when not skipping (default: start server)
  ...(skipWebServer
    ? {}
    : {
        webServer: {
          command: "pnpm dev",
          url: "http://127.0.0.1:3000/readyz",
          timeout: 120_000,
          reuseExistingServer: !process.env.CI,
          // Show server output on failure to help diagnose startup issues
          stdout: "pipe",
          stderr: "pipe",
          env: {
            ...(process.env.DATABASE_URL
              ? { DATABASE_URL: process.env.DATABASE_URL }
              : {}),
            APP_ENV: process.env.APP_ENV || "ci",
            NODE_ENV: process.env.NODE_ENV || "development",
            PORT: "3000",
            STRICT_PORT: "1",
            VITE_SENTRY_RELEASE:
              process.env.VITE_SENTRY_RELEASE ||
              process.env.SENTRY_RELEASE ||
              "",
          },
        },
      }),
});
