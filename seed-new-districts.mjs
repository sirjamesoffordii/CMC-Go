// Script to seed new districts matching the updated SVG
// Run with: node seed-new-districts.mjs

import mysql from 'mysql2/promise';

const newDistricts = [
  { id: "Alabama", name: "Alabama", region: "Southeast" },
  { id: "Alaska", name: "Alaska", region: "Northwest" },
  { id: "Appalachian", name: "Appalachian", region: "Mid-Atlantic" },
  { id: "Arizona", name: "Arizona", region: "West Coast" },
  { id: "Arkansas", name: "Arkansas", region: "South Central" },
  { id: "Colorado", name: "Colorado", region: "Big Sky" },
  { id: "Georgia", name: "Georgia", region: "Southeast" },
  { id: "Hawaii", name: "Hawaii", region: "West Coast" },
  { id: "Illinois", name: "Illinois", region: "Great Lakes" },
  { id: "Indiana", name: "Indiana", region: "Great Lakes" },
  { id: "Iowa", name: "Iowa", region: "Great Plains North" },
  { id: "Kansas", name: "Kansas", region: "Great Plains South" },
  { id: "Kentucky", name: "Kentucky", region: "Mid-Atlantic" },
  { id: "Louisiana", name: "Louisiana", region: "South Central" },
  { id: "Michigan", name: "Michigan", region: "Great Lakes" },
  { id: "Minnesota", name: "Minnesota", region: "Great Plains North" },
  { id: "Mississippi", name: "Mississippi", region: "Southeast" },
  { id: "Montana", name: "Montana", region: "Big Sky" },
  { id: "Nebraska", name: "Nebraska", region: "Great Plains North" },
  { id: "NewJersey", name: "New Jersey", region: "Mid-Atlantic" },
  { id: "NewMexico", name: "New Mexico", region: "Texico" },
  { id: "NewYork", name: "New York", region: "Northeast" },
  { id: "NorthCarolina", name: "North Carolina", region: "Southeast" },
  { id: "NorthDakota", name: "North Dakota", region: "Great Plains North" },
  { id: "NorthernCal-Nevada", name: "Northern California & Nevada", region: "West Coast" },
  { id: "NorthernNewEnglend", name: "Northern New England", region: "Northeast" },
  { id: "NorthMissouri", name: "North Missouri", region: "Great Plains South" },
  { id: "NorthTexas", name: "North Texas", region: "Texico" },
  { id: "Ohio", name: "Ohio", region: "Great Lakes" },
  { id: "Oklahoma", name: "Oklahoma", region: "South Central" },
  { id: "Oregon", name: "Oregon", region: "Northwest" },
  { id: "PeninsularFlorida", name: "Peninsular Florida", region: "Southeast" },
  { id: "Penn-Del", name: "Pennsylvania & Delaware", region: "Mid-Atlantic" },
  { id: "Potomac", name: "Potomac", region: "Mid-Atlantic" },
  { id: "SouthCarolina", name: "South Carolina", region: "Southeast" },
  { id: "SouthDakota", name: "South Dakota", region: "Great Plains North" },
  { id: "SouthernCalifornia", name: "Southern California", region: "West Coast" },
  { id: "SouthernNewEngland", name: "Southern New England", region: "Northeast" },
  { id: "SouthIdaho", name: "South Idaho", region: "Big Sky" },
  { id: "SouthMissouri", name: "South Missouri", region: "Great Plains South" },
  { id: "SouthTexas", name: "South Texas", region: "Texico" },
  { id: "Tennessee", name: "Tennessee", region: "Southeast" },
  { id: "Utah", name: "Utah", region: "Big Sky" },
  { id: "Washington", name: "Washington", region: "Northwest" },
  { id: "WestFlorida", name: "West Florida", region: "Southeast" },
  { id: "WestTexas", name: "West Texas", region: "Texico" },
  { id: "Wisconsin-NorthMichigan", name: "Wisconsin & North Michigan", region: "Great Lakes" },
  { id: "Wyoming", name: "Wyoming", region: "Big Sky" },
];

async function seedDistricts() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log('Connected to database');
    
    // First, let's see what districts exist
    const [existingDistricts] = await connection.execute('SELECT id FROM districts');
    console.log(`Found ${existingDistricts.length} existing districts`);
    
    // Insert new districts (ignore if already exists)
    for (const district of newDistricts) {
      try {
        await connection.execute(
          'INSERT INTO districts (id, name, region) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), region = VALUES(region)',
          [district.id, district.name, district.region]
        );
        console.log(`Upserted district: ${district.id}`);
      } catch (err) {
        console.error(`Error upserting ${district.id}:`, err.message);
      }
    }
    
    console.log('Done seeding districts');
  } finally {
    await connection.end();
  }
}

seedDistricts().catch(console.error);
