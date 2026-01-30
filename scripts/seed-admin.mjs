#!/usr/bin/env node
/**
 * Seed the CMC Go Admin account
 * This script creates the pre-seeded admin account if it doesn't exist
 *
 * Usage:
 *   pnpm db:seed:admin
 *   node scripts/seed-admin.mjs
 */

import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import mysql from "mysql2/promise";
import { config } from "dotenv";
import crypto from "crypto";
import { promisify } from "util";

config();

const scryptAsync = promisify(crypto.scrypt);
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

async function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const hash = await scryptAsync(password, salt, KEY_LENGTH);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

// Production safeguard
if (process.env.APP_ENV === "production") {
  console.error("❌ Cannot run seed script in production environment!");
  console.error('Set APP_ENV to something other than "production" to proceed.');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

async function main() {
  console.log("🔐 Seeding CMC Go Admin account...\n");

  const connection = await mysql.createConnection({
    uri: connectionString,
  });

  try {
    // Check if admin already exists
    const [existingRows] = await connection.execute(
      "SELECT id FROM users WHERE email = ?",
      ["sirjamesoffordII@gmail.com"]
    );

    if (Array.isArray(existingRows) && existingRows.length > 0) {
      console.log("✅ CMC Go Admin account already exists (skipping)");
      await connection.end();
      return;
    }

    // Hash the password
    const passwordHash = await hashPassword("Wow#24123");

    // Insert the admin user
    await connection.execute(
      `INSERT INTO users (
        fullName, email, passwordHash, role,
        scopeLevel, viewLevel, editLevel,
        campusId, districtId, regionId,
        approvalStatus, isBanned
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "Sir James Offord",
        "sirjamesoffordII@gmail.com",
        passwordHash,
        "CMC_GO_ADMIN",
        "NATIONAL",
        "NATIONAL",
        "NATIONAL",
        null, // No campus (National Team)
        null,
        null,
        "ACTIVE",
        false,
      ]
    );

    console.log("✅ CMC Go Admin account created successfully");
    console.log("   Email: sirjamesoffordII@gmail.com");
    console.log("   Role: CMC_GO_ADMIN");
    console.log("   Scope/View/Edit: NATIONAL");
  } catch (error) {
    console.error("❌ Error seeding admin:", error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
