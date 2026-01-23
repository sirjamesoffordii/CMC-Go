/**
 * Environment Contract for Database URLs:
 *
 * - DATABASE_URL: Primary database connection (local dev or production)
 *   - Production: Used exactly as provided (no rewrites)
 *   - Local dev: Automatically rewrites Railway internal host to public proxy
 *     * mysql-uqki.railway.internal → shortline.proxy.rlwy.net:56109
 *     * Preserves username, password, database name
 *     * Only rewrites if host includes 'railway.internal'
 *     * Never rewrites if already using proxy.rlwy.net
 *
 * - STAGING_DATABASE_URL: Railway staging database (dev-only convenience)
 *   - ONLY used in non-production environments
 *   - NEVER checked in production (safety guarantee)
 *
 * - Railway auto-provided variables (fallback):
 *   - MYSQL_URL, MYSQL_PUBLIC_URL (Railway's connection strings)
 *   - MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
 *   - MYSQLHOST, MYSQLPORT, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE
 *
 * Precedence:
 * 1. DATABASE_URL (explicit, always respected)
 * 2. STAGING_DATABASE_URL (only if not production - NEVER in production)
 * 3. Railway auto-provided variables (MYSQL_URL, etc.)
 *
 * Automatic Rewrite Rules (local dev only):
 * - If DATABASE_URL host includes 'railway.internal', rewrite to public proxy
 * - Railway staging deployment continues using internal host (NODE_ENV=production)
 * - Local dev automatically uses public proxy (NODE_ENV !== 'production')
 */
import "dotenv/config";

