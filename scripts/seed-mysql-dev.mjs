#!/usr/bin/env node
import { drizzle } from "drizzle-orm/mysql2";
import { eq, and } from "drizzle-orm";
import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { 
  districts, 
  campuses, 
  people,
} from "../drizzle/schema.ts";

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Production safeguard
if (process.env.APP_ENV === 'production') {
  console.error('❌ Cannot run seed script in production environment!');
  console.error('Set APP_ENV to something other than "production" to proceed.');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const connection = await mysql.createConnection(connectionString);
const db = drizzle(connection);

// Load all districts from seed file
const allDistricts = JSON.parse(readFileSync(join(__dirname, "seed-districts.json"), "utf-8"));

// Generate sample names for variety
const firstNames = ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Avery", "Quinn", "Sage", "River", "Dakota", "Phoenix", "Blake", "Cameron", "Drew", "Emery", "Finley", "Harper", "Hayden", "Jamie"];
const lastNames = ["Anderson", "Brown", "Davis", "Garcia", "Harris", "Jackson", "Johnson", "Jones", "Lee", "Martinez", "Miller", "Moore", "Robinson", "Smith", "Taylor", "Thomas", "Thompson", "Walker", "White", "Williams"];
const campusSuffixes = ["Central", "North", "South", "East", "West", "Main", "Downtown", "University", "Community", "First"];

async function seed() {
  console.log("Seeding MySQL database with dev data...");
  
  // Insert districts (first 20 for quick setup)
  const districtsToSeed = allDistricts.slice(0, 20);
  console.log(`Inserting ${districtsToSeed.length} districts...`);
  
  for (const district of districtsToSeed) {
    try {
      await db.insert(districts).values({
        id: district.id,
        name: district.name,
        region: district.region,
      }).onDuplicateKeyUpdate({
        set: {
          name: district.name,
          region: district.region,
        },
      });
    } catch (error) {
      console.warn(`Failed to insert district ${district.id}:`, error.message);
    }
  }

  // Generate and insert campuses (2-3 per district)
  console.log("Generating campuses...");
  const allCampuses = [];
  for (const district of districtsToSeed) {
    const numCampuses = 2 + Math.floor(Math.random() * 2); // 2-3 campuses
    for (let i = 0; i < numCampuses; i++) {
      const suffix = campusSuffixes[i % campusSuffixes.length];
      allCampuses.push({
        name: `${district.name} ${suffix}`,
        districtId: district.id,
      });
    }
  }

  console.log(`Inserting ${allCampuses.length} campuses...`);
  const campusIdMap = new Map();
  
  for (const campus of allCampuses) {
    try {
      const result = await db.insert(campuses).values({
        name: campus.name,
        districtId: campus.districtId,
      }).onDuplicateKeyUpdate({
        set: {
          name: campus.name,
        },
      });
      
      // Get the inserted ID
      const inserted = await db.select().from(campuses)
        .where(and(
          eq(campuses.name, campus.name),
          eq(campuses.districtId, campus.districtId)
        ))
        .limit(1);
      
      if (inserted.length > 0) {
        campus.id = inserted[0].id;
        campusIdMap.set(`${campus.districtId}_${campus.name}`, inserted[0].id);
      }
    } catch (error) {
      console.warn(`Failed to insert campus ${campus.name}:`, error.message);
    }
  }

  // Generate people (about 5-10 per district, ~150 total)
  console.log("Generating people...");
  const allPeople = [];
  const statuses = ["Yes", "Maybe", "No", "Not Invited"];
  let personCounter = 1;

  for (const district of districtsToSeed) {
    const numPeople = 5 + Math.floor(Math.random() * 6); // 5-10 people per district
    const districtCampuses = Array.from(campusIdMap.entries())
      .filter(([key]) => key.startsWith(`${district.id}_`))
      .map(([_, id]) => id);
    
    for (let i = 0; i < numPeople; i++) {
      const firstName = firstNames[(personCounter * 7 + i * 3) % firstNames.length];
      const lastName = lastNames[(personCounter * 11 + i * 5) % lastNames.length];
      const status = statuses[(personCounter + i) % statuses.length];
      const campusId = districtCampuses.length > 0 && Math.random() > 0.2 
        ? districtCampuses[Math.floor(Math.random() * districtCampuses.length)]
        : null;
      
      allPeople.push({
        personId: `dev_person_${personCounter}`,
        name: `${firstName} ${lastName}`,
        primaryDistrictId: district.id,
        primaryCampusId: campusId,
        primaryRegion: district.region,
        status: status,
        createdAt: new Date(),
        statusLastUpdated: new Date(),
      });
      
      personCounter++;
    }
  }

  console.log(`Inserting ${allPeople.length} people...`);
  let successCount = 0;
  let errorCount = 0;
  
  for (const person of allPeople) {
    try {
      await db.insert(people).values(person).onDuplicateKeyUpdate({
        set: {
          name: person.name,
          primaryDistrictId: person.primaryDistrictId,
          primaryCampusId: person.primaryCampusId,
          status: person.status,
          statusLastUpdated: person.statusLastUpdated,
        },
      });
      successCount++;
    } catch (error) {
      console.warn(`Failed to insert person ${person.name}:`, error.message);
      errorCount++;
    }
  }

  if (errorCount > 0) {
    console.warn(`\nWarning: ${errorCount} people failed to insert`);
  }

  console.log("\n✅ Dev seed completed!");
  
  // Print summary
  const districtCount = await db.select().from(districts);
  const campusCount = await db.select().from(campuses);
  const allPeopleData = await db.select().from(people);
  
  const statusCounts = {
    "Yes": allPeopleData.filter(p => p.status === "Yes").length,
    "Maybe": allPeopleData.filter(p => p.status === "Maybe").length,
    "No": allPeopleData.filter(p => p.status === "No").length,
    "Not Invited": allPeopleData.filter(p => p.status === "Not Invited").length,
  };
  
  console.log(`\nDatabase summary:`);
  console.log(`  Districts: ${districtCount.length}`);
  console.log(`  Campuses: ${campusCount.length}`);
  console.log(`  People: ${allPeopleData.length}`);
  console.log(`  Status breakdown:`);
  console.log(`    - Going (Yes): ${statusCounts["Yes"]}`);
  console.log(`    - Maybe: ${statusCounts["Maybe"]}`);
  console.log(`    - Not Going (No): ${statusCounts["No"]}`);
  console.log(`    - Not Invited: ${statusCounts["Not Invited"]}`);
}

seed()
  .then(() => {
    connection.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    connection.end();
    process.exit(1);
  });

