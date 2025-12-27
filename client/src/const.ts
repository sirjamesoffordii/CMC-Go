export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  try {
    const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
    const appId = import.meta.env.VITE_APP_ID;
    
    // Safe defaults for local development - check for truthy and non-empty strings
    if (!oauthPortalUrl || !appId || typeof oauthPortalUrl !== 'string' || typeof appId !== 'string' || oauthPortalUrl.trim() === '' || appId.trim() === '') {
      console.warn('[getLoginUrl] Missing OAuth env vars. Using fallback login URL.');
      // Return a safe fallback that won't crash but will show an error
      return `${window.location.origin}/api/oauth/callback?error=missing_config`;
    }
    
    const redirectUri = `${window.location.origin}/api/oauth/callback`;
    const state = btoa(redirectUri);

    const url = new URL(`${oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");

    return url.toString();
  } catch (error) {
    console.error('[getLoginUrl] Error constructing login URL:', error);
    // Return a safe fallback on any error
    return `${window.location.origin}/api/oauth/callback?error=config_error`;
  }
};
