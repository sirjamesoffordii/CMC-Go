#!/usr/bin/env node
/**
 * Cleanup fabricated contact info (email/phone) in `people`.
 *
 * Policy:
 * - Never guess/fabricate contacts.
 * - Preserve contacts for "verified/registered" people.
 *
 * Verification rules (kept):
 * - Linked user account: users.personId = people.personId
 * - OR depositPaid = true
 * - OR deposit_paid_at is not null
 *
 * Everyone else: if email/phone is present, clear it (set to NULL).
 *
 * Usage:
 *   node scripts/cleanup-fabricated-contacts.mjs --dry-run
 *   node scripts/cleanup-fabricated-contacts.mjs --apply
 */

import { drizzle } from "drizzle-orm/mysql2";
import { and, eq, isNotNull, or } from "drizzle-orm";
import mysql from "mysql2/promise";
import { config } from "dotenv";
import { people, users } from "../drizzle/schema.ts";

config();

const dryRun =
  process.argv.includes("--dry-run") || !process.argv.includes("--apply");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

function isBlank(value) {
  if (value == null) return true;
  if (typeof value !== "string") return false;
  return value.trim() === "";
}

async function main() {
  console.log(dryRun ? "🔍 DRY RUN — no changes will be made\n" : "");
  console.log("🔌 Connecting to database...");

  const connection = await mysql.createConnection(connectionString);
  const db = drizzle(connection);

  console.log("✅ Connected\n");

  const rows = await db
    .select({
      rowId: people.id,
      personId: people.personId,
      name: people.name,
      email: people.email,
      phone: people.phone,
      depositPaid: people.depositPaid,
      depositPaidAt: people.deposit_paid_at,
      linkedUserPersonId: users.personId,
    })
    .from(people)
    .leftJoin(users, eq(users.personId, people.personId));

  // Some people may have multiple users linked; de-dupe to a boolean "hasLinkedUser".
  const byRowId = new Map();
  for (const r of rows) {
    const existing = byRowId.get(r.rowId);
    if (!existing) {
      byRowId.set(r.rowId, {
        ...r,
        hasLinkedUser: r.linkedUserPersonId != null,
      });
    } else if (r.linkedUserPersonId != null) {
      existing.hasLinkedUser = true;
    }
  }

  const peopleRows = Array.from(byRowId.values());

  const shouldKeep = p =>
    Boolean(p.hasLinkedUser) ||
    Boolean(p.depositPaid) ||
    p.depositPaidAt != null;

  const hasAnyContact = p => !isBlank(p.email) || !isBlank(p.phone);

  const candidates = peopleRows.filter(p => hasAnyContact(p) && !shouldKeep(p));

  console.log(`👥 Total people rows: ${peopleRows.length}`);
  console.log(
    `✅ Verified/registered (kept): ${peopleRows.filter(shouldKeep).length}`
  );
  console.log(`🧹 To clear email/phone (not verified): ${candidates.length}\n`);

  if (candidates.length === 0) {
    console.log("✅ Nothing to clean.");
    await connection.end();
    return;
  }

  const preview = candidates.slice(0, 25);
  console.log(`Preview (first ${preview.length}):`);
  for (const p of preview) {
    const emailLabel = isBlank(p.email) ? "(blank)" : String(p.email);
    const phoneLabel = isBlank(p.phone) ? "(blank)" : String(p.phone);
    console.log(`  - ${p.name} [${p.personId}]: ${phoneLabel} | ${emailLabel}`);
  }
  console.log("");

  if (dryRun) {
    console.log("🔍 Dry run complete. Re-run with --apply to make changes.");
    await connection.end();
    return;
  }

  let updated = 0;
  for (const p of candidates) {
    await db
      .update(people)
      .set({
        email: null,
        phone: null,
      })
      .where(eq(people.id, p.rowId));
    updated++;
    if (updated % 100 === 0) {
      console.log(`  Cleared ${updated}/${candidates.length}...`);
    }
  }

  console.log(`\n✅ Cleared contact info for ${updated} people`);
  await connection.end();
}

main().catch(err => {
  console.error("❌ Error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
