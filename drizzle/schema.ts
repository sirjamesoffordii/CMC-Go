import {
  mysqlTable,
  int,
  varchar,
  text,
  timestamp,
  boolean,
  mysqlEnum,
  index,
  datetime,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * PR 2: Self-registration with role-based approval system
 * Password Auth: Added passwordHash, scopeLevel, viewLevel, editLevel, overseeRegionId, isBanned
 */
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }), // Password auth - nullable for migration
  role: mysqlEnum("role", [
    "STAFF",
    "CO_DIRECTOR",
    "CAMPUS_DIRECTOR",
    "CAMPUS_INTERN",
    "CAMPUS_VOLUNTEER",
    "DISTRICT_DIRECTOR",
    "DISTRICT_STAFF",
    "REGION_DIRECTOR",
    "REGIONAL_STAFF",
    "NATIONAL_STAFF",
    "NATIONAL_DIRECTOR",
    "FIELD_DIRECTOR",
    "CMC_GO_ADMIN",
    "ADMIN",
    "OTHER",
  ]).notNull(),
  campusId: int("campusId"), // Nullable for National Team members
  districtId: varchar("districtId", { length: 64 }), // Derived from campusId server-side
  regionId: varchar("regionId", { length: 255 }), // Derived from campusId server-side
  overseeRegionId: varchar("overseeRegionId", { length: 255 }), // For Regional Directors/Staff
  personId: varchar("personId", { length: 64 }), // Optional link to people.personId (onboarding)
  // Three-tier authorization system
  scopeLevel: mysqlEnum("scopeLevel", ["NATIONAL", "REGION", "DISTRICT"])
    .default("REGION")
    .notNull(),
  viewLevel: mysqlEnum("viewLevel", [
    "NATIONAL",
    "REGION",
    "DISTRICT",
    "CAMPUS",
  ])
    .default("CAMPUS")
    .notNull(),
  editLevel: mysqlEnum("editLevel", [
    "NATIONAL",
    "XAN",
    "REGION",
    "DISTRICT",
    "CAMPUS",
  ])
    .default("CAMPUS")
    .notNull(),
  isBanned: boolean("isBanned").default(false).notNull(),
  approvalStatus: mysqlEnum("approvalStatus", [
    "ACTIVE",
    "PENDING_APPROVAL",
    "REJECTED",
    "DISABLED",
  ])
    .default("ACTIVE")
    .notNull(),
  approvedByUserId: int("approvedByUserId"), // Nullable - set when approved
  approvedAt: timestamp("approvedAt"), // Nullable - set when approved
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  lastLoginAt: timestamp("lastLoginAt"), // Updated on login
  // Legacy OAuth columns (kept for database compatibility, not used in password auth)
  openId: varchar("openId", { length: 64 }),
  name: varchar("name", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  // Additional metadata
  roleLabel: varchar("roleLabel", { length: 255 }),
  roleTitle: varchar("roleTitle", { length: 255 }),
  linkedPersonId: varchar("linkedPersonId", { length: 64 }),
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
export const campuses = mysqlTable(
  "campuses",
  {
    id: int("id").primaryKey().autoincrement(),
    name: varchar("name", { length: 255 }).notNull(),
    districtId: varchar("districtId", { length: 64 }).notNull(),
    displayOrder: int("displayOrder").notNull().default(0), // Visual ordering within district
  },
  table => ({
    // PR 6: Add index for districtId lookups
    districtIdIdx: index("campuses_districtId_idx").on(table.districtId),
  })
);

export type Campus = typeof campuses.$inferSelect;
export type InsertCampus = typeof campuses.$inferInsert;

/**
 * Households table - represents shared households for families
 * Prevents double-counting of children and guests for married staff
 */
export const households = mysqlTable("households", {
  id: int("id").primaryKey().autoincrement(),
  label: varchar("label", { length: 255 }), // Optional label e.g. "Offord Household"
  childrenCount: int("childrenCount").default(0).notNull(),
  guestsCount: int("guestsCount").default(0).notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});

export type Household = typeof households.$inferSelect;
export type InsertHousehold = typeof households.$inferInsert;

/**
 * People table - represents unique individuals
 * personId is the authoritative ID from the Excel seed data
 * A person can have multiple assignments but exists only once here
 */
export const people = mysqlTable(
  "people",
  {
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
    status: mysqlEnum("status", ["Yes", "Maybe", "No", "Not Invited"])
      .default("Not Invited")
      .notNull(),
    depositPaid: boolean("depositPaid").default(false).notNull(),
    deposit_paid_at: datetime("deposit_paid_at"),
    statusLastUpdated: timestamp("statusLastUpdated"),
    statusLastUpdatedBy: varchar("statusLastUpdatedBy", { length: 255 }),
    // Household linking
    householdId: int("householdId"), // nullable FK to households.id
    householdRole: mysqlEnum("householdRole", ["primary", "member"]).default(
      "primary"
    ), // "primary" when first linked
    // Additional fields
    needs: text("needs"),
    notes: text("notes"),
    spouse: varchar("spouse", { length: 255 }), // Deprecated - use spouseAttending + householdId
    kids: varchar("kids", { length: 10 }), // Deprecated - use childrenCount + householdId
    guests: varchar("guests", { length: 10 }), // Deprecated - use guestsCount
    // Household and family fields
    spouseAttending: boolean("spouseAttending").default(false).notNull(),
    childrenCount: int("childrenCount").default(0).notNull(), // 0-10, requires householdId if > 0
    guestsCount: int("guestsCount").default(0).notNull(), // 0-10, stored on person always
    childrenAges: text("childrenAges"), // JSON array stored as text
    // Contact info
    phone: varchar("phone", { length: 32 }),
    email: varchar("email", { length: 320 }),
    // Ways to give (payment handles)
    cashapp: varchar("cashapp", { length: 64 }),
    zelle: varchar("zelle", { length: 128 }),
    venmo: varchar("venmo", { length: 64 }),
    // Mighty Networks profile link (Chi Alpha Mighty app)
    mightyProfileUrl: varchar("mightyProfileUrl", { length: 512 }),
    // Last edited tracking
    lastEdited: timestamp("lastEdited"),
    lastEditedBy: varchar("lastEditedBy", { length: 255 }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  table => ({
    // PR 6: Add indexes for common queries
    primaryCampusIdIdx: index("primaryCampusId_idx").on(table.primaryCampusId),
    primaryDistrictIdIdx: index("primaryDistrictId_idx").on(
      table.primaryDistrictId
    ),
    statusIdx: index("status_idx").on(table.status),
    householdIdIdx: index("householdId_idx").on(table.householdId),
  })
);

export type Person = typeof people.$inferSelect;
export type InsertPerson = typeof people.$inferInsert;

/**
 * Assignments table - tracks all role assignments for people
 * A person may have multiple assignments (e.g., Campus Director + District role)
 */
export const assignments = mysqlTable("assignments", {
  id: int("id").primaryKey().autoincrement(),
  personId: varchar("personId", { length: 64 }).notNull(), // References people.personId
  assignmentType: mysqlEnum("assignmentType", [
    "Campus",
    "District",
    "Region",
    "National",
  ]).notNull(),
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
export const needs = mysqlTable(
  "needs",
  {
    id: int("id").primaryKey().autoincrement(),
    personId: varchar("personId", { length: 64 }).notNull(), // References people.personId
    type: mysqlEnum("type", [
      "Registration",
      "Transportation",
      "Housing",
      "Other",
    ]).notNull(),
    description: text("description").notNull(),
    amount: int("amount"), // in cents (only for Registration type)
    fundsReceived: int("fundsReceived").default(0), // in cents - actual funds received for this need
    visibility: mysqlEnum("visibility", ["LEADERSHIP_ONLY", "DISTRICT_VISIBLE"])
      .default("LEADERSHIP_ONLY")
      .notNull(), // PR 2: Updated visibility enum
    createdById: int("createdById"), // Track creator (matches database column name)
    isActive: boolean("isActive").default(true).notNull(), // false when need is met
    resolvedAt: timestamp("resolvedAt"), // PR 2: Renamed from metAt for clarity
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  table => ({
    // PR 6: Add indexes for common queries
    personIdIdx: index("needs_personId_idx").on(table.personId),
    isActiveIdx: index("needs_isActive_idx").on(table.isActive),
    visibilityIdx: index("needs_visibility_idx").on(table.visibility),
  })
);

export type Need = typeof needs.$inferSelect;
export type InsertNeed = typeof needs.$inferInsert;

/**
 * Notes table - tracks notes about people
 * References people by personId (varchar) for consistency
 * Category: INVITE for invite-related notes, INTERNAL for other notes
 */
export const notes = mysqlTable(
  "notes",
  {
    id: int("id").primaryKey().autoincrement(),
    personId: varchar("personId", { length: 64 }).notNull(), // References people.personId
    category: mysqlEnum("category", ["INVITE", "INTERNAL"])
      .default("INTERNAL")
      .notNull(), // INVITE for invite notes, INTERNAL for other notes

    content: text("content").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    createdBy: varchar("createdBy", { length: 255 }),
    noteType: mysqlEnum("note_type", ["GENERAL", "REQUEST", "MESSAGE"])
      .notNull()
      .default("GENERAL"),
  },
  table => ({
    // PR 6: Add index for personId lookups
    personIdIdx: index("notes_personId_idx").on(table.personId),
  })
);

/**
 * Invite Notes table - PR 2: Leaders-only invite notes
 * Separate table for clarity and to enforce leaders-only access
 */
export const inviteNotes = mysqlTable(
  "invite_notes",
  {
    id: int("id").primaryKey().autoincrement(),
    personId: varchar("personId", { length: 64 }).notNull(), // References people.personId
    content: text("content").notNull(),
    createdByUserId: int("createdByUserId").notNull(), // References users.id
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  table => ({
    // PR 6: Add index for personId lookups
    personIdIdx: index("invite_notes_personId_idx").on(table.personId),
  })
);

export type InviteNote = typeof inviteNotes.$inferSelect;
export type InsertInviteNote = typeof inviteNotes.$inferInsert;

/**
 * Auth tokens table - for email verification codes
 * PR 2: Email verification support
 */
export const authTokens = mysqlTable("auth_tokens", {
  id: int("id").primaryKey().autoincrement(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  email: varchar("email", { length: 320 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  consumedAt: timestamp("consumedAt"), // Nullable - set when token is used
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type AuthToken = typeof authTokens.$inferSelect;
export type InsertAuthToken = typeof authTokens.$inferInsert;

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

/**
 * Status changes table - PR 3: Audit log for status changes
 * Tracks who changed status, when, from what to what
 */
export const statusChanges = mysqlTable(
  "status_changes",
  {
    id: int("id").primaryKey().autoincrement(),
    personId: varchar("personId", { length: 64 }).notNull(), // References people.personId
    fromStatus: mysqlEnum("fromStatus", ["Yes", "Maybe", "No", "Not Invited"]), // Nullable for initial status
    toStatus: mysqlEnum("toStatus", [
      "Yes",
      "Maybe",
      "No",
      "Not Invited",
    ]).notNull(),
    changedByUserId: int("changedByUserId").notNull(), // References users.id
    changedAt: timestamp("changedAt").notNull().defaultNow(),
    source: mysqlEnum("source", ["UI", "IMPORT", "ADMIN_BULK"])
      .default("UI")
      .notNull(),
    note: text("note"), // Optional note about the change
    // Snapshot fields for context (optional but helpful)
    districtId: varchar("districtId", { length: 64 }),
    regionId: varchar("regionId", { length: 255 }),
    campusId: int("campusId"),
  },
  table => ({
    // PR 6: Add indexes for common queries
    personIdIdx: index("status_changes_personId_idx").on(table.personId),
    changedByUserIdIdx: index("status_changes_changedByUserId_idx").on(
      table.changedByUserId
    ),
    changedAtIdx: index("status_changes_changedAt_idx").on(table.changedAt),
  })
);

export type StatusChange = typeof statusChanges.$inferSelect;
export type InsertStatusChange = typeof statusChanges.$inferInsert;

/**
 * Import runs table - PR 3: Tracks CSV import operations
 * Records summary statistics and errors for each import
 */
export const importRuns = mysqlTable("import_runs", {
  id: int("id").primaryKey().autoincrement(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  importedByUserId: int("importedByUserId").notNull(), // References users.id
  importedAt: timestamp("importedAt").notNull().defaultNow(),
  createdCount: int("createdCount").default(0).notNull(),
  updatedCount: int("updatedCount").default(0).notNull(),
  skippedCount: int("skippedCount").default(0).notNull(),
  errorCount: int("errorCount").default(0).notNull(),
  summaryJson: text("summaryJson"), // JSON string with detailed summary
});

export type ImportRun = typeof importRuns.$inferSelect;
export type InsertImportRun = typeof importRuns.$inferInsert;

/**
 * Donations table - Tracks Stripe donations toward CMC missionary fund
 * Goal: 100 people × $1,000 = $100,000
 */
export const donations = mysqlTable("donations", {
  id: int("id").primaryKey().autoincrement(),
  stripeSessionId: varchar("stripeSessionId", { length: 255 })
    .notNull()
    .unique(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  amountCents: int("amountCents").notNull(),
  donorName: varchar("donorName", { length: 255 }),
  donorEmail: varchar("donorEmail", { length: 320 }),
  status: mysqlEnum("donationStatus", [
    "pending",
    "completed",
    "failed",
    "refunded",
  ])
    .default("pending")
    .notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  completedAt: timestamp("completedAt"),
});

export type Donation = typeof donations.$inferSelect;
export type InsertDonation = typeof donations.$inferInsert;

/**
 * Messages table - person-to-person messaging within the app
 * Uses senderUserId (users.id) and recipientPersonId (people.personId)
 */
export const messages = mysqlTable(
  "messages",
  {
    id: int("id").primaryKey().autoincrement(),
    senderUserId: int("senderUserId").notNull(), // References users.id
    recipientPersonId: varchar("recipientPersonId", { length: 64 }).notNull(), // References people.personId
    content: text("content").notNull(),
    isRead: boolean("isRead").default(false).notNull(),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  table => ({
    senderUserIdIdx: index("messages_senderUserId_idx").on(table.senderUserId),
    recipientPersonIdIdx: index("messages_recipientPersonId_idx").on(
      table.recipientPersonId
    ),
    isReadIdx: index("messages_isRead_idx").on(table.isRead),
  })
);

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Notifications table - in-app notifications for users
 * Types: need_funded, need_created, message_received, status_changed, system
 */
export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("userId").notNull(), // References users.id
    type: mysqlEnum("notificationType", [
      "need_funded",
      "need_created",
      "message_received",
      "status_changed",
      "system",
    ]).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body"),
    linkUrl: varchar("linkUrl", { length: 512 }), // Optional deep link within app
    isRead: boolean("isRead").default(false).notNull(),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  table => ({
    userIdIdx: index("notifications_userId_idx").on(table.userId),
    isReadIdx: index("notifications_isRead_idx").on(table.isRead),
    typeIdx: index("notifications_type_idx").on(table.type),
  })
);

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Notification settings table - per-user notification preferences
 */
export const notificationSettings = mysqlTable("notification_settings", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull().unique(), // References users.id (one row per user)
  needFunded: boolean("needFunded").default(true).notNull(),
  needCreated: boolean("needCreated").default(true).notNull(),
  messageReceived: boolean("messageReceived").default(true).notNull(),
  statusChanged: boolean("statusChanged").default(true).notNull(),
  systemNotifications: boolean("systemNotifications").default(true).notNull(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});

export type NotificationSetting = typeof notificationSettings.$inferSelect;
export type InsertNotificationSetting =
  typeof notificationSettings.$inferInsert;
