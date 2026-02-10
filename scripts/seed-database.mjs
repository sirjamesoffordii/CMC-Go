#!/usr/bin/env node
/**
 * Comprehensive database seeding script for CMC Go
 * Seeds: districts, campuses, people, needs, notes, assignments, settings
 *
 * Usage:
 *   pnpm db:seed
 *   node scripts/seed-database.mjs
 */

import { drizzle } from "drizzle-orm/mysql2";
import { eq, and } from "drizzle-orm";
import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { checkNotDemoDatabase } from "./utils/check-demo-db.mjs";
import {
  districts,
  campuses,
  people,
  needs,
  notes,
  assignments,
  settings,
} from "../drizzle/schema.ts";

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Production safeguard
if (process.env.APP_ENV === "production") {
  console.error("❌ Cannot run seed script in production environment!");
  console.error('Set APP_ENV to something other than "production" to proceed.');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL environment variable is required");
  console.error("Please set DATABASE_URL in your .env file");
  console.error(
    "Format: DATABASE_URL=mysql://user:password@host:port/database"
  );
  process.exit(1);
}

// Prevent running against Railway demo DB
checkNotDemoDatabase(connectionString, "db:seed");

// Test database connection first
let connection;
let db;

async function testConnection() {
  try {
    console.log("🔌 Testing database connection...");
    connection = await mysql.createConnection(connectionString);
    await connection.query("SELECT 1");
    db = drizzle(connection);
    console.log("✅ Database connection successful\n");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    console.error("\nPlease check:");
    console.error("  1. DATABASE_URL is correct");
    console.error("  2. Database server is running");
    console.error("  3. Database exists");
    console.error("  4. User has proper permissions");
    return false;
  }
}

// Load seed data
let allDistricts;
try {
  allDistricts = JSON.parse(
    readFileSync(join(__dirname, "seed-districts.json"), "utf-8")
  );
  console.log(`📂 Loaded ${allDistricts.length} districts from seed file\n`);
} catch (error) {
  console.error("❌ Failed to load seed-districts.json:", error.message);
  process.exit(1);
}

// Generate sample names for variety
const firstNames = [
  "Alex",
  "Jordan",
  "Taylor",
  "Morgan",
  "Casey",
  "Riley",
  "Avery",
  "Quinn",
  "Sage",
  "River",
  "Dakota",
  "Phoenix",
  "Blake",
  "Cameron",
  "Drew",
  "Emery",
  "Finley",
  "Harper",
  "Hayden",
  "Jamie",
];
const lastNames = [
  "Anderson",
  "Brown",
  "Davis",
  "Garcia",
  "Harris",
  "Jackson",
  "Johnson",
  "Jones",
  "Lee",
  "Martinez",
  "Miller",
  "Moore",
  "Robinson",
  "Smith",
  "Taylor",
  "Thomas",
  "Thompson",
  "Walker",
  "White",
  "Williams",
];
const campusSuffixes = [
  "Central",
  "North",
  "South",
  "East",
  "West",
  "Main",
  "Downtown",
  "University",
  "Community",
  "First",
];
const roles = [
  "Campus Director",
  "Campus Co-Director",
  "Campus Staff",
  "Campus Intern",
  "Campus Volunteer",
  "District Director",
  "Regional Director",
];

// Status enum values from schema.ts
const statuses = ["Yes", "Maybe", "No", "Not Invited"];

