#!/usr/bin/env node
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { config } from "dotenv";
import { districts, people, campuses } from "../drizzle/schema.ts";
import { sql } from "drizzle-orm";

config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function checkData() {
  const connection = await mysql.createConnection(connectionString);
  const db = drizzle(connection);

  try {
    // Check districts
    const allDistricts = await db.select().from(districts);
    console.log(`\n📊 Districts in database: ${allDistricts.length}`);
    console.log(`   First 5: ${allDistricts.slice(0, 5).map(d => d.id).join(', ')}`);

    // Check people with districts
    const peopleWithDistricts = await db.select().from(people).where(sql`primaryDistrictId IS NOT NULL`);
    console.log(`\n👥 People with districts: ${peopleWithDistricts.length}`);
    
    // Check people by district
    const peopleByDistrict = await db.execute(sql`
      SELECT primaryDistrictId, COUNT(*) as count 
      FROM people 
      WHERE primaryDistrictId IS NOT NULL 
      GROUP BY primaryDistrictId 
      ORDER BY count DESC 
      LIMIT 10
    `);
    console.log(`\n   Top districts by people count:`);
    for (const row of peopleByDistrict[0]) {
      console.log(`     ${row.primaryDistrictId}: ${row.count} people`);
    }

    // Check campuses
    const allCampuses = await db.select().from(campuses);
    console.log(`\n🏫 Campuses in database: ${allCampuses.length}`);
    
    // Check campuses by district
    const campusesByDistrict = await db.execute(sql`
      SELECT districtId, COUNT(*) as count 
      FROM campuses 
      GROUP BY districtId 
      ORDER BY count DESC 
      LIMIT 10
    `);
    console.log(`\n   Top districts by campus count:`);
    for (const row of campusesByDistrict[0]) {
      console.log(`     ${row.districtId}: ${row.count} campuses`);
    }

    // Check if districts match SVG IDs (sample check)
    const sampleDistricts = allDistricts.slice(0, 10);
    console.log(`\n🔍 Sample district IDs (should match SVG path IDs):`);
    sampleDistricts.forEach(d => {
      console.log(`     ${d.id} - ${d.name} (${d.region})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkData();
