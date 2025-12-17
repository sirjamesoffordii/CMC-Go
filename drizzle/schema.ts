import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

/**
 * Core user table backing auth flow.
 */
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: text("email", { length: 320 }),
  loginMethod: text("loginMethod", { length: 64 }),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Districts table - represents geographic/organizational districts
 * DistrictSlug is the source of truth and must match SVG path IDs
 */
export const districts = sqliteTable("districts", {
  id: text("id", { length: 64 }).primaryKey(), // DistrictSlug
  name: text("name", { length: 255 }).notNull(),
  region: text("region", { length: 255 }).notNull(),
  leftNeighbor: text("leftNeighbor", { length: 64 }), // District ID to the left (geographically)
  rightNeighbor: text("rightNeighbor", { length: 64 }), // District ID to the right (geographically)
});

export type District = typeof districts.$inferSelect;
export type InsertDistrict = typeof districts.$inferInsert;

/**
 * Campuses table - represents campuses within districts
 */
export const campuses = sqliteTable("campuses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name", { length: 255 }).notNull(),
  districtId: text("districtId", { length: 64 }).notNull(),
});

export type Campus = typeof campuses.$inferSelect;
export type InsertCampus = typeof campuses.$inferInsert;

/**
 * People table - represents unique individuals
 * personId is the authoritative ID from the Excel seed data
 * A person can have multiple assignments but exists only once here
 */
export const people = sqliteTable("people", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  personId: text("personId", { length: 64 }).notNull().unique(), // Excel Person ID - source of truth
  name: text("name", { length: 255 }).notNull(),
  // Primary assignment info (from "People (Unique)" sheet)
  primaryRole: text("primaryRole", { length: 255 }),
  primaryCampusId: integer("primaryCampusId"), // nullable for National roles
  primaryDistrictId: text("primaryDistrictId", { length: 64 }), // nullable for National roles
  primaryRegion: text("primaryRegion", { length: 255 }), // nullable for National roles
  nationalCategory: text("nationalCategory", { length: 255 }), // e.g., "National Director", "CMC Go Coordinator"
  // Status tracking (Universal responses)
  status: text("status", { enum: ["Yes", "Maybe", "No", "Not Invited"] }).default("Not Invited").notNull(),
  depositPaid: integer("depositPaid", { mode: "boolean" }).default(false).notNull(),
  statusLastUpdated: integer("statusLastUpdated", { mode: "timestamp" }),
  statusLastUpdatedBy: text("statusLastUpdatedBy", { length: 255 }),
  // Additional fields
  needs: text("needs"),
  notes: text("notes"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type Person = typeof people.$inferSelect;
export type InsertPerson = typeof people.$inferInsert;

/**
 * Assignments table - tracks all role assignments for people
 * A person may have multiple assignments (e.g., Campus Director + District role)
 */
export const assignments = sqliteTable("assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  personId: text("personId", { length: 64 }).notNull(), // References people.personId
  assignmentType: text("assignmentType", { enum: ["Campus", "District", "Region", "National"] }).notNull(),
  roleTitle: text("roleTitle", { length: 255 }).notNull(),
  campusId: integer("campusId"), // nullable for non-Campus assignments
  districtId: text("districtId", { length: 64 }), // nullable for National assignments
  region: text("region", { length: 255 }), // nullable for National assignments
  isPrimary: integer("isPrimary", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = typeof assignments.$inferInsert;

/**
 * Needs table - tracks financial or other needs for people
 * References people by personId (varchar) for consistency
 */
export const needs = sqliteTable("needs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  personId: text("personId", { length: 64 }).notNull(), // References people.personId
  type: text("type", { enum: ["Financial", "Other"] }).notNull(),
  amount: integer("amount"), // in cents for Financial needs
  notes: text("notes"),
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type Need = typeof needs.$inferSelect;
export type InsertNeed = typeof needs.$inferInsert;

/**
 * Notes table - tracks notes about people
 * References people by personId (varchar) for consistency
 */
export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  personId: text("personId", { length: 64 }).notNull(), // References people.personId
  text: text("text").notNull(),
  isLeaderOnly: integer("isLeaderOnly", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

/**
 * Settings table - stores application-wide settings
 */
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key", { length: 255 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;
