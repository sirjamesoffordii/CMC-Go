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
 * People table - represents individuals with invitation status
 */
export const people = mysqlTable("people", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  campusId: int("campusId").notNull(),
  districtId: varchar("districtId", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["Not invited yet", "Maybe", "Going", "Not Going"]).default("Not invited yet").notNull(),
  role: varchar("role", { length: 255 }),
  lastUpdated: timestamp("lastUpdated").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Person = typeof people.$inferSelect;
export type InsertPerson = typeof people.$inferInsert;

/**
 * Needs table - tracks financial or other needs for people
 */
export const needs = mysqlTable("needs", {
  id: int("id").autoincrement().primaryKey(),
  personId: int("personId").notNull(),
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
 */
export const notes = mysqlTable("notes", {
  id: int("id").autoincrement().primaryKey(),
  personId: int("personId").notNull(),
  text: text("text").notNull(),
  isLeaderOnly: boolean("isLeaderOnly").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;
