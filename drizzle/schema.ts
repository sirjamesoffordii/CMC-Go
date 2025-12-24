import { mysqlTable, int, varchar, text, timestamp, boolean, mysqlEnum } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
  lastSignedIn: timestamp("lastSignedIn").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Districts table - represents geographic/organizational districts
 * DistrictSlug is the source of truth and must match SVG path IDs
 */
export const districts = mysqlTable("districts", {
  id: varchar("id", { length: 64 }).primaryKey(), // DistrictSlug
  name: varchar("name", { length: 255 }).notNull(),
  region: varchar("region", { length: 255 }).notNull(),
  leftNeighbor: varchar("leftNeighbor", { length: 64 }), // District ID to the left (geographically)
  rightNeighbor: varchar("rightNeighbor", { length: 64 }), // District ID to the right (geographically)
});

export type District = typeof districts.$inferSelect;
export type InsertDistrict = typeof districts.$inferInsert;

/**
 * Campuses table - represents campuses within districts
 */
export const campuses = mysqlTable("campuses", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  districtId: varchar("districtId", { length: 64 }).notNull(),
});

export type Campus = typeof campuses.$inferSelect;
export type InsertCampus = typeof campuses.$inferInsert;

/**
 * People table - represents unique individuals
 * personId is the authoritative ID from the Excel seed data
 * A person can have multiple assignments but exists only once here
 */
export const people = mysqlTable("people", {
  id: int("id").primaryKey().autoincrement(),
  personId: varchar("personId", { length: 64 }).notNull().unique(), // Excel Person ID - source of truth
  name: varchar("name", { length: 255 }).notNull(),
  // Primary assignment info (from "People (Unique)" sheet)
  primaryRole: varchar("primaryRole", { length: 255 }),
  primaryCampusId: int("primaryCampusId"), // nullable for National roles
  primaryDistrictId: varchar("primaryDistrictId", { length: 64 }), // nullable for National roles
  primaryRegion: varchar("primaryRegion", { length: 255 }), // nullable for National roles
  nationalCategory: varchar("nationalCategory", { length: 255 }), // e.g., "National Director", "CMC Go Coordinator"
  // Status tracking (Universal responses)
  status: mysqlEnum("status", ["Yes", "Maybe", "No", "Not Invited"]).default("Not Invited").notNull(),
  depositPaid: boolean("depositPaid").default(false).notNull(),
  statusLastUpdated: timestamp("statusLastUpdated"),
  statusLastUpdatedBy: varchar("statusLastUpdatedBy", { length: 255 }),
  // Additional fields
  needs: text("needs"),
  notes: text("notes"),
  spouse: varchar("spouse", { length: 255 }),
  kids: varchar("kids", { length: 10 }), // Store as string to allow empty or number
  guests: varchar("guests", { length: 10 }), // Store as string to allow empty or number
  childrenAges: text("childrenAges"), // JSON array stored as text
  // Last edited tracking
  lastEdited: timestamp("lastEdited"),
  lastEditedBy: varchar("lastEditedBy", { length: 255 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type Person = typeof people.$inferSelect;
export type InsertPerson = typeof people.$inferInsert;

/**
 * Assignments table - tracks all role assignments for people
 * A person may have multiple assignments (e.g., Campus Director + District role)
 */
export const assignments = mysqlTable("assignments", {
  id: int("id").primaryKey().autoincrement(),
  personId: varchar("personId", { length: 64 }).notNull(), // References people.personId
  assignmentType: mysqlEnum("assignmentType", ["Campus", "District", "Region", "National"]).notNull(),
  roleTitle: varchar("roleTitle", { length: 255 }).notNull(),
  campusId: int("campusId"), // nullable for non-Campus assignments
  districtId: varchar("districtId", { length: 64 }), // nullable for National assignments
  region: varchar("region", { length: 255 }), // nullable for National assignments
  isPrimary: boolean("isPrimary").default(false).notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = typeof assignments.$inferInsert;

/**
 * Needs table - tracks financial or other needs for people
 * References people by personId (varchar) for consistency
 */
/**
 * Needs table - tracks financial or other needs for people
 * Only active needs (isActive = true) are counted in metrics and summaries.
 * Inactive needs are retained for history.
 */
export const needs = mysqlTable("needs", {
  id: int("id").primaryKey().autoincrement(),
  personId: varchar("personId", { length: 64 }).notNull(), // References people.personId
  type: mysqlEnum("type", ["Financial", "Transportation", "Housing", "Other"]).notNull(),
  description: text("description").notNull(),
  amount: int("amount"), // in cents (only for Financial type)
  isActive: boolean("isActive").default(true).notNull(), // false when need is met
  metAt: timestamp("metAt"), // timestamp when need was marked as met (nullable)
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type Need = typeof needs.$inferSelect;
export type InsertNeed = typeof needs.$inferInsert;

/**
 * Notes table - tracks notes about people
 * References people by personId (varchar) for consistency
 */
export const notes = mysqlTable("notes", {
  id: int("id").primaryKey().autoincrement(),
  personId: varchar("personId", { length: 64 }).notNull(), // References people.personId
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  createdBy: varchar("createdBy", { length: 255 }),
});

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

/**
 * Settings table - key-value store for application settings
 */
export const settings = mysqlTable("settings", {
  key: varchar("key", { length: 255 }).primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;
