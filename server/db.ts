import { eq, and, or, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
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
let _pool: mysql.Pool | null = null;

/**
 * Get database connection using MySQL/TiDB connection pool.
 * Connection pooling is the standard practice for MySQL/TiDB to handle
 * concurrent requests efficiently and manage connections properly.
 */
export async function getDb() {
  if (!_db) {
    try {
      const connectionString = ENV.DATABASE_URL;
      if (!connectionString) {
        throw new Error("DATABASE_URL environment variable is required");
      }
      
      // Create connection pool for MySQL/TiDB
      // Pool configuration optimizes for production workloads
      _pool = mysql.createPool({
        uri: connectionString,
        connectionLimit: 10, // Maximum number of connections in the pool
        queueLimit: 0, // Unlimited queue for waiting connections
        enableKeepAlive: true, // Keep connections alive
        keepAliveInitialDelay: 0, // Start keep-alive immediately
      });
      
      _db = drizzle(_pool);
      
      console.log("[Database] Connected to MySQL/TiDB with connection pool");
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      _db = null;
      _pool = null;
    }
  }
  return _db;
}

/**
 * Get the MySQL connection pool directly (for raw queries)
 */
export function getPool(): mysql.Pool | null {
  return _pool;
}

/**
 * Gracefully close database connections.
 * Should be called on application shutdown.
 */
export async function closeDb() {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
    console.log("[Database] Connection pool closed");
  }
}

// ============================================================================
// USERS
// ============================================================================

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0] || null;
}

export async function createUser(user: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(users).values(user);
  return result[0].insertId;
}

export async function updateUserLastSignedIn(openId: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.openId, openId));
}

export async function upsertUser(user: Partial<InsertUser> & { openId: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getUserByOpenId(user.openId);
  if (existing) {
    await db.update(users)
      .set({ ...user, updatedAt: new Date() })
      .where(eq(users.openId, user.openId));
    return existing.id;
  } else {
    const result = await db.insert(users).values(user as InsertUser);
    return result[0].insertId;
  }
}

// ============================================================================
// DISTRICTS
// ============================================================================

export async function getAllDistricts() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(districts);
}

export async function getDistrictById(id: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(districts).where(eq(districts.id, id)).limit(1);
  return result[0] || null;
}

export async function createDistrict(district: InsertDistrict) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(districts).values(district);
  return district.id;
}

export async function updateDistrict(id: string, data: Partial<InsertDistrict>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(districts).set(data).where(eq(districts.id, id));
}

// ============================================================================
// CAMPUSES
// ============================================================================

export async function getAllCampuses() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(campuses);
}

export async function getCampusesByDistrictId(districtId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(campuses).where(eq(campuses.districtId, districtId));
}

// Alias for backward compatibility
export const getCampusesByDistrict = getCampusesByDistrictId;

export async function getCampusById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(campuses).where(eq(campuses.id, id)).limit(1);
  return result[0] || null;
}

export async function createCampus(campus: InsertCampus) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Insert campus with just name and districtId
  // displayOrder is optional and will be null if column doesn't exist yet
  const result = await db.insert(campuses).values({
    name: campus.name,
    districtId: campus.districtId,
  });
  
  // Get the insertId from the result (MySQL with Drizzle returns it in result[0].insertId)
  const insertId = result[0]?.insertId;
  
  if (!insertId) {
    throw new Error(`Failed to get insert ID from database`);
  }
  
  return insertId;
}

export async function updateCampus(id: number, data: Partial<InsertCampus>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(campuses).set(data).where(eq(campuses.id, id));
}

export async function updateCampusName(id: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(campuses).set({ name }).where(eq(campuses.id, id));
}

// ============================================================================
// PEOPLE
// ============================================================================

export async function getAllPeople() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(people);
}

export async function getPersonByPersonId(personId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(people).where(eq(people.personId, personId)).limit(1);
  return result[0] || null;
}

export async function getPeopleByDistrictId(districtId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(people).where(eq(people.primaryDistrictId, districtId));
}

export async function getPeopleByCampusId(campusId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(people).where(eq(people.primaryCampusId, campusId));
}

