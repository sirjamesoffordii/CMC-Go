#!/usr/bin/env node
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read JSON files
const districts = JSON.parse(readFileSync(join(__dirname, "seed-districts.json"), "utf-8"));
const campuses = JSON.parse(readFileSync(join(__dirname, "seed-campuses.json"), "utf-8"));
const people = JSON.parse(readFileSync(join(__dirname, "seed-people.json"), "utf-8"));
const needs = JSON.parse(readFileSync(join(__dirname, "seed-needs.json"), "utf-8"));
const notes = JSON.parse(readFileSync(join(__dirname, "seed-notes.json"), "utf-8"));

// Production safeguard
if (process.env.APP_ENV === 'production') {
  console.error('❌ Cannot run seed script in production environment!');
  console.error('Set APP_ENV to something other than "production" to proceed.');
  process.exit(1);
}

// Connect to database
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// Normalize status values to match ENUM
function normalizeStatus(status) {
  const statusMap = {
    'Going': 'Yes',
    'Not Going': 'No',
    'Not invited yet': 'Not Invited'
  };
  return statusMap[status] || status;
}

async function seed() {
  console.log("Starting database seed...");

  // Insert districts
  console.log(`Inserting ${districts.length} districts...`);
  for (const district of districts) {
    await connection.execute(
      `INSERT INTO districts (id, name, region)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), region = VALUES(region)`,
      [district.id, district.name, district.region]
    );
  }

  // Insert campuses
  console.log(`Inserting ${campuses.length} campuses...`);
  for (const campus of campuses) {
    await connection.execute(
      `INSERT INTO campuses (id, name, districtId)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), districtId = VALUES(districtId)`,
      [campus.id, campus.name, campus.districtId]
    );
  }

  // Insert people
  console.log(`Inserting ${people.length} people...`);
  for (const person of people) {
    await connection.execute(
      `INSERT INTO people (id, name, primaryCampusId, primaryDistrictId, status, primaryRole, lastUpdated)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         primaryCampusId = VALUES(primaryCampusId),
         primaryDistrictId = VALUES(primaryDistrictId),
         status = VALUES(status),
         primaryRole = VALUES(primaryRole)`,
      [person.id, person.name, person.campusId, person.districtId, normalizeStatus(person.status), person.role]
    );
  }

  // Insert needs
  console.log(`Inserting ${needs.length} needs...`);
  for (const need of needs) {
    await connection.execute(
      `INSERT INTO needs (id, personId, type, amount, notes, isActive)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         personId = VALUES(personId),
         type = VALUES(type),
         amount = VALUES(amount),
         notes = VALUES(notes),
         isActive = VALUES(isActive)`,
      [need.id, need.personId, need.type, need.amount ?? null, need.notes ?? null, need.isActive]
    );
  }

  // Insert notes
  console.log(`Inserting ${notes.length} notes...`);
  for (const note of notes) {
    await connection.execute(
      `INSERT INTO notes (id, personId, text, isLeaderOnly)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         personId = VALUES(personId),
         text = VALUES(text),
         isLeaderOnly = VALUES(isLeaderOnly)`,
      [note.id, note.personId, note.text, note.isLeaderOnly]
    );
  }

  console.log("Database seed completed successfully!");
  await connection.end();
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
