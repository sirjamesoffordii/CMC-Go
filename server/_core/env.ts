/**
 * Construct DATABASE_URL from Railway MySQL variables if DATABASE_URL is not set
 * Railway provides: MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
 */
function getDatabaseUrl(): string {
  // If DATABASE_URL is explicitly set, use it
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Try to construct from Railway MySQL variables
  const host = process.env.MYSQL_HOST;
  const port = process.env.MYSQL_PORT || "3306";
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE;

  if (host && user && password && database) {
    // Encode password in case it contains special characters
    const encodedPassword = encodeURIComponent(password);
    return `mysql://${user}:${encodedPassword}@${host}:${port}/${database}`;
  }

  // Try MYSQL_URL (Railway sometimes provides this)
  if (process.env.MYSQL_URL) {
    return process.env.MYSQL_URL;
  }

  return "";
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  DATABASE_URL: getDatabaseUrl(),
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
