#!/usr/bin/env node
/**
 * Test data seed script for household linking feature
 * Adds households and people with household relationships for testing
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { config } from "dotenv";
import { 
  districts, 
  campuses, 
  people,
  households,
} from "../drizzle/schema.ts";
import { eq } from "drizzle-orm";
import * as db from "../server/db.ts";

config();

// Production safeguard
if (process.env.APP_ENV === 'production') {
  console.error('❌ Cannot run seed script in production environment!');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const connection = await mysql.createConnection(connectionString);
const db = drizzle(connection);

async function seedTestData() {
  console.log("🌱 Seeding test data for household linking...\n");
  
  try {
    // 1. Get or create a test district
    console.log("📋 Setting up test district...");
    let testDistrict;
    try {
      const existingDistricts = await db.select().from(districts).limit(1);
      if (existingDistricts.length > 0) {
        testDistrict = existingDistricts[0];
        console.log(`✅ Using existing district: ${testDistrict.name}`);
      } else {
        // Create a test district
        await db.insert(districts).values({
          id: 'TestDistrict',
          name: 'Test District',
          region: 'Test Region',
        });
        testDistrict = { id: 'TestDistrict', name: 'Test District', region: 'Test Region' };
        console.log("✅ Created test district");
      }
    } catch (error) {
      console.error("❌ Error setting up district:", error.message);
      throw error;
    }

    // 2. Get or create a test campus
    console.log("🏫 Setting up test campus...");
    let testCampus;
    try {
      const existingCampuses = await db.select()
        .from(campuses)
        .where(eq(campuses.districtId, testDistrict.id))
        .limit(1);
      
      if (existingCampuses.length > 0) {
        testCampus = existingCampuses[0];
        console.log(`✅ Using existing campus: ${testCampus.name}`);
      } else {
        const result = await db.insert(campuses).values({
          name: 'Test Campus',
          districtId: testDistrict.id,
        });
        testCampus = { id: result[0].insertId, name: 'Test Campus', districtId: testDistrict.id };
        console.log("✅ Created test campus");
      }
    } catch (error) {
      console.error("❌ Error setting up campus:", error.message);
      throw error;
    }

    // 3. Create households
    console.log("🏠 Creating households...");
    const householdData = [
      { label: "Smith Household", childrenCount: 2, guestsCount: 0 },
      { label: "Johnson Household", childrenCount: 1, guestsCount: 1 },
      { label: "Williams Household", childrenCount: 3, guestsCount: 0 },
      { label: "Brown Household", childrenCount: 0, guestsCount: 2 },
      { label: "Davis Household", childrenCount: 1, guestsCount: 0 },
    ];

    const householdIds = [];
    for (const household of householdData) {
      try {
        // Use the db function which handles errors gracefully
        const insertId = await db.createHousehold(household);
        if (insertId) {
          householdIds.push(insertId);
          console.log(`✅ Created household: ${household.label} (ID: ${insertId})`);
        } else {
          console.warn(`⚠️  Could not get ID for household: ${household.label}`);
        }
      } catch (error) {
        console.warn(`⚠️  Failed to create household ${household.label}:`, error.message);
        // Try to find existing household
        try {
          const allHouseholds = await db.getAllHouseholds();
          const existing = allHouseholds.find(h => h.label === household.label);
          if (existing) {
            householdIds.push(existing.id);
            console.log(`✅ Using existing household: ${household.label} (ID: ${existing.id})`);
          }
        } catch (e) {
          // Ignore lookup errors - table might not exist
          console.warn(`⚠️  Households table may not exist yet. Run migrations first: pnpm db:migrate`);
        }
      }
    }
    console.log(`✅ Created ${householdIds.length} households\n`);

    // 4. Create test people with various household scenarios
    console.log("👥 Creating test people...");
    const testPeople = [
      // People with households (married couples)
      {
        personId: 'test_person_1',
        name: 'John Smith',
        primaryRole: 'Campus Director',
        primaryCampusId: testCampus.id,
        primaryDistrictId: testDistrict.id,
        primaryRegion: testDistrict.region,
        status: 'Yes',
        depositPaid: true,
        householdId: householdIds[0],
        householdRole: 'primary',
        spouseAttending: true,
        childrenCount: 2,
        guestsCount: 0,
        childrenAges: JSON.stringify(['8', '5']),
      },
      {
        personId: 'test_person_2',
        name: 'Jane Smith',
        primaryRole: 'Staff',
        primaryCampusId: testCampus.id,
        primaryDistrictId: testDistrict.id,
        primaryRegion: testDistrict.region,
        status: 'Yes',
        depositPaid: true,
        householdId: householdIds[0],
        householdRole: 'member',
        spouseAttending: false, // She's the spouse
        childrenCount: 0, // Counted in household
        guestsCount: 0,
      },
      {
        personId: 'test_person_3',
        name: 'Mike Johnson',
        primaryRole: 'Associate Director',
        primaryCampusId: testCampus.id,
        primaryDistrictId: testDistrict.id,
        primaryRegion: testDistrict.region,
        status: 'Maybe',
        depositPaid: false,
        householdId: householdIds[1],
        householdRole: 'primary',
        spouseAttending: true,
        childrenCount: 1,
        guestsCount: 1,
        childrenAges: JSON.stringify(['6']),
      },
      {
        personId: 'test_person_4',
        name: 'Sarah Johnson',
        primaryRole: 'Staff',
        primaryCampusId: testCampus.id,
        primaryDistrictId: testDistrict.id,
        primaryRegion: testDistrict.region,
        status: 'Maybe',
        depositPaid: false,
        householdId: householdIds[1],
        householdRole: 'member',
        spouseAttending: false,
        childrenCount: 0,
        guestsCount: 0,
      },
      {
        personId: 'test_person_5',
        name: 'David Williams',
        primaryRole: 'Campus Director',
        primaryCampusId: testCampus.id,
        primaryDistrictId: testDistrict.id,
        primaryRegion: testDistrict.region,
        status: 'Yes',
        depositPaid: true,
        householdId: householdIds[2],
        householdRole: 'primary',
        spouseAttending: true,
        childrenCount: 3,
        guestsCount: 0,
        childrenAges: JSON.stringify(['10', '7', '4']),
      },
      {
        personId: 'test_person_6',
        name: 'Emily Williams',
        primaryRole: 'Staff',
        primaryCampusId: testCampus.id,
        primaryDistrictId: testDistrict.id,
        primaryRegion: testDistrict.region,
        status: 'Yes',
        depositPaid: true,
        householdId: householdIds[2],
        householdRole: 'member',
        spouseAttending: false,
        childrenCount: 0,
        guestsCount: 0,
      },
      // People with guests but no household (single people)
      {
        personId: 'test_person_7',
        name: 'Chris Brown',
        primaryRole: 'Staff',
        primaryCampusId: testCampus.id,
        primaryDistrictId: testDistrict.id,
        primaryRegion: testDistrict.region,
        status: 'Yes',
        depositPaid: false,
        householdId: null,
        householdRole: 'primary',
        spouseAttending: false,
        childrenCount: 0,
        guestsCount: 2,
      },
      {
        personId: 'test_person_8',
        name: 'Alex Davis',
        primaryRole: 'Intern',
        primaryCampusId: testCampus.id,
        primaryDistrictId: testDistrict.id,
        primaryRegion: testDistrict.region,
        status: 'Not Invited',
        depositPaid: false,
        householdId: householdIds[3],
        householdRole: 'primary',
        spouseAttending: false,
        childrenCount: 0,
        guestsCount: 2,
      },
      // Person with household but no spouse/children (for testing)
      {
        personId: 'test_person_9',
        name: 'Taylor Davis',
        primaryRole: 'Staff',
        primaryCampusId: testCampus.id,
        primaryDistrictId: testDistrict.id,
        primaryRegion: testDistrict.region,
        status: 'Yes',
        depositPaid: true,
        householdId: householdIds[4],
        householdRole: 'primary',
        spouseAttending: false,
        childrenCount: 0,
        guestsCount: 0,
      },
      // Person without household (single, no guests)
      {
        personId: 'test_person_10',
        name: 'Jordan Martinez',
        primaryRole: 'Volunteer',
        primaryCampusId: testCampus.id,
        primaryDistrictId: testDistrict.id,
        primaryRegion: testDistrict.region,
        status: 'No',
        depositPaid: false,
        householdId: null,
        householdRole: 'primary',
        spouseAttending: false,
        childrenCount: 0,
        guestsCount: 0,
      },
    ];

    let peopleSuccessCount = 0;
    for (const person of testPeople) {
      try {
        await db.insert(people).values(person).onDuplicateKeyUpdate({
          set: {
            name: person.name,
            primaryRole: person.primaryRole,
            primaryCampusId: person.primaryCampusId,
            primaryDistrictId: person.primaryDistrictId,
            primaryRegion: person.primaryRegion,
            status: person.status,
            depositPaid: person.depositPaid,
            householdId: person.householdId,
            householdRole: person.householdRole,
            spouseAttending: person.spouseAttending,
            childrenCount: person.childrenCount,
            guestsCount: person.guestsCount,
            childrenAges: person.childrenAges,
          },
        });
        peopleSuccessCount++;
        console.log(`✅ Created/updated person: ${person.name}`);
      } catch (error) {
        console.warn(`⚠️  Failed to insert person ${person.name}:`, error.message);
      }
    }
    console.log(`✅ Created/updated ${peopleSuccessCount} people\n`);

    console.log("🎉 Test data seeding complete!\n");
    console.log("📊 Summary:");
    console.log(`   - ${householdIds.length} households created`);
    console.log(`   - ${peopleSuccessCount} people created/updated`);
    console.log("\n💡 Test scenarios included:");
    console.log("   - Married couples with children (Smith, Johnson, Williams)");
    console.log("   - Single person with guests (Brown)");
    console.log("   - Person with household but no spouse/children (Taylor Davis)");
    console.log("   - Single person without household (Martinez)");
    console.log("\n🧪 You can now test:");
    console.log("   - Creating households from person names");
    console.log("   - Linking people to existing households");
    console.log("   - Editing person household relationships");
    console.log("   - Validation rules for spouse/children requiring households");

  } catch (error) {
    console.error("❌ Error seeding test data:", error);
    throw error;
  } finally {
    await connection.end();
  }
}

seedTestData().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

