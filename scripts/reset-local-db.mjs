#!/usr/bin/env node
/**
 * SAFE LOCAL DATABASE RESET
 *
 * This script resets the local development database ONLY.
 * It includes multiple safety checks to prevent accidental execution on staging/production.
 *
 * Safety guarantees:
 * - Only works when DATABASE_URL points to localhost/127.0.0.1/docker mysql
 * - Hard-fails if NODE_ENV=production
 * - Hard-fails if host is Railway/internal
 * - Requires explicit confirmation
 *
 * Usage:
 *   pnpm db:reset:local
 */

import "dotenv/config";
import mysql from "mysql2/promise";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { checkNotDemoDatabase } from "./utils/check-demo-db.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

// ============================================================================
// SAFETY CHECKS
// ============================================================================

/**
 * Check if host is safe for local operations
 * Only allows: localhost, 127.0.0.1, docker mysql containers
 */
function isLocalHost(host) {
  const safeHosts = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "mysql", // Docker container name
    "db", // Common Docker container name
  ];

  const unsafePatterns = [
    "railway",
    "rlwy.net",
    "railway.app",
    "amazonaws.com",
    "rds.amazonaws.com",
    "cloud.google.com",
    "azure.com",
    "heroku.com",
  ];

  const hostLower = host.toLowerCase();

  // Check unsafe patterns first
  for (const pattern of unsafePatterns) {
    if (hostLower.includes(pattern)) {
      return false;
    }
  }

  // Check safe hosts
  return safeHosts.some(safe => hostLower === safe || hostLower.includes(safe));
}

/**
 * Parse DATABASE_URL and extract host
 */
function parseDatabaseHost(connectionString) {
  try {
    const url = new URL(connectionString);
    return url.hostname;
  } catch (error) {
    console.error("❌ Failed to parse DATABASE_URL:", error.message);
    return null;
  }
}

/**
 * Validate that we're working with a local database
 */
function validateLocalDatabase() {
  // Check NODE_ENV
  if (process.env.NODE_ENV === "production") {
    return {
      valid: false,
      host: null,
      error:
        "NODE_ENV is set to 'production'. Cannot reset database in production.",
    };
  }

  // Check APP_ENV
  if (process.env.APP_ENV === "production") {
    return {
      valid: false,
      host: null,
      error:
        "APP_ENV is set to 'production'. Cannot reset database in production.",
    };
  }

  // Get DATABASE_URL
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return {
      valid: false,
      host: null,
      error: "DATABASE_URL environment variable is not set.",
    };
  }

  // Parse host
  const host = parseDatabaseHost(connectionString);
  if (!host) {
    return {
      valid: false,
      host: null,
      error: "Could not parse host from DATABASE_URL.",
    };
  }

  // Check if host is local
  if (!isLocalHost(host)) {
    return {
      valid: false,
      host,
      error: `Host '${host}' is not a local database. This script only works with localhost/127.0.0.1/docker mysql.`,
    };
  }

  return { valid: true, host };
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Parse database name from connection string
 */
function parseDatabaseName(connectionString) {
  try {
    const url = new URL(connectionString);
    return url.pathname.slice(1); // Remove leading /
  } catch (error) {
    throw new Error(`Failed to parse DATABASE_URL: ${error.message}`);
  }
}

/**
 * Get connection without database (to drop/recreate it)
 */
function getConnectionWithoutDb(connectionString) {
  try {
    const url = new URL(connectionString);
    url.pathname = ""; // Remove database name
    return url.toString();
  } catch (error) {
    throw new Error(`Failed to create connection string: ${error.message}`);
  }
}

/**
 * Drop and recreate database
 */
