import { eq, and, or, sql, isNull } from "drizzle-orm";
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
  households,
  authTokens,
  inviteNotes,
  statusChanges,
  InsertDistrict,
  InsertCampus,
  InsertPerson,
  InsertNeed,
  InsertNote,
  InsertAssignment,
  InsertHousehold,
  InsertAuthToken,
  InsertInviteNote,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import {
  peopleScopeWhereClause,
  type PeopleScope,
  type UserScopeAnchors,
} from "./_core/authorization";

// XAN roles - people with these roles are counted as XAN members for aggregates
const XAN_ROLES = [
  "NATIONAL_STAFF",
  "NATIONAL_DIRECTOR",
  "FIELD_DIRECTOR",
  "REGION_DIRECTOR",
  "REGIONAL_STAFF",
  "CMC_GO_ADMIN",
];

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
        throw new Error(
          "DATABASE_URL environment variable is required. Set DATABASE_URL or MYSQL_* variables (MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE)"
        );
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

      const db = drizzle(_pool as any);
      _db = db;

      // Test the connection with a simple query
      try {
        await db.execute(sql`SELECT 1`);
        console.log("[Database] Connected to MySQL/TiDB with connection pool");
      } catch (testError) {
        console.error(
          "[Database] Connection pool created but test query failed:",
          testError
        );
        throw testError;
      }
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      if (error instanceof Error) {
        console.error("[Database] Error message:", error.message);
        if (error.stack) {
          console.error("[Database] Stack trace:", error.stack);
        }
      }
      _db = null;
      _pool = null;
      throw error; // Re-throw so callers know connection failed
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

// Explicit column selection for users - all columns that exist in Railway DB
const userColumns = {
  id: users.id,
  fullName: users.fullName,
  email: users.email,
  passwordHash: users.passwordHash,
  role: users.role,
  campusId: users.campusId,
  districtId: users.districtId,
  regionId: users.regionId,
  overseeRegionId: users.overseeRegionId,
  personId: users.personId,
  scopeLevel: users.scopeLevel,
  viewLevel: users.viewLevel,
  editLevel: users.editLevel,
  isBanned: users.isBanned,
  approvalStatus: users.approvalStatus,
  approvedByUserId: users.approvedByUserId,
  approvedAt: users.approvedAt,
  createdAt: users.createdAt,
  lastLoginAt: users.lastLoginAt,
  // Legacy OAuth columns (kept for compatibility)
  openId: users.openId,
  name: users.name,
  loginMethod: users.loginMethod,
  // Additional metadata
  roleLabel: users.roleLabel,
  roleTitle: users.roleTitle,
  linkedPersonId: users.linkedPersonId,
};

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select(userColumns)
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return result[0] || null;
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select(userColumns)
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result[0] || null;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select(userColumns)
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result[0] || null;
}

export async function createUser(user: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(users).values(user);
  const insertId = result[0]?.insertId;
  if (!insertId) {
    throw new Error("Failed to get insert ID from database");
  }
  return insertId;
}

export async function updateUserLastLoginAt(userId: number) {
  const db = await getDb();
  if (!db) {
    console.error(
      "[updateUserLastLoginAt] Database not available for user:",
      userId
    );
    throw new Error("Database not available");
  }
  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, userId));
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

export async function updateUserPersonId(
  userId: number,
  personId: string | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ personId }).where(eq(users.id, userId));
}

// Admin: Get all users with joined names
export async function getAllUsers() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      campusId: users.campusId,
      districtId: users.districtId,
      regionId: users.regionId,
      overseeRegionId: users.overseeRegionId,
      scopeLevel: users.scopeLevel,
      viewLevel: users.viewLevel,
      editLevel: users.editLevel,
      approvalStatus: users.approvalStatus,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      isBanned: users.isBanned,
      // Join names
      campusName: campuses.name,
      districtName: districts.name,
      regionName: users.regionId,
    })
    .from(users)
    .leftJoin(campuses, eq(users.campusId, campuses.id))
    .leftJoin(districts, eq(users.districtId, districts.id))
    .orderBy(users.fullName);

  return result;
}

// Admin: Update user role
export async function updateUserRole(userId: number, role: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({ role: role as any })
    .where(eq(users.id, userId));
}

// Admin: Update user approval status
export async function updateUserApprovalStatus(
  userId: number,
  approvalStatus: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({ approvalStatus: approvalStatus as any })
    .where(eq(users.id, userId));
}

// Admin: Update user authorization levels
export async function updateUserAuthLevels(
  userId: number,
  levels: {
    scopeLevel?: string;
    viewLevel?: string;
    editLevel?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = {};
  if (levels.scopeLevel) updateData.scopeLevel = levels.scopeLevel;
  if (levels.viewLevel) updateData.viewLevel = levels.viewLevel;
  if (levels.editLevel) updateData.editLevel = levels.editLevel;

  if (Object.keys(updateData).length > 0) {
    await db.update(users).set(updateData).where(eq(users.id, userId));
  }
}

// Admin: Delete user
export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(users).where(eq(users.id, userId));
}

// Admin: Get active sessions (users with recent lastLoginAt)
export async function getActiveSessions(thresholdMinutes: number = 30) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);

  const result = await db
    .select({
      id: users.id,
      lastSeenAt: users.lastLoginAt,
      user: {
        fullName: users.fullName,
        email: users.email,
        role: users.role,
      },
    })
    .from(users)
    .where(sql`${users.lastLoginAt} >= ${threshold}`)
    .orderBy(sql`${users.lastLoginAt} DESC`);

  return result;
}

