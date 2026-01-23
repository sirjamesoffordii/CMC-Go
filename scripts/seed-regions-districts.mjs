import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

// Region data with colors from the map
const regionsData = [
  { name: "Northwest", color: "#6b9fa3" },
  { name: "Big Sky", color: "#a89968" },
  { name: "Great Plains North", color: "#7b6d8f" },
  { name: "Great Lakes", color: "#5a7a8f" },
  { name: "Northeast", color: "#8f5a6b" },
  { name: "Great Plains South", color: "#c47b7b" },
  { name: "Southwest", color: "#b8956f" },
  { name: "South Central", color: "#9b6b9f" },
  { name: "Southeast", color: "#a87d6b" },
  { name: "Mid-Atlantic", color: "#8f7a5a" },
  { name: "Florida", color: "#6b8f7a" },
];

// Districts data mapped to regions with SVG path IDs
const districtsData = [
  // Northwest
  { name: "Alaska", svgPathId: "Alaska", regionName: "Northwest" },
  { name: "Washington", svgPathId: "Washington", regionName: "Northwest" },
  { name: "Oregon", svgPathId: "Oregon", regionName: "Northwest" },

  // Big Sky
  { name: "Montana", svgPathId: "Montana", regionName: "Big Sky" },
  { name: "Idaho", svgPathId: "Idaho", regionName: "Big Sky" },
  { name: "Wyoming", svgPathId: "Wyoming", regionName: "Big Sky" },
  { name: "Utah", svgPathId: "Utah", regionName: "Big Sky" },
  { name: "Nevada", svgPathId: "Nevada", regionName: "Big Sky" },

  // Great Plains North
  {
    name: "North Dakota",
    svgPathId: "North Dakota",
    regionName: "Great Plains North",
  },
  {
    name: "South Dakota",
    svgPathId: "South Dakota",
    regionName: "Great Plains North",
  },
  { name: "Nebraska", svgPathId: "Nebraska", regionName: "Great Plains North" },
  {
    name: "Minnesota",
    svgPathId: "Minnesota",
    regionName: "Great Plains North",
  },
  { name: "Iowa", svgPathId: "Iowa", regionName: "Great Plains North" },
  {
    name: "Wisconsin",
    svgPathId: "Wisconsin",
    regionName: "Great Plains North",
  },

  // Great Lakes
  { name: "Michigan", svgPathId: "Michigan", regionName: "Great Lakes" },
  { name: "Illinois", svgPathId: "Illinois", regionName: "Great Lakes" },
  { name: "Indiana", svgPathId: "Indiana", regionName: "Great Lakes" },
  { name: "Ohio", svgPathId: "Ohio", regionName: "Great Lakes" },

  // Northeast
  { name: "Maine", svgPathId: "Maine", regionName: "Northeast" },
  { name: "Vermont", svgPathId: "Vermont", regionName: "Northeast" },
  {
    name: "New Hampshire",
    svgPathId: "New Hampshire",
    regionName: "Northeast",
  },
  {
    name: "Massachusetts",
    svgPathId: "Massachusetts",
    regionName: "Northeast",
  },
  { name: "Rhode Island", svgPathId: "Rhode Island", regionName: "Northeast" },
  { name: "Connecticut", svgPathId: "Connecticut", regionName: "Northeast" },
  { name: "New York", svgPathId: "New York", regionName: "Northeast" },

  // Great Plains South
  { name: "Kansas", svgPathId: "Kansas", regionName: "Great Plains South" },
  { name: "Missouri", svgPathId: "Missouri", regionName: "Great Plains South" },
  { name: "Oklahoma", svgPathId: "Oklahoma", regionName: "Great Plains South" },
  { name: "Arkansas", svgPathId: "Arkansas", regionName: "Great Plains South" },

  // Southwest
  { name: "California", svgPathId: "California", regionName: "Southwest" },
  { name: "Arizona", svgPathId: "Arizona", regionName: "Southwest" },
  { name: "New Mexico", svgPathId: "New Mexico", regionName: "Southwest" },
  { name: "Colorado", svgPathId: "Colorado", regionName: "Southwest" },

  // South Central
  { name: "Texas", svgPathId: "Texas", regionName: "South Central" },
  { name: "Louisiana", svgPathId: "Louisiana", regionName: "South Central" },
  {
    name: "Mississippi",
    svgPathId: "Mississippi",
    regionName: "South Central",
  },

  // Southeast
  { name: "Kentucky", svgPathId: "Kentucky", regionName: "Southeast" },
  { name: "Tennessee", svgPathId: "Tennessee", regionName: "Southeast" },
  { name: "Alabama", svgPathId: "Alabama", regionName: "Southeast" },
  { name: "Georgia", svgPathId: "Georgia", regionName: "Southeast" },
  {
    name: "South Carolina",
    svgPathId: "South Carolina",
    regionName: "Southeast",
  },
  {
    name: "North Carolina",
    svgPathId: "North Carolina",
    regionName: "Southeast",
  },

  // Mid-Atlantic
  {
    name: "West Virginia",
    svgPathId: "West Virginia",
    regionName: "Mid-Atlantic",
  },
  { name: "Virginia", svgPathId: "Virginia", regionName: "Mid-Atlantic" },
  { name: "Maryland", svgPathId: "Maryland", regionName: "Mid-Atlantic" },
  { name: "Delaware", svgPathId: "Delaware", regionName: "Mid-Atlantic" },
  { name: "New Jersey", svgPathId: "New Jersey", regionName: "Mid-Atlantic" },
  {
    name: "Pennsylvania",
    svgPathId: "Pennsylvania",
    regionName: "Mid-Atlantic",
  },

  // Florida
  { name: "Florida", svgPathId: "Florida", regionName: "Florida" },
];

async function seedDatabase() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    console.log("Seeding regions...");

    // Insert regions
    const regionMap = new Map();
    for (const region of regionsData) {
      const [result] = await connection.query(
        "INSERT INTO regions (name, color) VALUES (?, ?)",
        [region.name, region.color]
      );
      regionMap.set(region.name, result.insertId);
      console.log(`✓ Created region: ${region.name} (ID: ${result.insertId})`);
    }

    console.log("\nSeeding districts...");

    // Insert districts
    for (const district of districtsData) {
      const regionId = regionMap.get(district.regionName);
      if (!regionId) {
        console.error(`✗ Region not found for district: ${district.name}`);
        continue;
      }

      const [result] = await connection.query(
        "INSERT INTO districts (name, svgPathId, regionId) VALUES (?, ?, ?)",
        [district.name, district.svgPathId, regionId]
      );
      console.log(
        `✓ Created district: ${district.name} → ${district.regionName} (ID: ${result.insertId})`
      );
    }

    console.log("\n✓ Database seeded successfully!");
    console.log(`  - ${regionsData.length} regions created`);
    console.log(`  - ${districtsData.length} districts created`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await connection.end();
  }
}

seedDatabase();
