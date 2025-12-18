import { eq, and, or, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { dirname } from "path";
import { 
  InsertUser, 
  users, 
  districts, 
  campuses, 
  people, 
  needs, 
  notes,
  settings,
  assignments,
  InsertDistrict,
  InsertCampus,
  InsertPerson,
  InsertNeed,
  InsertNote,
  InsertSetting,
  InsertAssignment
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _sqlite: Database.Database | null = null;

export async function getDb() {
  if (!_db) {
    try {
      // Force SQLite - ignore MySQL DATABASE_URL
      const dbPath = './data/cmc_go.db';
      // Ensure the directory exists
      const dir = dirname(dbPath);
      try {
        mkdirSync(dir, { recursive: true });
      } catch (e) {
        // Directory might already exist
      }
      _sqlite = new Database(dbPath);
      _sqlite.pragma('foreign_keys = ON');
      _db = drizzle(_sqlite);
      
      // Ensure tables exist (for dev mode)
      await ensureTablesExist();
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function ensureTablesExist() {
  if (!_sqlite) return;
  
  try {
    // Check if districts table exists
    const result = _sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='districts'").get();
    if (!result) {
      console.log("[Database] Tables not found, initializing schema...");
      _sqlite.exec(`
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
      console.log("[Database] Schema initialized successfully");
    }
  } catch (error) {
    console.warn("[Database] Failed to ensure tables exist:", error);
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Districts
export async function getAllDistricts() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(districts);
}

export async function getDistrictById(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(districts).where(eq(districts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateDistrictName(id: string, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(districts)
    .set({ name })
    .where(eq(districts.id, id));
}

export async function updateDistrictRegion(id: string, region: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(districts)
    .set({ region })
    .where(eq(districts.id, id));
}

// Campuses
export async function getAllCampuses() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(campuses);
}

export async function getCampusesByDistrict(districtId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(campuses).where(eq(campuses.districtId, districtId));
}

export async function updateCampusName(id: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(campuses)
    .set({ name })
    .where(eq(campuses.id, id));
}

export async function createCampus(campus: InsertCampus) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(campuses).values(campus);
  // Get the inserted campus ID from SQLite
  const insertId = result.lastInsertRowid as number;
  return { id: insertId, ...campus };
}

// People - now using personId (string) as the primary identifier
export async function getAllPeople() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(people);
}

export async function getPeopleByDistrict(districtId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(people).where(eq(people.primaryDistrictId, districtId));
}

export async function getPeopleByCampus(campusId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(people).where(eq(people.primaryCampusId, campusId));
}

export async function createPerson(person: InsertPerson) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(people).values(person);
  return result;
}

export async function updatePersonStatus(personId: string, status: "Yes" | "Maybe" | "No" | "Not Invited") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(people)
    .set({ status, statusLastUpdated: new Date() })
    .where(eq(people.personId, personId));
}

export async function getPersonById(personId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(people).where(eq(people.personId, personId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updatePersonName(personId: string, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(people)
    .set({ name, statusLastUpdated: new Date() })
    .where(eq(people.personId, personId));
}

// Needs - now using personId (string)
export async function getNeedsByPerson(personId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(needs).where(eq(needs.personId, personId));
}

export async function createNeed(need: InsertNeed) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(needs).values(need);
  return result;
}

export async function toggleNeedActive(needId: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(needs)
    .set({ isActive })
    .where(eq(needs.id, needId));
}

export async function getAllActiveNeeds() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(needs).where(eq(needs.isActive, true));
}

// Notes - now using personId (string)
export async function getNotesByPerson(personId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(notes).where(eq(notes.personId, personId));
}

export async function createNote(note: InsertNote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notes).values(note);
  return result;
}

// Assignments
export async function getAssignmentsByPerson(personId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(assignments).where(eq(assignments.personId, personId));
}

export async function createAssignment(assignment: InsertAssignment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(assignments).values(assignment);
  return result;
}

// Metrics
export async function getMetrics() {
  const db = await getDb();
  if (!db) return { total: 0, invited: 0, going: 0, maybe: 0, notGoing: 0, notInvited: 0, percentInvited: 0 };
  
  const allPeople = await db.select().from(people);
  const total = allPeople.length;
  // Translate universal responses to national view language
  const invited = allPeople.filter(p => p.status !== "Not Invited").length;
  const going = allPeople.filter(p => p.status === "Yes").length; // Yes → Going
  const maybe = allPeople.filter(p => p.status === "Maybe").length; // Maybe → Maybe
  const notGoing = allPeople.filter(p => p.status === "No").length; // No → Not Going
  const notInvited = allPeople.filter(p => p.status === "Not Invited").length; // Not Invited → Not Invited Yet
  const percentInvited = total > 0 ? Math.round((invited / total) * 100) : 0;
  
  return { total, invited, going, maybe, notGoing, notInvited, percentInvited };
}

// Follow-up data (people with Maybe status or active needs)
export async function getFollowUpPeople() {
  const db = await getDb();
  if (!db) return [];
  
  // Get all people with Maybe status
  const maybePeople = await db.select().from(people).where(eq(people.status, "Maybe"));
  
  // Get all people with active needs
  const activeNeeds = await db.select().from(needs).where(eq(needs.isActive, true));
  const needsSet = new Set(activeNeeds.map(n => n.personId));
  const peopleWithNeedsIds = Array.from(needsSet);
  
  // Combine and deduplicate using personId (string)
  const allPersonIds = new Set<string>();
  maybePeople.forEach(p => allPersonIds.add(p.personId));
  peopleWithNeedsIds.forEach(id => allPersonIds.add(id));
  
  // Get full person records
  if (allPersonIds.size === 0) return [];
  
  const personIdsArray = Array.from(allPersonIds);
  const followUpPeople = await db.select().from(people).where(
    or(...personIdsArray.map(id => eq(people.personId, id)))
  );
  
  return followUpPeople;
}

// Settings
export async function getSetting(key: string) {
  console.log('[getSetting] Fetching key:', key);
  const db = await getDb();
  if (!db) {
    console.log('[getSetting] No database connection');
    return null;
  }
  
  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  console.log('[getSetting] Result for', key, ':', result[0] || 'null');
  return result[0] || null;
}

export async function setSetting(key: string, value: string) {
  const db = await getDb();
  if (!db) return;
  
  // Try to update first
  const existing = await getSetting(key);
  
  if (existing) {
    await db.update(settings)
      .set({ value, updatedAt: new Date() })
      .where(eq(settings.key, key));
  } else {
    await db.insert(settings).values({ key, value });
  }
}

// Import people from CSV
export async function importPeople(rows: Array<{
  name: string;
  campus?: string; // Optional for National assignments
  district?: string; // Optional for National assignments
  role?: string;
  status?: "Yes" | "Maybe" | "No" | "Not Invited";
  notes?: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results = {
    success: 0,
    skipped: 0,
    errors: [] as Array<{ row: number; name: string; error: string }>,
  };

  // Get all districts and campuses for validation
  const allDistricts = await db.select().from(districts);
  const allCampuses = await db.select().from(campuses);
  
  const districtMap = new Map(allDistricts.map(d => [d.name.toLowerCase(), d.id]));
  const campusMap = new Map(allCampuses.map(c => [c.name.toLowerCase(), c]));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    try {
      // Determine assignment type
      const isNational = !row.district || row.district.toLowerCase() === 'national';
      const isDistrict = row.district && !row.campus; // Has district but no campus
      const isCampus = row.district && row.campus; // Has both

      let districtId: string | null = null;
      let campus: typeof allCampuses[0] | null = null;

      if (!isNational) {
        // Validate district
        districtId = districtMap.get(row.district!.toLowerCase()) || null;
        if (!districtId) {
          results.errors.push({
            row: rowNum,
            name: row.name,
            error: `District "${row.district}" not found`,
          });
          continue;
        }

        // Validate campus if provided
        if (row.campus) {
          campus = campusMap.get(row.campus.toLowerCase()) || null;
          if (!campus) {
            results.errors.push({
              row: rowNum,
              name: row.name,
              error: `Campus "${row.campus}" not found`,
            });
            continue;
          }
        }
      }

      // Check if person already exists (by name)
      const existing = await db
        .select()
        .from(people)
        .where(eq(people.name, row.name))
        .limit(1);

      if (existing.length > 0) {
        // Check if already assigned
        if (isCampus && campus) {
          // Check campus assignment
          const existingAssignment = await db
            .select()
            .from(assignments)
            .where(
              and(
                eq(assignments.personId, existing[0].personId),
                eq(assignments.campusId, campus.id)
              )
            )
            .limit(1);

          if (existingAssignment.length > 0) {
            results.skipped++;
            continue;
          }
        } else if (isDistrict && districtId) {
          // Check district assignment
          const existingDistrict = await db
            .select()
            .from(assignments)
            .where(
              and(
                eq(assignments.personId, existing[0].personId),
                eq(assignments.districtId, districtId),
                eq(assignments.assignmentType, "District")
              )
            )
            .limit(1);

          if (existingDistrict.length > 0) {
            results.skipped++;
            continue;
          }
        } else if (isNational) {
          // Check if already has National assignment
          const existingNational = await db
            .select()
            .from(assignments)
            .where(
              and(
                eq(assignments.personId, existing[0].personId),
                eq(assignments.assignmentType, "National")
              )
            )
            .limit(1);

          if (existingNational.length > 0) {
            results.skipped++;
            continue;
          }
        }
      }

      // Create or get person
      let personId: string;
      if (existing.length > 0) {
        personId = existing[0].personId;
        // Update person status if provided
        if (row.status) {
          await db
            .update(people)
            .set({ status: row.status })
            .where(eq(people.personId, personId));
        }
      } else {
        // Create new person
        personId = `person_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await db.insert(people).values({
          personId,
          name: row.name,
          status: row.status || "Not Invited",
          primaryRole: row.role || null,
          createdAt: new Date(),
          statusLastUpdated: new Date(),
        });
      }

      // Create assignment using correct schema
      if (isNational) {
        // National assignment
        await db.insert(assignments).values({
          personId,
          assignmentType: "National",
          roleTitle: row.role || "National Team",
          campusId: null,
          districtId: null,
          region: null,
          isPrimary: true,
          createdAt: new Date(),
        });
      } else if (isDistrict && districtId) {
        // District assignment (no campus)
        const district = allDistricts.find(d => d.id === districtId);
        await db.insert(assignments).values({
          personId,
          assignmentType: "District",
          roleTitle: row.role || "No Campus Assigned",
          campusId: null,
          districtId: districtId,
          region: district?.region || null,
          isPrimary: true,
          createdAt: new Date(),
        });
      } else if (isCampus && campus && districtId) {
        // Campus assignment
        const district = allDistricts.find(d => d.id === districtId);
        await db.insert(assignments).values({
          personId,
          assignmentType: "Campus",
          roleTitle: row.role || "Member",
          campusId: campus.id,
          districtId: districtId,
          region: district?.region || null,
          isPrimary: true,
          createdAt: new Date(),
        });
      }

      // Add note if provided
      if (row.notes) {
        await db.insert(notes).values({
          personId,
          text: row.notes,
          isLeaderOnly: false,
          createdAt: new Date(),
        });
      }

      results.success++;
    } catch (error) {
      results.errors.push({
        row: rowNum,
        name: row.name,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

// Get all national staff and regional directors
export async function getNationalStaff() {
  const db = await getDb();
  if (!db) return [];

  // Get people with National assignments (includes regional directors)
  const nationalAssignments = await db
    .select()
    .from(assignments)
    .where(eq(assignments.assignmentType, "National"));

  const nationalPersonIds = nationalAssignments.map(a => a.personId);
  
  if (nationalPersonIds.length === 0) return [];

  // Get the people details
  const nationalPeople = await db
    .select()
    .from(people)
    .where(
      inArray(people.personId, nationalPersonIds)
    );

  // Join with assignments to get role titles
  return nationalPeople.map(person => {
    const assignment = nationalAssignments.find(a => a.personId === person.personId);
    return {
      ...person,
      roleTitle: assignment?.roleTitle || null,
      assignmentType: assignment?.assignmentType || null,
    };
  });
}
