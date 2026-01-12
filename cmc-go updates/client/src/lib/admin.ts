/**
 * Admin access control helper
 * 
 * This is a temporary implementation using env vars and localStorage.
 * Replace with real auth when authentication is implemented.
 */

/**
 * Check if the current user has admin access
 * 
 * Checks in order:
 * 1. VITE_ADMIN_ENABLED env var (must be "true")
 * 2. localStorage flag "cmc_admin" (must be "true")
 * 
 * Default: NOT admin
 */
export function isAdmin(): boolean {
  // Check env var first
  const envAdmin = import.meta.env.VITE_ADMIN_ENABLED === "true";
  if (envAdmin) {
    return true;
  }
  
  // Check localStorage
  const localStorageAdmin = typeof window !== "undefined" && localStorage.getItem("cmc_admin") === "true";
  if (localStorageAdmin) {
    return true;
  }
  
  return false;
}

/**
 * Set admin access in localStorage
 * Useful for development/testing
 */
export function setAdminAccess(enabled: boolean): void {
  if (typeof window === "undefined") return;
  
  if (enabled) {
    localStorage.setItem("cmc_admin", "true");
  } else {
    localStorage.removeItem("cmc_admin");
  }
}


