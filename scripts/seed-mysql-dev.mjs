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
  needs,
  notes,
  assignments,
  settings,
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
const roles = ["Campus Director", "Associate Director", "Staff", "Intern", "Volunteer", "District Director", "Regional Director"];

// Status enum values from schema.ts
const statuses = ["Yes", "Maybe", "No", "Not Invited"];

async function seed() {
  console.log("🌱 Seeding MySQL database with dev data...\n");
  
  try {
    // 1. Insert districts (first 20 for quick setup)
    const districtsToSeed = allDistricts.slice(0, 20);
    console.log(`📋 Inserting ${districtsToSeed.length} districts...`);
    
    for (const district of districtsToSeed) {
      try {
        await db.insert(districts).values({
          id: district.id,
          name: district.name,
          region: district.region,
          leftNeighbor: null, // Can be set later if needed
          rightNeighbor: null, // Can be set later if needed
        }).onDuplicateKeyUpdate({
          set: {
            name: district.name,
            region: district.region,
          },
        });
      } catch (error) {
        console.warn(`⚠️  Failed to insert district ${district.id}:`, error.message);
      }
    }
    console.log(`✅ Inserted ${districtsToSeed.length} districts\n`);

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

    console.log(`📋 Inserting ${allCampuses.length} campuses...`);
    const campusIdMap = new Map();
    
    for (const campus of allCampuses) {
      try {
        await db.insert(campuses).values({
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
        console.warn(`⚠️  Failed to insert campus ${campus.name}:`, error.message);
      }
    }
    console.log(`✅ Inserted ${allCampuses.length} campuses\n`);

    // 3. Generate and insert people (about 5-10 per district, ~150 total)
    console.log("👥 Generating people...");
    const allPeople = [];
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
        const role = roles[Math.floor(Math.random() * roles.length)];
        
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
          // Some people have spouse/kids/guests
          spouse: Math.random() > 0.6 ? `${firstNames[(personCounter * 13) % firstNames.length]} ${lastName}` : null,
          kids: Math.random() > 0.7 ? String(Math.floor(Math.random() * 4)) : null,
          guests: Math.random() > 0.8 ? String(Math.floor(Math.random() * 3)) : null,
        });
        
        personCounter++;
      }
    }

    console.log(`📋 Inserting ${allPeople.length} people...`);
    let peopleSuccessCount = 0;
    let peopleErrorCount = 0;
    
    for (const person of allPeople) {
      try {
        await db.insert(people).values(person).onDuplicateKeyUpdate({
          set: {
            name: person.name,
            primaryRole: person.primaryRole,
            primaryDistrictId: person.primaryDistrictId,
            primaryCampusId: person.primaryCampusId,
            primaryRegion: person.primaryRegion,
            status: person.status,
            depositPaid: person.depositPaid,
            statusLastUpdated: person.statusLastUpdated,
            spouse: person.spouse,
            kids: person.kids,
            guests: person.guests,
          },
        });
        peopleSuccessCount++;
      } catch (error) {
        console.warn(`⚠️  Failed to insert person ${person.name}:`, error.message);
        peopleErrorCount++;
      }
    }

    if (peopleErrorCount > 0) {
      console.warn(`⚠️  Warning: ${peopleErrorCount} people failed to insert`);
    }
    console.log(`✅ Inserted ${peopleSuccessCount} people\n`);

    // 4. Insert needs (for some people)
    console.log("💰 Generating needs...");
    const allNeeds = [];
    const needDescriptions = [
      "Travel expenses for conference",
      "Accommodation costs",
      "Meal expenses",
      "Childcare support",
      "Transportation assistance",
      "Registration fee assistance",
    ];

    // Add needs for ~30% of people
    for (let i = 0; i < Math.floor(allPeople.length * 0.3); i++) {
      const person = allPeople[Math.floor(Math.random() * allPeople.length)];
      allNeeds.push({
        personId: person.personId,
        description: needDescriptions[Math.floor(Math.random() * needDescriptions.length)],
        amount: Math.floor(Math.random() * 50000) + 1000, // $10-$500 in cents
        createdAt: new Date(),
      });
    }

    console.log(`📋 Inserting ${allNeeds.length} needs...`);
    let needsSuccessCount = 0;
    for (const need of allNeeds) {
      try {
        await db.insert(needs).values(need).onDuplicateKeyUpdate({
          set: {
            description: need.description,
            amount: need.amount,
          },
        });
        needsSuccessCount++;
      } catch (error) {
        console.warn(`⚠️  Failed to insert need for ${need.personId}:`, error.message);
      }
    }
    console.log(`✅ Inserted ${needsSuccessCount} needs\n`);

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
        content: noteTemplates[Math.floor(Math.random() * noteTemplates.length)],
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
        console.warn(`⚠️  Failed to insert note for ${note.personId}:`, error.message);
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
        ? (Math.random() > 0.5 ? "Campus" : "District")
        : (Math.random() > 0.5 ? "District" : "Region");
      
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
        roleTitle: person.primaryRole || roles[Math.floor(Math.random() * roles.length)],
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
        console.warn(`⚠️  Failed to insert assignment for ${assignment.personId}:`, error.message);
      }
    }
    console.log(`✅ Inserted ${assignmentsSuccessCount} assignments\n`);

    // 7. Insert settings
    console.log("⚙️  Inserting settings...");
    const defaultSettings = [
      { key: "app_version", value: "1.0.0" },
      { key: "last_updated", value: new Date().toISOString() },
    ];

    for (const setting of defaultSettings) {
      try {
        await db.insert(settings).values(setting).onDuplicateKeyUpdate({
          set: {
            value: setting.value,
          },
        });
      } catch (error) {
        console.warn(`⚠️  Failed to insert setting ${setting.key}:`, error.message);
      }
    }
    console.log(`✅ Inserted ${defaultSettings.length} settings\n`);

    // Print summary
    console.log("📊 Database Summary:");
    console.log("=" .repeat(50));
    
    const districtCount = await db.select().from(districts);
    const campusCount = await db.select().from(campuses);
    const allPeopleData = await db.select().from(people);
    const needsCount = await db.select().from(needs);
    const notesCount = await db.select().from(notes);
    const assignmentsCount = await db.select().from(assignments);
    const settingsCount = await db.select().from(settings);
    
    const statusCounts = {
      "Yes": allPeopleData.filter(p => p.status === "Yes").length,
      "Maybe": allPeopleData.filter(p => p.status === "Maybe").length,
      "No": allPeopleData.filter(p => p.status === "No").length,
      "Not Invited": allPeopleData.filter(p => p.status === "Not Invited").length,
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
    console.log("=" .repeat(50));
    console.log("\n✅ Seed completed successfully!\n");

  } catch (error) {
    console.error("\n❌ Seed failed:", error);
    throw error;
  }
}

seed()
  .then(() => {
    connection.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    connection.end();
    process.exit(1);
  });