export async function searchPeopleByNameInScope(
  query: string,
  scope: PeopleScope,
  limit: number = 20
) {
  const db = await getDb();
  if (!db) return [];

  const q = query.trim();
  if (!q) return [];

  const likePattern = `%${q}%`;
  const nameFilter = sql`${people.name} LIKE ${likePattern}`;

  let scopeFilter = sql`1=1`;
  if (scope.level === "CAMPUS") {
    scopeFilter = eq(people.primaryCampusId, scope.campusId);
  } else if (scope.level === "DISTRICT") {
    scopeFilter = eq(people.primaryDistrictId, scope.districtId);
  } else if (scope.level === "REGION") {
    scopeFilter = eq(people.primaryRegion, scope.regionId);
  }

  return await db
    .select({
      personId: people.personId,
      name: people.name,
      primaryCampusId: people.primaryCampusId,
      primaryDistrictId: people.primaryDistrictId,
      primaryRegion: people.primaryRegion,
    })
    .from(people)
    .where(and(nameFilter, scopeFilter))
    .limit(limit);
}

export async function upsertUser(
  user: Partial<InsertUser> & { openId: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getUserByOpenId(user.openId);
  if (existing) {
    await db
      .update(users)
      .set({ ...user })
      .where(eq(users.openId, user.openId));
    return existing.id;
  } else {
    if (!user.email) {
      throw new Error("Email is required to create a new user");
    }
    const result = await db.insert(users).values(user as InsertUser);
    const insertId = result[0]?.insertId;
    if (!insertId) {
      throw new Error("Failed to get insert ID from database");
    }
    return insertId;
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
  const result = await db
    .select()
    .from(districts)
    .where(eq(districts.id, id))
    .limit(1);
  return result[0] || null;
}

export async function createDistrict(district: InsertDistrict) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(districts).values(district);
  return district.id;
}

export async function updateDistrict(
  id: string,
  data: Partial<InsertDistrict>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(districts).set(data).where(eq(districts.id, id));
}

export async function updateDistrictName(id: string, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(districts).set({ name }).where(eq(districts.id, id));
}

export async function updateDistrictRegion(id: string, region: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(districts).set({ region }).where(eq(districts.id, id));
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
  return await db
    .select()
    .from(campuses)
    .where(eq(campuses.districtId, districtId));
}

// Alias for backward compatibility
export const getCampusesByDistrict = getCampusesByDistrictId;

export async function getCampusById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(campuses)
    .where(eq(campuses.id, id))
    .limit(1);
  return result[0] || null;
}

export async function getCampusByNameAndDistrict(
  name: string,
  districtId: string
) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(campuses)
    .where(and(eq(campuses.name, name), eq(campuses.districtId, districtId)))
    .limit(1);
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

export async function updateCampusDisplayOrder(
  id: number,
  displayOrder: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(campuses).set({ displayOrder }).where(eq(campuses.id, id));
}

export async function countPeopleByCampusId(campusId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(people)
    .where(eq(people.primaryCampusId, campusId));
  return result[0]?.count ?? 0;
}

export async function deleteCampus(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Detach people from this campus (retain their person record)
  await db
    .update(people)
    .set({ primaryCampusId: null })
    .where(eq(people.primaryCampusId, id));
  // Remove the campus row
  await db.delete(campuses).where(eq(campuses.id, id));
}

// ============================================================================
// PEOPLE
// ============================================================================

export async function getAllPeople() {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(people);
  } catch (error) {
    console.error("[getAllPeople] Database error:", error);
    if (error instanceof Error) {
      console.error("[getAllPeople] Full error message:", error.message);
      // Check for common schema mismatch issues
      if (error.message.includes("notes") || error.message.includes("note")) {
        console.error(
          "[getAllPeople] Possible schema mismatch with 'notes' field"
        );
      }
    }
    throw error;
  }
}

export async function getPersonByPersonId(personId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(people)
    .where(eq(people.personId, personId))
    .limit(1);
  return result[0] || null;
}

export async function personExists(personId: string) {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select({ personId: people.personId })
    .from(people)
    .where(eq(people.personId, personId))
    .limit(1);
  return Boolean(result[0]);
}

export async function getPersonByPersonIdInScope(
  personId: string,
  user: UserScopeAnchors
) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(people)
    .where(and(eq(people.personId, personId), peopleScopeWhereClause(user)))
    .limit(1);
  return result[0] || null;
}

export async function getPeopleByDistrictId(districtId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(people)
    .where(eq(people.primaryDistrictId, districtId));
}

export async function getPeopleByRegionId(regionId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(people)
    .where(eq(people.primaryRegion, regionId));
}

export async function getPeopleByCampusId(campusId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(people)
    .where(eq(people.primaryCampusId, campusId));
}

/**
 * Sanitize person data for public viewing - removes private fields
 * Public view only includes: personId, status, primaryDistrictId, primaryCampusId, primaryRole, primaryRegion
 * Removes: name, notes, spouse, kids, guests, childrenAges, lastEdited, lastEditedBy, and other PII
 * Note: name is excluded for privacy, but personId can be used as an identifier
 */
export function sanitizePersonForPublic(person: typeof people.$inferSelect) {
  return {
    id: person.id,
    personId: person.personId,
    status: person.status,
    depositPaid: person.depositPaid,
    statusLastUpdated: person.statusLastUpdated,
    primaryDistrictId: person.primaryDistrictId,
    primaryCampusId: person.primaryCampusId,
    primaryRole: person.primaryRole,
    primaryRegion: person.primaryRegion,
    nationalCategory: person.nationalCategory,
    householdId: person.householdId,
    householdRole: person.householdRole,
    spouseAttending: person.spouseAttending,
    childrenCount: person.childrenCount,
    guestsCount: person.guestsCount,
    createdAt: person.createdAt,
    // Explicitly exclude private fields: name, notes, spouse, kids, guests, childrenAges, lastEdited, lastEditedBy
  };
}