async function seed() {
  console.log("🌱 Seeding MySQL database with dev data...\n");

  try {
    // 1. Insert districts (first 20 for quick setup, or all if you want)
    const districtsToSeed = allDistricts.slice(0, 20);
    console.log(`📋 Inserting ${districtsToSeed.length} districts...`);

    let districtsInserted = 0;
    for (const district of districtsToSeed) {
      try {
        await db
          .insert(districts)
          .values({
            id: district.id,
            name: district.name,
            region: district.region,
            leftNeighbor: null,
            rightNeighbor: null,
          })
          .onDuplicateKeyUpdate({
            set: {
              name: district.name,
              region: district.region,
            },
          });
        districtsInserted++;
      } catch (error) {
        console.warn(
          `⚠️  Failed to insert district ${district.id}:`,
          error.message
        );
      }
    }
    console.log(`✅ Inserted/updated ${districtsInserted} districts\n`);

    // 1b. Ensure National Team (XAN) exists as a first-class district
    console.log("🏛️  Ensuring XAN (National Team) district exists...");
    await db
      .insert(districts)
      .values({
        id: "XAN",
        name: "National Team",
        region: "National Team",
        leftNeighbor: null,
        rightNeighbor: null,
      })
      .onDuplicateKeyUpdate({
        set: { name: "National Team", region: "National Team" },
      });
    console.log("✅ XAN district ready\n");

    // 2. Generate and insert campuses (2-3 per district)
    console.log("🏫 Generating campuses...");
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

    // Deliverable 2: Add national campuses inside XAN
    allCampuses.push(
      { name: "National Office", districtId: "XAN" },
      { name: "Regional Directors", districtId: "XAN" }
    );

    console.log(`📋 Inserting ${allCampuses.length} campuses...`);
    const campusIdMap = new Map();
    let campusesInserted = 0;

    for (const campus of allCampuses) {
      try {
        // Campuses table does not have a composite unique key on (districtId, name),
        // so guard against duplicates manually.
        const existing = await db
          .select()
          .from(campuses)
          .where(
            and(
              eq(campuses.name, campus.name),
              eq(campuses.districtId, campus.districtId)
            )
          )
          .limit(1);

        if (existing.length === 0) {
          await db.insert(campuses).values({
            name: campus.name,
            districtId: campus.districtId,
          });
        }

        // Get the inserted ID
        const inserted = await db
          .select()
          .from(campuses)
          .where(
            and(
              eq(campuses.name, campus.name),
              eq(campuses.districtId, campus.districtId)
            )
          )
          .limit(1);

        if (inserted.length > 0) {
          campus.id = inserted[0].id;
          campusIdMap.set(
            `${campus.districtId}_${campus.name}`,
            inserted[0].id
          );
          campusesInserted++;
        }
      } catch (error) {
        console.warn(
          `⚠️  Failed to insert campus ${campus.name}:`,
          error.message
        );
      }
    }
    console.log(`✅ Inserted/updated ${campusesInserted} campuses\n`);

    // Capture XAN campus ids for later seeding
    const xanNationalOfficeCampusId =
      campusIdMap.get("XAN_National Office") || null;
    const xanRegionalDirectorsCampusId =
      campusIdMap.get("XAN_Regional Directors") || null;
    if (!xanNationalOfficeCampusId || !xanRegionalDirectorsCampusId) {
      console.warn(
        "⚠️  Could not resolve XAN campus ids; XAN people seeding may be incomplete."
      );
    }

    // 3. Generate and insert people (exactly 200 people distributed across all districts)
    // plus XAN leadership + regional directors
    console.log("👥 Generating 200 people...");
    const allPeople = [];
    let personCounter = 1;
    const targetTotal = 200;

    // 3a. Seed XAN leadership (fixed ids so you can safely edit later)
    const xanPeople = [];

    // Alex Rodriguez = National Director (shown in the header slot like a district director)
    xanPeople.push({
      personId: "xan_alex_rodriguez",
      name: "Alex Rodriguez",
      primaryRole: "National Director",
      primaryDistrictId: "XAN",
      primaryCampusId: null,
      primaryRegion: "NATIONAL",
      status: "Not Invited",
      depositPaid: false,
      createdAt: new Date(),
      statusLastUpdated: new Date(),
      spouseAttending: false,
      childrenCount: 0,
      guestsCount: 0,
      childrenAges: null,
      spouse: null,
      kids: null,
      guests: null,
    });

    // Dan Gauthier = Field Director (first person in the Regional Directors campus row)
    if (xanRegionalDirectorsCampusId) {
      xanPeople.push({
        personId: "xan_dan_gauthier",
        name: "Dan Gauthier",
        primaryRole: "Field Director",
        primaryDistrictId: "XAN",
        primaryCampusId: xanRegionalDirectorsCampusId,
        primaryRegion: "NATIONAL",
        status: "Not Invited",
        depositPaid: false,
        createdAt: new Date(),
        statusLastUpdated: new Date(),
        spouseAttending: false,
        childrenCount: 0,
        guestsCount: 0,
        childrenAges: null,
        spouse: null,
        kids: null,
        guests: null,
      });
    }

    // Regional Director for each Chi Alpha region (placeholders clearly labeled)
    const regionsForDirectors = [
      "Northwest",
      "West Coast",
      "Big Sky",
      "Great Plains North",
      "Great Plains South",
      "Great Lakes",
      "Northeast",
      "Mid-Atlantic",
      "Southeast",
      "Texico",
      "South Central",
    ];

    const regionalDirectorNameByRegion = {
      Texico: "Matt Hoogendoorn",
    };

    for (const region of regionsForDirectors) {
      const name =
        regionalDirectorNameByRegion[region] || `Regional Director — ${region}`;
      const slug = region
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      if (!xanRegionalDirectorsCampusId) continue;
      xanPeople.push({
        personId: `xan_rd_${slug}`,
        name,
        primaryRole: "Regional Director",
        primaryDistrictId: "XAN",
        primaryCampusId: xanRegionalDirectorsCampusId,
        primaryRegion: region,
        status: "Not Invited",
        depositPaid: false,
        createdAt: new Date(),
        statusLastUpdated: new Date(),
        spouseAttending: false,
        childrenCount: 0,
        guestsCount: 0,
        childrenAges: null,
        spouse: null,
        kids: null,
        guests: null,
      });
    }

    // Put XAN people first so UI defaults keep leadership at the top.
    allPeople.push(...xanPeople);

    // Calculate how many people per district (distribute evenly)
    const peoplePerDistrict = Math.floor(targetTotal / districtsToSeed.length);
    const remainder = targetTotal % districtsToSeed.length;

    for (
      let districtIndex = 0;
      districtIndex < districtsToSeed.length;
      districtIndex++
    ) {
      const district = districtsToSeed[districtIndex];
      // Distribute remainder across first few districts
      const numPeople = peoplePerDistrict + (districtIndex < remainder ? 1 : 0);

      const districtCampuses = Array.from(campusIdMap.entries())
        .filter(([key]) => key.startsWith(`${district.id}_`))
        .map(([_, id]) => id);

      for (let i = 0; i < numPeople; i++) {
        const firstName =
          firstNames[(personCounter * 7 + i * 3) % firstNames.length];
        const lastName =
          lastNames[(personCounter * 11 + i * 5) % lastNames.length];
        const status = statuses[(personCounter + i) % statuses.length];
        const campusId =
          districtCampuses.length > 0 && Math.random() > 0.2
            ? districtCampuses[
                Math.floor(Math.random() * districtCampuses.length)
              ]
            : null;
        const role = roles[Math.floor(Math.random() * roles.length)];

        // Generate household data using new schema fields
        const spouseAttending = Math.random() > 0.6; // 40% have spouse attending
        const childrenCount =
          spouseAttending && Math.random() > 0.5
            ? Math.floor(Math.random() * 4) // 0-3 children
            : 0;
        const guestsCount =
          Math.random() > 0.7
            ? Math.floor(Math.random() * 3) // 0-2 guests
            : 0;
        const childrenAges =
          childrenCount > 0
            ? JSON.stringify(
                Array.from(
                  { length: childrenCount },
                  () => Math.floor(Math.random() * 18) + 1
                )
              )
            : null;

        allPeople.push({
          personId: `dev_person_${personCounter}`,
          name: `${firstName} ${lastName}`,
          primaryRole: role,
          primaryDistrictId: district.id,
          primaryCampusId: campusId,
          primaryRegion: district.region,
          status: status,
          depositPaid: Math.random() > 0.7, // 30% have paid deposit
          createdAt: new Date(),
          statusLastUpdated: new Date(),
          // Use new schema fields
          spouseAttending: spouseAttending,
          childrenCount: childrenCount,
          guestsCount: guestsCount,
          childrenAges: childrenAges,
          // Deprecated fields (set to null for new data)
          spouse: null,
          kids: null,
          guests: null,
        });

        personCounter++;
      }
    }

    console.log(`📋 Inserting ${allPeople.length} people...`);
    let peopleSuccessCount = 0;
    let peopleErrorCount = 0;

    for (const person of allPeople) {
      try {
        await db
          .insert(people)
          .values(person)
          .onDuplicateKeyUpdate({
            set: {
              name: person.name,
              primaryRole: person.primaryRole,
              primaryDistrictId: person.primaryDistrictId,
              primaryCampusId: person.primaryCampusId,
              primaryRegion: person.primaryRegion,
              status: person.status,
              depositPaid: person.depositPaid,
              statusLastUpdated: person.statusLastUpdated,
              spouseAttending: person.spouseAttending,
              childrenCount: person.childrenCount,
              guestsCount: person.guestsCount,
              childrenAges: person.childrenAges,
              spouse: person.spouse,
              kids: person.kids,
              guests: person.guests,
            },
          });
        peopleSuccessCount++;
      } catch (error) {
        console.warn(
          `⚠️  Failed to insert person ${person.name}:`,
          error.message
        );
        peopleErrorCount++;
      }
    }

    if (peopleErrorCount > 0) {
      console.warn(`⚠️  Warning: ${peopleErrorCount} people failed to insert`);
    }
    console.log(`✅ Inserted/updated ${peopleSuccessCount} people\n`);

    // 4. Insert needs (for some people)
    console.log("💰 Generating needs...");
    const allNeeds = [];
    const needTypes = ["Registration", "Transportation", "Housing", "Other"];
    const needDescriptions = {
      Registration: [
        "Travel expenses for conference",
        "Accommodation costs",
        "Meal expenses",
        "Registration fee assistance",
      ],
      Transportation: [
        "Flight assistance needed",
        "Gas money for road trip",
        "Rental car expenses",
      ],
      Housing: [
        "Hotel accommodation needed",
        "Looking for shared room",
        "Extended stay required",
      ],
      Other: [
        "Childcare support",
        "Special dietary requirements",
        "Accessibility needs",
      ],
    };

    // Add needs for ~30% of people
    for (let i = 0; i < Math.floor(allPeople.length * 0.3); i++) {
      const person = allPeople[Math.floor(Math.random() * allPeople.length)];
      const needType = needTypes[Math.floor(Math.random() * needTypes.length)];
      const descriptions = needDescriptions[needType];
      const description =
        descriptions[Math.floor(Math.random() * descriptions.length)];

      allNeeds.push({
        personId: person.personId,
        type: needType,
        description: description,
        amount:
          needType === "Registration"
            ? Math.floor(Math.random() * 50000) + 1000
            : null, // $10-$500 in cents
        visibility: "LEADERSHIP_ONLY",
        isActive: true,
        createdAt: new Date(),
      });
    }

    console.log(`📋 Inserting ${allNeeds.length} needs...`);
    let needsSuccessCount = 0;
    for (const need of allNeeds) {
      try {
        await db
          .insert(needs)
          .values(need)
          .onDuplicateKeyUpdate({
            set: {
              type: need.type,
              description: need.description,
              amount: need.amount,
              visibility: need.visibility,
              isActive: need.isActive,
            },
          });
        needsSuccessCount++;
      } catch (error) {
        console.warn(
          `⚠️  Failed to insert need for ${need.personId}:`,
          error.message
        );
      }
    }
    console.log(`✅ Inserted/updated ${needsSuccessCount} needs\n`);

    // 5. Insert notes (for some people)
    console.log("📝 Generating notes...");
    const allNotes = [];
    const noteTemplates = [
      "Waiting on work schedule confirmation.",
      "Needs to coordinate with spouse's schedule.",
      "Interested in attending, checking availability.",
      "Has prior commitment, will confirm later.",
      "Very excited to participate!",
      "May need financial assistance.",
    ];

    // Add notes for ~40% of people
    for (let i = 0; i < Math.floor(allPeople.length * 0.4); i++) {
      const person = allPeople[Math.floor(Math.random() * allPeople.length)];
      allNotes.push({
        personId: person.personId,
        category: "INTERNAL",
        content:
          noteTemplates[Math.floor(Math.random() * noteTemplates.length)],
        createdAt: new Date(),
        createdBy: "system",
      });
    }

    console.log(`📋 Inserting ${allNotes.length} notes...`);
    let notesSuccessCount = 0;
    for (const note of allNotes) {
      try {
        await db.insert(notes).values(note);
        notesSuccessCount++;
      } catch (error) {
        console.warn(
          `⚠️  Failed to insert note for ${note.personId}:`,
          error.message
        );
      }
    }
    console.log(`✅ Inserted ${notesSuccessCount} notes\n`);

    // 6. Insert assignments (for some people)
    console.log("📌 Generating assignments...");
    const allAssignments = [];

    // Add assignments for ~60% of people
    for (let i = 0; i < Math.floor(allPeople.length * 0.6); i++) {
      const person = allPeople[Math.floor(Math.random() * allPeople.length)];
      const assignmentType = person.primaryCampusId
        ? Math.random() > 0.5
          ? "Campus"
          : "District"
        : Math.random() > 0.5
          ? "District"
          : "Region";

      let campusId = null;
      let districtId = null;
      let region = null;

      if (assignmentType === "Campus" && person.primaryCampusId) {
        campusId = person.primaryCampusId;
        districtId = person.primaryDistrictId;
      } else if (assignmentType === "District" && person.primaryDistrictId) {
        districtId = person.primaryDistrictId;
      } else if (assignmentType === "Region" && person.primaryRegion) {
        region = person.primaryRegion;
      }

      allAssignments.push({
        personId: person.personId,
        assignmentType: assignmentType,
        roleTitle:
          person.primaryRole || roles[Math.floor(Math.random() * roles.length)],
        campusId: campusId,
        districtId: districtId,
        region: region,
        isPrimary: true,
        createdAt: new Date(),
      });
    }

    console.log(`📋 Inserting ${allAssignments.length} assignments...`);
    let assignmentsSuccessCount = 0;
    for (const assignment of allAssignments) {
      try {
        await db.insert(assignments).values(assignment);
        assignmentsSuccessCount++;
      } catch (error) {
        console.warn(
          `⚠️  Failed to insert assignment for ${assignment.personId}:`,
          error.message
        );
      }
    }
    console.log(`✅ Inserted ${assignmentsSuccessCount} assignments\n`);

    // 7. Insert settings
    console.log("⚙️  Inserting settings...");
    const defaultSettings = [
      { key: "app_version", value: "1.0.0" },
      { key: "last_updated", value: new Date().toISOString() },
    ];

    let settingsInserted = 0;
    for (const setting of defaultSettings) {
      try {
        await db
          .insert(settings)
          .values(setting)
          .onDuplicateKeyUpdate({
            set: {
              value: setting.value,
            },
          });
        settingsInserted++;
      } catch (error) {
        console.warn(
          `⚠️  Failed to insert setting ${setting.key}:`,
          error.message
        );
      }
    }
    console.log(`✅ Inserted/updated ${settingsInserted} settings\n`);

    // Print summary
    console.log("📊 Database Summary:");
    console.log("=".repeat(50));

    const districtCount = await db.select().from(districts);
    const campusCount = await db.select().from(campuses);
    const allPeopleData = await db.select().from(people);
    const needsCount = await db.select().from(needs);
    const notesCount = await db.select().from(notes);
    const assignmentsCount = await db.select().from(assignments);
    const settingsCount = await db.select().from(settings);

    const statusCounts = {
      Yes: allPeopleData.filter(p => p.status === "Yes").length,
      Maybe: allPeopleData.filter(p => p.status === "Maybe").length,
      No: allPeopleData.filter(p => p.status === "No").length,
      "Not Invited": allPeopleData.filter(p => p.status === "Not Invited")
        .length,
    };

    console.log(`  Districts: ${districtCount.length}`);
    console.log(`  Campuses: ${campusCount.length}`);
    console.log(`  People: ${allPeopleData.length}`);
    console.log(`  Needs: ${needsCount.length}`);
    console.log(`  Notes: ${notesCount.length}`);
    console.log(`  Assignments: ${assignmentsCount.length}`);
    console.log(`  Settings: ${settingsCount.length}`);
    console.log(`\n  People Status Breakdown:`);
    console.log(`    - Going (Yes): ${statusCounts["Yes"]}`);
    console.log(`    - Maybe: ${statusCounts["Maybe"]}`);
    console.log(`    - Not Going (No): ${statusCounts["No"]}`);
    console.log(`    - Not Invited: ${statusCounts["Not Invited"]}`);
    console.log("=".repeat(50));
    console.log("\n✅ Seed completed successfully!\n");
  } catch (error) {
    console.error("\n❌ Seed failed:", error);
    throw error;
  }
}

// Main execution
async function main() {
  const connected = await testConnection();
  if (!connected) {
    process.exit(1);
  }

  try {
    await seed();
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
