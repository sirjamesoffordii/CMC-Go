#!/usr/bin/env node
/**
 * Seed script to add Texas and New Mexico campuses and people
 * Run with: node scripts/seed-texas-new-mexico.mjs
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { campuses, people, districts } from "../drizzle/schema.ts";
import { eq, and } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

// Districts to ensure exist
const DISTRICTS = [
  { id: "SouthTexas", name: "South Texas", region: "Texico" },
  { id: "NorthTexas", name: "North Texas", region: "Texico" },
  { id: "WestTexas", name: "West Texas", region: "Texico" },
  { id: "NewMexico", name: "New Mexico", region: "Texico" },
];

// Data structure: { districtId: { campusName: [people] } }
const DATA = {
  SouthTexas: {
    _districtDirector: "Jake Lefner",
    "University of Houston": [
      { name: "Matthew Hoogendorn", role: "Campus Director" },
    ],
    "Sam Houston State University": [
      { name: "Colin Weezer", role: "Campus Director" },
    ],
    "Lamar University": [{ name: "Andy Jirrels", role: "Campus Director" }],
    "Prairie View A&M University": [
      { name: "Sir James Offord", role: "Campus Director" },
      { name: "Moriah Offord", role: "Campus Co-Director" },
      { name: "Cam", role: "Staff" },
      { name: "Jada", role: "Staff" },
      { name: "Zoe", role: "Staff" },
      { name: "Destiny", role: "Staff" },
    ],
    "University of Texas at San Antonio": [
      { name: "Johnny Hauk", role: "Campus Director" },
      { name: "Amy Hauk", role: "Campus Co-Director" },
    ],
    "Texas A&M University-Kingsville": [
      { name: "Makaela Waters", role: "Campus Director" },
    ],
    "Texas A&M University-Corpus Christi": [
      { name: "Derrick Bruce", role: "Campus Director" },
      { name: "Marrisa Bruce", role: "Campus Co-Director" },
    ],
    "University of Texas Rio Grande Valley (Brownsville)": [
      { name: "Dane", role: "Campus Director" },
    ],
  },
  NorthTexas: {
    _districtDirector: "Dick Herman",
    "Texas Christian University": [
      { name: "Andrew Youngblood", role: "Campus Director" },
      { name: "Alicia Youngblood", role: "Campus Co-Director" },
    ],
    "University of North Texas": [{ name: "Haley", role: "Campus Director" }],
    "Texas Woman's University": [{ name: "Alyssa", role: "Campus Director" }],
    "University of Texas at Arlington": [],
    "University of Texas at Austin": [],
    "Texas State University": [{ name: "Paige", role: "Campus Director" }],
    "Stephen F. Austin State University": [
      { name: "Derrick", role: "Campus Director" },
    ],
    "Midwestern State University": [
      { name: "Kristin", role: "Campus Director" },
    ],
    "Angelo State University": [{ name: "Scroggins", role: "Campus Director" }],
  },
  WestTexas: {
    _districtDirector: "Renay Little",
    "Texas Tech University": [{ name: "Nick Hester", role: "Campus Director" }],
    "West Texas A&M University": [{ name: "Joshua", role: "Campus Director" }],
  },
  NewMexico: {
    _districtDirector: "Justin Vistine",
    "New Mexico Highlands University": [
      { name: "Cooper", role: "Campus Director" },
    ],
    "Eastern New Mexico University": [
      { name: "Justin Vinstine", role: "Campus Director" },
    ],
  },
};

// Generate unique personId
function generatePersonId(name, districtId, campusName) {
  const cleanName = name.replace(/[^a-zA-Z]/g, "").toLowerCase();
  const cleanCampus = campusName
    ? campusName
        .replace(/[^a-zA-Z]/g, "")
        .substring(0, 10)
        .toLowerCase()
    : "district";
  return `${districtId.toLowerCase()}-${cleanCampus}-${cleanName}-${Date.now().toString(36)}`;
}

async function ensureDistrictsExist() {
  console.log("Ensuring districts exist...");
  for (const district of DISTRICTS) {
    const existing = await db
      .select()
      .from(districts)
      .where(eq(districts.id, district.id));
    if (existing.length === 0) {
      await db.insert(districts).values(district);
      console.log(`  Created district: ${district.name}`);
    } else {
      console.log(`  District exists: ${district.name}`);
    }
  }
}

async function getOrCreateCampus(campusName, districtId) {
  // Check if campus already exists
  const existing = await db
    .select()
    .from(campuses)
    .where(
      and(eq(campuses.name, campusName), eq(campuses.districtId, districtId))
    );

  if (existing.length > 0) {
    console.log(`  Campus exists: ${campusName} (id=${existing[0].id})`);
    return existing[0].id;
  }

  // Create new campus
  const result = await db.insert(campuses).values({
    name: campusName,
    districtId: districtId,
    displayOrder: 0,
  });

  const insertId = result[0].insertId;
  console.log(`  Created campus: ${campusName} (id=${insertId})`);
  return insertId;
}

async function createPersonIfNotExists(
  personData,
  campusId,
  districtId,
  region
) {
  // Check if person with same name exists in same campus/district
  const existing = await db
    .select()
    .from(people)
    .where(
      and(
        eq(people.name, personData.name),
        eq(people.primaryDistrictId, districtId),
        campusId ? eq(people.primaryCampusId, campusId) : undefined
      )
    );

  if (existing.length > 0) {
    console.log(`    Person exists: ${personData.name}`);
    return;
  }

  const personId = generatePersonId(
    personData.name,
    districtId,
    campusId ? "campus" : null
  );

  await db.insert(people).values({
    personId,
    name: personData.name,
    primaryRole: personData.role,
    primaryCampusId: campusId,
    primaryDistrictId: districtId,
    primaryRegion: region,
    status: "Not Invited",
  });

  console.log(`    Created person: ${personData.name} (${personData.role})`);
}

async function main() {
  console.log(
    "Starting seed for Texas and New Mexico campuses and people...\n"
  );

  await ensureDistrictsExist();
  console.log("");

  for (const [districtId, districtData] of Object.entries(DATA)) {
    const district = DISTRICTS.find(d => d.id === districtId);
    console.log(`\n=== ${district.name} ===`);

    // Add district director
    if (districtData._districtDirector) {
      console.log(
        `  Adding District Director: ${districtData._districtDirector}`
      );
      await createPersonIfNotExists(
        { name: districtData._districtDirector, role: "District Director" },
        null, // no campus for district director
        districtId,
        district.region
      );
    }

    // Add campuses and their people
    for (const [campusName, peopleList] of Object.entries(districtData)) {
      if (campusName.startsWith("_")) continue; // Skip meta fields

      console.log(`\n  Campus: ${campusName}`);
      const campusId = await getOrCreateCampus(campusName, districtId);

      for (const person of peopleList) {
        await createPersonIfNotExists(
          person,
          campusId,
          districtId,
          district.region
        );
      }
    }
  }

  console.log("\n✅ Seed complete!");
  await connection.end();
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
