/**
 * API configuration utilities
 * Centralizes API base URL configuration from environment variables
 */

/**
 * Get the API base URL from environment variable
 * Defaults to "/api" for same-origin requests in local development
 */
export const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_URL?.replace(/\/api\/trpc$/, "") || "/api";
};

/**
 * Get the full tRPC endpoint URL
 * Defaults to "/api/trpc" for same-origin requests
 */
export const getTrpcUrl = (): string => {
  return import.meta.env.VITE_API_URL || "/api/trpc";
};


