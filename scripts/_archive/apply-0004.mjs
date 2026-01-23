#!/usr/bin/env node
import "dotenv/config";
import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { join } from "path";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

async function apply() {
  const filePath = join(
    process.cwd(),
    "drizzle",
    "0004_add_people_household_fields.sql"
  );
  const content = readFileSync(filePath, "utf8");
  const statements = content
    .split("--> statement-breakpoint")
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith("--"));

  const conn = await mysql.createConnection(connectionString);
  try {
    for (const stmt of statements) {
      try {
        console.log("Executing:", stmt.split("\n")[0].slice(0, 120));
        await conn.query(stmt);
        console.log("✓ OK");
      } catch (err) {
        const msg = err && err.message ? err.message : String(err);
        if (
          msg.includes("Duplicate column name") ||
          msg.includes("already exists") ||
          err.code === "ER_DUP_FIELDNAME"
        ) {
          console.warn("⚠️  Column exists, skipping:", msg.split("\n")[0]);
          continue;
        }
        console.error("❌ Error executing statement:", msg);
        throw err;
      }
    }
    console.log("\n✅ Applied 0004_add_people_household_fields.sql");
  } finally {
    await conn.end();
  }
}

apply().catch(err => {
  console.error(err);
  process.exit(1);
});