export async function createPerson(person: InsertPerson) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    // Build values object explicitly - only include fields that are provided
    // This prevents Drizzle from trying to insert undefined values
    const values: any = {
      personId: person.personId,
      name: person.name,
      status: person.status || 'Not Invited',
      depositPaid: person.depositPaid ?? false,
    };
    
    // Only add optional fields if they are explicitly provided (not undefined)
    if (person.primaryDistrictId !== undefined) {
      values.primaryDistrictId = person.primaryDistrictId;
    }
    if (person.primaryRegion !== undefined && person.primaryRegion !== null) {
      values.primaryRegion = person.primaryRegion;
    }
    if (person.primaryRole !== undefined && person.primaryRole !== null) {
      values.primaryRole = person.primaryRole;
    }
    if (person.primaryCampusId !== undefined && person.primaryCampusId !== null) {
      values.primaryCampusId = person.primaryCampusId;
    }
    if (person.nationalCategory !== undefined && person.nationalCategory !== null) {
      values.nationalCategory = person.nationalCategory;
    }
    if (person.notes !== undefined) {
      values.notes = person.notes;
    }
    if (person.spouse !== undefined) {
      values.spouse = person.spouse;
    }
    if (person.kids !== undefined) {
      values.kids = person.kids;
    }
    if (person.guests !== undefined) {
      values.guests = person.guests;
    }
    if (person.childrenAges !== undefined) {
      values.childrenAges = person.childrenAges;
    }
    if (person.lastEdited !== undefined) {
      values.lastEdited = person.lastEdited;
    }
    if (person.lastEditedBy !== undefined) {
      values.lastEditedBy = person.lastEditedBy;
    }
    
    console.log('[db.createPerson] Inserting person:', JSON.stringify(values, null, 2));
    const result = await db.insert(people).values(values);
    console.log('[db.createPerson] Insert successful, result:', result);
    return result[0].insertId;
  } catch (error) {
    console.error('[db.createPerson] Database error:', error);
    console.error('[db.createPerson] Error details:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

export async function updatePerson(personId: string, data: Partial<InsertPerson>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(people).set(data).where(eq(people.personId, personId));
}

export async function deletePerson(personId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(people).where(eq(people.personId, personId));
}

export async function updatePersonStatus(personId: string, status: "Yes" | "Maybe" | "No" | "Not Invited") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(people).set({ 
    status,
    statusLastUpdated: new Date()
  }).where(eq(people.personId, personId));
}

export async function updatePersonName(personId: string, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(people).set({ name }).where(eq(people.personId, personId));
}

// ============================================================================
// ASSIGNMENTS
// ============================================================================

export async function getAllAssignments() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(assignments);
}

export async function getAssignmentsByPersonId(personId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(assignments).where(eq(assignments.personId, personId));
}

export async function createAssignment(assignment: InsertAssignment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(assignments).values(assignment);
  return result[0].insertId;
}

// ============================================================================
// NEEDS
// ============================================================================

export async function getNeedsByPersonId(personId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(needs).where(eq(needs.personId, personId));
}

export async function createNeed(need: InsertNeed) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(needs).values(need);
  return result[0].insertId;
}

export async function getAllActiveNeeds() {
  const db = await getDb();
  if (!db) return [];
  // Return all needs (isActive field was removed from schema)
  return await db.select().from(needs);
}

// ============================================================================
// NOTES
// ============================================================================

export async function getNotesByPersonId(personId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(notes).where(eq(notes.personId, personId));
}

export async function createNote(note: InsertNote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notes).values(note);
  return result[0].insertId;
}

// ============================================================================
// SETTINGS
// ============================================================================

export async function getSetting(key: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return result[0] || null;
}

export async function setSetting(key: string, value: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(settings).values({ key, value })
    .onDuplicateKeyUpdate({ set: { value, updatedAt: new Date() } });
}

// ============================================================================
// METRICS & AGGREGATIONS
// ============================================================================

export async function getMetrics() {
  const db = await getDb();
  if (!db) return { going: 0, maybe: 0, notGoing: 0, notInvited: 0, total: 0 };
  
  const allPeople = await db.select().from(people);
  const going = allPeople.filter(p => p.status === 'Yes').length;
  const maybe = allPeople.filter(p => p.status === 'Maybe').length;
  const notGoing = allPeople.filter(p => p.status === 'No').length;
  const notInvited = allPeople.filter(p => p.status === 'Not Invited').length;
  
  return {
    going,
    maybe,
    notGoing,
    notInvited,
    total: allPeople.length
  };
}

export async function getDistrictMetrics(districtId: string) {
  const db = await getDb();
  if (!db) return { going: 0, maybe: 0, notGoing: 0, notInvited: 0, total: 0 };
  
  const districtPeople = await db.select().from(people).where(eq(people.primaryDistrictId, districtId));
  const going = districtPeople.filter(p => p.status === 'Yes').length;
  const maybe = districtPeople.filter(p => p.status === 'Maybe').length;
  const notGoing = districtPeople.filter(p => p.status === 'No').length;
  const notInvited = districtPeople.filter(p => p.status === 'Not Invited').length;
  
  return {
    going,
    maybe,
    notGoing,
    notInvited,
    total: districtPeople.length
  };
}

export async function getRegionMetrics(region: string) {
  const db = await getDb();
  if (!db) return { going: 0, maybe: 0, notGoing: 0, notInvited: 0, total: 0 };
  
  const regionPeople = await db.select().from(people).where(eq(people.primaryRegion, region));
  const going = regionPeople.filter(p => p.status === 'Yes').length;
  const maybe = regionPeople.filter(p => p.status === 'Maybe').length;
  const notGoing = regionPeople.filter(p => p.status === 'No').length;
  const notInvited = regionPeople.filter(p => p.status === 'Not Invited').length;
  
  return {
    going,
    maybe,
    notGoing,
    notInvited,
    total: regionPeople.length
  };
}

// National staff (no district/region)
export async function getNationalStaff() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(people).where(
    and(
      sql`${people.primaryDistrictId} IS NULL`,
      sql`${people.primaryRegion} IS NULL`
    )
  );
}
