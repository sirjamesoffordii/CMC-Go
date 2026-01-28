#!/usr/bin/env node
/**
 * Restore all people who were students from seed-people.json
 * Add them back to the database as "Staff" instead of "Student"
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { people, districts } from "../drizzle/schema.ts";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { eq } from "drizzle-orm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

// Normalize status values to match ENUM
function normalizeStatus(status) {
  const statusMap = {
    Going: "Yes",
    "Not Going": "No",
    "Not invited yet": "Not Invited",
  };
  return statusMap[status] || status;
}

async function restoreStudentsAsStaff() {
  console.log("[Restore Students as Staff] Starting...");

  let connection;
  let db;

  try {
    // Create database connection
    console.log("🔌 Connecting to database...");
    connection = await mysql.createConnection(connectionString);
    db = drizzle(connection);
    console.log("✅ Database connection successful\n");

    // Read seed-people.json
    console.log("📖 Reading seed-people.json...");
    const allPeople = JSON.parse(
      readFileSync(join(__dirname, "seed-people.json"), "utf-8")
    );

    // Filter for students
    const students = allPeople.filter(p => p.role === "Student");
    console.log(`📋 Found ${students.length} students in seed file\n`);

    if (students.length === 0) {
      console.log(
        "[Restore Students as Staff] No students found in seed file."
      );
      await connection.end();
      return;
    }

    // Get all districts to map districtId to region
    const allDistricts = await db.select().from(districts);
    const districtMap = new Map();
    allDistricts.forEach(d => {
      districtMap.set(d.id, d.region);
    });

    console.log(`🔄 Restoring ${students.length} people as Staff...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const student of students) {
      try {
        // Get region from district
        const region = districtMap.get(student.districtId) || null;

        // Create person with "Staff" role instead of "Student"
        const personData = {
          personId: String(student.id),
          name: student.name,
          primaryCampusId: student.campusId || null,
          primaryDistrictId: student.districtId || null,
          primaryRegion: region,
          primaryRole: "Staff", // Changed from "Student" to "Staff"
          status: normalizeStatus(student.status),
          createdAt: new Date(),
          statusLastUpdated: student.lastUpdated
            ? new Date(student.lastUpdated)
            : new Date(),
          depositPaid: false,
          spouseAttending: false,
          childrenCount: 0,
          guestsCount: 0,
          childrenAges: null,
          spouse: null,
          kids: null,
          guests: null,
        };

        // Insert or update (in case person already exists)
        await db
          .insert(people)
          .values(personData)
          .onDuplicateKeyUpdate({
            set: {
              name: personData.name,
              primaryRole: personData.primaryRole, // Ensure it's "Staff"
              primaryCampusId: personData.primaryCampusId,
              primaryDistrictId: personData.primaryDistrictId,
              primaryRegion: personData.primaryRegion,
              status: personData.status,
              statusLastUpdated: personData.statusLastUpdated,
            },
          });

        successCount++;
        if (successCount % 50 === 0) {
          console.log(`  Processed ${successCount}/${students.length}...`);
        }
      } catch (error) {
        console.warn(
          `⚠️  Failed to restore ${student.name} (ID: ${student.id}):`,
          error.message
        );
        errorCount++;
      }
    }

    console.log(`\n✅ Successfully restored ${successCount} people as Staff`);
    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} people failed to restore`);
    }
    console.log("[Restore Students as Staff] Done!");

    await connection.end();
  } catch (error) {
    console.error("[Restore Students as Staff] Error:", error);
    if (error instanceof Error) {
      console.error(
        "[Restore Students as Staff] Error message:",
        error.message
      );
    }
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

restoreStudentsAsStaff();
