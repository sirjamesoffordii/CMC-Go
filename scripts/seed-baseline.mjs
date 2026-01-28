#!/usr/bin/env node
/**
 * BASELINE SEED SCRIPT
 *
 * Seeds only the REQUIRED baseline data needed for the app to boot successfully.
 * This is idempotent - safe to run multiple times.
 *
 * Required tables/data:
 * - settings: App configuration (app_version, etc.)
 *
 * Usage:
 *   pnpm db:seed:baseline
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { config } from "dotenv";
import { checkNotDemoDatabase } from "./utils/check-demo-db.mjs";
import { settings } from "../drizzle/schema.ts";

config();

// Production safeguard
if (
  process.env.APP_ENV === "production" ||
  process.env.NODE_ENV === "production"
) {
  console.error("❌ Cannot run seed script in production environment!");
  console.error(
    'Set APP_ENV and NODE_ENV to something other than "production" to proceed.'
  );
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL environment variable is required");
  console.error("Please set DATABASE_URL in your .env file");
  process.exit(1);
}

// Prevent running against Railway demo DB
checkNotDemoDatabase(connectionString, "db:seed:baseline");

let connection;
let db;

async function seedBaseline() {
  try {
    console.log("🔌 Connecting to database...");
    connection = await mysql.createConnection(connectionString);
    await connection.query("SELECT 1");
    db = drizzle(connection);
    console.log("✅ Database connection successful\n");

    console.log("🌱 Seeding baseline required data...\n");

    // 1. Settings (required for app to boot)
    console.log("⚙️  Seeding settings...");
    const baselineSettings = [
      { key: "app_version", value: "1.0.0" },
      { key: "last_updated", value: new Date().toISOString() },
    ];

    let settingsInserted = 0;
    for (const setting of baselineSettings) {
      try {
        await db
          .insert(settings)
          .values(setting)
          .onDuplicateKeyUpdate({
            set: {
              value: setting.value,
              updatedAt: new Date(),
            },
          });
        settingsInserted++;
      } catch (error) {
        console.warn(
          `⚠️  Failed to insert setting ${setting.key}:`,
          error.message
        );
      }
    }
    console.log(`✅ Inserted/updated ${settingsInserted} settings\n`);

    console.log("✅ Baseline seed completed successfully!\n");
  } catch (error) {
    console.error("\n❌ Baseline seed failed:", error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedBaseline()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