function getDatabaseUrl(): string {
  const isProduction = process.env.NODE_ENV === "production";

  // 1. DATABASE_URL is always the primary source (explicit override)
  // In production, use exactly as provided (no rewrites)
  if (process.env.DATABASE_URL) {
    let url = process.env.DATABASE_URL;

    // Automatic rewrite for local dev: Railway internal → public proxy + credential replacement
    // Safety: Never rewrite in production
    if (!isProduction) {
      try {
        const urlObj = new URL(url);
        let hostname = urlObj.hostname.toLowerCase();
        let isUsingProxy = hostname.includes("proxy.rlwy.net");
        let wasRewritten = false;

        // Check if host includes railway.internal (but not already using proxy)
        if (hostname.includes("railway.internal") && !isUsingProxy) {
          // Rewrite: mysql-uqki.railway.internal → shortline.proxy.rlwy.net:56109
          urlObj.hostname = "shortline.proxy.rlwy.net";
          urlObj.port = "56109";
          isUsingProxy = true;
          wasRewritten = true;
          hostname = urlObj.hostname.toLowerCase(); // Update hostname after rewrite
        }

        // If using public proxy in local dev, enforce non-root user
        // Check username after any host rewrite
        const username = urlObj.username;
        if (isUsingProxy && username === "root") {
          if (process.env.DEMO_DB_ALLOW_ROOT === "true") {
            console.warn("[ENV] Using root via public proxy (dev only).");
          } else {
            // Replace root with demo user (cmc_go) if credentials are provided
            const demoUser = process.env.DEMO_DB_USER || "cmc_go";
            const demoPassword = process.env.DEMO_DB_PASSWORD;

            if (demoUser && demoPassword) {
              // Auto-swap root -> demo user for zero-friction setup
              urlObj.username = demoUser;
              urlObj.password = demoPassword;
              console.log(
                `[ENV] Swapped root -> ${demoUser} for proxy connection (dev only)`
              );
            } else {
              // Missing credentials - provide helpful error with copy/paste lines
              throw new Error(
                "Local dev is configured to use root via proxy. Root is blocked.\n\n" +
                  "Option 1 (Recommended): Update DATABASE_URL to use cmc_go user:\n" +
                  "  DATABASE_URL=mysql://cmc_go:<password>@shortline.proxy.rlwy.net:56109/railway\n\n" +
                  "Option 2: Add these to your .env file to auto-swap root -> cmc_go:\n" +
                  "  DEMO_DB_USER=cmc_go\n" +
                  "  DEMO_DB_PASSWORD=<your_cmc_go_password>\n\n" +
                  "Option 3 (Dev only, not recommended):\n" +
                  "  DEMO_DB_ALLOW_ROOT=true"
              );
            }
          }
        }

        // Update url string after all rewrites
        url = urlObj.toString();

        // Log connection details (dev only, never credentials)
        if (wasRewritten || isUsingProxy) {
          console.log(`[ENV] DB host: ${urlObj.hostname}`);
          console.log(
            `[ENV] Connection path: ${isUsingProxy ? "PUBLIC PROXY" : "INTERNAL"}`
          );
          console.log(`[ENV] DB user: ${urlObj.username}`);
        }
      } catch (error) {
        // If it's our credential error, re-throw it
        if (
          error instanceof Error &&
          error.message.includes("Root is blocked")
        ) {
          throw error;
        }
        // If URL parsing fails, use original (safety fallback)
        // This should not happen with valid DATABASE_URL, but we don't want to break startup
      }
    }

    return url;
  }

  // 2. STAGING_DATABASE_URL is a dev-only convenience (NEVER in production)
  // This allows local dev to temporarily point to staging without changing DATABASE_URL
  // Production safety: This block is skipped when isProduction is true
  if (!isProduction && process.env.STAGING_DATABASE_URL) {
    return process.env.STAGING_DATABASE_URL;
  }

  // 3. Railway auto-provided variables (fallback for Railway deployments)
  // Try MYSQL_URL first (Railway provides this and it's the most reliable)
  if (process.env.MYSQL_URL) {
    return process.env.MYSQL_URL;
  }

  // Try MYSQL_PUBLIC_URL (Railway's public-facing connection string)
  if (process.env.MYSQL_PUBLIC_URL) {
    return process.env.MYSQL_PUBLIC_URL;
  }

  // Try to construct from Railway MySQL variables (with underscores)
  let host = process.env.MYSQL_HOST;
  let port = process.env.MYSQL_PORT || "3306";
  let user = process.env.MYSQL_USER;
  let password = process.env.MYSQL_PASSWORD;
  let database = process.env.MYSQL_DATABASE;

  // If not found, try Railway's format without underscores
  if (!host) host = process.env.MYSQLHOST;
  if (!port || port === "3306") port = process.env.MYSQLPORT || "3306";
  if (!user) user = process.env.MYSQLUSER;
  if (!password) password = process.env.MYSQLPASSWORD;
  if (!database) database = process.env.MYSQLDATABASE;

  if (host && user && password && database) {
    // Encode password in case it contains special characters
    const encodedPassword = encodeURIComponent(password);
    return `mysql://${user}:${encodedPassword}@${host}:${port}/${database}`;
  }

  return "";
}

const databaseUrl = getDatabaseUrl();

/**
 * Helper to extract database connection info (host/db only, never password)
 * Safe to log in development - never exposes credentials
 */
export function getDatabaseInfo() {
  if (!databaseUrl) {
    return {
      host: null,
      database: null,
      isDemoDb: false,
      connectionPath: null,
    };
  }

  try {
    const urlObj = new URL(databaseUrl);
    const host = urlObj.hostname;
    const database = urlObj.pathname.slice(1); // Remove leading /

    // Check if connected to Railway demo DB
    const isDemoDb =
      host.includes("railway.internal") ||
      host.includes("proxy.rlwy.net") ||
      host.includes("up.railway.app") ||
      host.includes("railway.app");

    // Determine connection path (internal vs proxy)
    let connectionPath: "internal" | "proxy" | null = null;
    if (isDemoDb) {
      if (host.includes("railway.internal")) {
        connectionPath = "internal";
      } else if (host.includes("proxy.rlwy.net")) {
        connectionPath = "proxy";
      }
    }

    return { host, database, isDemoDb, connectionPath };
  } catch (error) {
    return {
      host: null,
      database: null,
      isDemoDb: false,
      connectionPath: null,
    };
  }
}