export async function createPerson(person: InsertPerson) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Build values object explicitly - only include fields that are provided
    // This prevents Drizzle from trying to insert undefined values
    const values: Record<string, unknown> = {
      personId: person.personId,
      name: person.name,
      status: person.status || "Not Invited",
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
    if (
      person.primaryCampusId !== undefined &&
      person.primaryCampusId !== null
    ) {
      values.primaryCampusId = person.primaryCampusId;
    }
    if (
      person.nationalCategory !== undefined &&
      person.nationalCategory !== null
    ) {
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
    if (person.householdId !== undefined && person.householdId !== null) {
      values.householdId = person.householdId;
    }
    if (person.householdRole !== undefined) {
      values.householdRole = person.householdRole;
    }
    if (person.spouseAttending !== undefined) {
      values.spouseAttending = person.spouseAttending;
    }
    if (person.childrenCount !== undefined) {
      values.childrenCount = person.childrenCount;
    }
    if (person.guestsCount !== undefined) {
      values.guestsCount = person.guestsCount;
    }
    if (person.lastEdited !== undefined) {
      values.lastEdited = person.lastEdited;
    }
    if (person.lastEditedBy !== undefined) {
      values.lastEditedBy = person.lastEditedBy;
    }

    console.log(
      "[db.createPerson] Inserting person:",
      JSON.stringify(values, null, 2)
    );
    const result = await db.insert(people).values(values as InsertPerson);
    console.log("[db.createPerson] Insert successful, result:", result);
    const insertId = result[0]?.insertId;
    if (!insertId) {
      throw new Error("Failed to get insert ID from database");
    }
    return insertId;
  } catch (error) {
    console.error("[db.createPerson] Database error:", error);
    console.error(
      "[db.createPerson] Error details:",
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

export async function updatePerson(
  personId: string,
  data: Partial<InsertPerson>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(people).set(data).where(eq(people.personId, personId));
}

export async function deletePerson(personId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(people).where(eq(people.personId, personId));
}

export async function updatePersonStatus(
  personId: string,
  status: "Yes" | "Maybe" | "No" | "Not Invited"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(people)
    .set({
      status,
      statusLastUpdated: new Date(),
    })
    .where(eq(people.personId, personId));
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
  return await db
    .select()
    .from(assignments)
    .where(eq(assignments.personId, personId));
}

export async function createAssignment(assignment: InsertAssignment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(assignments).values(assignment);
  const insertId = result[0]?.insertId;
  if (!insertId) {
    throw new Error("Failed to get insert ID from database");
  }
  return insertId;
}

// ============================================================================
// NEEDS
// ============================================================================

/**
 * Get all needs for a person (active and inactive) for display purposes.
 * For counting, use getAllActiveNeeds() and filter by personId.
 * Only active needs are counted. Inactive needs are retained for history.
 */
export async function getNeedsByPersonId(personId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(needs)
    .where(eq(needs.personId, personId))
    .orderBy(sql`${needs.createdAt} DESC`);
}

export async function createNeed(need: InsertNeed) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(needs).values(need);
  const insertId = result[0]?.insertId;
  if (!insertId) {
    throw new Error("Failed to get insert ID from database");
  }
  return insertId;
}

export async function getAllActiveNeeds() {
  const db = await getDb();
  if (!db) return [];
  try {
    // Return only active needs (isActive = true)
    return await db.select().from(needs).where(eq(needs.isActive, true));
  } catch (error) {
    console.error("[getAllActiveNeeds] Database error:", error);
    // Check if it's a column name issue
    if (error instanceof Error) {
      if (
        error.message.includes("createdById") ||
        error.message.includes("createdByUserId")
      ) {
        console.error(
          "[getAllActiveNeeds] Schema mismatch: Check if database column name matches schema definition"
        );
        console.error("[getAllActiveNeeds] Schema expects: createdById");
      }
      // Log the full error for debugging
      console.error("[getAllActiveNeeds] Full error:", error.message);
    }
    throw error;
  }
}

/**
 * Get all needs (active + inactive) for display purposes (e.g. people list).
 */
export async function getAllNeeds() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(needs)
    .orderBy(sql`${needs.createdAt} DESC`);
}

/**
 * Toggle need active status. When marking as met (isActive = false), set resolvedAt timestamp.
 * Only active needs are counted. Inactive needs are retained for history.
 */
export async function toggleNeedActive(needId: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: { isActive: boolean; resolvedAt?: Date | null } = {
    isActive,
  };
  if (!isActive) {
    // When marking as met, set resolvedAt timestamp
    updateData.resolvedAt = new Date();
  } else {
    // When reactivating, clear resolvedAt
    updateData.resolvedAt = null;
  }
  await db.update(needs).set(updateData).where(eq(needs.id, needId));
}

/**
 * Get need by personId. Returns most recent need (active or inactive) for display purposes.
 * For counting, use getAllActiveNeeds() instead.
 */
export async function getNeedByPersonId(personId: string) {
  const db = await getDb();
  if (!db) return null;
  // Get most recent need (for display in tooltips/forms)
  const result = await db
    .select()
    .from(needs)
    .where(eq(needs.personId, personId))
    .orderBy(sql`${needs.createdAt} DESC`)
    .limit(1);
  return result[0] || null;
}

export async function getNeedById(needId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(needs)
    .where(eq(needs.id, needId))
    .limit(1);
  return result[0] || null;
}

/**
 * Update or create need. Only creates if type is provided (not "None").
 * When marking as met (isActive = false), sets resolvedAt timestamp.
 * Only active needs are counted. Inactive needs are retained for history.
 */
export async function updateOrCreateNeed(
  personId: string,
  needData: {
    type: InsertNeed["type"];
    description: string;
    amount?: number | null;
    fundsReceived?: number | null;
    visibility?: InsertNeed["visibility"];
    isActive: boolean;
    createdById?: number | null;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if need exists for this person
  const existing = await getNeedByPersonId(personId);

  const updateData: {
    type: InsertNeed["type"];
    description: string;
    amount?: number | null;
    fundsReceived?: number | null;
    visibility?: InsertNeed["visibility"];
    isActive: boolean;
    resolvedAt?: Date | null;
  } = {
    type: needData.type,
    description: needData.description,
    amount: needData.amount ?? null,
    fundsReceived: needData.fundsReceived ?? null,
    isActive: needData.isActive,
  };

  if (needData.visibility !== undefined) {
    updateData.visibility = needData.visibility;
  }

  // Set resolvedAt when marking as met, clear when reactivating
  if (!needData.isActive) {
    updateData.resolvedAt = new Date();
  } else if (existing && !existing.isActive) {
    // Reactivating a previously met need
    updateData.resolvedAt = null;
  }

  if (existing) {
    // Update existing need
    await db.update(needs).set(updateData).where(eq(needs.id, existing.id));
    return existing.id;
  } else {
    // Create new need (only if type is not "None" - this should be validated by caller)
    const insertValues: InsertNeed = {
      personId,
      type: needData.type,
      description: needData.description,
      amount: needData.amount ?? null,
      fundsReceived: needData.fundsReceived ?? null,
      isActive: needData.isActive,
      resolvedAt: needData.isActive ? null : new Date(),
      createdById: needData.createdById ?? null,
    };

    if (needData.visibility !== undefined) {
      insertValues.visibility = needData.visibility;
    }

    const result = await db.insert(needs).values(insertValues);
    const insertId = result[0]?.insertId;
    if (!insertId) {
      throw new Error("Failed to get insert ID from database");
    }
    return insertId;
  }
}

export async function deleteNeedByPersonId(personId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(needs).where(eq(needs.personId, personId));
}

// ============================================================================
// NOTES
// ============================================================================

export async function getNotesByPersonId(
  personId: string,
  category?: "INVITE" | "INTERNAL"
) {
  const db = await getDb();
  if (!db) return [];

  if (category) {
    return await db
      .select()
      .from(notes)
      .where(and(eq(notes.personId, personId), eq(notes.category, category)));
  }

  return await db.select().from(notes).where(eq(notes.personId, personId));
}

export async function createNote(note: InsertNote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notes).values(note);
  const insertId = result[0]?.insertId;
  if (!insertId) {
    throw new Error("Failed to get insert ID from database");
  }
  return insertId;
}

// ============================================================================
// SETTINGS
// ============================================================================

export async function getSetting(key: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);
  return result[0] || null;
}

