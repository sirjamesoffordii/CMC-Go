/**
 * Client-side scope checking utilities.
 *
 * Uses the user's 3-tier authorization levels (scopeLevel, viewLevel, editLevel)
 * stored in the DB and returned by auth.me.
 *
 * Scope:      Geographic area shown on the map. All names visible, but NO details
 *             (roles, needs, tooltip notes, status colors — icons appear grey).
 * Detail View: Which people's personal info the user can see (roles, needs, tooltip, status colors).
 * Edit:       Which people's info the user can modify.
 */

import { resolvePersonRegion } from "../../../shared/const";

export type PeopleScope =
  | { level: "CAMPUS"; campusId: number }
  | { level: "DISTRICT"; districtId: string }
  | { level: "REGION"; regionId: string }
  | { level: "ALL" };

export type EditScope =
  | { level: "CAMPUS"; campusId: number }
  | { level: "DISTRICT"; districtId: string }
  | { level: "REGION"; regionId: string }
  | { level: "ALL" }
  | { level: "XAN" };

interface User {
  role: string;
  campusId?: number | null;
  districtId?: string | null;
  regionId?: string | null;
  overseeRegionId?: string | null;
  scopeLevel?: string | null;
  viewLevel?: string | null;
  editLevel?: string | null;
}

// ────────────────────────────────────────────────────────
// Default level fallbacks (mirrors server getDefaultAuthorization)
// Used only when DB-stored levels are missing.
// ────────────────────────────────────────────────────────

function getDefaultScopeLevel(role: string): string {
  switch (role) {
    case "NATIONAL_DIRECTOR":
    case "FIELD_DIRECTOR":
    case "CMC_GO_ADMIN":
    case "ADMIN":
    case "NATIONAL_STAFF":
    case "REGION_DIRECTOR":
    case "REGIONAL_STAFF":
      return "NATIONAL";
    default:
      // DISTRICT_DIRECTOR, DISTRICT_STAFF, CAMPUS_DIRECTOR, CO_DIRECTOR,
      // CAMPUS_INTERN, CAMPUS_VOLUNTEER, STAFF
      return "REGION";
  }
}

function getDefaultViewLevel(role: string): string {
  switch (role) {
    case "NATIONAL_DIRECTOR":
    case "FIELD_DIRECTOR":
    case "CMC_GO_ADMIN":
    case "ADMIN":
    case "NATIONAL_STAFF":
    case "REGION_DIRECTOR":
    case "REGIONAL_STAFF":
      return "NATIONAL";
    case "DISTRICT_DIRECTOR":
    case "DISTRICT_STAFF":
      return "REGION";
    case "CAMPUS_DIRECTOR":
    case "CO_DIRECTOR":
      return "DISTRICT";
    default:
      // STAFF, CAMPUS_INTERN, CAMPUS_VOLUNTEER
      return "CAMPUS";
  }
}

function getDefaultEditLevel(role: string): string {
  switch (role) {
    case "NATIONAL_DIRECTOR":
    case "FIELD_DIRECTOR":
    case "CMC_GO_ADMIN":
    case "ADMIN":
      return "NATIONAL";
    case "NATIONAL_STAFF":
      return "XAN";
    case "REGION_DIRECTOR":
    case "REGIONAL_STAFF":
      return "REGION";
    case "DISTRICT_DIRECTOR":
    case "DISTRICT_STAFF":
      return "DISTRICT";
    default:
      // CAMPUS_DIRECTOR, CO_DIRECTOR, STAFF, CAMPUS_INTERN, CAMPUS_VOLUNTEER
      return "CAMPUS";
  }
}

// ────────────────────────────────────────────────────────
// Effective region for a user (overseeRegionId takes priority)
// ────────────────────────────────────────────────────────

function getUserRegion(user: User): string | null {
  return user.overseeRegionId || user.regionId || null;
}

// ────────────────────────────────────────────────────────
// Scope resolvers (level string → PeopleScope / EditScope)
// ────────────────────────────────────────────────────────

function resolveScope(level: string, user: User): PeopleScope | null {
  if (level === "NATIONAL") return { level: "ALL" };

  if (level === "REGION") {
    const regionId = getUserRegion(user);
    if (regionId) return { level: "REGION", regionId };
    // fail-closed fallback
    if (user.districtId)
      return { level: "DISTRICT", districtId: user.districtId };
    if (user.campusId) return { level: "CAMPUS", campusId: user.campusId };
    return null;
  }

  if (level === "DISTRICT") {
    if (user.districtId)
      return { level: "DISTRICT", districtId: user.districtId };
    if (user.campusId) return { level: "CAMPUS", campusId: user.campusId };
    return null;
  }

  if (level === "CAMPUS") {
    if (user.campusId) return { level: "CAMPUS", campusId: user.campusId };
    return null;
  }

  return null;
}

function resolveEditScope(level: string, user: User): EditScope | null {
  if (level === "NATIONAL") return { level: "ALL" };
  if (level === "XAN") return { level: "XAN" };
  return resolveScope(level, user) as EditScope | null;
}

// ────────────────────────────────────────────────────────
// Public API — Scope (geographic area on map)
// ────────────────────────────────────────────────────────

/**
 * Determine the people scope for a user based on their scopeLevel (DB field).
 * Scope = geographic area shown on the map. Names visible but no details.
 * Falls back to role-based defaults when scopeLevel is not set.
 */
export function getPeopleScope(
  user: User | null | undefined,
): PeopleScope | null {
  if (!user) return null;
  const level = user.scopeLevel || getDefaultScopeLevel(user.role);
  return resolveScope(level, user);
}

