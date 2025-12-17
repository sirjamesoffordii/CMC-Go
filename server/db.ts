import { eq, and, or } from "drizzle-orm";
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
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
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

export async function updatePersonStatus(personId: string, status: "Not invited yet" | "Maybe" | "Going" | "Not Going") {
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
  const invited = allPeople.filter(p => p.status !== "Not invited yet").length;
  const going = allPeople.filter(p => p.status === "Going").length;
  const maybe = allPeople.filter(p => p.status === "Maybe").length;
  const notGoing = allPeople.filter(p => p.status === "Not Going").length;
  const notInvited = allPeople.filter(p => p.status === "Not invited yet").length;
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