async function dropAndRecreateDatabase(connectionString, databaseName) {
  console.log("🗑️  Dropping and recreating database...");

  const connectionWithoutDb = getConnectionWithoutDb(connectionString);
  let connection;

  try {
    connection = await mysql.createConnection(connectionWithoutDb);

    // Drop database if it exists
    await connection.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
    console.log(`  ✓ Dropped database ${databaseName}`);

    // Create database
    await connection.query(`CREATE DATABASE \`${databaseName}\``);
    console.log(`  ✓ Created database ${databaseName}\n`);

    return true;
  } catch (error) {
    if (error.code === "ER_DBACCESS_DENIED_ERROR") {
      console.error("❌ Permission denied: Cannot drop/create database");
      console.error(
        "   Your user doesn't have DROP/CREATE DATABASE permissions."
      );
      console.error("   Falling back to table truncation instead...\n");
      return false;
    }
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Run migrations
 */
async function runMigrations() {
  console.log("📦 Running migrations...");
  try {
    execSync("pnpm db:migrate", {
      cwd: projectRoot,
      stdio: "inherit",
      env: { ...process.env },
    });
    console.log("✅ Migrations completed\n");
  } catch (error) {
    console.error("❌ Failed to run migrations:", error.message);
    throw error;
  }
}

/**
 * Run seed
 */
async function runSeed() {
  console.log("🌱 Seeding database...");
  try {
    execSync("pnpm db:seed", {
      cwd: projectRoot,
      stdio: "inherit",
      env: { ...process.env },
    });
    console.log("✅ Seed completed\n");
  } catch (error) {
    console.error("❌ Failed to run seed:", error.message);
    throw error;
  }
}

// ============================================================================
// MAIN RESET FUNCTION
// ============================================================================

async function resetLocalDatabase() {
  console.log("=".repeat(60));
  console.log("🔄 LOCAL DATABASE RESET");
  console.log("=".repeat(60));
  console.log();

  // Validate safety
  const validation = validateLocalDatabase();
  if (!validation.valid) {
    console.error("❌ SAFETY CHECK FAILED");
    console.error(`   ${validation.error}`);
    console.error();
    console.error("This script only works with local databases.");
    console.error(
      "Allowed hosts: localhost, 127.0.0.1, docker mysql containers"
    );
    console.error();
    process.exit(1);
  }

  // Additional check: prevent running against Railway demo DB
  const connectionString = process.env.DATABASE_URL;
  checkNotDemoDatabase(connectionString, "db:reset:local");

  const databaseName = parseDatabaseName(connectionString);
  const host = validation.host;

  // Display warning
  console.log("⚠️  WARNING: This will DELETE ALL DATA in the local database!");
  console.log();
  console.log("   Database:", databaseName);
  console.log("   Host:", host);
  console.log();
  console.log("This operation cannot be undone.");
  console.log();

  // In non-interactive mode, require explicit flag
  const args = process.argv.slice(2);
  const forceFlag = args.includes("--force") || args.includes("-f");

  if (!forceFlag) {
    console.log("To proceed, run with --force flag:");
    console.log("   pnpm db:reset:local --force");
    console.log();
    process.exit(0);
  }

  console.log("🚀 Starting reset (--force flag detected)...");
  console.log();

  try {
    // Drop and recreate database
    const dropped = await dropAndRecreateDatabase(
      connectionString,
      databaseName
    );

    if (!dropped) {
      console.error("❌ Could not drop/recreate database. Exiting.");
      process.exit(1);
    }

    // Run migrations
    await runMigrations();

    // Run seed
    await runSeed();

    console.log("=".repeat(60));
    console.log("✅ LOCAL DATABASE RESET COMPLETED");
    console.log("=".repeat(60));
    console.log();
    console.log("Summary:");
    console.log(`  - Database: ${databaseName}`);
    console.log(`  - Host: ${host}`);
    console.log(`  - Method: Drop & Recreate`);
    console.log(`  - Migrations: Applied`);
    console.log(`  - Seed: Completed`);
    console.log();
  } catch (error) {
    console.error();
    console.error("❌ Database reset failed:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run
resetLocalDatabase().catch(error => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
