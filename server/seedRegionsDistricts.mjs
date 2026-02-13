import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

// Region and district data extracted from SVG map
const regionsData = [
  { name: "Northwest", color: "#5DADE2" },
  { name: "West Coast", color: "#F39C12" },
  { name: "Big Sky", color: "#A0826D" },
  { name: "Great Plains North", color: "#6C3483" },
  { name: "Great Plains South", color: "#F4D03F" },
  { name: "Great Lakes", color: "#3498DB" },
  { name: "Northeast", color: "#E91E63" },
  { name: "Mid-Atlantic", color: "#D98880" },
  { name: "Southeast", color: "#52BE80" },
  { name: "Texico", color: "#AF7AC5" },
  { name: "South Central", color: "#E74C3C" },
];

const districtsData = [
  // Northwest
  { name: "Alaska", svgPathId: "Alaska", region: "Northwest" },
  { name: "Washington", svgPathId: "Washington", region: "Northwest" },
  { name: "Oregon", svgPathId: "Oregon", region: "Northwest" },
  { name: "Idaho", svgPathId: "Idaho", region: "Northwest" },

  // West Coast
  {
    name: "Northern California",
    svgPathId: "Northern California",
    region: "West Coast",
  },
  {
    name: "Southern California",
    svgPathId: "Southern California",
    region: "West Coast",
  },
  { name: "Nevada", svgPathId: "Nevada", region: "West Coast" },
  { name: "Hawaii", svgPathId: "Hawaii", region: "West Coast" },

  // Big Sky
  { name: "Montana", svgPathId: "Montana", region: "Big Sky" },
  { name: "Wyoming", svgPathId: "Wyoming", region: "Big Sky" },
  { name: "Utah", svgPathId: "Utah", region: "Big Sky" },
  { name: "Colorado", svgPathId: "Colorado", region: "Big Sky" },

  // Great Plains North
  {
    name: "North Dakota",
    svgPathId: "North Dakota",
    region: "Great Plains North",
  },
  {
    name: "South Dakota",
    svgPathId: "South Dakota",
    region: "Great Plains North",
  },
  { name: "Nebraska", svgPathId: "Nebraska", region: "Great Plains North" },
  { name: "Minnesota", svgPathId: "Minnesota", region: "Great Plains North" },
  { name: "Wisconsin", svgPathId: "Wisconsin", region: "Great Plains North" },

  // Great Plains South
  { name: "Kansas", svgPathId: "Kansas", region: "Great Plains South" },
  { name: "Iowa", svgPathId: "Iowa", region: "Great Plains South" },
  { name: "Missouri", svgPathId: "Missouri", region: "Great Plains South" },

  // Great Lakes
  { name: "Michigan", svgPathId: "Michigan", region: "Great Lakes" },
  { name: "Illinois", svgPathId: "Illinois", region: "Great Lakes" },
  { name: "Indiana", svgPathId: "Indiana", region: "Great Lakes" },
  { name: "Ohio", svgPathId: "Ohio", region: "Great Lakes" },

  // Northeast
  { name: "Maine", svgPathId: "Maine", region: "Northeast" },
  { name: "Vermont", svgPathId: "Vermont", region: "Northeast" },
  { name: "Massachusetts", svgPathId: "Massachusetts", region: "Northeast" },
  { name: "Rhode Island", svgPathId: "Rhode Island", region: "Northeast" },
  { name: "Connecticut", svgPathId: "Connecticut", region: "Northeast" },
  { name: "New York", svgPathId: "New York", region: "Northeast" },

  // Mid-Atlantic
  { name: "Pennsylvania", svgPathId: "Pennsylvania", region: "Mid-Atlantic" },
  { name: "New Jersey", svgPathId: "New Jersey", region: "Mid-Atlantic" },
  { name: "Delaware", svgPathId: "Delaware", region: "Mid-Atlantic" },
  { name: "Maryland", svgPathId: "Maryland", region: "Mid-Atlantic" },
  { name: "West Virginia", svgPathId: "West Virginia", region: "Mid-Atlantic" },
  { name: "Virginia", svgPathId: "Virginia", region: "Mid-Atlantic" },
  { name: "Kentucky", svgPathId: "Kentucky", region: "Mid-Atlantic" },
  { name: "Tennessee", svgPathId: "Tennessee", region: "Mid-Atlantic" },
  {
    name: "North Carolina",
    svgPathId: "North Carolina",
    region: "Mid-Atlantic",
  },

  // Southeast
  { name: "South Carolina", svgPathId: "South Carolina", region: "Southeast" },
  { name: "Georgia", svgPathId: "Georgia", region: "Southeast" },
  { name: "Florida", svgPathId: "Florida", region: "Southeast" },
  { name: "Alabama", svgPathId: "Alabama", region: "Southeast" },
  { name: "Mississippi", svgPathId: "Mississippi", region: "Southeast" },

  // Texico
  { name: "New Mexico", svgPathId: "New Mexico", region: "Texico" },
  { name: "West Texas", svgPathId: "West Texas", region: "Texico" },

  // South Central
  { name: "Oklahoma", svgPathId: "Oklahoma", region: "South Central" },
  { name: "Arkansas", svgPathId: "Arkansas", region: "South Central" },
  { name: "Louisiana", svgPathId: "Louisiana", region: "South Central" },
  { name: "North Texas", svgPathId: "North Texas", region: "South Central" },
  { name: "South Texas", svgPathId: "South Texas", region: "South Central" },
];

async function seedRegionsAndDistricts() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  console.log("Seeding regions...");

  // Insert regions
  const regionMap = {};
  for (const region of regionsData) {
    const [result] = await connection.execute(
      "INSERT INTO regions (name, color) VALUES (?, ?) ON DUPLICATE KEY UPDATE color = VALUES(color)",
      [region.name, region.color]
    );
    // Get the region ID
    const [rows] = await connection.execute(
      "SELECT id FROM regions WHERE name = ?",
      [region.name]
    );
    regionMap[region.name] = rows[0].id;
    console.log(`  ✓ ${region.name} (ID: ${rows[0].id})`);
  }

  console.log("\nSeeding districts...");

  // Insert districts
  for (const district of districtsData) {
    const regionId = regionMap[district.region];
    if (!regionId) {
      console.error(
        `  ✗ ${district.name}: Region "${district.region}" not found`
      );
      continue;
    }

    await connection.execute(
      "INSERT INTO districts_new (name, svgPathId, regionId) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), regionId = VALUES(regionId)",
      [district.name, district.svgPathId, regionId]
    );
    console.log(`  ✓ ${district.name} → ${district.region}`);
  }

  console.log("\nSeeding complete!");
  await connection.end();
}

seedRegionsAndDistricts().catch(console.error);