export async function setSetting(key: string, value: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .insert(settings)
    .values({ key, value })
    .onDuplicateKeyUpdate({ set: { value, updatedAt: new Date() } });
}

export async function getAllSettings() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(settings);
}

export async function updateSettings(values: Record<string, string>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const entries = Object.entries(values);
  for (const [key, value] of entries) {
    await db
      .insert(settings)
      .values({ key, value })
      .onDuplicateKeyUpdate({ set: { value, updatedAt: new Date() } });
  }
}

// ============================================================================
// METRICS & AGGREGATIONS
// ============================================================================

export async function getMetrics() {
  const db = await getDb();
  if (!db) return { going: 0, maybe: 0, notGoing: 0, notInvited: 0, total: 0 };

  /**
   * Aggregate status counts in a single query. Using GROUP BY allows the
   * database engine to compute counts efficiently rather than loading
   * every row into application memory. The resulting rows will look
   * like `{ status: 'Yes', count: 42 }`.
   */
  const statusCounts = await db
    .select({ status: people.status, count: sql<number>`COUNT(*)` })
    .from(people)
    .groupBy(people.status);

  // Get total count separately to ensure we count ALL people, including those with null status
  const totalResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(people);
  const total = Number(totalResult[0]?.count) || 0;

  // Initialize counters with zero values
  const counts = { going: 0, maybe: 0, notGoing: 0, notInvited: 0 } as Record<
    string,
    number
  >;
  let countedTotal = 0;

  for (const row of statusCounts) {
    const status = row.status;
    const count = Number((row as any).count) || 0;
    countedTotal += count;
    switch (status) {
      case "Yes":
        counts.going = count;
        break;
      case "Maybe":
        counts.maybe = count;
        break;
      case "No":
        counts.notGoing = count;
        break;
      case "Not Invited":
        counts.notInvited = count;
        break;
      default:
        // Unknown or null status values are counted as "Not Invited"
        counts.notInvited += count;
        break;
    }
  }

  // If there's a discrepancy (people with null status), add them to notInvited
  if (total > countedTotal) {
    counts.notInvited += total - countedTotal;
  }

  return { ...counts, total };
}

