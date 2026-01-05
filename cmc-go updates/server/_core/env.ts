/**
 * Construct DATABASE_URL from Railway MySQL variables if DATABASE_URL is not set
 * Railway provides variables in two formats:
 * - With underscores: MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
 * - Without underscores: MYSQLHOST, MYSQLPORT, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE
 * - Also provides: MYSQL_URL, MYSQL_PUBLIC_URL
 */
function getDatabaseUrl(): string {
  // If DATABASE_URL is explicitly set, use it
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

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

// Log database URL construction for debugging (without exposing password)
if (databaseUrl) {
  const urlObj = new URL(databaseUrl);
  const maskedUrl = `${urlObj.protocol}//${urlObj.username}:***@${urlObj.host}${urlObj.pathname}`;
  console.log(`[ENV] DATABASE_URL constructed: ${maskedUrl}`);
} else {
  console.warn("[ENV] ⚠️  DATABASE_URL is empty! Check environment variables.");
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

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  DATABASE_URL: databaseUrl,
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  corsOrigin: process.env.CORS_ORIGIN ?? "",
};

/**
 * Validate required environment variables before starting the server.
 * Throws an error if any required variables are missing.
 */
export function validateEnv() {
  const required = [
    { key: 'DATABASE_URL', value: ENV.DATABASE_URL },
  ];
  
  const missing = required.filter(({ value }) => !value);
  
  if (missing.length > 0) {
    const missingKeys = missing.map(({ key }) => key).join(', ');
    throw new Error(`Missing required environment variables: ${missingKeys}`);
  }
}
