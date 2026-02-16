#!/usr/bin/env node
/**
 * Verifies that the OTHER role migration (0009) was applied successfully.
 * Run after: pnpm db:migrate
 *
 * Usage: node scripts/verify-other-role-migration.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.MYSQL_URL) return process.env.MYSQL_URL;
  const host = process.env.MYSQL_HOST ?? process.env.MYSQLHOST ?? "localhost";
  const port = process.env.MYSQL_PORT ?? process.env.MYSQLPORT ?? "3306";
  const user = process.env.MYSQL_USER ?? process.env.MYSQLUSER;
  const password = process.env.MYSQL_PASSWORD ?? process.env.MYSQLPASSWORD;
  const database = process.env.MYSQL_DATABASE ?? process.env.MYSQLDATABASE ?? "cmcgo";
  if (user && database) {
    const auth = password ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}` : encodeURIComponent(user);
    return `mysql://${auth}@${host}:${port}/${database}`;
  }
  return null;
}

async function verify() {
  const url = resolveDatabaseUrl();
  if (!url) {
    console.error("❌ Set DATABASE_URL or MYSQL_* env vars");
    process.exit(1);
  }

  let conn;
  try {
    conn = await mysql.createConnection(url);
    console.log("✓ Connected to database\n");

    // Check if 0009 migration was applied
    const [migrations] = await conn.query(
      "SELECT hash FROM drizzle_migrations WHERE hash = ?",
      ["0009_add_other_role.sql"]
    );
    if (migrations.length === 0) {
      console.log("❌ Migration 0009_add_other_role.sql has NOT been applied.");
      console.log("   Run: pnpm db:migrate\n");
      process.exit(1);
    }
    console.log("✓ Migration 0009_add_other_role.sql is applied\n");

    // Check if OTHER is in the role enum
    const [cols] = await conn.query(
      "SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'"
    );
    if (cols.length === 0) {
      console.log("❌ users.role column not found");
      process.exit(1);
    }
    const enumDef = cols[0].COLUMN_TYPE;
    if (!enumDef.includes("OTHER") && !enumDef.includes("'OTHER'")) {
      console.log("❌ users.role enum does NOT include 'OTHER'");
      console.log("   Current enum:", enumDef);
      process.exit(1);
    }
    console.log("✓ users.role enum includes 'OTHER'\n");
    console.log("✅ Verification passed. 'Other' registration flow should work.");
  } catch (err) {
    console.error("❌ Verification failed:", err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

verify();
