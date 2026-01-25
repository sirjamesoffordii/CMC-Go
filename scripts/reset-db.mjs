#!/usr/bin/env node
import "dotenv/config";
import mysql from "mysql2/promise";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { checkNotDemoDatabase } from "./utils/check-demo-db.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

// Production safeguard
if (
  process.env.NODE_ENV === "production" ||
  process.env.APP_ENV === "production"
) {
  console.error("❌ Cannot reset database in production environment!");
  console.error(
    "Set NODE_ENV and APP_ENV to something other than 'production' to proceed."
  );
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

// Prevent running against Railway demo DB
checkNotDemoDatabase(connectionString, "db:reset");

// Parse connection string to extract database name
function parseDatabaseName(connectionString) {
  try {
    // Format: mysql://user:password@host:port/database
    const url = new URL(connectionString);
    return url.pathname.slice(1); // Remove leading /
  } catch (error) {
    console.error("❌ Failed to parse DATABASE_URL:", error.message);
    process.exit(1);
  }
}

const databaseName = parseDatabaseName(connectionString);

// Get connection without database (to drop/recreate it)
function getConnectionWithoutDb() {
  try {
    const url = new URL(connectionString);
    url.pathname = ""; // Remove database name
    return url.toString();
  } catch (_error) {
    return null;
  }
}

// Tables in order for truncation (respecting foreign keys)
// Order: child tables first, parent tables last
const TRUNCATE_ORDER = [
  "notes", // References people
  "needs", // References people
  "assignments", // References people, campuses, districts
  "people", // References campuses, districts
  "campuses", // References districts
  "districts", // No dependencies
  "settings", // No dependencies
  "users", // No dependencies
  // drizzle_migrations is NOT truncated (keep migration history)
];

/**
 * Truncate all tables in proper order (respecting foreign keys)
 */
async function truncateAllTables() {
  console.log("🗑️  Truncating all tables...");

  let connection;
  try {
    connection = await mysql.createConnection(connectionString);

    // Disable foreign key checks temporarily
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");

    for (const tableName of TRUNCATE_ORDER) {
      try {
        await connection.query(`TRUNCATE TABLE \`${tableName}\``);
        console.log(`  ✓ Truncated ${tableName}`);
      } catch (error) {
        // Table might not exist, that's okay
        if (error.code === "ER_NO_SUCH_TABLE") {
          console.log(`  ⚠️  Table ${tableName} does not exist (skipping)`);
        } else {
          console.warn(
            `  ⚠️  Failed to truncate ${tableName}: ${error.message}`
          );
        }
      }
    }

    // Re-enable foreign key checks
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");

    console.log("✅ All tables truncated\n");
  } catch (error) {
    console.error("❌ Failed to truncate tables:", error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Drop and recreate database (requires DROP DATABASE permission)
 */
async function dropAndRecreateDatabase() {
  console.log("🗑️  Dropping and recreating database...");

  const connectionWithoutDb = getConnectionWithoutDb();
  if (!connectionWithoutDb) {
    throw new Error("Failed to create connection without database");
  }

  let connection;
  try {
    connection = await mysql.createConnection(connectionWithoutDb);

    // Drop database if it exists
    await connection.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
    console.log(`  ✓ Dropped database ${databaseName}`);

    // Create database
    await connection.query(`CREATE DATABASE \`${databaseName}\``);
    console.log(`  ✓ Created database ${databaseName}\n`);
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

  return true;
}

/**
 * Run migrations (non-interactive)
 */
async function runMigrations() {
  console.log("📦 Running migrations...");
  try {
    // Use db:push:yes for non-interactive push, or db:migrate for migration files
    execSync("pnpm db:push:yes", {
      cwd: projectRoot,
      stdio: "inherit",
      env: { ...process.env, CI: "true" }, // Ensure non-interactive
    });
    console.log("✅ Schema pushed successfully\n");
  } catch (error) {
    console.error("❌ Failed to push schema:", error.message);
    console.error("   Trying db:migrate as fallback...");
    try {
      execSync("pnpm db:migrate", {
        cwd: projectRoot,
        stdio: "inherit",
        env: { ...process.env },
      });
      console.log("✅ Migrations completed\n");
    } catch (migrateError) {
      console.error("❌ Failed to run migrations:", migrateError.message);
      throw migrateError;
    }
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

/**
 * Main reset function
 */
async function resetDatabase(options = {}) {
  const { dropDatabase = false } = options;

  console.log("🔄 Starting database reset...\n");
  console.log("⚠️  WARNING: This will delete all data in the database!");
  console.log(`   Database: ${databaseName}\n`);

  let dropped = false;

  if (dropDatabase) {
    try {
      dropped = await dropAndRecreateDatabase();
    } catch (_error) {
      console.warn(
        "⚠️  Could not drop/recreate database, falling back to truncation...\n"
      );
    }
  }

  if (!dropped) {
    await truncateAllTables();
  }

  await runMigrations();
  await runSeed();

  console.log("✅ Database reset completed successfully!");
  console.log("\n📊 Summary:");
  console.log(`   - Database: ${databaseName}`);
  console.log(
    `   - Method: ${dropped ? "Drop & Recreate" : "Truncate Tables"}`
  );
  console.log(`   - Migrations: Applied`);
  console.log(`   - Seed: Completed`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const dropDatabase = args.includes("--drop-db") || args.includes("-d");

// Run reset
resetDatabase({ dropDatabase })
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error("\n❌ Database reset failed:", error.message);
    process.exit(1);
  });
