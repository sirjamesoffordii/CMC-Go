import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
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
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:3000/api/health",
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      ...(process.env.DATABASE_URL ? { DATABASE_URL: process.env.DATABASE_URL } : {}),
      APP_ENV: process.env.APP_ENV || "ci",
      NODE_ENV: process.env.NODE_ENV || "development",
      PORT: "3000",
      STRICT_PORT: "1",
      // Ensure the client tags events with the same release used by CI (if set)
      VITE_SENTRY_RELEASE: process.env.VITE_SENTRY_RELEASE || process.env.SENTRY_RELEASE || "",
    },
  },
});