export async function getDistrictMetrics(districtId: string) {
  const db = await getDb();
  if (!db) return { going: 0, maybe: 0, notGoing: 0, notInvited: 0, total: 0 };

  // Include people assigned to the district either directly (primaryDistrictId)
  // OR indirectly via their primaryCampusId's district.
  //
  // This fixes cases where primaryDistrictId is null but the campus belongs to the district.
  //
  // Special case for XAN: also include people with XAN roles (National Team members)
  // regardless of their primaryDistrictId
  let districtWhere;
  if (districtId === "XAN") {
    // For XAN, include people by district OR by XAN role
    districtWhere = or(
      eq(people.primaryDistrictId, "XAN"),
      eq(campuses.districtId, "XAN"),
      sql`${people.primaryRole} IN (${sql.join(
        XAN_ROLES.map(r => sql`${r}`),
        sql`, `
      )})`
    );
  } else {
    districtWhere = or(
      eq(people.primaryDistrictId, districtId),
      eq(campuses.districtId, districtId)
    );
  }

  // Get total count separately to ensure we count ALL people in district
  const totalResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(people)
    .leftJoin(campuses, eq(people.primaryCampusId, campuses.id))
    .where(districtWhere);
  const total = Number(totalResult[0]?.count) || 0;

  // Aggregate counts per status for a specific district in a single query.
  const statusCounts = await db
    .select({ status: people.status, count: sql<number>`COUNT(*)` })
    .from(people)
    .leftJoin(campuses, eq(people.primaryCampusId, campuses.id))
    .where(districtWhere)
    .groupBy(people.status);

  const counts = { going: 0, maybe: 0, notGoing: 0, notInvited: 0 } as Record<
    string,
    number
  >;
  let countedTotal = 0;

  for (const row of statusCounts) {
    const status = row.status;
    const count = Number((row as any).count) || 0;
    countedTotal += count;
    switch (status) {
      case "Yes":
        counts.going = count;
        break;
      case "Maybe":
        counts.maybe = count;
        break;
      case "No":
        counts.notGoing = count;
        break;
      case "Not Invited":
        counts.notInvited = count;
        break;
      default:
        // Unknown or null status values are counted as "Not Invited"
        counts.notInvited += count;
        break;
    }
  }

  // If there's a discrepancy (people with null status), add them to notInvited
  if (total > countedTotal) {
    counts.notInvited += total - countedTotal;
  }

  return { ...counts, total };
}

export async function getCampusMetricsByDistrict(districtId: string) {
  const db = await getDb();
  if (!db) return { campuses: [], unassigned: 0 };

  const campusCounts = await db
    .select({
      campusId: campuses.id,
      total: sql<number>`COUNT(${people.id})`,
    })
    .from(campuses)
    .leftJoin(people, eq(people.primaryCampusId, campuses.id))
    .where(eq(campuses.districtId, districtId))
    .groupBy(campuses.id);

  const unassignedResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(people)
    .where(
      and(
        eq(people.primaryDistrictId, districtId),
        isNull(people.primaryCampusId)
      )
    );

  return {
    campuses: campusCounts.map(row => ({
      campusId: row.campusId,
      total: Number(row.total) || 0,
    })),
    unassigned: Number(unassignedResult[0]?.count) || 0,
  };
}

export async function getDistrictLeadershipCounts(districtId: string) {
  const db = await getDb();
  if (!db) return { districtDirectorCount: 0, districtStaffCount: 0 };

  // District leadership are people who belong to the district but have no campus (campus is N/A)
  const districtLevelPeople = await db
    .select({ primaryRole: people.primaryRole })
    .from(people)
    .where(
      and(
        eq(people.primaryDistrictId, districtId),
        isNull(people.primaryCampusId)
      )
    );

  const totalDistrictLevel = districtLevelPeople.length;
  let districtDirectorCount = 0;
  let districtStaffCount = 0;

  for (const row of districtLevelPeople) {
    const role = (row.primaryRole ?? "").toLowerCase().trim();
    if (!role) continue;
    if (
      role.includes("district director") ||
      role === "dd" ||
      (districtId === "XAN" &&
        (role.includes("national director") || role.includes("field director")))
    ) {
      districtDirectorCount += 1;
      continue;
    }
    if (
      role.includes("district staff") ||
      role === "ds" ||
      (districtId === "XAN" && role.includes("national staff"))
    ) {
      districtStaffCount += 1;
    }
  }

  if (totalDistrictLevel > 0) {
    const remaining = totalDistrictLevel - districtDirectorCount;
    if (remaining > districtStaffCount) {
      districtStaffCount = remaining;
    }
  }

  return { districtDirectorCount, districtStaffCount };
}

/**
 * Get aggregate needs summary for a district (public - no person identifiers).
 * Returns total needs count, met needs count, and financial amounts (active + met).
 */
export async function getDistrictNeedsSummary(districtId: string) {
  const db = await getDb();
  if (!db)
    return { totalNeeds: 0, metNeeds: 0, totalFinancial: 0, metFinancial: 0 };

  // Get all needs for people in this district (active + met)
  const result = await db
    .select({
      totalNeeds: sql<number>`COUNT(${needs.id})`,
      metNeeds: sql<number>`COALESCE(SUM(CASE WHEN ${needs.isActive} = false THEN 1 ELSE 0 END), 0)`,
      totalAmount: sql<number>`COALESCE(SUM(${needs.amount}), 0)`,
      metAmount: sql<number>`COALESCE(SUM(${needs.fundsReceived}), 0)`,
    })
    .from(needs)
    .innerJoin(people, eq(needs.personId, people.personId))
    .leftJoin(campuses, eq(people.primaryCampusId, campuses.id))
    .where(
      and(
        or(
          eq(people.primaryDistrictId, districtId),
          eq(campuses.districtId, districtId)
        )
      )
    );

  return {
    totalNeeds: Number(result[0]?.totalNeeds) || 0,
    metNeeds: Number(result[0]?.metNeeds) || 0,
    totalFinancial: Number(result[0]?.totalAmount) || 0,
    metFinancial: Number(result[0]?.metAmount) || 0,
  };
}

/**
 * Get aggregate needs summary for all districts (public - no person identifiers).
 * Returns total needs count, met needs count, and financial amounts (active + met).
 */
