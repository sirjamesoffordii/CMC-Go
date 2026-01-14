// Additional DB functions for login and admin features
// These should be merged into server/db.ts

import { eq, and, gte, isNull } from "drizzle-orm";
import { users } from "../drizzle/schema";

// ============================================================================
// USER SESSIONS
// ============================================================================

export async function createOrUpdateSession(session: { userId: number; sessionId: string; userAgent: string | null; ipAddress: string | null }) {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { userSessions } = await import("../drizzle/schema");

  // Check if session already exists
  const existing = await db.select().from(userSessions).where(eq(userSessions.sessionId, session.sessionId)).limit(1);

  if (existing.length > 0) {
    // Update lastSeenAt
    await db.update(userSessions)
      .set({ lastSeenAt: new Date() })
      .where(eq(userSessions.id, existing[0].id));
    return existing[0];
  } else {
    // Create new session
    const result = await db.insert(userSessions).values({
      userId: session.userId,
      sessionId: session.sessionId,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      lastSeenAt: new Date(),
    });

    return { id: Number(result[0]?.insertId), ...session };
  }
}

export async function updateSessionLastSeen(sessionId: string) {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { userSessions } = await import("../drizzle/schema");

  await db.update(userSessions)
    .set({ lastSeenAt: new Date() })
    .where(eq(userSessions.sessionId, sessionId));
}

export async function revokeSession(sessionId: string) {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { userSessions } = await import("../drizzle/schema");

  await db.update(userSessions)
    .set({ revokedAt: new Date() })
    .where(eq(userSessions.sessionId, sessionId));
}

export async function getActiveSessions() {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) return [];

  const { userSessions } = await import("../drizzle/schema");

  // Active = lastSeenAt within 30 minutes and not revoked
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  return await db.select()
    .from(userSessions)
    .where(
      and(
        gte(userSessions.lastSeenAt, thirtyMinutesAgo),
        isNull(userSessions.revokedAt)
      )
    );
}

export async function updateUserLastLogin(userId: number) {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
}

// ============================================================================
// ADMIN USER MANAGEMENT
// ============================================================================

export async function getAllUsers() {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users);
}

export async function updateUserRole(userId: number, role: "STAFF" | "CO_DIRECTOR" | "CAMPUS_DIRECTOR" | "DISTRICT_DIRECTOR" | "REGION_DIRECTOR" | "ADMIN") {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function updateUserStatus(userId: number, approvalStatus: "ACTIVE" | "PENDING_APPROVAL" | "REJECTED" | "DISABLED") {
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
