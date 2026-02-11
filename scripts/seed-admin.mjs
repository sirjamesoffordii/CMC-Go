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
    // --- CMC Go Admin (Sir James Offord) ---
    const [existingAdmin] = await connection.execute(
      "SELECT id FROM users WHERE email = ?",
      ["sirjamesoffordII@gmail.com"]
    );

    if (Array.isArray(existingAdmin) && existingAdmin.length > 0) {
      console.log("✅ CMC Go Admin account already exists (skipping)");
    } else {
      const passwordHash = await hashPassword("Wow#24123");
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
          null,
          null,
          null,
          "ACTIVE",
          false,
        ]
      );
      console.log("✅ CMC Go Admin account created successfully");
    }

    // --- Alex Rodriguez (National Director) ---
    const [existingAlex] = await connection.execute(
      "SELECT id FROM users WHERE email = ?",
      ["Arodriguez@ag.org"]
    );
    if (Array.isArray(existingAlex) && existingAlex.length > 0) {
      const alexHashUpdate = await hashPassword("Arod");
      await connection.execute(
        "UPDATE users SET passwordHash = ? WHERE email = ?",
        [alexHashUpdate, "Arodriguez@ag.org"]
      );
      console.log(
        "✅ Alex Rodriguez (National Director) already exists (password updated)"
      );
    } else {
      const alexHash = await hashPassword("Arod");
      await connection.execute(
        `INSERT INTO users (
          fullName, email, passwordHash, role,
          scopeLevel, viewLevel, editLevel,
          campusId, districtId, regionId,
          approvalStatus, isBanned
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          "Alex Rodriguez",
          "Arodriguez@ag.org",
          alexHash,
          "NATIONAL_DIRECTOR",
          "NATIONAL",
          "NATIONAL",
          "NATIONAL",
          null,
          null,
          null,
          "ACTIVE",
          false,
        ]
      );
      console.log("✅ Alex Rodriguez (National Director) created");
    }

    // --- Dan Guenther (Field Director) ---
    const [existingDan] = await connection.execute(
      "SELECT id FROM users WHERE email = ?",
      ["dan@nwxa.org"]
    );
    if (Array.isArray(existingDan) && existingDan.length > 0) {
      console.log("✅ Dan Guenther (Field Director) already exists (skipping)");
    } else {
      const danHash = await hashPassword("Field Director");
      await connection.execute(
        `INSERT INTO users (
          fullName, email, passwordHash, role,
          scopeLevel, viewLevel, editLevel,
          campusId, districtId, regionId,
          approvalStatus, isBanned
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          "Dan Guenther",
          "dan@nwxa.org",
          danHash,
          "FIELD_DIRECTOR",
          "NATIONAL",
          "NATIONAL",
          "NATIONAL",
          null,
          null,
          null,
          "ACTIVE",
          false,
        ]
      );
      console.log("✅ Dan Guenther (Field Director) created");
    }

    // --- Matthew Hoogendoorn (Regional Director, Texico) ---
    const [existingMatt] = await connection.execute(
      "SELECT id FROM users WHERE email = ?",
      ["mkhoogendoorn@gmail.com"]
    );
    if (Array.isArray(existingMatt) && existingMatt.length > 0) {
      // Update password to latest
      const mattHashUpdate = await hashPassword("RD1234");
      await connection.execute(
        "UPDATE users SET passwordHash = ? WHERE email = ?",
        [mattHashUpdate, "mkhoogendoorn@gmail.com"]
      );
      console.log(
        "✅ Matthew Hoogendoorn (Regional Director, Texico) already exists (password updated)"
      );
    } else {
      const mattHash = await hashPassword("RD1234");
      await connection.execute(
        `INSERT INTO users (
          fullName, email, passwordHash, role,
          scopeLevel, viewLevel, editLevel,
          campusId, districtId, regionId, overseeRegionId,
          approvalStatus, isBanned
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          "Matthew Hoogendoorn",
          "mkhoogendoorn@gmail.com",
          mattHash,
          "REGION_DIRECTOR",
          "NATIONAL",
          "NATIONAL",
          "REGION",
          null,
          null,
          "Texico",
          "Texico",
          "ACTIVE",
          false,
        ]
      );
      console.log("✅ Matthew Hoogendoorn (Regional Director, Texico) created");
    }

    // --- CMC Go Admin (Demo/Shared) ---
    const [existingDemo] = await connection.execute(
      "SELECT id FROM users WHERE email = ?",
      ["Admin@cmcgo.app"]
    );
    if (Array.isArray(existingDemo) && existingDemo.length > 0) {
      console.log("✅ Admin@cmcgo.app already exists (skipping)");
    } else {
      const demoHash = await hashPassword("Admin1234");
      await connection.execute(
        `INSERT INTO users (
          fullName, email, passwordHash, role,
          scopeLevel, viewLevel, editLevel,
          campusId, districtId, regionId,
          approvalStatus, isBanned
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          "CMC Go Admin",
          "Admin@cmcgo.app",
          demoHash,
          "CMC_GO_ADMIN",
          "NATIONAL",
          "NATIONAL",
          "NATIONAL",
          null,
          null,
          null,
          "ACTIVE",
          false,
        ]
      );
      console.log("✅ Admin@cmcgo.app (CMC_GO_ADMIN) created");
    }
  } catch (error) {
    console.error("❌ Error seeding:", error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
