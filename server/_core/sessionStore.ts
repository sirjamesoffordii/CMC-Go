/**
 * Session store configuration for express-session
 * Uses MySQL database for persistent session storage
 */

import session from "express-session";
import MySQLStore from "express-mysql-session";
import { ENV } from "./env";

// Create MySQLStore class from the session store constructor
const MySQLStoreClass = MySQLStore(session);

// Type for the store instance
type MySQLStoreInstance = InstanceType<typeof MySQLStoreClass>;

/**
 * Create and configure MySQL session store
 * Sessions persist in the database and survive server restarts
 */
export function createSessionStore(): MySQLStoreInstance {
  if (!ENV.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for session store");
  }

  // Parse DATABASE_URL to extract connection options
  const url = new URL(ENV.DATABASE_URL);
  
  const options: MySQLStore.Options = {
    host: url.hostname,
    port: parseInt(url.port || "3306", 10),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1), // Remove leading /
    
    // Session store configuration
    checkExpirationInterval: 15 * 60 * 1000, // Check for expired sessions every 15 minutes
    expiration: 7 * 24 * 60 * 60 * 1000, // Sessions expire after 7 days
    createDatabaseTable: true, // Auto-create sessions table if it doesn't exist
    schema: {
      tableName: "sessions",
      columnNames: {
        session_id: "session_id",
        expires: "expires",
        data: "data",
      },
    },
  };

  return new MySQLStoreClass(options);
}

/**
 * Get session configuration for express-session middleware
 */
export function getSessionConfig(store: MySQLStoreInstance): session.SessionOptions {
  if (!ENV.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is required for session management");
  }

  const isProduction = ENV.isProduction;

  return {
    secret: ENV.SESSION_SECRET,
    store,
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    cookie: {
      secure: isProduction, // HTTPS only in production
      httpOnly: true, // Prevent client-side access
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: isProduction ? "none" : "lax", // CSRF protection
      path: "/",
    },
    name: "cmc.sid", // Session cookie name
    rolling: true, // Reset expiry on each request (keep active sessions alive)
  };
}