export async function getNeedsAggregateSummary() {
  const db = await getDb();
  if (!db)
    return { totalNeeds: 0, metNeeds: 0, totalFinancial: 0, metFinancial: 0 };

  const result = await db
    .select({
      totalNeeds: sql<number>`COUNT(${needs.id})`,
      metNeeds: sql<number>`COALESCE(SUM(CASE WHEN ${needs.isActive} = false THEN 1 ELSE 0 END), 0)`,
      totalAmount: sql<number>`COALESCE(SUM(${needs.amount}), 0)`,
      metAmount: sql<number>`COALESCE(SUM(${needs.fundsReceived}), 0)`,
    })
    .from(needs);

  return {
    totalNeeds: Number(result[0]?.totalNeeds) || 0,
    metNeeds: Number(result[0]?.metNeeds) || 0,
    totalFinancial: Number(result[0]?.totalAmount) || 0,
    metFinancial: Number(result[0]?.metAmount) || 0,
  };
}

export async function getRegionMetrics(region: string) {
  const db = await getDb();
  if (!db) return { going: 0, maybe: 0, notGoing: 0, notInvited: 0, total: 0 };

  // Derive region from districts table via primaryDistrictId JOIN,
  // falling back to people.primaryRegion for people without a district.
  const effectiveRegion = sql<string>`COALESCE(${districts.region}, ${people.primaryRegion})`;
  const regionFilter = sql`${effectiveRegion} = ${region}`;

  // Get total count separately to ensure we count ALL people in region
  const totalResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(people)
    .leftJoin(districts, eq(people.primaryDistrictId, districts.id))
    .where(regionFilter);
  const total = Number(totalResult[0]?.count) || 0;

  const statusCounts = await db
    .select({ status: people.status, count: sql<number>`COUNT(*)` })
    .from(people)
    .leftJoin(districts, eq(people.primaryDistrictId, districts.id))
    .where(regionFilter)
    .groupBy(people.status);

  const counts = { going: 0, maybe: 0, notGoing: 0, notInvited: 0 } as Record<
    string,
    number
  >;
  let countedTotal = 0;

  for (const row of statusCounts) {
    const status = row.status;
    const count = Number((row as any).count) || 0;
    countedTotal += count;
    switch (status) {
      case "Yes":
        counts.going = count;
        break;
      case "Maybe":
        counts.maybe = count;
        break;
      case "No":
        counts.notGoing = count;
        break;
      case "Not Invited":
        counts.notInvited = count;
        break;
      default:
        // Unknown or null status values are counted as "Not Invited"
        counts.notInvited += count;
        break;
    }
  }

  // If there's a discrepancy (people with null status), add them to notInvited
  if (total > countedTotal) {
    counts.notInvited += total - countedTotal;
  }

  return { ...counts, total };
}

/**
 * Get aggregate metrics for all districts (no person identifiers).
 * Returns counts for Yes, Maybe, No, Not Invited statuses per district.
 * This is a public aggregate endpoint - everyone can see these numbers.
 *
 * XAN attribution: People with XAN roles (National Team members) are
 * attributed to the XAN district regardless of their primaryDistrictId.
 */
export async function getAllDistrictMetrics() {
  const db = await getDb();
  if (!db) return [];

  // Include people in a district either by primaryDistrictId or by the district
  // of their primaryCampusId. Use COALESCE to derive the effective district.
  // Special case: XAN role members are attributed to "XAN" district.
  const xanRoleCondition = sql`${people.primaryRole} IN (${sql.join(
    XAN_ROLES.map(r => sql`${r}`),
    sql`, `
  )})`;
  const effectiveDistrictId = sql<string>`CASE 
    WHEN ${xanRoleCondition} THEN 'XAN'
    ELSE COALESCE(${people.primaryDistrictId}, ${campuses.districtId})
  END`;

  const result = await db
    .select({
      districtId: effectiveDistrictId.as("districtId"),
      status: people.status,
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(people)
    .leftJoin(campuses, eq(people.primaryCampusId, campuses.id))
    .where(sql`${effectiveDistrictId} IS NOT NULL`)
    .groupBy(effectiveDistrictId, people.status);

  // Group by district and aggregate status counts
  const districtMap = new Map<
    string,
    {
      going: number;
      maybe: number;
      notGoing: number;
      notInvited: number;
      total: number;
    }
  >();

  for (const row of result) {
    const districtId = row.districtId;
    if (!districtId) continue;

    if (!districtMap.has(districtId)) {
      districtMap.set(districtId, {
        going: 0,
        maybe: 0,
        notGoing: 0,
        notInvited: 0,
        total: 0,
      });
    }

    const counts = districtMap.get(districtId)!;
    const count = Number(row.count) || 0;
    counts.total += count;

    switch (row.status) {
      case "Yes":
        counts.going = count;
        break;
      case "Maybe":
        counts.maybe = count;
        break;
      case "No":
        counts.notGoing = count;
        break;
      case "Not Invited":
      default:
        counts.notInvited += count;
        break;
    }
  }

  return Array.from(districtMap.entries()).map(([districtId, counts]) => ({
    districtId,
    ...counts,
  }));
}

/**
 * Get aggregate metrics for all regions (no person identifiers).
 * Returns counts for Yes, Maybe, No, Not Invited statuses per region.
 * This is a public aggregate endpoint - everyone can see these numbers.
 */
export async function getAllRegionMetrics() {
  const db = await getDb();
  if (!db) return [];

  // Derive region from districts table via primaryDistrictId JOIN,
  // falling back to people.primaryRegion for people without a district.
  // This ensures people with primaryDistrictId but NULL primaryRegion
  // are still counted in the correct region.
  const effectiveRegion = sql<string>`COALESCE(${districts.region}, ${people.primaryRegion})`;

  const result = await db
    .select({
      region: effectiveRegion.as("region"),
      status: people.status,
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(people)
    .leftJoin(districts, eq(people.primaryDistrictId, districts.id))
    .where(sql`${effectiveRegion} IS NOT NULL`)
    .groupBy(effectiveRegion, people.status);

  // Group by region and aggregate status counts
  const regionMap = new Map<
    string,
    {
      going: number;
      maybe: number;
      notGoing: number;
      notInvited: number;
      total: number;
    }
  >();

  for (const row of result) {
    const region = row.region;
    if (!region) continue;

    if (!regionMap.has(region)) {
      regionMap.set(region, {
        going: 0,
        maybe: 0,
        notGoing: 0,
        notInvited: 0,
        total: 0,
      });
    }

    const counts = regionMap.get(region)!;
    const count = Number(row.count) || 0;
    counts.total += count;

    switch (row.status) {
      case "Yes":
        counts.going = count;
        break;
      case "Maybe":
        counts.maybe = count;
        break;
      case "No":
        counts.notGoing = count;
        break;
      case "Not Invited":
      default:
        counts.notInvited += count;
        break;
    }
  }

  return Array.from(regionMap.entries()).map(([region, counts]) => ({
    region,
    ...counts,
  }));
}

// National staff (no district/region)
export async function getNationalStaff() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(people)
    .where(
      and(
        sql`${people.primaryDistrictId} IS NULL`,
        sql`${people.primaryRegion} IS NULL`
      )
    );
}

// ============================================================================
// HOUSEHOLDS
// ============================================================================

export async function getAllHouseholds() {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(households);
  } catch (error) {
    // If households table doesn't exist yet, return empty array
    console.error(
      "Error fetching households (table may not exist yet):",
      error
    );
    return [];
  }
}

export async function getHouseholdById(id: number) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db
      .select()
      .from(households)
      .where(eq(households.id, id))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    // If households table doesn't exist yet, return null
    console.error(
      "Error fetching household by id (table may not exist yet):",
      error
    );
    return null;
  }
}

