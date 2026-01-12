#!/usr/bin/env node
import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { dirname } from "path";
import { config } from "dotenv";

config();

// Production safeguard
if (process.env.APP_ENV === 'production') {
  console.error('❌ Cannot run init-db script in production environment!');
  console.error('Set APP_ENV to something other than "production" to proceed.');
  process.exit(1);
}

const dbPath = './data/cmc_go.db';
const dir = dirname(dbPath);
try {
  mkdirSync(dir, { recursive: true });
} catch (e) {
  // Directory might already exist
}

const sqlite = new Database(dbPath);
sqlite.pragma('foreign_keys = ON');

console.log("Initializing database schema...");

// Create tables in order (respecting foreign keys)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    openId TEXT(64) NOT NULL UNIQUE,
    name TEXT,
    email TEXT(320),
    loginMethod TEXT(64),
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
    createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updatedAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    lastSignedIn INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS districts (
    id TEXT(64) PRIMARY KEY,
    name TEXT(255) NOT NULL,
    region TEXT(255) NOT NULL,
    leftNeighbor TEXT(64),
    rightNeighbor TEXT(64)
  );

  CREATE TABLE IF NOT EXISTS campuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT(255) NOT NULL,
    districtId TEXT(64) NOT NULL,
    FOREIGN KEY (districtId) REFERENCES districts(id)
  );

  CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    personId TEXT(64) NOT NULL UNIQUE,
    name TEXT(255) NOT NULL,
    primaryRole TEXT(255),
    primaryCampusId INTEGER,
    primaryDistrictId TEXT(64),
    primaryRegion TEXT(255),
    nationalCategory TEXT(255),
    status TEXT NOT NULL DEFAULT 'Not Invited' CHECK(status IN ('Yes', 'Maybe', 'No', 'Not Invited')),
    depositPaid INTEGER NOT NULL DEFAULT 0 CHECK(depositPaid IN (0, 1)),
    statusLastUpdated INTEGER,
    statusLastUpdatedBy TEXT(255),
    needs TEXT,
    notes TEXT,
    createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (primaryCampusId) REFERENCES campuses(id),
    FOREIGN KEY (primaryDistrictId) REFERENCES districts(id)
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    personId TEXT(64) NOT NULL,
    assignmentType TEXT NOT NULL CHECK(assignmentType IN ('Campus', 'District', 'Region', 'National')),
    roleTitle TEXT(255) NOT NULL,
    campusId INTEGER,
    districtId TEXT(64),
    region TEXT(255),
    isPrimary INTEGER NOT NULL DEFAULT 0 CHECK(isPrimary IN (0, 1)),
    createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (personId) REFERENCES people(personId),
    FOREIGN KEY (campusId) REFERENCES campuses(id),
    FOREIGN KEY (districtId) REFERENCES districts(id)
  );

  CREATE TABLE IF NOT EXISTS needs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    personId TEXT(64) NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('Financial', 'Other')),
    amount INTEGER,
    notes TEXT,
    isActive INTEGER NOT NULL DEFAULT 1 CHECK(isActive IN (0, 1)),
    createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (personId) REFERENCES people(personId)
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    personId TEXT(64) NOT NULL,
    text TEXT NOT NULL,
    isLeaderOnly INTEGER NOT NULL DEFAULT 0 CHECK(isLeaderOnly IN (0, 1)),
    createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (personId) REFERENCES people(personId)
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT(255) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    updatedAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );
`);

console.log("Database schema initialized successfully!");
sqlite.close();

