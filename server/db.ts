import { eq, and, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  districts, 
  campuses, 
  people, 
  needs, 
  notes,
  settings,
  InsertDistrict,
  InsertCampus,
  InsertPerson,
  InsertNeed,
  InsertNote,
  InsertSetting
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
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

    await db.insert(users).values(values).onDuplicateKeyUpdate({
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

// People
export async function getAllPeople() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(people);
}

export async function getPeopleByDistrict(districtId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(people).where(eq(people.districtId, districtId));
}

export async function getPeopleByCampus(campusId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(people).where(eq(people.campusId, campusId));
}

export async function createPerson(person: InsertPerson) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(people).values(person);
  return result;
}

export async function updatePersonStatus(personId: number, status: "Not invited yet" | "Maybe" | "Going" | "Not Going") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(people)
    .set({ status, lastUpdated: new Date() })
    .where(eq(people.id, personId));
}

export async function getPersonById(personId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(people).where(eq(people.id, personId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updatePersonName(personId: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(people)
    .set({ name, lastUpdated: new Date() })
    .where(eq(people.id, personId));
}

// Needs
export async function getNeedsByPerson(personId: number) {
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

// Notes
export async function getNotesByPerson(personId: number) {
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

// Metrics
export async function getMetrics() {
  const db = await getDb();
  if (!db) return { total: 0, invited: 0, going: 0, percentInvited: 0 };
  
  const allPeople = await db.select().from(people);
  const total = allPeople.length;
  const invited = allPeople.filter(p => p.status !== "Not invited yet").length;
  const going = allPeople.filter(p => p.status === "Going").length;
  const percentInvited = total > 0 ? Math.round((invited / total) * 100) : 0;
  
  return { total, invited, going, percentInvited };
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
  
  // Combine and deduplicate
  const allPeopleIds = new Set<number>();
  maybePeople.forEach(p => allPeopleIds.add(p.id));
  peopleWithNeedsIds.forEach(id => allPeopleIds.add(id));
  
  // Get full person records
  if (allPeopleIds.size === 0) return [];
  
  const peopleIdsArray = Array.from(allPeopleIds);
  const followUpPeople = await db.select().from(people).where(
    or(...peopleIdsArray.map(id => eq(people.id, id)))
  );
  
  return followUpPeople;
}

// Settings
export async function getSetting(key: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
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
