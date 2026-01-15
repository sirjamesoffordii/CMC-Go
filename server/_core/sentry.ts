/**
 * Sentry error monitoring initialization
 * Must be imported and initialized before any other modules
 */

import * as Sentry from "@sentry/node";

// Initialize Sentry
export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    console.warn("SENTRY_DSN not configured - error monitoring disabled");
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    release: process.env.SENTRY_RELEASE || undefined,
    // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing.
    // Adjust this in production
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    
    // Optionally capture console errors
    integrations: [
      Sentry.captureConsoleIntegration({ levels: ["error"] }),
    ],
  });

  console.log("Sentry initialized successfully");
}

// Export Sentry for use in error handlers
export { Sentry };