export async function getHouseholdMembers(householdId: number) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db
      .select()
      .from(people)
      .where(eq(people.householdId, householdId));
  } catch (error) {
    // If households table doesn't exist yet, return empty array
    console.error(
      "Error fetching household members (table may not exist yet):",
      error
    );
    return [];
  }
}

export async function searchHouseholds(query: string) {
  const db = await getDb();
  if (!db) return [];
  // Search by label or by member names
  const allHouseholds = await db.select().from(households);
  const matchingHouseholds = [];

  for (const household of allHouseholds) {
    // Check label match
    if (
      household.label &&
      household.label.toLowerCase().includes(query.toLowerCase())
    ) {
      matchingHouseholds.push(household);
      continue;
    }

    // Check member names
    const members = await getHouseholdMembers(household.id);
    const memberNames = members.map(m => m.name.toLowerCase()).join(" ");
    if (memberNames.includes(query.toLowerCase())) {
      matchingHouseholds.push(household);
    }
  }

  return matchingHouseholds;
}

export async function createHousehold(data: InsertHousehold) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const cleanData: Partial<InsertHousehold> = {
    childrenCount: data.childrenCount ?? 0,
    guestsCount: data.guestsCount ?? 0,
  };

  // Ensure label is not empty - fallback to "Household" if needed
  if (data.label !== undefined && data.label !== null && data.label.trim()) {
    cleanData.label = data.label.trim();
  } else {
    // Fallback to "Household" if label is empty or not provided
    cleanData.label = "Household";
  }

  const result = await db.insert(households).values(cleanData);
  const insertId = result[0]?.insertId;
  if (!insertId) {
    throw new Error("Failed to get insert ID from database");
  }
  return insertId;
}

export async function updateHousehold(
  id: number,
  data: Partial<InsertHousehold>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Partial<InsertHousehold> = {};
  if (data.label !== undefined) updateData.label = data.label;
  if (data.childrenCount !== undefined)
    updateData.childrenCount = data.childrenCount;
  if (data.guestsCount !== undefined) updateData.guestsCount = data.guestsCount;

  await db.update(households).set(updateData).where(eq(households.id, id));
}

export async function deleteHousehold(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // First, unlink all people from this household
  await db
    .update(people)
    .set({ householdId: null, householdRole: "primary" })
    .where(eq(people.householdId, id));

  // Then delete the household
  await db.delete(households).where(eq(households.id, id));
}

// ============================================================================
// AUTH TOKENS
// ============================================================================

export async function createAuthToken(token: InsertAuthToken) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(authTokens).values(token);
  const insertId = result[0]?.insertId;
  if (!insertId) {
    throw new Error("Failed to get insert ID from database");
  }
  return insertId;
}

export async function getAuthToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(authTokens)
    .where(
      and(
        eq(authTokens.token, token),
        sql`${authTokens.expiresAt} > NOW()`,
        sql`${authTokens.consumedAt} IS NULL`
      )
    )
    .limit(1);
  return result[0] || null;
}

export async function consumeAuthToken(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(authTokens)
    .set({ consumedAt: new Date() })
    .where(eq(authTokens.token, token));
}

// ============================================================================
// USER APPROVALS
// ============================================================================

export async function getPendingApprovals(role: string) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(users)
    .where(eq(users.approvalStatus, "PENDING_APPROVAL"));
}

