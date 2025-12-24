#!/usr/bin/env node
/**
 * Migration script to rename districts:
 * - NorthMissouri -> NorthernMissouri
 * - SouthMissouri -> SouthernMissouri
 */

import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { dirname } from "path";

const dbPath = './data/cmc_go.db';
const dir = dirname(dbPath);
try {
  mkdirSync(dir, { recursive: true });
} catch (e) {
  // Directory might already exist
}

const sqlite = new Database(dbPath);

console.log("Starting district name migration...");

try {
  // Check if NorthMissouri exists
  const northMissouri = sqlite.prepare("SELECT id FROM districts WHERE id = ?").get("NorthMissouri");
  
  if (northMissouri) {
    console.log("Found NorthMissouri, updating to NorthernMissouri...");
    
    // SQLite requires foreign keys to be disabled when updating PRIMARY KEY
    sqlite.pragma('foreign_keys = OFF');
    
    // Update district ID and name
    sqlite.prepare("UPDATE districts SET id = ?, name = ? WHERE id = ?").run(
      "NorthernMissouri",
      "Northern Missouri",
      "NorthMissouri"
    );
    
    // Re-enable foreign keys
    sqlite.pragma('foreign_keys = ON');
    
    // Update people references
    const peopleUpdated = sqlite.prepare("UPDATE people SET primaryDistrictId = ? WHERE primaryDistrictId = ?").run(
      "NorthernMissouri",
      "NorthMissouri"
    );
    console.log(`  Updated ${peopleUpdated.changes} people records`);
    
    // Update campus references
    const campusesUpdated = sqlite.prepare("UPDATE campuses SET districtId = ? WHERE districtId = ?").run(
      "NorthernMissouri",
      "NorthMissouri"
    );
    console.log(`  Updated ${campusesUpdated.changes} campus records`);
    
    // Update assignment references
    const assignmentsUpdated = sqlite.prepare("UPDATE assignments SET districtId = ? WHERE districtId = ?").run(
      "NorthernMissouri",
      "NorthMissouri"
    );
    console.log(`  Updated ${assignmentsUpdated.changes} assignment records`);
    
    // Update neighbor references in districts
    const leftNeighborUpdated = sqlite.prepare("UPDATE districts SET leftNeighbor = ? WHERE leftNeighbor = ?").run(
      "NorthernMissouri",
      "NorthMissouri"
    );
    console.log(`  Updated ${leftNeighborUpdated.changes} left neighbor references`);
    
    const rightNeighborUpdated = sqlite.prepare("UPDATE districts SET rightNeighbor = ? WHERE rightNeighbor = ?").run(
      "NorthernMissouri",
      "NorthMissouri"
    );
    console.log(`  Updated ${rightNeighborUpdated.changes} right neighbor references`);
    
    console.log("✓ Successfully migrated NorthMissouri to NorthernMissouri");
  } else {
    console.log("NorthMissouri not found in database (may have already been migrated or never existed)");
  }
  
  // Check if SouthMissouri exists and migrate to SouthernMissouri
  const southMissouri = sqlite.prepare("SELECT id FROM districts WHERE id = ?").get("SouthMissouri");
  
  if (southMissouri) {
    console.log("Found SouthMissouri, updating to SouthernMissouri...");
    
    // SQLite requires foreign keys to be disabled when updating PRIMARY KEY
    sqlite.pragma('foreign_keys = OFF');
    
    // Update district ID and name
    sqlite.prepare("UPDATE districts SET id = ?, name = ? WHERE id = ?").run(
      "SouthernMissouri",
      "Southern Missouri",
      "SouthMissouri"
    );
    
    // Re-enable foreign keys
    sqlite.pragma('foreign_keys = ON');
    
    // Update people references
    const peopleUpdated = sqlite.prepare("UPDATE people SET primaryDistrictId = ? WHERE primaryDistrictId = ?").run(
      "SouthernMissouri",
      "SouthMissouri"
    );
    console.log(`  Updated ${peopleUpdated.changes} people records`);
    
    // Update campus references
    const campusesUpdated = sqlite.prepare("UPDATE campuses SET districtId = ? WHERE districtId = ?").run(
      "SouthernMissouri",
      "SouthMissouri"
    );
    console.log(`  Updated ${campusesUpdated.changes} campus records`);
    
    // Update assignment references
    const assignmentsUpdated = sqlite.prepare("UPDATE assignments SET districtId = ? WHERE districtId = ?").run(
      "SouthernMissouri",
      "SouthMissouri"
    );
    console.log(`  Updated ${assignmentsUpdated.changes} assignment records`);
    
    // Update neighbor references in districts
    const leftNeighborUpdated = sqlite.prepare("UPDATE districts SET leftNeighbor = ? WHERE leftNeighbor = ?").run(
      "SouthernMissouri",
      "SouthMissouri"
    );
    console.log(`  Updated ${leftNeighborUpdated.changes} left neighbor references`);
    
    const rightNeighborUpdated = sqlite.prepare("UPDATE districts SET rightNeighbor = ? WHERE rightNeighbor = ?").run(
      "SouthernMissouri",
      "SouthMissouri"
    );
    console.log(`  Updated ${rightNeighborUpdated.changes} right neighbor references`);
    
    console.log("✓ Successfully migrated SouthMissouri to SouthernMissouri");
  } else {
    console.log("SouthMissouri not found in database (may have already been migrated or never existed)");
  }
  
  // Ensure foreign keys are re-enabled
  sqlite.pragma('foreign_keys = ON');
  
  console.log("\nMigration completed successfully!");
  
} catch (error) {
  console.error("Error during migration:", error);
  // Ensure foreign keys are re-enabled even on error
  sqlite.pragma('foreign_keys = ON');
  process.exit(1);
} finally {
  sqlite.close();
}

