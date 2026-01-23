import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Redirect component that handles /__sentry_test paths
 * Prevents these test paths from crashing the app or poisoning history
 */
export function SentryTestRedirect() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // Only redirect in non-production environments
    const isProduction =
      import.meta.env.MODE === "production" || import.meta.env.PROD === true;

    if (isProduction) {
      return; // Don't redirect in production
    }

    // Check if current path starts with /__sentry_test
    if (location.startsWith("/__sentry_test")) {
      // Use replace to avoid poisoning history
      window.location.replace("/");
    }
  }, [location]);

  return null;
}
