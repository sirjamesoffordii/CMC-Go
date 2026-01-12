#!/usr/bin/env node
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { 
  districts, 
  campuses, 
  people,
  assignments,
  needs,
  notes,
  settings,
} from "../drizzle/schema.ts";

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Production safeguard
if (process.env.APP_ENV === 'production') {
  console.error('❌ Cannot run import script in production environment!');
  console.error('Set APP_ENV to something other than "production" to proceed.');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const connection = await mysql.createConnection(connectionString);
const db = drizzle(connection);

// Load export data
console.log("Loading export.json...");
const exportData = JSON.parse(readFileSync(join(__dirname, "../data/export.json"), "utf-8"));

async function importData() {
  console.log("Importing data from export.json...\n");
  
  // Clear existing data (in reverse order of dependencies)
  console.log("Clearing existing data...");
  try {
    await db.delete(notes);
    await db.delete(needs);
    await db.delete(assignments);
    await db.delete(people);
    await db.delete(campuses);
    await db.delete(districts);
    await db.delete(settings);
    console.log("Cleared existing data\n");
  } catch (error) {
    console.warn("Note: Some tables may not exist yet:", error.message);
  }

  // Import districts
  if (exportData.districts && exportData.districts.length > 0) {
    console.log(`Importing ${exportData.districts.length} districts...`);
    for (const district of exportData.districts) {
      try {
        await db.insert(districts).values({
          id: district.id,
          name: district.name,
          region: district.region,
          leftNeighbor: district.leftNeighbor || null,
          rightNeighbor: district.rightNeighbor || null,
        }).onDuplicateKeyUpdate({
          set: {
            name: district.name,
            region: district.region,
            leftNeighbor: district.leftNeighbor || null,
            rightNeighbor: district.rightNeighbor || null,
          },
        });
      } catch (error) {
        console.warn(`Failed to import district ${district.id}:`, error.message);
      }
    }
    console.log(`✅ Imported ${exportData.districts.length} districts\n`);
  }

  // Import campuses
  if (exportData.campuses && exportData.campuses.length > 0) {
    console.log(`Importing ${exportData.campuses.length} campuses...`);
    for (const campus of exportData.campuses) {
      try {
        await db.insert(campuses).values({
          name: campus.name,
          districtId: campus.districtId,
        }).onDuplicateKeyUpdate({
          set: {
            name: campus.name,
            districtId: campus.districtId,
          },
        });
      } catch (error) {
        console.warn(`Failed to import campus ${campus.name}:`, error.message);
      }
    }
    console.log(`✅ Imported ${exportData.campuses.length} campuses\n`);
  }

  // Import people
  if (exportData.people && exportData.people.length > 0) {
    console.log(`Importing ${exportData.people.length} people...`);
    let successCount = 0;
    let errorCount = 0;
    
    for (const person of exportData.people) {
      try {
        await db.insert(people).values({
          personId: person.personId,
          name: person.name,
          primaryRole: person.primaryRole || null,
          primaryCampusId: person.primaryCampusId || null,
          primaryDistrictId: person.primaryDistrictId || null,
          primaryRegion: person.primaryRegion || null,
          nationalCategory: person.nationalCategory || null,
          status: person.status || "Not Invited",
          depositPaid: person.depositPaid || false,
          statusLastUpdated: person.statusLastUpdated ? new Date(person.statusLastUpdated * 1000) : null,
          statusLastUpdatedBy: person.statusLastUpdatedBy || null,
          needs: person.needs || null,
          notes: person.notes || null,
          spouse: person.spouse || null,
          kids: person.kids || null,
          guests: person.guests || null,
          childrenAges: person.childrenAges || null,
          lastEdited: person.lastEdited ? new Date(person.lastEdited * 1000) : null,
          lastEditedBy: person.lastEditedBy || null,
          createdAt: person.createdAt ? new Date(person.createdAt * 1000) : new Date(),
        }).onDuplicateKeyUpdate({
          set: {
            name: person.name,
            primaryRole: person.primaryRole || null,
            primaryCampusId: person.primaryCampusId || null,
            primaryDistrictId: person.primaryDistrictId || null,
            primaryRegion: person.primaryRegion || null,
            nationalCategory: person.nationalCategory || null,
            status: person.status || "Not Invited",
            depositPaid: person.depositPaid || false,
            statusLastUpdated: person.statusLastUpdated ? new Date(person.statusLastUpdated * 1000) : null,
            statusLastUpdatedBy: person.statusLastUpdatedBy || null,
          },
        });
        successCount++;
      } catch (error) {
        console.warn(`Failed to import person ${person.name} (${person.personId}):`, error.message);
        errorCount++;
      }
    }
    console.log(`✅ Imported ${successCount} people (${errorCount} errors)\n`);
  }

  // Import assignments
  if (exportData.assignments && exportData.assignments.length > 0) {
    console.log(`Importing ${exportData.assignments.length} assignments...`);
    let successCount = 0;
    let errorCount = 0;
    
    for (const assignment of exportData.assignments) {
      try {
        await db.insert(assignments).values({
          id: assignment.id,
          personId: assignment.personId,
          assignmentType: assignment.assignmentType,
          roleTitle: assignment.roleTitle,
          campusId: assignment.campusId || null,
          districtId: assignment.districtId || null,
          region: assignment.region || null,
          isPrimary: assignment.isPrimary ? 1 : 0,
          createdAt: assignment.createdAt ? new Date(assignment.createdAt * 1000) : new Date(),
        }).onDuplicateKeyUpdate({
          set: {
            personId: assignment.personId,
            assignmentType: assignment.assignmentType,
            roleTitle: assignment.roleTitle,
            campusId: assignment.campusId || null,
            districtId: assignment.districtId || null,
            region: assignment.region || null,
            isPrimary: assignment.isPrimary ? 1 : 0,
          },
        });
        successCount++;
      } catch (error) {
        console.warn(`Failed to import assignment ${assignment.id}:`, error.message);
        errorCount++;
      }
    }
    console.log(`✅ Imported ${successCount} assignments (${errorCount} errors)\n`);
  }

  // Import needs
  if (exportData.needs && exportData.needs.length > 0) {
    console.log(`Importing ${exportData.needs.length} needs...`);
    let successCount = 0;
    let errorCount = 0;
    
    for (const need of exportData.needs) {
      try {
        await db.insert(needs).values({
          personId: need.personId,
          description: need.description || need.notes || need.type || "Need",
          amount: need.amount || null,
          createdAt: need.createdAt ? new Date(need.createdAt * 1000) : new Date(),
        }).onDuplicateKeyUpdate({
          set: {
            description: need.description || need.notes || need.type || "Need",
            amount: need.amount || null,
          },
        });
        successCount++;
      } catch (error) {
        console.warn(`Failed to import need ${need.id}:`, error.message);
        errorCount++;
      }
    }
    console.log(`✅ Imported ${successCount} needs (${errorCount} errors)\n`);
  }

  // Import notes
  if (exportData.notes && exportData.notes.length > 0) {
    console.log(`Importing ${exportData.notes.length} notes...`);
    let successCount = 0;
    let errorCount = 0;
    
    for (const note of exportData.notes) {
      try {
        await db.insert(notes).values({
          personId: note.personId,
          content: note.content || note.text || "Note",
          createdBy: note.createdBy || null,
          createdAt: note.createdAt ? new Date(note.createdAt * 1000) : new Date(),
        }).onDuplicateKeyUpdate({
          set: {
            content: note.content || note.text || "Note",
            createdBy: note.createdBy || null,
          },
        });
        successCount++;
      } catch (error) {
        console.warn(`Failed to import note ${note.id}:`, error.message);
        errorCount++;
      }
    }
    console.log(`✅ Imported ${successCount} notes (${errorCount} errors)\n`);
  }

  // Import settings
  if (exportData.settings && exportData.settings.length > 0) {
    console.log(`Importing ${exportData.settings.length} settings...`);
    for (const setting of exportData.settings) {
      try {
        await db.insert(settings).values({
          key: setting.key,
          value: setting.value,
          updatedAt: setting.updatedAt ? new Date(setting.updatedAt * 1000) : new Date(),
        }).onDuplicateKeyUpdate({
          set: {
            value: setting.value,
            updatedAt: setting.updatedAt ? new Date(setting.updatedAt * 1000) : new Date(),
          },
        });
      } catch (error) {
        console.warn(`Failed to import setting ${setting.key}:`, error.message);
      }
    }
    console.log(`✅ Imported ${exportData.settings.length} settings\n`);
  }

  console.log("\n✅ Import completed!");
  
  // Print summary
  const districtCount = await db.select().from(districts);
  const campusCount = await db.select().from(campuses);
  const allPeopleData = await db.select().from(people);
  
  const statusCounts = {
    "Yes": allPeopleData.filter(p => p.status === "Yes").length,
    "Maybe": allPeopleData.filter(p => p.status === "Maybe").length,
    "No": allPeopleData.filter(p => p.status === "No").length,
    "Not Invited": allPeopleData.filter(p => p.status === "Not Invited").length,
  };
  
  console.log(`\nDatabase summary:`);
  console.log(`  Districts: ${districtCount.length}`);
  console.log(`  Campuses: ${campusCount.length}`);
  console.log(`  People: ${allPeopleData.length}`);
  console.log(`  Status breakdown:`);
  console.log(`    - Going (Yes): ${statusCounts["Yes"]}`);
  console.log(`    - Maybe: ${statusCounts["Maybe"]}`);
  console.log(`    - Not Going (No): ${statusCounts["No"]}`);
  console.log(`    - Not Invited: ${statusCounts["Not Invited"]}`);
}

importData()
  .then(() => {
    connection.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error("Import failed:", error);
    connection.end();
    process.exit(1);
  });


