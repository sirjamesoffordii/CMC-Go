import mysql from "mysql2/promise";

// Chi Alpha Regions with their colors (from the SVG map)
const regionsData = [
  { name: "Texico", color: "#9b6b9f" },
  { name: "South Central", color: "#9b6b9f" },
  { name: "South East", color: "#6b8f7a" },
  { name: "Mid-Atlantic", color: "#a87d6b" },
  { name: "North East", color: "#8f5a6b" },
  { name: "Great Lakes", color: "#5a7a8f" },
  { name: "Great Plains North", color: "#7b6d8f" },
  { name: "Great Plains South", color: "#c47b7b" },
  { name: "Big Sky", color: "#a89968" },
  { name: "Northwest", color: "#6b9fa3" },
  { name: "West Coast", color: "#b8956f" },
];

// Districts mapped to their regions (from SVG Source of Truth document)
// svgPathId must match the inkscape:label in map.svg exactly
const districtsData = [
  // TEXICO
  { svgPathId: "NorthTexas", regionName: "Texico" },
  { svgPathId: "SouthTexas", regionName: "Texico" },
  { svgPathId: "WestTexas", regionName: "Texico" },
  { svgPathId: "NewMexico", regionName: "Texico" },

  // SOUTH CENTRAL
  { svgPathId: "Oklahoma", regionName: "South Central" },
  { svgPathId: "Louisiana", regionName: "South Central" },
  { svgPathId: "Arkansas", regionName: "South Central" },

  // SOUTH EAST
  { svgPathId: "Mississippi", regionName: "South East" },
  { svgPathId: "Alabama", regionName: "South East" },
  { svgPathId: "PeninsularFlorida", regionName: "South East" },
  { svgPathId: "WestFlorida", regionName: "South East" },
  { svgPathId: "Georgia", regionName: "South East" },
  { svgPathId: "SouthCarolina", regionName: "South East" },

  // MID-ATLANTIC
  { svgPathId: "NorthCarolina", regionName: "Mid-Atlantic" },
  { svgPathId: "Appalachian", regionName: "Mid-Atlantic" },
  { svgPathId: "Kentucky", regionName: "Mid-Atlantic" },
  { svgPathId: "Tennessee", regionName: "Mid-Atlantic" },

  // NORTH EAST
  { svgPathId: "NorthernNewEngland", regionName: "North East" },
  { svgPathId: "SouthernNewEngland", regionName: "North East" },
  { svgPathId: "NewYork", regionName: "North East" },
  { svgPathId: "NewJersey", regionName: "North East" },
  { svgPathId: "Penn-Del", regionName: "North East" },
  { svgPathId: "Potomac", regionName: "North East" },

  // GREAT LAKES
  { svgPathId: "Illinois", regionName: "Great Lakes" },
  { svgPathId: "Indiana", regionName: "Great Lakes" },
  { svgPathId: "Michigan", regionName: "Great Lakes" },
  { svgPathId: "Ohio", regionName: "Great Lakes" },

  // GREAT PLAINS NORTH
  { svgPathId: "Minnesota", regionName: "Great Plains North" },
  { svgPathId: "NorthDakota", regionName: "Great Plains North" },
  { svgPathId: "SouthDakota", regionName: "Great Plains North" },
  { svgPathId: "Wisconsin-NorthMichigan", regionName: "Great Plains North" },

  // GREAT PLAINS SOUTH
  { svgPathId: "Iowa", regionName: "Great Plains South" },
  { svgPathId: "Nebraska", regionName: "Great Plains South" },
  { svgPathId: "Kansas", regionName: "Great Plains South" },
  { svgPathId: "NorthernMissouri", regionName: "Great Plains South" },
  { svgPathId: "SouthernMissouri", regionName: "Great Plains South" },

  // BIG SKY
  { svgPathId: "Colorado", regionName: "Big Sky" },
  { svgPathId: "Utah", regionName: "Big Sky" },
  { svgPathId: "Wyoming", regionName: "Big Sky" },
  { svgPathId: "Montana", regionName: "Big Sky" },
  { svgPathId: "SouthIdaho", regionName: "Big Sky" },

  // NORTHWEST
  { svgPathId: "Oregon", regionName: "Northwest" },
  { svgPathId: "Washington", regionName: "Northwest" },
  { svgPathId: "Alaska", regionName: "Northwest" },

  // WEST COAST
  { svgPathId: "Hawaii", regionName: "West Coast" },
  { svgPathId: "NorthernCal-Nevada", regionName: "West Coast" },
  { svgPathId: "SouthernCalifornia", regionName: "West Coast" },
  { svgPathId: "Arizona", regionName: "West Coast" },
];

async function seedChiAlpha() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    console.log("=== Chi Alpha Regions & Districts Seeding ===\n");

    // Clear existing data
    console.log("Clearing existing districts and regions...");
    await connection.query("DELETE FROM campuses");
    await connection.query("DELETE FROM districts");
    await connection.query("DELETE FROM regions");

    // Insert regions
    console.log("\nSeeding regions...");
    const regionMap = new Map();
    for (const region of regionsData) {
      const [result] = await connection.query(
        "INSERT INTO regions (name, color) VALUES (?, ?)",
        [region.name, region.color]
      );
      regionMap.set(region.name, result.insertId);
      console.log(`✓ Created region: ${region.name} (ID: ${result.insertId})`);
    }

    // Insert districts
    console.log("\nSeeding districts...");
    for (const district of districtsData) {
      const regionId = regionMap.get(district.regionName);
      if (!regionId) {
        console.error(`✗ Region not found: ${district.regionName}`);
        continue;
      }

      // Use svgPathId as both the name and svgPathId for now
      // The name can be made more human-readable later
      const [result] = await connection.query(
        "INSERT INTO districts (name, svgPathId, regionId) VALUES (?, ?, ?)",
        [district.svgPathId, district.svgPathId, regionId]
      );
      console.log(
        `✓ Created district: ${district.svgPathId} → ${district.regionName}`
      );
    }

    console.log("\n=== Seeding Complete ===");
    console.log(`  - ${regionsData.length} regions created`);
    console.log(`  - ${districtsData.length} districts created`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await connection.end();
  }
}

seedChiAlpha();