export async function approveUser(
  userId: number,
  approvedByUserId: number | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({
      approvalStatus: "ACTIVE",
      approvedByUserId,
      approvedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function rejectUser(
  userId: number,
  rejectedByUserId: number | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({
      approvalStatus: "REJECTED",
    })
    .where(eq(users.id, userId));
}

// ============================================================================
// INVITE NOTES
// ============================================================================

export async function getInviteNotesByPersonId(personId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(inviteNotes)
    .where(eq(inviteNotes.personId, personId))
    .orderBy(sql`${inviteNotes.createdAt} DESC`);
}

export async function createInviteNote(note: InsertInviteNote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(inviteNotes).values(note);
  const insertId = result[0]?.insertId;
  if (!insertId) {
    throw new Error("Failed to get insert ID from database");
  }
  return insertId;
}

// ============================================================================
// STATUS CHANGES
// ============================================================================

export async function getStatusHistory(personId: string, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(statusChanges)
    .where(eq(statusChanges.personId, personId))
    .orderBy(sql`${statusChanges.changedAt} DESC`)
    .limit(limit);
}

export async function revertStatusChange(
  statusChangeId: number,
  revertedByUserId: number | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the status change record
  const change = await db
    .select()
    .from(statusChanges)
    .where(eq(statusChanges.id, statusChangeId))
    .limit(1);

  if (!change[0]) {
    throw new Error("Status change not found");
  }

  // Check if this is an initial status (fromStatus is null)
  if (!change[0].fromStatus) {
    throw new Error("Cannot revert initial status change");
  }

  // Revert person's status to fromStatus
  await db
    .update(people)
    .set({
      status: change[0].fromStatus,
      statusLastUpdated: new Date(),
    })
    .where(eq(people.personId, change[0].personId));

  return { success: true };
}

// ============================================================================
// FOLLOW-UP PEOPLE
// ============================================================================

export async function getFollowUpPeople() {
  const db = await getDb();
  if (!db) return [];

  // Get people with Maybe status or active needs
  const maybeStatus = await db
    .select()
    .from(people)
    .where(eq(people.status, "Maybe"));

  const peopleWithNeeds = await db.select().from(people)
    .where(sql`${people.personId} IN (
      SELECT DISTINCT personId FROM ${needs} WHERE isActive = true
    )`);

  // Combine and deduplicate by personId
  const allPeople = [...maybeStatus, ...peopleWithNeeds];
  const uniquePeople = Array.from(
    new Map(allPeople.map(p => [p.personId, p])).values()
  );

  return uniquePeople;
}

// ============================================================================
// IMPORT PEOPLE
// ============================================================================

// Leadership roles that don't require a campus (N/A for campus)
// These roles belong to a district, region, or national level
const LEADERSHIP_ROLES_NO_CAMPUS = [
  "DISTRICT_DIRECTOR",
  "DISTRICT_STAFF",
  "REGION_DIRECTOR",
  "REGIONAL_STAFF",
  "NATIONAL_STAFF",
  "NATIONAL_DIRECTOR",
  "FIELD_DIRECTOR",
  "CMC_GO_ADMIN",
  "ADMIN",
] as const;

export async function importPeople(
  rows: Array<{
    name: string;
    campus?: string;
    district?: string;
    role?: string;
    status?: "Yes" | "Maybe" | "No" | "Not Invited";
    notes?: string;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Load all campuses and districts once at the start for efficiency
  const allCampuses = await getAllCampuses();
  const allDistricts = await getAllDistricts();

  for (const row of rows) {
    try {
      const normalizedRole = row.role?.toUpperCase().replace(/\s+/g, "_");
      const isLeadershipRole = LEADERSHIP_ROLES_NO_CAMPUS.includes(
        normalizedRole as (typeof LEADERSHIP_ROLES_NO_CAMPUS)[number]
      );

      // Campus-based roles (STAFF, CO_DIRECTOR, CAMPUS_DIRECTOR) require a campus
      // Leadership roles (DD, DS, RD, RS, etc.) do NOT require a campus - they are N/A for campus
      if (!isLeadershipRole && !row.campus) {
        errors.push(
          `${row.name}: Campus is required for role "${row.role || "STAFF"}"`
        );
        continue;
      }

      // Find campus if provided
      let campus = null;
      if (row.campus) {
        campus = allCampuses.find(
          c => c.name.toLowerCase() === row.campus?.toLowerCase()
        );
        if (!campus) {
          errors.push(`${row.name}: Campus "${row.campus}" not found`);
          continue;
        }
      }

      // For leadership roles without campus, district is required
      let districtId = campus?.districtId || null;
      if (isLeadershipRole && !campus && row.district) {
        const district = allDistricts.find(
          (d: { id: string }) =>
            d.id.toLowerCase() === row.district?.toLowerCase()
        );
        if (district) {
          districtId = district.id;
        } else {
          errors.push(`${row.name}: District "${row.district}" not found`);
          continue;
        }
      } else if (isLeadershipRole && !campus && !row.district) {
        // Leadership roles without campus need at least a district (except national roles)
        const isNationalRole = [
          "NATIONAL_STAFF",
          "NATIONAL_DIRECTOR",
          "FIELD_DIRECTOR",
          "CMC_GO_ADMIN",
          "ADMIN",
        ].includes(normalizedRole || "");
        if (!isNationalRole) {
          errors.push(
            `${row.name}: District is required for role "${row.role}" without campus`
          );
          continue;
        }
      }

      // Generate personId from name (simple approach - could be improved)
      const personId = row.name.toLowerCase().replace(/\s+/g, "_");

      // Check if person already exists
      const existing = await getPersonByPersonId(personId);
      if (existing) {
        skipped++;
        continue;
      }

      // Create person - campus may be null for leadership roles
      await createPerson({
        personId,
        name: row.name,
        primaryCampusId: campus?.id || null,
        primaryDistrictId: districtId,
        primaryRole: row.role,
        status: row.status || "Not Invited",
        notes: row.notes,
        depositPaid: false,
      });

      imported++;
    } catch (error) {
      errors.push(
        `Failed to import ${row.name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return { imported, skipped, errors };
}

// ============================================================================
// NEED VISIBILITY
// ============================================================================

export async function updateNeedVisibility(
  needId: number,
  visibility: "LEADERSHIP_ONLY" | "DISTRICT_VISIBLE"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(needs).set({ visibility }).where(eq(needs.id, needId));
}
