/**
 * Shared types and constants for DistrictPanel components
 *
 * This module extracts common types, constants, and utility functions
 * from DistrictPanel.tsx to enable code reuse and improve maintainability.
 */
import type { Person, Campus } from "../../../../drizzle/schema";

// ============================================================================
// Status Mappings
// ============================================================================

/** Maps UI status labels (Figma design) to database status values */
export const statusMap = {
  director: "Yes" as const,
  staff: "Maybe" as const,
  "co-director": "No" as const,
  "not-invited": "Not Invited" as const,
};

/** Reverse mapping: database status to UI status */
export const reverseStatusMap = {
  Yes: "director" as const,
  Maybe: "staff" as const,
  No: "co-director" as const,
  "Not Invited": "not-invited" as const,
};

export type FigmaStatus = keyof typeof statusMap;
export type DbStatus = (typeof statusMap)[FigmaStatus];

// ============================================================================
// Role Constants
// ============================================================================

/** Authoritative role list - single source of truth for all role values */
export const campusRoles = [
  "Campus Director",
  "Campus Co-Director",
  "Campus Staff",
  "Campus Intern",
  "Campus Volunteer",
  "District Staff",
  "District Director",
  "Regional Staff",
  "Regional Director",
  "Field Director",
  "National Staff",
  "National Director",
] as const;

export type CampusRole = (typeof campusRoles)[number];

/**
 * Maps old/invalid roles to authoritative roles.
 * Handles various legacy role formats and normalizes them.
 */
export function mapRoleToAuthoritative(
  role: string | null | undefined
): CampusRole | null {
  if (!role) return null;

  const roleLower = role.toLowerCase().trim();

  // Direct matches
  if (campusRoles.includes(role as CampusRole)) {
    return role as CampusRole;
  }

  // Map old roles to new roles
  const roleMapping: Record<string, CampusRole> = {
    staff: "Campus Staff",
    "campus staff": "Campus Staff",
    "co-director": "Campus Co-Director",
    "campus co-director": "Campus Co-Director",
    "campus codirector": "Campus Co-Director",
    "campus co director": "Campus Co-Director",
    director: "Campus Director",
    "campus director": "Campus Director",
    "district staff": "District Staff",
    "district director": "District Director",
    dd: "District Director",
    "regional staff": "Regional Staff",
    "regional director": "Regional Director",
    "field director": "Field Director",
    "national staff": "National Staff",
    "national director": "National Director",
    volunteer: "Campus Volunteer",
    "campus volunteer": "Campus Volunteer",
    intern: "Campus Intern",
    "campus intern": "Campus Intern",
  };

  // Check for partial matches
  for (const [key, mappedRole] of Object.entries(roleMapping)) {
    if (roleLower.includes(key)) {
      return mappedRole;
    }
  }

  // Default fallback for unrecognized roles
  return "Campus Staff";
}

// ============================================================================
// Form State Types
// ============================================================================

/** Need type options */
export type NeedType =
  | "None"
  | "Financial"
  | "Transportation"
  | "Housing"
  | "Other";

/** Person form state for add/edit dialogs */
export interface PersonFormState {
  name: string;
  role: CampusRole;
  status: FigmaStatus;
  needType: NeedType;
  needAmount: string;
  needDetails: string;
  notes: string;
  spouseAttending: boolean;
  childrenCount: number;
  guestsCount: number;
  childrenAges: string[];
  depositPaid: boolean;
  needsMet: boolean;
  householdId: number | null;
}

/** Default person form state */
export const defaultPersonForm: PersonFormState = {
  name: "",
  role: "Campus Staff",
  status: "not-invited",
  needType: "None",
  needAmount: "",
  needDetails: "",
  notes: "",
  spouseAttending: false,
  childrenCount: 0,
  guestsCount: 0,
  childrenAges: [],
  depositPaid: false,
  needsMet: false,
  householdId: null,
};

/** Campus form state for add/edit dialogs */
export interface CampusFormState {
  name: string;
}

/** Default campus form state */
export const defaultCampusForm: CampusFormState = {
  name: "",
};

// ============================================================================
// Data Types
// ============================================================================

/** Campus with associated people */
export interface CampusWithPeople extends Campus {
  people: Person[];
}

/** Person with needs indicator */
export interface PersonWithNeeds extends Person {
  hasNeeds: boolean;
}

/** Stats object for district metrics */
export interface DistrictStats {
  going: number;
  maybe: number;
  notGoing: number;
  notInvited: number;
}

/** Needs summary for district */
export interface NeedsSummary {
  totalNeeds: number;
  metNeeds: number;
  totalFinancial: number;
  metFinancial: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the last name from a full name string.
 * Returns the last word, or the full name if single word.
 */
export function getLastName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1]! : parts[0]!;
}

/** Status order for sorting people */
export const statusSortOrder: Record<Person["status"], number> = {
  "Not Invited": 0,
  Yes: 1,
  Maybe: 2,
  No: 3,
};

/**
 * Sorts people by status using the standard order:
 * Not Invited → Yes → Maybe → No
 */
export function sortPeopleByStatus(people: Person[]): Person[] {
  return [...people].sort(
    (a, b) => statusSortOrder[a.status] - statusSortOrder[b.status]
  );
}
