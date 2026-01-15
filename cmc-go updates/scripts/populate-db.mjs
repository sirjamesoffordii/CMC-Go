#!/usr/bin/env node
import { readFileSync, writeFileSync, unlinkSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read JSON files
const districts = JSON.parse(readFileSync(join(__dirname, "seed-districts.json"), "utf-8"));
const campuses = JSON.parse(readFileSync(join(__dirname, "seed-campuses.json"), "utf-8"));
const people = JSON.parse(readFileSync(join(__dirname, "seed-people.json"), "utf-8"));

const dbPath = './data/cmc_go.db';

console.log("Populating database with districts, campuses, and people...");

// Helper function to escape SQL strings
function escapeSQL(str) {
  if (!str) return 'NULL';
  return "'" + str.replace(/'/g, "''") + "'";
}

// Helper function to get current timestamp
function getTimestamp() {
  return Math.floor(Date.now() / 1000);
}

// Map status values
function mapStatus(status) {
  const statusMap = {
    'Going': 'Yes',
    'Maybe': 'Maybe',
    'Not going': 'No',
    'Not invited yet': 'Not Invited'
  };
  return statusMap[status] || 'Not Invited';
}

// Generate personId from name
function generatePersonId(name, index) {
  // Create a simple ID from name + index
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${cleanName}-${index}`;
}

try {
  // Start transaction
  let sql = "BEGIN TRANSACTION;\n\n";
  
  // Clear existing data
  sql += "DELETE FROM notes;\n";
  sql += "DELETE FROM needs;\n";
  sql += "DELETE FROM assignments;\n";
  sql += "DELETE FROM people;\n";
  sql += "DELETE FROM campuses;\n";
  sql += "DELETE FROM districts;\n\n";
  
  // Insert districts
  console.log(`Inserting ${districts.length} districts...`);
  sql += "-- Insert Districts\n";
  for (const district of districts) {
    sql += `INSERT INTO districts (id, name, region) VALUES (${escapeSQL(district.id)}, ${escapeSQL(district.name)}, ${escapeSQL(district.region)});\n`;
  }
  sql += "\n";
  
  // Insert campuses
  console.log(`Inserting ${campuses.length} campuses...`);
  sql += "-- Insert Campuses\n";
  for (const campus of campuses) {
    sql += `INSERT INTO campuses (id, name, districtId) VALUES (${campus.id}, ${escapeSQL(campus.name)}, ${escapeSQL(campus.districtId)});\n`;
  }
  sql += "\n";
  
  // Insert people
  console.log(`Inserting ${people.length} people...`);
  sql += "-- Insert People\n";
  let personIndex = 1;
  for (const person of people) {
    const personId = generatePersonId(person.name, personIndex);
    const status = mapStatus(person.status);
    const campusId = person.campusId || 'NULL';
    const districtId = person.districtId ? escapeSQL(person.districtId) : 'NULL';
    const role = person.role ? escapeSQL(person.role) : 'NULL';
    const timestamp = getTimestamp();
    
    sql += `INSERT INTO people (personId, name, primaryRole, primaryCampusId, primaryDistrictId, status, createdAt, depositPaid) VALUES (${escapeSQL(personId)}, ${escapeSQL(person.name)}, ${role}, ${campusId}, ${districtId}, ${escapeSQL(status)}, ${timestamp}, 0);\n`;
    personIndex++;
  }
  
  // Commit transaction
  sql += "\nCOMMIT;\n";
  
  // Write SQL to temporary file
  const sqlFile = join(__dirname, 'temp-populate.sql');
  writeFileSync(sqlFile, sql, 'utf-8');
  
  // Execute SQL using sqlite3 CLI
  console.log("Executing SQL...");
  execSync(`sqlite3 "${dbPath}" < "${sqlFile}"`, { stdio: 'inherit', shell: true });
  
  // Clean up temp file
  unlinkSync(sqlFile);
  
  console.log("Database populated successfully!");
  console.log(`- ${districts.length} districts`);
  console.log(`- ${campuses.length} campuses`);
  console.log(`- ${people.length} people`);
  
} catch (error) {
  console.error("Error populating database:", error);
  process.exit(1);
}