// Log database URL construction for debugging (without exposing password)
// Only log in development to avoid noise in production
// Note: Connection details are already logged in getDatabaseUrl() for proxy connections
if (!process.env.NODE_ENV || process.env.NODE_ENV !== "production") {
  if (databaseUrl) {
    const dbInfo = getDatabaseInfo();
    if (dbInfo.host && dbInfo.database) {
      // Only log if not already logged by getDatabaseUrl() (for non-proxy connections)
      if (
        !dbInfo.host.includes("proxy.rlwy.net") &&
        !dbInfo.host.includes("railway.internal")
      ) {
        console.log(`[ENV] Database: ${dbInfo.database} @ ${dbInfo.host}`);
        try {
          const urlObj = new URL(databaseUrl);
          console.log(`[ENV] DB user: ${urlObj.username}`);
        } catch {
          // Ignore parsing errors
        }
      }
      if (dbInfo.isDemoDb) {
        console.log(
          `[ENV] ⚠️  Connected to Railway staging demo DB (shared with staging website)`
        );
      }
    } else {
      const urlObj = new URL(databaseUrl);
      const maskedUrl = `${urlObj.protocol}//${urlObj.username}:***@${urlObj.host}${urlObj.pathname}`;
      console.log(`[ENV] DATABASE_URL constructed: ${maskedUrl}`);
    }
  } else {
    console.warn(
      "[ENV] ⚠️  DATABASE_URL is empty! Check environment variables."
    );
    console.warn("[ENV] Available MySQL variables:", {
      MYSQL_URL: process.env.MYSQL_URL ? "✓" : "✗",
      MYSQL_PUBLIC_URL: process.env.MYSQL_PUBLIC_URL ? "✓" : "✗",
      MYSQL_HOST: process.env.MYSQL_HOST ? "✓" : "✗",
      MYSQLHOST: process.env.MYSQLHOST ? "✓" : "✗",
      MYSQL_USER: process.env.MYSQL_USER ? "✓" : "✗",
      MYSQLUSER: process.env.MYSQLUSER ? "✓" : "✗",
      MYSQL_DATABASE: process.env.MYSQL_DATABASE ? "✓" : "✗",
      MYSQLDATABASE: process.env.MYSQLDATABASE ? "✓" : "✗",
    });
  }
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  SESSION_SECRET: process.env.SESSION_SECRET ?? "",
  DATABASE_URL: databaseUrl,
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  corsOrigin: process.env.CORS_ORIGIN ?? "",
  // Dev-only: bypass auth requirements in local development when set
  devBypassAuth:
    (
      process.env.VITE_DEV_BYPASS_AUTH ??
      process.env.DEV_BYPASS_AUTH ??
      ""
    ).toLowerCase() === "true" && process.env.NODE_ENV === "development",
};

/**
 * Validate required environment variables before starting the server.
 * Throws an error if any required variables are missing.
 */
export function validateEnv() {
  // In production we require DB connectivity at startup.
  // In development, we allow starting without DB/auth so UI work isn't blocked.
  const requiredInProd = [
    { key: "DATABASE_URL", value: ENV.DATABASE_URL },
    { key: "SESSION_SECRET", value: ENV.SESSION_SECRET },
  ];
  if (ENV.isProduction) {
    const missing = requiredInProd.filter(({ value }) => !value);
    if (missing.length > 0) {
      const missingKeys = missing.map(({ key }) => key).join(", ");
      throw new Error(`Missing required environment variables: ${missingKeys}`);
    }

    // Security: Ensure SESSION_SECRET is not using the default value in production
    if (ENV.SESSION_SECRET === "change-me-in-production") {
      throw new Error(
        "SESSION_SECRET must be changed from default value in production"
      );
    }
  }
}
