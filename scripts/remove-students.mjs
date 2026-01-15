#!/usr/bin/env node
/**
 * Remove all people with "Student" role from the database
 * This event is not for students, so we need to clean them out.
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { people } from "../drizzle/schema.ts";
import { sql } from "drizzle-orm";
import { checkNotDemoDatabase } from "./utils/check-demo-db.mjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

// Allow running against Railway demo DB for this cleanup operation
// checkNotDemoDatabase(connectionString, "db:remove-students");

async function removeStudents() {
  console.log("[Remove Students] Starting...");
  
  let connection;
  let db;

  try {
    // Create database connection
    console.log("🔌 Connecting to database...");
    connection = await mysql.createConnection(connectionString);
    db = drizzle(connection);
    console.log("✅ Database connection successful\n");

    // Find all people with "Student" in their primaryRole (case-insensitive)
    const studentsToDelete = await db.select({
      personId: people.personId,
      name: people.name,
      primaryRole: people.primaryRole,
    }).from(people).where(
      sql`LOWER(${people.primaryRole}) LIKE '%student%'`
    );

    console.log(`[Remove Students] Found ${studentsToDelete.length} people with "Student" role`);

    if (studentsToDelete.length === 0) {
      console.log("[Remove Students] No students found. Nothing to remove.");
      await connection.end();
      return;
    }

    // Show what will be deleted (first 10)
    console.log("[Remove Students] Sample of people to be removed:");
    studentsToDelete.slice(0, 10).forEach(p => {
      console.log(`  - ${p.name || p.personId} (${p.primaryRole})`);
    });
    if (studentsToDelete.length > 10) {
      console.log(`  ... and ${studentsToDelete.length - 10} more`);
    }

    // Delete all students
    await db.delete(people).where(
      sql`LOWER(${people.primaryRole}) LIKE '%student%'`
    );

    console.log(`\n✅ Successfully removed ${studentsToDelete.length} people with "Student" role`);
    console.log("[Remove Students] Done!");
    
    await connection.end();
  } catch (error) {
    console.error("[Remove Students] Error:", error);
    if (error instanceof Error) {
      console.error("[Remove Students] Error message:", error.message);
    }
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

removeStudents();
