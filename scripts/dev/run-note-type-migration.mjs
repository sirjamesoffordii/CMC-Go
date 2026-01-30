#!/usr/bin/env node
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function runMigration() {
  // Parse DATABASE_URL
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL not found in environment");
  }

  const url = new URL(dbUrl);
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port || "3306"),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
  });

  console.log("Connected to database");

  // Check current enum values
  const [cols] = await connection.query(
    "SHOW COLUMNS FROM notes LIKE 'note_type'"
  );
  console.log("Current note_type column:", cols[0]?.Type);

  // Check if migration already done
  if (cols[0]?.Type?.includes("REQUEST") && !cols[0]?.Type?.includes("NEED")) {
    console.log(
      "Migration already applied - enum already has REQUEST without NEED"
    );
    await connection.end();
    return;
  }

  // Step 1: Add REQUEST to enum (if not already there)
  console.log("Step 1: Adding REQUEST to enum...");
  try {
    await connection.query(
      "ALTER TABLE notes MODIFY COLUMN note_type ENUM('GENERAL', 'NEED', 'REQUEST') NOT NULL DEFAULT 'GENERAL'"
    );
  } catch (e) {
    console.log("Step 1 note:", e.message);
  }

  // Step 2: Update NEED to REQUEST
  console.log("Step 2: Updating NEED values to REQUEST...");
  const [updateResult] = await connection.query(
    "UPDATE notes SET note_type = 'REQUEST' WHERE note_type = 'NEED'"
  );
  console.log("Updated rows:", updateResult.affectedRows);

  // Step 3: Remove NEED from enum
  console.log("Step 3: Removing NEED from enum...");
  await connection.query(
    "ALTER TABLE notes MODIFY COLUMN note_type ENUM('GENERAL', 'REQUEST') NOT NULL DEFAULT 'GENERAL'"
  );

  // Verify
  const [cols2] = await connection.query(
    "SHOW COLUMNS FROM notes LIKE 'note_type'"
  );
  console.log("Final note_type column:", cols2[0]?.Type);

  await connection.end();
  console.log("Migration complete!");
}

runMigration().catch(e => {
  console.error(e);
  process.exit(1);
});
