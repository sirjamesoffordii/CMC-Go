import { eq, and, or, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { 
  InsertUser, 
  users, 
  districts, 
  campuses, 
  people, 
  assignments,
  regions,
  InsertDistrict,
  InsertCampus,
  InsertPerson,
  InsertAssignment,
  InsertRegion
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: mysql.Pool | null = null;

export async function getDb() {
  if (!_db) {
    try {
      const connectionString = ENV.DATABASE_URL;
      if (!connectionString) {
        throw new Error("DATABASE_URL environment variable is required");
      }
      
      _pool = mysql.createPool(connectionString);
      _db = drizzle(_pool);
      
      console.log("[Database] Connected to MySQL/TiDB");
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
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

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users);
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
// REGIONS
// ============================================================================

export async function getAllRegions() {
  const db = await getDb();
  if (!db) return [];
  const { regions } = await import("../drizzle/schema");
  return await db.select().from(regions);
}

export async function getRegionById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const { regions } = await import("../drizzle/schema");
  const result = await db.select().from(regions).where(eq(regions.id, id)).limit(1);
  return result[0] || null;
}

export async function createRegion(region: InsertRegion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(regions).values(region);
  return result[0].insertId;
}

// ============================================================================
// DISTRICTS
// ============================================================================

export async function getAllDistricts() {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({
      id: districts.id,
      name: districts.name,
      svgPathId: districts.svgPathId,
      regionId: districts.regionId,
      region: regions.name,
      color: districts.color,
      contactName: districts.contactName,
      contactEmail: districts.contactEmail,
      contactPhone: districts.contactPhone,
      lastEditedBy: districts.lastEditedBy,
      lastEditedAt: districts.lastEditedAt,
      createdAt: districts.createdAt,
    })
    .from(districts)
    .leftJoin(regions, eq(districts.regionId, regions.id));
  return result;
}

export async function getDistrictById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select({
      id: districts.id,
      name: districts.name,
      svgPathId: districts.svgPathId,
      regionId: districts.regionId,
      region: regions.name,
      color: districts.color,
      contactName: districts.contactName,
      contactEmail: districts.contactEmail,
      contactPhone: districts.contactPhone,
      lastEditedBy: districts.lastEditedBy,
      lastEditedAt: districts.lastEditedAt,
      createdAt: districts.createdAt,
    })
    .from(districts)
    .leftJoin(regions, eq(districts.regionId, regions.id))
    .where(eq(districts.id, id))
    .limit(1);
  return result[0] || null;
}

export async function getDistrictBySvgPathId(svgPathId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(districts).where(eq(districts.svgPathId, svgPathId)).limit(1);
  return result[0] || null;
}

export async function updateDistrictName(id: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(districts).set({ name }).where(eq(districts.id, id));
}

export async function updateDistrictRegion(id: number, regionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(districts).set({ regionId }).where(eq(districts.id, id));
}

export async function createDistrict(district: InsertDistrict) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(districts).values(district);
  return district.id;
}

export async function updateDistrict(id: number, data: Partial<InsertDistrict>) {
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

export async function getCampusesByDistrictId(districtId: number) {
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

export async function createCampus(campus: { name: string; districtId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // If districtId is a string (svgPathId), look up the numeric ID
  let numericDistrictId: number;
  if (typeof campus.districtId === 'string') {
    const district = await getDistrictBySvgPathId(campus.districtId);
    if (!district) {
      throw new Error(`District not found with svgPathId: ${campus.districtId}`);
    }
    numericDistrictId = district.id;
  } else {
    numericDistrictId = campus.districtId;
  }
  
  // Insert campus with name and numeric districtId
  const result = await db.insert(campuses).values({
    name: campus.name,
    districtId: numericDistrictId,
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

export async function deleteCampus(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(campuses).where(eq(campuses.id, id));
}

// ============================================================================
// PEOPLE
// ============================================================================

export async function getAllPeople() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(people);
}

export async function getPeopleByDistrict(districtId: number) {
  const db = await getDb();
  if (!db) return [];
  // Query people through campuses that belong to the district
  const campusesInDistrict = await db.select().from(campuses).where(eq(campuses.districtId, districtId));
  const campusIds = campusesInDistrict.map(c => c.id);
  if (campusIds.length === 0) return [];
  return await db.select().from(people).where(inArray(people.primaryCampusId, campusIds));
}

export async function getPersonByPersonId(personId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(people).where(eq(people.personId, personId)).limit(1);
  return result[0] || null;
}

export async function getPeopleByDistrictId(districtId: number) {
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
  const result = await db.insert(people).values(person);
  return result[0].insertId;
}

export async function updatePerson(input: { personId: string; name?: string; primaryRole?: string; status?: "Yes" | "Maybe" | "No" | "Not Invited"; depositPaid?: boolean; notes?: string; spouse?: string; kids?: number; guests?: number; childrenAges?: string; lastEditedBy?: string; lastEditedAt?: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Partial<InsertPerson> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.primaryRole !== undefined) updateData.primaryRole = input.primaryRole;
  if (input.status !== undefined) {
    updateData.status = input.status;
    updateData.statusLastUpdated = new Date();
  }
  if (input.depositPaid !== undefined) updateData.depositPaid = input.depositPaid;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.spouse !== undefined) updateData.spouse = input.spouse;
  if (input.kids !== undefined) updateData.kids = input.kids;
  if (input.guests !== undefined) updateData.guests = input.guests;
  if (input.childrenAges !== undefined) updateData.childrenAges = input.childrenAges;
  if (input.lastEditedBy !== undefined) updateData.lastEditedBy = input.lastEditedBy;
  if (input.lastEditedAt !== undefined) updateData.lastEditedAt = input.lastEditedAt;
  await db.update(people).set(updateData).where(eq(people.personId, input.personId));
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

// Needs and notes are now stored in the people.needs and people.notes text fields
// Settings functionality removed - use environment variables or database config tables if needed

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

export async function getDistrictMetrics(districtId: number) {
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

export async function getRegionMetrics(regionId: number) {
  const db = await getDb();
  if (!db) return { going: 0, maybe: 0, notGoing: 0, notInvited: 0, total: 0 };
  
  const regionPeople = await db.select().from(people).where(eq(people.primaryRegionId, regionId));
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

// National staff - people with nationalCategory set
export async function getNationalStaff() {
  const db = await getDb();
  if (!db) return [];
  const results = await db.select({
    id: people.id,
    personId: people.personId,
    name: people.name,
    primaryRole: people.primaryRole,
    primaryCampusId: people.primaryCampusId,
    primaryDistrictId: people.primaryDistrictId,
    primaryRegionId: people.primaryRegionId,
    nationalCategory: people.nationalCategory,
    roleTitle: people.nationalCategory, // Alias for compatibility
    status: people.status,
    depositPaid: people.depositPaid,
    statusLastUpdated: people.statusLastUpdated,
    statusLastUpdatedBy: people.statusLastUpdatedBy,
    needs: people.needs,
    notes: people.notes,
    spouse: people.spouse,
    kids: people.kids,
    guests: people.guests,
    childrenAges: people.childrenAges,
    lastEditedBy: people.lastEditedBy,
    lastEditedAt: people.lastEditedAt,
    createdAt: people.createdAt,
  }).from(people).where(
    sql`${people.nationalCategory} IS NOT NULL`
  );
  return results;
}

// Alias for backward compatibility
export const getPeopleByCampus = getPeopleByCampusId;

// ============================================================================
// SETTINGS
// ============================================================================

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const { settings } = await import("../drizzle/schema");
  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return result[0]?.value || null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { settings } = await import("../drizzle/schema");
  
  // Try to update first
  const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  if (existing.length > 0) {
    await db.update(settings).set({ value }).where(eq(settings.key, key));
  } else {
    await db.insert(settings).values({ key, value });
  }
}

// ============================================================================
// NEEDS
// ============================================================================

export async function getAllActiveNeeds() {
  const db = await getDb();
  if (!db) return [];
  const { needs } = await import("../drizzle/schema");
  return await db.select().from(needs).where(eq(needs.isActive, true));
}

export async function getNeedsByPersonId(personId: string) {
  const db = await getDb();
  if (!db) return [];
  const { needs } = await import("../drizzle/schema");
  return await db.select().from(needs).where(eq(needs.personId, personId));
}

export async function createNeed(need: { personId: string; type: "financial" | "other"; description?: string; amount?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { needs } = await import("../drizzle/schema");
  const result = await db.insert(needs).values(need);
  return result[0].insertId;
}

export async function resolveNeed(id: number, resolvedBy: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { needs } = await import("../drizzle/schema");
  await db.update(needs).set({ 
    isActive: false, 
    resolvedAt: new Date(),
    resolvedBy 
  }).where(eq(needs.id, id));
}

export async function toggleNeedActive(needId: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { needs } = await import("../drizzle/schema");
  await db.update(needs).set({ isActive }).where(eq(needs.id, needId));
}

// ============================================================================
// NOTES
// ============================================================================

export async function getNotesByPersonId(personId: string) {
  // Notes are now stored in the people.notes text field
  const person = await getPersonByPersonId(personId);
  if (!person || !person.notes) return [];
  
  // Return notes as an array with a single entry
  return [{
    id: 1,
    personId,
    content: person.notes,
    createdAt: person.createdAt,
    createdBy: person.lastEditedBy || 'Unknown'
  }];
}

export async function createNote(note: { personId: string; content: string; createdBy?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Append to existing notes
  const person = await getPersonByPersonId(note.personId);
  const existingNotes = person?.notes || '';
  const timestamp = new Date().toISOString();
  const newNote = `[${timestamp}] ${note.createdBy || 'Unknown'}: ${note.content}`;
  const updatedNotes = existingNotes ? `${existingNotes}\n${newNote}` : newNote;
  
  await db.update(people).set({ 
    notes: updatedNotes,
    lastEditedBy: note.createdBy,
    lastEditedAt: new Date()
  }).where(eq(people.personId, note.personId));
  
  return 1; // Return a dummy ID
}

// ============================================================================
// IMPORT
// ============================================================================

export async function importPeople(rows: Array<{
  name: string;
  campus?: string;
  district?: string;
  role?: string;
  status?: "Yes" | "Maybe" | "No" | "Not Invited";
  notes?: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const results = { imported: 0, skipped: 0, errors: [] as string[] };
  
  for (const row of rows) {
    try {
      // Generate a unique personId
      const personId = `IMPORT-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      // Find campus and district IDs
      let campusId: number | null = null;
      let districtId: number | null = null;
      
      if (row.campus) {
        const campuses = await getAllCampuses();
        const campus = campuses.find(c => c.name === row.campus);
        campusId = campus?.id || null;
      }
      
      if (row.district) {
        const districts = await getAllDistricts();
        const district = districts.find(d => d.name === row.district);
        districtId = district?.id || null;
      }
      
      await db.insert(people).values({
        personId,
        name: row.name,
        primaryRole: row.role,
        primaryCampusId: campusId,
        primaryDistrictId: districtId,
        status: row.status || "Not Invited",
        notes: row.notes
      });
      
      results.imported++;
    } catch (error) {
      results.skipped++;
      results.errors.push(`Failed to import ${row.name}: ${error}`);
    }
  }
  
  return results;
}

export async function updatePersonName(personId: string, name: string) {
  return updatePerson({ personId, name });
}

// ============================================================================
// FOLLOW UP
// ============================================================================

export async function getFollowUpPeople() {
  const db = await getDb();
  if (!db) return [];
  
  // Return people with status "Maybe" or those who need follow-up
  return await db.select().from(people).where(
    or(
      eq(people.status, "Maybe"),
      eq(people.status, "Not Invited")
    )
  );
}