// ────────────────────────────────────────────────────────
// Public API — View scope (detail view)
// ────────────────────────────────────────────────────────

/**
 * Returns the user's view scope (determines which people's details are visible).
 * Detail View = roles, needs, tooltip notes, status colors.
 */
export function getViewScope(
  user: User | null | undefined,
): PeopleScope | null {
  if (!user) return null;
  const level = user.viewLevel || getDefaultViewLevel(user.role);
  return resolveScope(level, user);
}

// ────────────────────────────────────────────────────────
// Public API — Edit scope
// ────────────────────────────────────────────────────────

/**
 * Returns the user's edit scope (determines which people can be edited).
 */
export function getEditScope(
  user: User | null | undefined,
): EditScope | null {
  if (!user) return null;
  const level = user.editLevel || getDefaultEditLevel(user.role);
  return resolveEditScope(level, user);
}

// ────────────────────────────────────────────────────────
// Per-entity scope checks
// ────────────────────────────────────────────────────────

/** Check if a person falls within a scope/editScope. */
function isInScope(
  scope: PeopleScope | EditScope,
  person: {
    primaryCampusId?: number | null;
    primaryDistrictId?: string | null;
    primaryRegion?: string | null;
  },
): boolean {
  if (scope.level === "ALL") return true;
  if (scope.level === "REGION")
    return resolvePersonRegion(person) === scope.regionId;
  if (scope.level === "DISTRICT")
    return person.primaryDistrictId === scope.districtId;
  if (scope.level === "CAMPUS")
    return person.primaryCampusId === scope.campusId;
  return false;
}

/**
 * Can the user see the details (role, status color, needs, tooltip) for this person?
 * Based on viewLevel.
 */
export function canViewPersonDetails(
  user: User | null | undefined,
  person: {
    primaryCampusId?: number | null;
    primaryDistrictId?: string | null;
    primaryRegion?: string | null;
  },
): boolean {
  const viewScope = getViewScope(user);
  if (!viewScope) return false;
  return isInScope(viewScope, person);
}

/**
 * Can the user edit this person's info?
 * Based on editLevel. XAN edit = can only edit XAN members.
 */
export function canEditPersonClient(
  user: User | null | undefined,
  person: {
    primaryCampusId?: number | null;
    primaryDistrictId?: string | null;
    primaryRegion?: string | null;
  },
): boolean {
  const editScope = getEditScope(user);
  if (!editScope) return false;

  if (editScope.level === "XAN") {
    // XAN edit scope: can only edit XAN panel members
    return person.primaryDistrictId === "XAN";
  }

  return isInScope(editScope, person);
}

// ────────────────────────────────────────────────────────
// District / Campus in-scope checks (for map & panel gating)
// ────────────────────────────────────────────────────────

/**
 * Check if a district is within the user's geographic scope.
 * Campus staff (CAMPUS scope) can still view their own district.
 */
export function isDistrictInScope(
  districtId: string,
  user: User | null | undefined,
  districtRegion?: string | null,
): boolean {
  const scope = getPeopleScope(user);
  if (!scope) return false;
  if (scope.level === "ALL") return true;
  if (scope.level === "REGION") return scope.regionId === districtRegion;
  if (scope.level === "DISTRICT") return scope.districtId === districtId;
  // CAMPUS scope: allow viewing own district (we still show names, just mask details)
  if (scope.level === "CAMPUS") return user?.districtId === districtId;
  return false;
}

/**
 * Check if a campus is within the user's geographic scope.
 */
export function isCampusInScope(
  campusId: number,
  campusDistrictId: string | null,
  user: User | null | undefined,
  districtRegion?: string | null,
): boolean {
  const scope = getPeopleScope(user);
  if (!scope) return false;
  if (scope.level === "ALL") return true;
  if (scope.level === "REGION") return scope.regionId === districtRegion;
  if (scope.level === "DISTRICT") return scope.districtId === campusDistrictId;
  if (scope.level === "CAMPUS") return scope.campusId === campusId;
  return false;
}

// ────────────────────────────────────────────────────────
// Edit-level helpers (district / person)
// ────────────────────────────────────────────────────────

/**
 * Whether the current user can edit a district in the given region.
 * Used for district-level operations (add/remove campus, rename district, etc.).
 */
export function canEditDistrictInRegion(
  user: User | null | undefined,
  districtRegion: string | null | undefined,
): boolean {
  if (!user || !districtRegion) return false;
  const editScope = getEditScope(user);
  if (!editScope) return false;
  if (editScope.level === "ALL") return true;
  if (editScope.level === "REGION")
    return editScope.regionId === districtRegion;
  if (editScope.level === "DISTRICT") {
    // District-level editors can edit within their own district
    // (server validates the specific district)
    return true;
  }
  // CAMPUS and XAN cannot edit at district level
  return false;
}

/**
 * Whether the current user can edit a person (quick region-level check).
 * Used for per-person edit gating. Server enforces the final check.
 */
export function canEditPersonByRegion(
  user: User | null | undefined,
  personPrimaryRegion: string | null | undefined,
): boolean {
  if (!user) return false;
  const editScope = getEditScope(user);
  if (!editScope) return false;
  if (editScope.level === "ALL") return true;
  if (editScope.level === "XAN") return false;
  if (editScope.level === "REGION") {
    return editScope.regionId === (personPrimaryRegion ?? null);
  }
  // DISTRICT and CAMPUS: server enforces the fine-grained check
  return true;
}
