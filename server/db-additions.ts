// Additional DB functions for login and admin features
// These should be merged into server/db.ts

import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";

// ============================================================================
// USER LOGIN
// ============================================================================

export async function updateUserLastLogin(userId: number) {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, userId));
}

// ============================================================================
// ADMIN USER MANAGEMENT
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

export async function getAllUsers() {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) return [];
  return await db.select(userColumns).from(users);
}

export async function updateUserRole(
  userId: number,
  role:
    | "STAFF"
    | "CO_DIRECTOR"
    | "CAMPUS_DIRECTOR"
    | "DISTRICT_DIRECTOR"
    | "REGION_DIRECTOR"
    | "ADMIN"
) {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function updateUserStatus(
  userId: number,
  approvalStatus: "ACTIVE" | "PENDING_APPROVAL" | "REJECTED" | "DISABLED"
) {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ approvalStatus }).where(eq(users.id, userId));
}

export async function deleteUser(userId: number) {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(users).where(eq(users.id, userId));
}
