#!/usr/bin/env node
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { 
  districts, 
  campuses, 
  people,
} from "../drizzle/schema.ts";
import { sql } from "drizzle-orm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = './data/cmc_go.db';
const dir = dirname(dbPath);
try {
  mkdirSync(dir, { recursive: true });
} catch (e) {
  // Directory might already exist
}

const sqlite = new Database(dbPath);
sqlite.pragma('foreign_keys = ON');

// Check if people table has the correct schema (has depositPaid column)
const peopleTableInfo = sqlite.prepare("PRAGMA table_info(people)").all();
const hasDepositPaid = peopleTableInfo.some((col) => col.name === 'depositPaid');

// If tables don't exist or have wrong schema, recreate them
const hasDistricts = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='districts'").get();
if (!hasDistricts || !hasDepositPaid) {
  console.log("Initializing/updating database schema...");
  
  // Drop existing tables if they have wrong schema
  if (hasDistricts && !hasDepositPaid) {
    console.log("Dropping old tables to recreate with correct schema...");
    sqlite.exec(`
      DROP TABLE IF EXISTS notes;
      DROP TABLE IF EXISTS needs;
      DROP TABLE IF EXISTS assignments;
      DROP TABLE IF EXISTS people;
      DROP TABLE IF EXISTS campuses;
      DROP TABLE IF EXISTS districts;
      DROP TABLE IF EXISTS settings;
      DROP TABLE IF EXISTS users;
    `);
  }
  
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      openId TEXT(64) NOT NULL UNIQUE,
      name TEXT,
      email TEXT(320),
      loginMethod TEXT(64),
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
      createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updatedAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      lastSignedIn INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS districts (
      id TEXT(64) PRIMARY KEY,
      name TEXT(255) NOT NULL,
      region TEXT(255) NOT NULL,
      leftNeighbor TEXT(64),
      rightNeighbor TEXT(64)
    );

    CREATE TABLE IF NOT EXISTS campuses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT(255) NOT NULL,
      districtId TEXT(64) NOT NULL,
      FOREIGN KEY (districtId) REFERENCES districts(id)
    );

    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      personId TEXT(64) NOT NULL UNIQUE,
      name TEXT(255) NOT NULL,
      primaryRole TEXT(255),
      primaryCampusId INTEGER,
      primaryDistrictId TEXT(64),
      primaryRegion TEXT(255),
      nationalCategory TEXT(255),
      status TEXT NOT NULL DEFAULT 'Not Invited' CHECK(status IN ('Yes', 'Maybe', 'No', 'Not Invited')),
      depositPaid INTEGER NOT NULL DEFAULT 0 CHECK(depositPaid IN (0, 1)),
      statusLastUpdated INTEGER,
      statusLastUpdatedBy TEXT(255),
      needs TEXT,
      notes TEXT,
      createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (primaryCampusId) REFERENCES campuses(id),
      FOREIGN KEY (primaryDistrictId) REFERENCES districts(id)
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      personId TEXT(64) NOT NULL,
      assignmentType TEXT NOT NULL CHECK(assignmentType IN ('Campus', 'District', 'Region', 'National')),
      roleTitle TEXT(255) NOT NULL,
      campusId INTEGER,
      districtId TEXT(64),
      region TEXT(255),
      isPrimary INTEGER NOT NULL DEFAULT 0 CHECK(isPrimary IN (0, 1)),
      createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (personId) REFERENCES people(personId),
      FOREIGN KEY (campusId) REFERENCES campuses(id),
      FOREIGN KEY (districtId) REFERENCES districts(id)
    );

    CREATE TABLE IF NOT EXISTS needs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      personId TEXT(64) NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('Financial', 'Other')),
      amount INTEGER,
      notes TEXT,
      isActive INTEGER NOT NULL DEFAULT 1 CHECK(isActive IN (0, 1)),
      createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (personId) REFERENCES people(personId)
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      personId TEXT(64) NOT NULL,
      text TEXT NOT NULL,
      isLeaderOnly INTEGER NOT NULL DEFAULT 0 CHECK(isLeaderOnly IN (0, 1)),
      createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (personId) REFERENCES people(personId)
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT(255) NOT NULL UNIQUE,
      value TEXT NOT NULL,
      updatedAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `);
  console.log("Schema initialized/updated successfully");
}

const db = drizzle(sqlite);

// Load all districts from seed file
const allDistricts = JSON.parse(readFileSync(join(__dirname, "seed-districts.json"), "utf-8"));

// Generate sample names for variety
const firstNames = ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Avery", "Quinn", "Sage", "River", "Dakota", "Phoenix", "Blake", "Cameron", "Drew", "Emery", "Finley", "Harper", "Hayden", "Jamie", "Sam", "Chris", "Pat", "Dana", "Kim", "Leslie", "Robin", "Terry", "Jesse", "Logan"];
const lastNames = ["Anderson", "Brown", "Davis", "Garcia", "Harris", "Jackson", "Johnson", "Jones", "Lee", "Martinez", "Miller", "Moore", "Robinson", "Smith", "Taylor", "Thomas", "Thompson", "Walker", "White", "Williams", "Wilson", "Wright", "Young", "Adams", "Baker", "Clark", "Collins", "Evans", "Green", "Hall"];

// Campus name suffixes
const campusSuffixes = ["Central", "North", "South", "East", "West", "Main", "Downtown", "University", "Community", "First", "Second", "Third", "Park", "Valley", "Ridge", "Hills", "Lake", "River", "Springs", "Heights"];

// Generate bell curve distribution for campuses
// Returns number of campuses for a district based on its position in the list
function getCampusCountForDistrict(districtIndex, totalDistricts) {
  // Normalize index to 0-1 range
  const normalizedIndex = districtIndex / (totalDistricts - 1);
  
  // Bell curve: use normal distribution approximation
  // Center districts get more campuses, edge districts get fewer
  // Using a simple bell curve: 1 - 4*(x-0.5)^2 gives a nice curve
  const bellCurveValue = 1 - 4 * Math.pow(normalizedIndex - 0.5, 2);
  
  // Scale to get campus count between 2 and 10
  // bellCurveValue ranges from 0 to 1, so:
  const minCampuses = 2;
  const maxCampuses = 10;
  const campusCount = Math.round(minCampuses + (maxCampuses - minCampuses) * bellCurveValue);
  
  return Math.max(minCampuses, Math.min(maxCampuses, campusCount));
}

// Generate campuses for all districts with bell curve distribution
function generateCampusesForDistricts(districts, targetTotal = 300) {
  const allCampuses = [];
  
  // First pass: calculate how many campuses each district should get
  let campusCounts = districts.map((district, index) => {
    return getCampusCountForDistrict(index, districts.length);
  });
  
  // Adjust to hit target total exactly
  let currentTotal = campusCounts.reduce((sum, count) => sum + count, 0);
  let adjustment = targetTotal - currentTotal;
  
  // Keep adjusting until we hit the target
  while (adjustment !== 0) {
    // Sort districts by distance from center (prioritize middle districts)
    const sortedIndices = districts.map((_, i) => i)
      .sort((a, b) => {
        const aDist = Math.abs(a / districts.length - 0.5);
        const bDist = Math.abs(b / districts.length - 0.5);
        return aDist - bDist; // Closer to center first
      });
    
    const adjustPerDistrict = Math.sign(adjustment);
    const adjustCount = Math.min(Math.abs(adjustment), sortedIndices.length);
    
    for (let i = 0; i < adjustCount; i++) {
      const idx = sortedIndices[i];
      const newCount = campusCounts[idx] + adjustPerDistrict;
      if (newCount >= 2 && newCount <= 10) {
        campusCounts[idx] = newCount;
      }
    }
    
    currentTotal = campusCounts.reduce((sum, count) => sum + count, 0);
    adjustment = targetTotal - currentTotal;
    
    // Safety check to prevent infinite loop
    if (Math.abs(adjustment) < 5) {
      // If we're close, just adjust a few more districts
      break;
    }
  }
  
  // Final adjustment if still not exact
  if (adjustment !== 0) {
    const sortedIndices = districts.map((_, i) => i)
      .sort((a, b) => {
        const aDist = Math.abs(a / districts.length - 0.5);
        const bDist = Math.abs(b / districts.length - 0.5);
        return aDist - bDist;
      });
    
    for (let i = 0; i < Math.abs(adjustment) && i < sortedIndices.length; i++) {
      const idx = sortedIndices[i];
      if (adjustment > 0 && campusCounts[idx] < 10) {
        campusCounts[idx]++;
      } else if (adjustment < 0 && campusCounts[idx] > 2) {
        campusCounts[idx]--;
      }
    }
  }
  
  // Generate campuses for each district
  districts.forEach((district, districtIndex) => {
    const numCampuses = campusCounts[districtIndex];
    
    for (let i = 0; i < numCampuses; i++) {
      const suffix = campusSuffixes[i % campusSuffixes.length];
      const campusName = `${district.name} ${suffix}`;
      
      allCampuses.push({
        name: campusName,
        districtId: district.id,
      });
    }
  });
  
  return allCampuses;
}

// Generate people - 1100 total, distributed across districts and campuses
function generatePeople(districts, campuses, targetTotal = 1100) {
  const allPeople = [];
  const statuses = ["Yes", "Maybe", "No", "Not Invited"];
  
  // Group campuses by district
  const campusesByDistrict = new Map();
  campuses.forEach((campus) => {
    if (!campusesByDistrict.has(campus.districtId)) {
      campusesByDistrict.set(campus.districtId, []);
    }
    campusesByDistrict.get(campus.districtId).push(campus);
  });
  
  // Count total campuses for weighting
  const totalCampuses = campuses.length;
  
  // Ensure every district gets at least 5 people minimum
  const MIN_PEOPLE_PER_DISTRICT = 5;
  
  // Calculate people per district based on campus count (weighted distribution)
  // First, assign minimum to all districts
  const peopleCounts = districts.map(district => {
    return MIN_PEOPLE_PER_DISTRICT;
  });
  
  // Calculate remaining people to distribute
  const remainingPeople = targetTotal - (MIN_PEOPLE_PER_DISTRICT * districts.length);
  
  // Distribute remaining people proportionally based on campus count
  if (remainingPeople > 0) {
    districts.forEach((district, index) => {
      const districtCampuses = campusesByDistrict.get(district.id) || [];
      // Weight by campus count
      const weight = districtCampuses.length / totalCampuses;
      const additionalPeople = Math.round(remainingPeople * weight);
      peopleCounts[index] += additionalPeople;
    });
  }
  
  // Adjust to hit exactly targetTotal
  let currentTotal = peopleCounts.reduce((sum, count) => sum + count, 0);
  let adjustment = targetTotal - currentTotal;
  
  // Distribute adjustment
  if (adjustment !== 0) {
    // Sort by current count (adjust smaller districts first if adding, larger first if subtracting)
    const sortedIndices = districts.map((_, i) => i)
      .sort((a, b) => {
        if (adjustment > 0) {
          return peopleCounts[a] - peopleCounts[b]; // Increase smaller first
        } else {
          return peopleCounts[b] - peopleCounts[a]; // Decrease larger first
        }
      });
    
    const adjustCount = Math.min(Math.abs(adjustment), sortedIndices.length);
    for (let i = 0; i < adjustCount; i++) {
      const idx = sortedIndices[i];
      peopleCounts[idx] += Math.sign(adjustment);
      peopleCounts[idx] = Math.max(MIN_PEOPLE_PER_DISTRICT, peopleCounts[idx]);
    }
  }
  
  let personCounter = 1;
  
  districts.forEach((district, districtIndex) => {
    const districtCampuses = campusesByDistrict.get(district.id) || [];
    const numPeople = peopleCounts[districtIndex];
    
    // Assign 80% to campuses, 20% to district-only
    const campusPeople = Math.floor(numPeople * 0.8);
    const districtOnlyPeople = numPeople - campusPeople;
    
    // Assign people to campuses
    if (districtCampuses.length > 0 && campusPeople > 0) {
      const peoplePerCampus = Math.floor(campusPeople / districtCampuses.length);
      const campusRemainder = campusPeople % districtCampuses.length;
      
      districtCampuses.forEach((campus, campusIndex) => {
        const peopleForCampus = peoplePerCampus + (campusIndex < campusRemainder ? 1 : 0);
        
        for (let i = 0; i < peopleForCampus && personCounter <= targetTotal; i++) {
          const firstName = firstNames[(personCounter * 7 + i * 3) % firstNames.length];
          const lastName = lastNames[(personCounter * 11 + i * 5) % lastNames.length];
          const status = statuses[(personCounter + i) % statuses.length];
          
          allPeople.push({
            personId: `dev_person_${personCounter}`,
            name: `${firstName} ${lastName}`,
            districtId: district.id,
            campusId: campus.id, // Will be set after campus is inserted
            campusName: campus.name,
            status: status,
          });
          
          personCounter++;
        }
      });
    }
    
    // Add district-only people
    for (let i = 0; i < districtOnlyPeople && personCounter <= targetTotal; i++) {
      const firstName = firstNames[(personCounter * 7 + i * 3) % firstNames.length];
      const lastName = lastNames[(personCounter * 11 + i * 5) % lastNames.length];
      const status = statuses[(personCounter + i) % statuses.length];
      
      allPeople.push({
        personId: `dev_person_${personCounter}`,
        name: `${firstName} ${lastName}`,
        districtId: district.id,
        campusId: null,
        status: status,
      });
      
      personCounter++;
    }
  });
  
  // Trim to exact target if we went over
  return allPeople.slice(0, targetTotal);
}

async function seed() {
  console.log("Seeding dev data for all districts...");
  
  // Clear existing dev data (but keep districts)
  console.log("Clearing existing campuses and people...");
  try {
    await db.delete(people).where(sql`personId LIKE 'dev_%'`);
    await db.delete(campuses);
    console.log("Cleared existing dev data");
  } catch (error) {
    console.warn("Note: Some existing data may remain:", error.message);
  }

  // Insert all districts
  console.log(`Inserting ${allDistricts.length} districts...`);
  for (const district of allDistricts) {
    try {
      await db.insert(districts).values({
        id: district.id,
        name: district.name,
        region: district.region,
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

  // Generate campuses with bell curve distribution
  console.log("Generating 300 campuses with bell curve distribution...");
  const allCampuses = generateCampusesForDistricts(allDistricts, 300);
  console.log(`Generated ${allCampuses.length} campuses`);

  // Insert campuses
  console.log(`Inserting ${allCampuses.length} campuses...`);
  const campusIdMap = new Map(); // Map campus name+district to inserted ID
  let campusInsertCount = 0;
  
  for (const campus of allCampuses) {
    try {
      const result = await db.insert(campuses).values({
        name: campus.name,
        districtId: campus.districtId,
      }).onConflictDoNothing().returning({ id: campuses.id });
      
      // Get the inserted ID (or existing ID if conflict)
      if (result && result.length > 0) {
        campus.id = result[0].id;
        campusIdMap.set(`${campus.districtId}_${campus.name}`, result[0].id);
        campusInsertCount++;
      } else {
        // Campus already exists, fetch its ID
        const existing = await db.select().from(campuses)
          .where(sql`name = ${campus.name} AND districtId = ${campus.districtId}`)
          .limit(1);
        if (existing.length > 0) {
          campus.id = existing[0].id;
          campusIdMap.set(`${campus.districtId}_${campus.name}`, existing[0].id);
        }
      }
    } catch (error) {
      console.warn(`Failed to insert campus ${campus.name}:`, error.message);
    }
  }
  
  console.log(`Inserted ${campusInsertCount} new campuses`);

  // Generate 1100 people
  console.log("Generating 1100 people...");
  const allPeople = generatePeople(allDistricts, allCampuses, 1100);
  
  // Update campus IDs in people array
  allPeople.forEach(person => {
    if (person.campusName) {
      const campusKey = `${person.districtId}_${person.campusName}`;
      person.campusId = campusIdMap.get(campusKey) || null;
    }
  });

  console.log(`Inserting ${allPeople.length} people...`);
  let successCount = 0;
  let errorCount = 0;
  
  for (const person of allPeople) {
    try {
      await db.insert(people).values({
        personId: person.personId,
        name: person.name,
        primaryDistrictId: person.districtId,
        primaryCampusId: person.campusId || null,
        status: person.status,
        createdAt: new Date(),
        statusLastUpdated: new Date(),
      }).onConflictDoUpdate({
        target: people.personId,
        set: {
          name: person.name,
          primaryDistrictId: person.districtId,
          primaryCampusId: person.campusId || null,
          status: person.status,
          statusLastUpdated: new Date(),
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

  console.log("\nDev seed completed!");
  
  // Print summary with status breakdown
  const districtCount = await db.select().from(districts);
  const campusCount = await db.select().from(campuses);
  const allPeopleData = await db.select().from(people);
  
  const statusCounts = {
    "Yes": allPeopleData.filter(p => p.status === "Yes").length,
    "Maybe": allPeopleData.filter(p => p.status === "Maybe").length,
    "No": allPeopleData.filter(p => p.status === "No").length,
    "Not Invited": allPeopleData.filter(p => p.status === "Not Invited").length,
  };
  
  // Count people with and without campuses
  const peopleWithCampus = allPeopleData.filter(p => p.primaryCampusId !== null).length;
  const peopleDistrictOnly = allPeopleData.filter(p => p.primaryCampusId === null).length;
  
  // Verify every district has people
  const districtsWithPeople = new Set(allPeopleData.map(p => p.primaryDistrictId).filter(Boolean));
  const districtsWithoutPeople = districtCount.filter(d => !districtsWithPeople.has(d.id));
  
  console.log(`\nDatabase summary:`);
  console.log(`  Districts: ${districtCount.length}`);
  console.log(`  Campuses: ${campusCount.length}`);
  console.log(`  People: ${allPeopleData.length}`);
  console.log(`    - With campus: ${peopleWithCampus}`);
  console.log(`    - District-only: ${peopleDistrictOnly}`);
  console.log(`  Status breakdown:`);
  console.log(`    - Going (Yes): ${statusCounts["Yes"]}`);
  console.log(`    - Maybe: ${statusCounts["Maybe"]}`);
  console.log(`    - Not Going (No): ${statusCounts["No"]}`);
  console.log(`    - Not Invited: ${statusCounts["Not Invited"]}`);
  
  if (districtsWithoutPeople.length > 0) {
    console.log(`\n⚠️  WARNING: ${districtsWithoutPeople.length} districts have no people:`);
    districtsWithoutPeople.forEach(d => console.log(`    - ${d.name} (${d.id})`));
    console.log(`\nAdding people to districts without data...`);
    
    // Add at least 5 people to each district without people
    let personCounter = allPeopleData.length + 1;
    for (const district of districtsWithoutPeople) {
      const districtCampuses = await db.select().from(campuses)
        .where(sql`districtId = ${district.id}`)
        .limit(1);
      
      for (let i = 0; i < 5; i++) {
        const firstName = firstNames[(personCounter * 7 + i * 3) % firstNames.length];
        const lastName = lastNames[(personCounter * 11 + i * 5) % lastNames.length];
        const status = statuses[(personCounter + i) % statuses.length];
        
        try {
          await db.insert(people).values({
            personId: `dev_person_${personCounter}`,
            name: `${firstName} ${lastName}`,
            primaryDistrictId: district.id,
            primaryCampusId: districtCampuses.length > 0 ? districtCampuses[0].id : null,
            status: status,
            createdAt: new Date(),
            statusLastUpdated: new Date(),
          });
          personCounter++;
        } catch (error) {
          console.warn(`Failed to add person to ${district.name}:`, error.message);
        }
      }
    }
    
    console.log(`Added people to ${districtsWithoutPeople.length} districts.`);
  } else {
    console.log(`\n✅ All districts have people assigned.`);
  }
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

