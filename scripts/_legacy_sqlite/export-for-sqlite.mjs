import mysql from 'mysql2/promise';
import fs from 'fs';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);

console.log('Exporting database for SQLite...\n');

// Fetch all data
const [districts] = await connection.query('SELECT * FROM districts ORDER BY id');
const [campuses] = await connection.query('SELECT * FROM campuses ORDER BY id');
const [people] = await connection.query('SELECT * FROM people ORDER BY id');
const [assignments] = await connection.query('SELECT * FROM assignments ORDER BY id');
const [needs] = await connection.query('SELECT * FROM needs ORDER BY id');
const [notes] = await connection.query('SELECT * FROM notes ORDER BY id');

console.log(`Found ${districts.length} districts`);
console.log(`Found ${campuses.length} campuses`);
console.log(`Found ${people.length} people`);
console.log(`Found ${assignments.length} assignments`);
console.log(`Found ${needs.length} needs`);
console.log(`Found ${notes.length} notes\n`);

// Helper to escape SQL values for SQLite
function escapeSQL(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof Date) {
    // SQLite uses ISO8601 strings
    return `'${value.toISOString()}'`;
  }
  // Escape single quotes for SQLite
  return `'${String(value).replace(/'/g, "''")}'`;
}

// Build SQLite-compatible SQL file
let sql = `-- CMC Go Database Export for SQLite
-- Generated: ${new Date().toISOString()}
-- Districts: ${districts.length}
-- Campuses: ${campuses.length}
-- People: ${people.length}
-- Assignments: ${assignments.length}
-- Needs: ${needs.length}
-- Notes: ${notes.length}

PRAGMA foreign_keys = OFF;

-- Clear existing data
DELETE FROM notes;
DELETE FROM needs;
DELETE FROM assignments;
DELETE FROM people;
DELETE FROM campuses;
DELETE FROM districts;

`;

// Insert districts
if (districts.length > 0) {
  sql += `\n-- Insert ${districts.length} districts\n`;
  for (const d of districts) {
    const values = [
      escapeSQL(d.id),
      escapeSQL(d.name),
      escapeSQL(d.region),
      escapeSQL(d.createdAt),
      escapeSQL(d.updatedAt)
    ].join(', ');
    sql += `INSERT INTO districts (id, name, region, createdAt, updatedAt) VALUES (${values});\n`;
  }
}

// Insert campuses
if (campuses.length > 0) {
  sql += `\n-- Insert ${campuses.length} campuses\n`;
  for (const c of campuses) {
    const values = [
      c.id,
      escapeSQL(c.name),
      escapeSQL(c.districtId),
      escapeSQL(c.createdAt),
      escapeSQL(c.updatedAt)
    ].join(', ');
    sql += `INSERT INTO campuses (id, name, districtId, createdAt, updatedAt) VALUES (${values});\n`;
  }
}

// Insert people
if (people.length > 0) {
  sql += `\n-- Insert ${people.length} people\n`;
  for (const p of people) {
    const values = [
      p.id,
      escapeSQL(p.personId),
      escapeSQL(p.name),
      escapeSQL(p.primaryRole),
      escapeSQL(p.primaryCampusId),
      escapeSQL(p.primaryDistrictId),
      escapeSQL(p.primaryRegion),
      escapeSQL(p.nationalCategory),
      escapeSQL(p.status),
      escapeSQL(p.statusLastUpdated),
      escapeSQL(p.email),
      escapeSQL(p.phone),
      escapeSQL(p.createdAt)
    ].join(', ');
    sql += `INSERT INTO people (id, personId, name, primaryRole, primaryCampusId, primaryDistrictId, primaryRegion, nationalCategory, status, statusLastUpdated, email, phone, createdAt) VALUES (${values});\n`;
  }
}

// Insert assignments
if (assignments.length > 0) {
  sql += `\n-- Insert ${assignments.length} assignments\n`;
  for (const a of assignments) {
    const values = [
      a.id,
      escapeSQL(a.personId),
      escapeSQL(a.role),
      escapeSQL(a.campusId),
      escapeSQL(a.districtId),
      escapeSQL(a.region),
      escapeSQL(a.nationalCategory),
      escapeSQL(a.createdAt)
    ].join(', ');
    sql += `INSERT INTO assignments (id, personId, role, campusId, districtId, region, nationalCategory, createdAt) VALUES (${values});\n`;
  }
}

// Insert needs
if (needs.length > 0) {
  sql += `\n-- Insert ${needs.length} needs\n`;
  for (const n of needs) {
    const values = [
      n.id,
      escapeSQL(n.personId),
      escapeSQL(n.type),
      escapeSQL(n.amount),
      escapeSQL(n.notes),
      n.isActive ? 1 : 0,
      escapeSQL(n.createdAt)
    ].join(', ');
    sql += `INSERT INTO needs (id, personId, type, amount, notes, isActive, createdAt) VALUES (${values});\n`;
  }
}

// Insert notes
if (notes.length > 0) {
  sql += `\n-- Insert ${notes.length} notes\n`;
  for (const n of notes) {
    const values = [
      n.id,
      escapeSQL(n.personId),
      escapeSQL(n.text),
      n.isLeaderOnly ? 1 : 0,
      escapeSQL(n.createdAt)
    ].join(', ');
    sql += `INSERT INTO notes (id, personId, text, isLeaderOnly, createdAt) VALUES (${values});\n`;
  }
}

sql += `\nPRAGMA foreign_keys = ON;\n`;

// Write to file
const outputPath = '/home/ubuntu/cmc-go-sqlite-export.sql';
fs.writeFileSync(outputPath, sql);

const sizeKB = (fs.statSync(outputPath).size / 1024).toFixed(2);
console.log(`\n✅ Database exported for SQLite!`);
console.log(`📁 File: ${outputPath}`);
console.log(`📊 Size: ${sizeKB} KB\n`);

await connection.end();
