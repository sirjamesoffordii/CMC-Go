#!/usr/bin/env node
/**
 * Verify that create/update operations persist to database
 * Tests: createCampus, createPerson, updatePerson
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq } from "drizzle-orm";
import { 
  campuses,
  people,
} from "../drizzle/schema.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

async function verifyWrites() {
  console.log("🧪 Verifying database write operations...\n");
  
  const connection = await mysql.createConnection(connectionString);
  const db = drizzle(connection);
  
  try {
    // Test 1: Create a campus
    console.log("1️⃣  Testing createCampus...");
    const testCampus = {
      name: `Test Campus ${Date.now()}`,
      districtId: "SouthernMissouri", // Use a district that should exist
    };
    
    const campusResult = await db.insert(campuses).values(testCampus);
    const campusId = campusResult[0]?.insertId;
    
    if (!campusId) {
      throw new Error("Failed to get campus insertId");
    }
    
    // Read it back
    const readCampus = await db.select().from(campuses).where(eq(campuses.id, campusId)).limit(1);
    
    if (readCampus.length === 0 || readCampus[0].name !== testCampus.name) {
      throw new Error(`Campus write failed: expected ${testCampus.name}, got ${readCampus[0]?.name || 'nothing'}`);
    }
    
    console.log(`   ✅ Campus created and read back: ${readCampus[0].name} (id: ${campusId})`);
    
    // Test 2: Create a person
    console.log("\n2️⃣  Testing createPerson...");
    const testPerson = {
      personId: `test_person_${Date.now()}`,
      name: "Test Person",
      status: "Not Invited" as const,
      depositPaid: false,
      primaryDistrictId: "SouthernMissouri",
      primaryCampusId: campusId,
    };
    
    const personResult = await db.insert(people).values(testPerson);
    const personId = personResult[0]?.insertId;
    
    if (!personId) {
      throw new Error("Failed to get person insertId");
    }
    
    // Read it back
    const readPerson = await db.select().from(people).where(eq(people.id, personId)).limit(1);
    
    if (readPerson.length === 0 || readPerson[0].personId !== testPerson.personId) {
      throw new Error(`Person write failed: expected ${testPerson.personId}, got ${readPerson[0]?.personId || 'nothing'}`);
    }
    
    console.log(`   ✅ Person created and read back: ${readPerson[0].name} (personId: ${readPerson[0].personId})`);
    
    // Test 3: Update person
    console.log("\n3️⃣  Testing updatePerson...");
    const updatedStatus = "Yes" as const;
    await db.update(people)
      .set({ status: updatedStatus })
      .where(eq(people.personId, testPerson.personId));
    
    // Read it back
    const updatedPerson = await db.select().from(people).where(eq(people.personId, testPerson.personId)).limit(1);
    
    if (updatedPerson.length === 0 || updatedPerson[0].status !== updatedStatus) {
      throw new Error(`Person update failed: expected status ${updatedStatus}, got ${updatedPerson[0]?.status || 'nothing'}`);
    }
    
    console.log(`   ✅ Person updated and read back: status = ${updatedPerson[0].status}`);
    
    // Cleanup
    console.log("\n🧹 Cleaning up test data...");
    await db.delete(people).where(eq(people.personId, testPerson.personId));
    await db.delete(campuses).where(eq(campuses.id, campusId));
    console.log("   ✅ Test data cleaned up");
    
    console.log("\n✅ All write operations verified successfully!");
    
  } catch (error) {
    console.error("\n❌ Verification failed:", error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

verifyWrites()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Verification script failed:", error);
    process.exit(1);
  });

