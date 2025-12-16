import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
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
  id: int("id").autoincrement().primaryKey(),
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
  id: int("id").autoincrement().primaryKey(),
  personId: varchar("personId", { length: 64 }).notNull().unique(), // Excel Person ID - source of truth
  name: varchar("name", { length: 255 }).notNull(),
  // Primary assignment info (from "People (Unique)" sheet)
  primaryRole: varchar("primaryRole", { length: 255 }),
  primaryCampusId: int("primaryCampusId"), // nullable for National roles
  primaryDistrictId: varchar("primaryDistrictId", { length: 64 }), // nullable for National roles
  primaryRegion: varchar("primaryRegion", { length: 255 }), // nullable for National roles
  nationalCategory: varchar("nationalCategory", { length: 255 }), // e.g., "National Director", "CMC Go Coordinator"
  // Status tracking
  status: mysqlEnum("status", ["Not invited yet", "Maybe", "Going", "Not Going"]).default("Not invited yet").notNull(),
  statusLastUpdated: timestamp("statusLastUpdated"),
  statusLastUpdatedBy: varchar("statusLastUpdatedBy", { length: 255 }),
  // Additional fields
  needs: text("needs"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Person = typeof people.$inferSelect;
export type InsertPerson = typeof people.$inferInsert;

/**
 * Assignments table - tracks all role assignments for people
 * A person may have multiple assignments (e.g., Campus Director + District role)
 */
export const assignments = mysqlTable("assignments", {
  id: int("id").autoincrement().primaryKey(),
  personId: varchar("personId", { length: 64 }).notNull(), // References people.personId
  assignmentType: mysqlEnum("assignmentType", ["Campus", "District", "Region", "National"]).notNull(),
  roleTitle: varchar("roleTitle", { length: 255 }).notNull(),
  campusId: int("campusId"), // nullable for non-Campus assignments
  districtId: varchar("districtId", { length: 64 }), // nullable for National assignments
  region: varchar("region", { length: 255 }), // nullable for National assignments
  isPrimary: boolean("isPrimary").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = typeof assignments.$inferInsert;

/**
 * Needs table - tracks financial or other needs for people
 * References people by personId (varchar) for consistency
 */
export const needs = mysqlTable("needs", {
  id: int("id").autoincrement().primaryKey(),
  personId: varchar("personId", { length: 64 }).notNull(), // References people.personId
  type: mysqlEnum("type", ["Financial", "Other"]).notNull(),
  amount: int("amount"), // in cents for Financial needs
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Need = typeof needs.$inferSelect;
export type InsertNeed = typeof needs.$inferInsert;

/**
 * Notes table - tracks notes about people
 * References people by personId (varchar) for consistency
 */
export const notes = mysqlTable("notes", {
  id: int("id").autoincrement().primaryKey(),
  personId: varchar("personId", { length: 64 }).notNull(), // References people.personId
  text: text("text").notNull(),
  isLeaderOnly: boolean("isLeaderOnly").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

/**
 * Settings table - stores application-wide settings
 */
export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;
