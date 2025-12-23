import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
 * Regions table - represents geographic regions (e.g., "Northeast", "Great Plains South")
 */
export const regions = mysqlTable("regions", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  color: varchar("color", { length: 50 }), // Hex color code for map display
  description: text("description"),
  // Audit trail
  lastEditedBy: varchar("lastEditedBy", { length: 255 }),
  lastEditedAt: timestamp("lastEditedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type Region = typeof regions.$inferSelect;
export type InsertRegion = typeof regions.$inferInsert;

/**
 * Districts table - represents geographic/organizational districts within regions
 * svgPathId is the source of truth and must match SVG path inkscape:label attributes
 */
export const districts = mysqlTable("districts", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  svgPathId: varchar("svgPathId", { length: 64 }).notNull().unique(), // Matches SVG inkscape:label
  regionId: int("regionId").notNull(), // FK to regions.id
  color: varchar("color", { length: 50 }), // Override color for this district
  contactName: varchar("contactName", { length: 255 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactPhone: varchar("contactPhone", { length: 50 }),
  // Audit trail
  lastEditedBy: varchar("lastEditedBy", { length: 255 }),
  lastEditedAt: timestamp("lastEditedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type District = typeof districts.$inferSelect;
export type InsertDistrict = typeof districts.$inferInsert;

/**
 * Campuses table - represents campuses within districts
 */
export const campuses = mysqlTable("campuses", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  districtId: int("districtId").notNull(), // FK to districts.id
  city: varchar("city", { length: 255 }),
  state: varchar("state", { length: 2 }),
  contactName: varchar("contactName", { length: 255 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactPhone: varchar("contactPhone", { length: 50 }),
  // Audit trail
  lastEditedBy: varchar("lastEditedBy", { length: 255 }),
  lastEditedAt: timestamp("lastEditedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
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
  primaryCampusId: int("primaryCampusId"), // FK to campuses.id, nullable for National roles
  primaryDistrictId: int("primaryDistrictId"), // FK to districts.id, nullable for National roles
  primaryRegionId: int("primaryRegionId"), // FK to regions.id, nullable for National roles
  nationalCategory: varchar("nationalCategory", { length: 255 }), // e.g., "National Director", "CMC Go Coordinator"
  // Status tracking (Universal responses)
  status: mysqlEnum("status", ["Yes", "Maybe", "No", "Not Invited"]).default("Not Invited").notNull(),
  depositPaid: boolean("depositPaid").default(false).notNull(),
  statusLastUpdated: timestamp("statusLastUpdated"),
  statusLastUpdatedBy: varchar("statusLastUpdatedBy", { length: 255 }),
  // Additional fields
  needs: text("needs"),
  notes: text("notes"),
  // Accompanying people
  spouse: varchar("spouse", { length: 255 }),
  kids: int("kids").default(0),
  guests: int("guests").default(0),
  childrenAges: text("childrenAges"), // JSON array of age ranges
  // Audit trail
  lastEditedBy: varchar("lastEditedBy", { length: 255 }),
  lastEditedAt: timestamp("lastEditedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type Person = typeof people.$inferSelect;
export type InsertPerson = typeof people.$inferInsert;

/**
 * Assignments table - represents multiple roles a person can have
 * Example: A person might be "Campus Director" at one campus and "Regional Coordinator" for a region
 */
export const assignments = mysqlTable("assignments", {
  id: int("id").primaryKey().autoincrement(),
  personId: varchar("personId", { length: 64 }).notNull(), // FK to people.personId
  role: varchar("role", { length: 255 }).notNull(),
  campusId: int("campusId"), // FK to campuses.id, nullable
  districtId: int("districtId"), // FK to districts.id, nullable
  regionId: int("regionId"), // FK to regions.id, nullable
  isPrimary: boolean("isPrimary").default(false).notNull(), // Whether this is the person's primary assignment
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = typeof assignments.$inferInsert;


/**
 * Settings table - stores application settings as key-value pairs
 */
export const settings = mysqlTable("settings", {
  id: int("id").primaryKey().autoincrement(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;

/**
 * Needs table - tracks financial and other needs for people
 */
export const needs = mysqlTable("needs", {
  id: int("id").primaryKey().autoincrement(),
  personId: varchar("personId", { length: 64 }).notNull(), // FK to people.personId
  type: mysqlEnum("type", ["financial", "other"]).default("other").notNull(),
  description: text("description"),
  amount: int("amount"), // For financial needs
  isActive: boolean("isActive").default(true).notNull(),
  resolvedAt: timestamp("resolvedAt"),
  resolvedBy: varchar("resolvedBy", { length: 255 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type Need = typeof needs.$inferSelect;
export type InsertNeed = typeof needs.$inferInsert;
