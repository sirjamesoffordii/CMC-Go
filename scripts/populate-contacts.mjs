#!/usr/bin/env node
/**
 * Populate contact data for existing people.
 *
 * IMPORTANT: This script does NOT generate, guess, or fabricate emails/phones.
 * It only syncs known emails from the `users` table when a user is linked to a
 * person via `users.personId` -> `people.personId`.
 *
 * Usage:
 *   node scripts/populate-contacts.mjs
 *   node scripts/populate-contacts.mjs --dry-run
 */

import { drizzle } from "drizzle-orm/mysql2";
import { and, eq, isNotNull, isNull, or } from "drizzle-orm";
import mysql from "mysql2/promise";
import { config } from "dotenv";
import { people, users } from "../drizzle/schema.ts";

config();

const dryRun = process.argv.includes("--dry-run");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

async function main() {
  console.log(dryRun ? "🔍 DRY RUN — no changes will be made\n" : "");
  console.log("🔌 Connecting to database...");

  const connection = await mysql.createConnection(connectionString);
  const db = drizzle(connection);

  console.log("✅ Connected\n");

  // Sync verified emails from users -> people when linked by personId.
  // This preserves the principle: unknown contact info stays blank.
  const linked = await db
    .select({
      personRowId: people.id,
      personId: people.personId,
      personName: people.name,
      personEmail: people.email,
      userEmail: users.email,
    })
    .from(users)
    .leftJoin(people, eq(users.personId, people.personId))
    .where(and(isNotNull(users.personId), isNotNull(users.email)));

  const eligible = linked.filter(r => {
    if (!r.personRowId) return false;
    return r.personEmail == null || r.personEmail === "";
  });

  const missingPeopleLink = linked.filter(r => !r.personRowId);

  console.log(`👤 Linked user accounts (users.personId set): ${linked.length}`);
  console.log(
    `✉️  Eligible email backfills (people.email blank): ${eligible.length}`
  );
  if (missingPeopleLink.length > 0) {
    console.log(
      `⚠️  Users linked to missing people rows: ${missingPeopleLink.length}`
    );
  }
  console.log("");

  let updated = 0;
  for (const row of eligible) {
    if (dryRun) {
      console.log(
        `  ${row.personName ?? row.personId}: email <= ${row.userEmail}`
      );
      continue;
    }

    await db
      .update(people)
      .set({ email: row.userEmail })
      .where(eq(people.id, row.personRowId));
    updated++;
  }

  if (!dryRun) {
    console.log(`✅ Updated ${updated} people with verified emails`);
  } else {
    console.log(`🔍 Would update ${eligible.length} people (dry run)`);
  }

  await connection.end();
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
