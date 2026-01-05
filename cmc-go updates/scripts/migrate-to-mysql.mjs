import Database from 'better-sqlite3';
import mysql from 'mysql2/promise';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

console.log('=== CMC Go: SQLite to MySQL Migration ===\n');

// Connect to SQLite
const sqlite = new Database('./data/cmc_go.db', { readonly: true });
console.log('✓ Connected to SQLite database');

// Connect to MySQL
const connection = await mysql.createConnection(DATABASE_URL);
console.log('✓ Connected to MySQL database\n');

try {
  // Drop existing tables if they exist
  console.log('Dropping existing tables...');
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  await connection.query('DROP TABLE IF EXISTS assignments');
  await connection.query('DROP TABLE IF EXISTS notes');
  await connection.query('DROP TABLE IF EXISTS needs');
  await connection.query('DROP TABLE IF EXISTS people');
  await connection.query('DROP TABLE IF EXISTS campuses');
  await connection.query('DROP TABLE IF EXISTS districts');
  await connection.query('DROP TABLE IF EXISTS settings');
  await connection.query('DROP TABLE IF EXISTS users');
  await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('✓ Dropped existing tables\n');

  // Create tables
  console.log('Creating MySQL tables...');
  
  await connection.query(`
    CREATE TABLE users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      openId VARCHAR(64) NOT NULL UNIQUE,
      name VARCHAR(255),
      email VARCHAR(320),
      loginMethod VARCHAR(64),
      role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      lastSignedIn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await connection.query(`
    CREATE TABLE districts (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      region VARCHAR(255) NOT NULL,
      leftNeighbor VARCHAR(64),
      rightNeighbor VARCHAR(64)
    )
  `);
  
  await connection.query(`
    CREATE TABLE campuses (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      districtId VARCHAR(64) NOT NULL
    )
  `);
  
  await connection.query(`
    CREATE TABLE people (
      id INT PRIMARY KEY AUTO_INCREMENT,
      personId VARCHAR(64) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      primaryRole VARCHAR(255),
      primaryCampusId INT,
      primaryDistrictId VARCHAR(64),
      primaryRegion VARCHAR(255),
      nationalCategory VARCHAR(255),
      status ENUM('Yes', 'Maybe', 'No', 'Not Invited') NOT NULL DEFAULT 'Not Invited',
      depositPaid BOOLEAN NOT NULL DEFAULT FALSE,
      statusLastUpdated TIMESTAMP NULL,
      statusLastUpdatedBy VARCHAR(255),
      needs TEXT,
      notes TEXT,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await connection.query(`
    CREATE TABLE assignments (
      id INT PRIMARY KEY AUTO_INCREMENT,
      personId VARCHAR(64) NOT NULL,
      assignmentType ENUM('Campus', 'District', 'Region', 'National') NOT NULL,
      roleTitle VARCHAR(255) NOT NULL,
      campusId INT,
      districtId VARCHAR(64),
      region VARCHAR(255),
      isPrimary BOOLEAN NOT NULL DEFAULT FALSE,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await connection.query(`
    CREATE TABLE needs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      personId VARCHAR(64) NOT NULL,
      description TEXT NOT NULL,
      amount INT,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await connection.query(`
    CREATE TABLE notes (
      id INT PRIMARY KEY AUTO_INCREMENT,
      personId VARCHAR(64) NOT NULL,
      content TEXT NOT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      createdBy VARCHAR(255)
    )
  `);
  
  await connection.query(`
    CREATE TABLE settings (
      \`key\` VARCHAR(255) PRIMARY KEY,
      value TEXT,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  
  console.log('✓ Created MySQL tables\n');

  // Migrate data
  console.log('Migrating data from SQLite to MySQL...\n');

  // Migrate districts
  const districts = sqlite.prepare('SELECT * FROM districts').all();
  for (const district of districts) {
    await connection.query(
      'INSERT INTO districts (id, name, region, leftNeighbor, rightNeighbor) VALUES (?, ?, ?, ?, ?)',
      [district.id, district.name, district.region, district.leftNeighbor, district.rightNeighbor]
    );
  }
  console.log(`✓ Migrated ${districts.length} districts`);

  // Migrate campuses
  const campuses = sqlite.prepare('SELECT * FROM campuses').all();
  for (const campus of campuses) {
    await connection.query(
      'INSERT INTO campuses (id, name, districtId) VALUES (?, ?, ?)',
      [campus.id, campus.name, campus.districtId]
    );
  }
  console.log(`✓ Migrated ${campuses.length} campuses`);

  // Migrate people
  const people = sqlite.prepare('SELECT * FROM people').all();
  for (const person of people) {
    await connection.query(
      `INSERT INTO people (
        id, personId, name, primaryRole, primaryCampusId, primaryDistrictId,
        primaryRegion, nationalCategory, status, depositPaid, statusLastUpdated,
        statusLastUpdatedBy, needs, notes, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        person.id,
        person.personId,
        person.name,
        person.primaryRole,
        person.primaryCampusId,
        person.primaryDistrictId,
        person.primaryRegion,
        person.nationalCategory,
        person.status,
        person.depositPaid ? 1 : 0,
        person.statusLastUpdated ? new Date(person.statusLastUpdated) : null,
        person.statusLastUpdatedBy,
        person.needs,
        person.notes,
        new Date(person.createdAt)
      ]
    );
  }
  console.log(`✓ Migrated ${people.length} people`);

  // Migrate assignments
  const assignments = sqlite.prepare('SELECT * FROM assignments').all();
  for (const assignment of assignments) {
    await connection.query(
      `INSERT INTO assignments (
        id, personId, assignmentType, roleTitle, campusId, districtId,
        region, isPrimary, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        assignment.id,
        assignment.personId,
        assignment.assignmentType,
        assignment.roleTitle,
        assignment.campusId,
        assignment.districtId,
        assignment.region,
        assignment.isPrimary ? 1 : 0,
        new Date(assignment.createdAt)
      ]
    );
  }
  console.log(`✓ Migrated ${assignments.length} assignments`);

  // Migrate settings
  const settings = sqlite.prepare('SELECT * FROM settings').all();
  for (const setting of settings) {
    await connection.query(
      'INSERT INTO settings (`key`, value, updatedAt) VALUES (?, ?, ?)',
      [setting.key, setting.value, new Date(setting.updatedAt)]
    );
  }
  console.log(`✓ Migrated ${settings.length} settings`);

  // Verify migration
  console.log('\n=== Verification ===\n');
  const [districtCount] = await connection.query('SELECT COUNT(*) as count FROM districts');
  const [campusCount] = await connection.query('SELECT COUNT(*) as count FROM campuses');
  const [peopleCount] = await connection.query('SELECT COUNT(*) as count FROM people');
  const [assignmentCount] = await connection.query('SELECT COUNT(*) as count FROM assignments');
  const [settingCount] = await connection.query('SELECT COUNT(*) as count FROM settings');

  console.log(`Districts: ${districtCount[0].count}`);
  console.log(`Campuses: ${campusCount[0].count}`);
  console.log(`People: ${peopleCount[0].count}`);
  console.log(`Assignments: ${assignmentCount[0].count}`);
  console.log(`Settings: ${settingCount[0].count}`);

  // Check status breakdown
  const [statusBreakdown] = await connection.query(`
    SELECT status, COUNT(*) as count 
    FROM people 
    GROUP BY status
  `);
  console.log('\nStatus Breakdown:');
  statusBreakdown.forEach(row => {
    console.log(`  ${row.status}: ${row.count}`);
  });

  console.log('\n✅ Migration completed successfully!');

} catch (error) {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
} finally {
  sqlite.close();
  await connection.end();
}
