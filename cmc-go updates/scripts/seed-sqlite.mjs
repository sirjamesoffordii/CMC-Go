#!/usr/bin/env node
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync } from "fs";
import { 
  districts, 
  campuses, 
  people,
  needs,
  notes,
  settings,
  assignments
} from "../drizzle/schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read JSON files
const districtsData = JSON.parse(readFileSync(join(__dirname, "seed-districts.json"), "utf-8"));
const campusesData = JSON.parse(readFileSync(join(__dirname, "seed-campuses.json"), "utf-8"));
const peopleData = JSON.parse(readFileSync(join(__dirname, "seed-people.json"), "utf-8"));
const needsData = JSON.parse(readFileSync(join(__dirname, "seed-needs.json"), "utf-8"));
const notesData = JSON.parse(readFileSync(join(__dirname, "seed-notes.json"), "utf-8"));

// Connect to SQLite database
const dbPath = './data/cmc_go.db';
const dir = dirname(dbPath);
try {
  mkdirSync(dir, { recursive: true });
} catch (e) {
  // Directory might already exist
}

const sqlite = new Database(dbPath);
sqlite.pragma('foreign_keys = ON');
const db = drizzle(sqlite);

async function seed() {
  console.log("Starting SQLite database seed...");

  // Insert districts
  console.log(`Inserting ${districtsData.length} districts...`);
  for (const district of districtsData) {
    try {
      await db.insert(districts).values({
        id: district.id,
        name: district.name,
        region: district.region,
        leftNeighbor: district.leftNeighbor || null,
        rightNeighbor: district.rightNeighbor || null,
      }).onConflictDoUpdate({
        target: districts.id,
        set: {
          name: district.name,
          region: district.region,
        },
      });
    } catch (error) {
      console.warn(`Failed to insert district ${district.id}:`, error.message);
    }
  }

  // Insert campuses
  console.log(`Inserting ${campusesData.length} campuses...`);
  for (const campus of campusesData) {
    try {
      await db.insert(campuses).values({
        id: campus.id,
        name: campus.name,
        districtId: campus.districtId,
      }).onConflictDoUpdate({
        target: campuses.id,
        set: {
          name: campus.name,
          districtId: campus.districtId,
        },
      });
    } catch (error) {
      console.warn(`Failed to insert campus ${campus.id}:`, error.message);
    }
  }

  // Insert people - convert old schema to new schema
  console.log(`Inserting ${peopleData.length} people...`);
  for (const person of peopleData) {
    try {
      // Convert old schema to new schema
      // Old: { id, name, campusId, districtId, status, role, lastUpdated }
      // New: { personId, name, primaryCampusId, primaryDistrictId, status, primaryRole, statusLastUpdated }
      
      // Map old status values to new ones
      const statusMap = {
        "Going": "Yes",
        "Not Going": "No",
        "Maybe": "Maybe",
        "Not invited yet": "Not Invited",
        "Not Invited": "Not Invited",
      };
      
      const newStatus = statusMap[person.status] || "Not Invited";
      
      // Generate personId if not present (for old seed data)
      const personId = person.personId || `person_${person.id}`;
      
      await db.insert(people).values({
        personId: personId,
        name: person.name,
        primaryCampusId: person.campusId || null,
        primaryDistrictId: person.districtId || null,
        primaryRole: person.role || null,
        status: newStatus,
        statusLastUpdated: person.lastUpdated ? new Date(person.lastUpdated) : new Date(),
        createdAt: new Date(),
      }).onConflictDoUpdate({
        target: people.personId,
        set: {
          name: person.name,
          primaryCampusId: person.campusId || null,
          primaryDistrictId: person.districtId || null,
          primaryRole: person.role || null,
          status: newStatus,
          statusLastUpdated: person.lastUpdated ? new Date(person.lastUpdated) : new Date(),
        },
      });
    } catch (error) {
      console.warn(`Failed to insert person ${person.name}:`, error.message);
    }
  }

  // Insert needs - convert personId from int to string
  console.log(`Inserting ${needsData.length} needs...`);
  for (const need of needsData) {
    try {
      // Convert personId from int to string format
      const personId = typeof need.personId === 'number' 
        ? `person_${need.personId}` 
        : need.personId;
      
      await db.insert(needs).values({
        personId: personId,
        type: need.type,
        amount: need.amount || null,
        notes: need.notes || null,
        isActive: need.isActive !== undefined ? need.isActive : true,
        createdAt: need.createdAt ? new Date(need.createdAt) : new Date(),
      }).onConflictDoNothing();
    } catch (error) {
      console.warn(`Failed to insert need for person ${need.personId}:`, error.message);
    }
  }

  // Insert notes - convert personId from int to string
  console.log(`Inserting ${notesData.length} notes...`);
  for (const note of notesData) {
    try {
      // Convert personId from int to string format
      const personId = typeof note.personId === 'number' 
        ? `person_${note.personId}` 
        : note.personId;
      
      await db.insert(notes).values({
        personId: personId,
        text: note.text,
        isLeaderOnly: note.isLeaderOnly || false,
        createdAt: note.createdAt ? new Date(note.createdAt) : new Date(),
      }).onConflictDoNothing();
    } catch (error) {
      console.warn(`Failed to insert note for person ${note.personId}:`, error.message);
    }
  }

  console.log("Seed completed successfully!");
  
  // Print summary
  const districtCount = await db.select().from(districts);
  const peopleCount = await db.select().from(people);
  const campusCount = await db.select().from(campuses);
  
  console.log(`\nDatabase summary:`);
  console.log(`  Districts: ${districtCount.length}`);
  console.log(`  Campuses: ${campusCount.length}`);
  console.log(`  People: ${peopleCount.length}`);
}

seed()
  .then(() => {
    sqlite.close();
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    sqlite.close();
    process.exit(1);
  });

