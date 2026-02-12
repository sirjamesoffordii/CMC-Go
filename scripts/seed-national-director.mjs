#!/usr/bin/env node
/**
 * Seed the National Director user (Alex Rodriguez) in a safe, idempotent way.
 *
 * This is intended for one-off runs against staging/production.
 *
 * Required env:
 *   - DATABASE_URL or MYSQL_URL (Railway)
 *   - NATIONAL_DIRECTOR_PASSWORD
 *
 * Safety:
 *   - If NODE_ENV=production or APP_ENV=production, requires ALLOW_PROD_SEED=true
 *   - Will NOT reset password unless FORCE_PASSWORD_RESET=true
 */

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

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return { url: process.env.DATABASE_URL, source: "DATABASE_URL" };
  if (process.env.MYSQL_URL) return { url: process.env.MYSQL_URL, source: "MYSQL_URL" };
  if (process.env.MYSQL_PUBLIC_URL) return { url: process.env.MYSQL_PUBLIC_URL, source: "MYSQL_PUBLIC_URL" };

  const host = process.env.MYSQL_HOST ?? process.env.MYSQLHOST;
  const port = process.env.MYSQL_PORT ?? process.env.MYSQLPORT ?? "3306";
  const user = process.env.MYSQL_USER ?? process.env.MYSQLUSER;
  const password = process.env.MYSQL_PASSWORD ?? process.env.MYSQLPASSWORD;
  const database = process.env.MYSQL_DATABASE ?? process.env.MYSQLDATABASE;

  if (host && user && database) {
    const encodedUser = encodeURIComponent(user);
    const encodedPassword = password ? encodeURIComponent(password) : "";
    const auth = password ? `${encodedUser}:${encodedPassword}` : encodedUser;
    return { url: `mysql://${auth}@${host}:${port}/${database}`, source: "MYSQL_*" };
  }

  return { url: undefined, source: undefined };
}

function requireProductionOverrideIfNeeded() {
  const isProduction =
    process.env.NODE_ENV === "production" || process.env.APP_ENV === "production";

  if (isProduction && process.env.ALLOW_PROD_SEED !== "true") {
    console.error("❌ Refusing to seed in production without ALLOW_PROD_SEED=true");
    console.error("Set ALLOW_PROD_SEED=true for a one-off run, then remove it.");
    process.exit(1);
  }
}

async function main() {
  requireProductionOverrideIfNeeded();

  const { url, source } = resolveDatabaseUrl();
  console.log(
    "🔍 Database connection:",
    url ? `Set ✓ (${source})` : "Not set ✗"
  );

  if (!url) {
    console.error(
      "❌ Database connection string is required. Set DATABASE_URL or MYSQL_URL."
    );
    process.exit(1);
  }

  const password = process.env.NATIONAL_DIRECTOR_PASSWORD;
  if (!password) {
    console.error("❌ NATIONAL_DIRECTOR_PASSWORD environment variable is required");
    process.exit(1);
  }

  const email = "Arodriguez@ag.org";
  const fullName = "Alex Rodriguez";

  const connection = await mysql.createConnection({ uri: url });

  try {
    const [existing] = await connection.execute(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    const forceReset = process.env.FORCE_PASSWORD_RESET === "true";

    if (Array.isArray(existing) && existing.length > 0) {
      if (forceReset) {
        const passwordHash = await hashPassword(password);
        await connection.execute(
          "UPDATE users SET passwordHash = ? WHERE email = ?",
          [passwordHash, email]
        );
        console.log("✅ National Director user exists (password reset)");
      } else {
        console.log("✅ National Director user exists (no changes)");
      }
      return;
    }

    const passwordHash = await hashPassword(password);
    await connection.execute(
      `INSERT INTO users (
        fullName, email, passwordHash, role,
        scopeLevel, viewLevel, editLevel,
        campusId, districtId, regionId,
        approvalStatus, isBanned
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fullName,
        email,
        passwordHash,
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

    console.log("✅ National Director user created");
  } finally {
    await connection.end();
  }
}

main().catch(err => {
  console.error("❌ Seed failed:", err?.message ?? String(err));
  process.exit(1);
});
