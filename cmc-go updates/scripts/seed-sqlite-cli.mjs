#!/usr/bin/env node
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = "./data/cmc_go.db";
const districtsFile = join(__dirname, "seed-districts.json");

console.log("Seeding SQLite database using CLI...");

// Read districts
const allDistricts = JSON.parse(readFileSync(districtsFile, "utf-8"));
const districtsToSeed = allDistricts.slice(0, 20); // First 20 districts

// Generate SQL
let sql = `
-- Clear existing dev data
DELETE FROM people WHERE personId LIKE 'dev_%';
DELETE FROM campuses WHERE name LIKE '% Central' OR name LIKE '% North' OR name LIKE '% South' OR name LIKE '% Main' OR name LIKE '% Downtown' OR name LIKE '% University' OR name LIKE '% Community' OR name LIKE '% East' OR name LIKE '% West';

-- Insert districts
`;

for (const district of districtsToSeed) {
  sql += `INSERT OR IGNORE INTO districts (id, name, region) VALUES ('${district.id}', '${district.name.replace(/'/g, "''")}', '${district.region.replace(/'/g, "''")}');\n`;
}

// Generate campuses (2-3 per district)
const campusSuffixes = ["Central", "North", "South", "Main", "Downtown", "University", "Community", "East", "West"];
const campuses = [];
sql += `\n-- Insert campuses\n`;

for (const district of districtsToSeed) {
  const numCampuses = 2 + Math.floor(Math.random() * 2); // 2-3 campuses
  for (let i = 0; i < numCampuses; i++) {
    const suffix = campusSuffixes[i % campusSuffixes.length];
    const campusName = `${district.name} ${suffix}`;
    campuses.push({ name: campusName, districtId: district.id });
    sql += `INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('${campusName.replace(/'/g, "''")}', '${district.id}');\n`;
  }
}

// Generate people
const firstNames = ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Avery", "Quinn", "Sage", "River", "Dakota", "Phoenix", "Blake", "Cameron", "Drew"];
const lastNames = ["Anderson", "Brown", "Davis", "Garcia", "Harris", "Jackson", "Johnson", "Jones", "Lee", "Martinez", "Miller", "Moore", "Robinson", "Smith", "Taylor"];
const statuses = ["Yes", "Maybe", "No", "Not Invited"];

sql += `\n-- Insert people\n`;

let personCounter = 1;
for (const district of districtsToSeed) {
  const numPeople = 5 + Math.floor(Math.random() * 6); // 5-10 people
  const districtCampuses = campuses.filter(c => c.districtId === district.id);
  
  for (let i = 0; i < numPeople; i++) {
    const firstName = firstNames[(personCounter * 7 + i * 3) % firstNames.length];
    const lastName = lastNames[(personCounter * 11 + i * 5) % lastNames.length];
    const status = statuses[(personCounter + i) % statuses.length];
    const hasCampus = Math.random() > 0.2 && districtCampuses.length > 0;
    const campusName = hasCampus ? districtCampuses[Math.floor(Math.random() * districtCampuses.length)].name : null;
    
    const personId = `dev_person_${personCounter}`;
    const name = `${firstName} ${lastName}`;
    const now = Math.floor(Date.now() / 1000);
    
    if (campusName) {
      sql += `INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT '${personId}', '${name.replace(/'/g, "''")}', '${district.id}', c.id, '${district.region.replace(/'/g, "''")}', '${status}', ${now}, ${now}
FROM campuses c WHERE c.name = '${campusName.replace(/'/g, "''")}' AND c.districtId = '${district.id}' LIMIT 1;\n`;
    } else {
      sql += `INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('${personId}', '${name.replace(/'/g, "''")}', '${district.id}', NULL, '${district.region.replace(/'/g, "''")}', '${status}', ${now}, ${now});\n`;
    }
    
    personCounter++;
  }
}

// Write SQL to temp file
const tempSqlFile = join(__dirname, "temp-seed.sql");
writeFileSync(tempSqlFile, sql);

try {
  // Execute SQL using sqlite3 CLI
  execSync(`sqlite3 "${dbPath}" < "${tempSqlFile}"`, { stdio: 'inherit' });
  console.log("\n✅ Database seeded successfully!");
  
  // Get summary
  const summary = execSync(`sqlite3 "${dbPath}" "SELECT COUNT(*) FROM districts; SELECT COUNT(*) FROM campuses; SELECT COUNT(*) FROM people; SELECT status, COUNT(*) FROM people GROUP BY status;"`, { encoding: 'utf-8' });
  const lines = summary.trim().split('\n');
  console.log(`\nDatabase summary:`);
  console.log(`  Districts: ${lines[0]}`);
  console.log(`  Campuses: ${lines[1]}`);
  console.log(`  People: ${lines[2]}`);
  if (lines.length > 3) {
    console.log(`  Status breakdown:`);
    for (let i = 3; i < lines.length; i++) {
      const [status, count] = lines[i].split('|');
      console.log(`    - ${status}: ${count}`);
    }
  }
} catch (error) {
  console.error("Failed to seed database:", error.message);
  process.exit(1);
} finally {
  // Clean up temp file
  try {
    require('fs').unlinkSync(tempSqlFile);
  } catch (e) {
    // Ignore
  }
}


