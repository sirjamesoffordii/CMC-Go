/**
 * Authorization helpers for PR 2
 * Implements the editing ladder and viewing rules
 *
 * Password Auth: Added three-tier authorization (scopeLevel, viewLevel, editLevel)
 */

import { TRPCError } from "@trpc/server";
import type { Person, User } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { people } from "../../drizzle/schema";

export type UserRole =
  | "STAFF"
  | "CO_DIRECTOR"
  | "CAMPUS_DIRECTOR"
  | "DISTRICT_DIRECTOR"
  | "DISTRICT_STAFF"
  | "REGION_DIRECTOR"
  | "REGIONAL_STAFF"
  | "NATIONAL_STAFF"
  | "NATIONAL_DIRECTOR"
  | "FIELD_DIRECTOR"
  | "CMC_GO_ADMIN"
  | "ADMIN";

// Phase 3: Authorization level types
export type ScopeLevel = "NATIONAL" | "REGION" | "DISTRICT";
export type ViewLevel = "NATIONAL" | "REGION" | "DISTRICT" | "CAMPUS";
export type EditLevel = "NATIONAL" | "XAN" | "REGION" | "DISTRICT" | "CAMPUS";

// Level ordering for comparisons (lower index = more access)
const VIEW_LEVEL_ORDER: ViewLevel[] = [
  "NATIONAL",
  "REGION",
  "DISTRICT",
  "CAMPUS",
];
const EDIT_LEVEL_ORDER: EditLevel[] = [
  "NATIONAL",
  "XAN",
  "REGION",
  "DISTRICT",
  "CAMPUS",
];

// XAN roles - National Team members
const XAN_ROLES = [
  "NATIONAL_STAFF",
  "NATIONAL_DIRECTOR",
  "FIELD_DIRECTOR",
  "REGION_DIRECTOR",
  "REGIONAL_STAFF",
  "CMC_GO_ADMIN",
];

/**
 * Check if a person is a XAN panel member (National Team)
 */
export function isXanMember(person: {
  primaryRole?: string | null;
  primaryDistrictId?: string | null;
}): boolean {
  if (person.primaryDistrictId === "XAN") return true;
  if (person.primaryRole && XAN_ROLES.includes(person.primaryRole)) return true;
  return false;
}

/**
 * Check if a user is a National Team member
 */
export function isNationalTeamMember(user: User | null | undefined): boolean {
  if (!user) return false;
  return XAN_ROLES.includes(user.role);
}

/**
 * Check if user's view level grants access to view a person
 */
export function canViewAtLevel(
  userViewLevel: ViewLevel,
  targetLevel: ViewLevel
): boolean {
  const userIdx = VIEW_LEVEL_ORDER.indexOf(userViewLevel);
  const targetIdx = VIEW_LEVEL_ORDER.indexOf(targetLevel);
  return userIdx <= targetIdx;
}

/**
 * Check if user's edit level grants access to edit a person
 */
export function canEditAtLevel(
  userEditLevel: EditLevel,
  targetLevel: EditLevel
): boolean {
  const userIdx = EDIT_LEVEL_ORDER.indexOf(userEditLevel);
  const targetIdx = EDIT_LEVEL_ORDER.indexOf(targetLevel);
  return userIdx <= targetIdx;
}

/**
 * Determine what level a person is at based on their location
 */
export function getPersonLevel(person: {
  primaryCampusId?: number | null;
  primaryDistrictId?: string | null;
  primaryRegion?: string | null;
}): ViewLevel {
  if (person.primaryCampusId != null) return "CAMPUS";
  if (person.primaryDistrictId) return "DISTRICT";
  if (person.primaryRegion) return "REGION";
  return "NATIONAL";
}

/**
 * Check if user can VIEW a person based on viewLevel authorization
 */
export function canViewPerson(
  user: User | null | undefined,
  person: {
    primaryCampusId?: number | null;
    primaryDistrictId?: string | null;
    primaryRegion?: string | null;
    primaryRole?: string | null;
  }
): boolean {
  if (!user) return false;

  // XAN member special rule: Only National Team members can view XAN member info
  if (isXanMember(person)) {
    return isNationalTeamMember(user);
  }

  const userViewLevel = (user as any).viewLevel || "CAMPUS";

  // NATIONAL view level can see everyone
  if (userViewLevel === "NATIONAL") return true;

  // REGION view level: user can see people in their region
  if (userViewLevel === "REGION") {
    const userRegion = (user as any).overseeRegionId || user.regionId;
    return person.primaryRegion === userRegion;
  }

  // DISTRICT view level: user can see people in their district
  if (userViewLevel === "DISTRICT") {
    return person.primaryDistrictId === user.districtId;
  }

  // CAMPUS view level: user can see people in their campus
  if (userViewLevel === "CAMPUS") {
    return person.primaryCampusId === user.campusId;
  }

  return false;
}

/**
 * Check if user can EDIT a person based on editLevel authorization
 */
export function canEditPerson(
  user: User | null | undefined,
  person: {
    primaryCampusId?: number | null;
    primaryDistrictId?: string | null;
    primaryRegion?: string | null;
    primaryRole?: string | null;
  }
): boolean {
  if (!user) return false;

  // National Team members can always edit XAN members
  if (isNationalTeamMember(user) && isXanMember(person)) {
    return true;
  }

  const userEditLevel = (user as any).editLevel || "CAMPUS";

  // NATIONAL edit level can edit everyone
  if (userEditLevel === "NATIONAL") return true;

  // XAN edit level: can ONLY edit XAN members (handled above), nothing else
  if (userEditLevel === "XAN") {
    return false;
  }

  // REGION edit level: user can edit people in their region
  if (userEditLevel === "REGION") {
    const userRegion = (user as any).overseeRegionId || user.regionId;
    return person.primaryRegion === userRegion;
  }

  // DISTRICT edit level: user can edit people in their district
  if (userEditLevel === "DISTRICT") {
    return person.primaryDistrictId === user.districtId;
  }

  // CAMPUS edit level: user can edit people in their campus
  if (userEditLevel === "CAMPUS") {
    return person.primaryCampusId === user.campusId;
  }

  return false;
}

/**
 * Check if a role is a leader role (CO_DIRECTOR+)
 */
export function isLeaderRole(role: UserRole): boolean {
  return [
    "CO_DIRECTOR",
    "CAMPUS_DIRECTOR",
    "DISTRICT_DIRECTOR",
    "REGION_DIRECTOR",
    "ADMIN",
  ].includes(role);
}

/**
 * Check if user can edit a specific campus
 * - STAFF, CO_DIRECTOR: can edit ONLY their campus
 * - CAMPUS_DIRECTOR: can edit entire district (including other campuses)
 * - DISTRICT_DIRECTOR (ACTIVE): can edit entire region
 * - REGION_DIRECTOR (ACTIVE): can edit nationally
 * - ADMIN: can edit nationally
 */
export function canEditCampus(user: User, campusId: number): boolean {
  if (!user || user.approvalStatus !== "ACTIVE") {
    return false;
  }

  // STAFF and CO_DIRECTOR can only edit their own campus
  if (user.role === "STAFF" || user.role === "CO_DIRECTOR") {
    return user.campusId === campusId;
  }

  // CAMPUS_DIRECTOR can edit any campus in their district
  if (user.role === "CAMPUS_DIRECTOR") {
    // We need to check if the campus belongs to the user's district
    // This will be checked server-side by looking up the campus
    return true; // Will be validated with district lookup
  }

  // DISTRICT_DIRECTOR (ACTIVE) can edit any campus in their region
  if (user.role === "DISTRICT_DIRECTOR") {
    return true; // Will be validated with region lookup
  }

  // REGION_DIRECTOR (ACTIVE) and ADMIN can edit any campus
  if (user.role === "REGION_DIRECTOR" || user.role === "ADMIN") {
    return true;
  }

  return false;
}

/**
 * Check if user can edit a specific district
 */
export function canEditDistrict(user: User, districtId: string): boolean {
  if (!user || user.approvalStatus !== "ACTIVE") {
    return false;
  }

  // STAFF and CO_DIRECTOR cannot edit at district level
  if (user.role === "STAFF" || user.role === "CO_DIRECTOR") {
    return false;
  }

  // CAMPUS_DIRECTOR can edit their district
  if (user.role === "CAMPUS_DIRECTOR") {
    return user.districtId === districtId;
  }

  // DISTRICT_DIRECTOR (ACTIVE) can edit any district in their region
  if (user.role === "DISTRICT_DIRECTOR") {
    return true; // Will be validated with region lookup
  }

  // REGION_DIRECTOR (ACTIVE) and ADMIN can edit any district
  if (user.role === "REGION_DIRECTOR" || user.role === "ADMIN") {
    return true;
  }

  return false;
}

/**
 * Check if user can edit a specific region
 */
export function canEditRegion(user: User, regionId: string): boolean {
  if (!user || user.approvalStatus !== "ACTIVE") {
    return false;
  }

  // Only DISTRICT_DIRECTOR (ACTIVE), REGION_DIRECTOR (ACTIVE), and ADMIN can edit regions
  if (user.role === "DISTRICT_DIRECTOR") {
    return user.regionId === regionId;
  }

  if (user.role === "REGION_DIRECTOR" || user.role === "ADMIN") {
    return true;
  }

  return false;
}

/**
 * Check if user can edit nationally
 */
export function canEditNational(user: User): boolean {
  if (!user || user.approvalStatus !== "ACTIVE") {
    return false;
  }

  // Only REGION_DIRECTOR (ACTIVE) and ADMIN can edit nationally
  return user.role === "REGION_DIRECTOR" || user.role === "ADMIN";
}

/**
 * Check if approver can approve a District Director
 * Approver must be ACTIVE REGION_DIRECTOR in same region
 */
export function canApproveDistrictDirector(
  approverUser: User,
  targetUser: User
): boolean {
  if (!approverUser || approverUser.approvalStatus !== "ACTIVE") {
    return false;
  }

  if (approverUser.role !== "REGION_DIRECTOR") {
    return false;
  }

  if (targetUser.role !== "DISTRICT_DIRECTOR") {
    return false;
  }

  // Must be in same region
  return approverUser.regionId === targetUser.regionId;
}

/**
 * Check if approver can approve a Region Director
 * Approver must be ADMIN
 */
export function canApproveRegionDirector(
  approverUser: User,
  targetUser: User
): boolean {
  if (!approverUser || approverUser.approvalStatus !== "ACTIVE") {
    return false;
  }

  if (approverUser.role !== "ADMIN") {
    return false;
  }

  return targetUser.role === "REGION_DIRECTOR";
}

/**
 * Check if user can view invite notes for a person
 * Based on editing scope - if they can edit the person's campus/district/region, they can view notes
 */
export function canViewInviteNotes(
  user: User,
  personDistrictId: string | null,
  personCampusId: number | null,
  personRegion: string | null
): boolean {
  if (!user || !isLeaderRole(user.role)) {
    return false; // Only leaders can view invite notes
  }

  if (user.approvalStatus !== "ACTIVE") {
    return false; // Must be active
  }

  // ADMIN can view all
  if (user.role === "ADMIN") {
    return true;
  }

  // REGION_DIRECTOR (ACTIVE) can view nationally
  if (user.role === "REGION_DIRECTOR") {
    return true;
  }

  // DISTRICT_DIRECTOR (ACTIVE) can view in their region
  if (user.role === "DISTRICT_DIRECTOR") {
    return personRegion === user.regionId;
  }

  // CAMPUS_DIRECTOR can view in their district
  if (user.role === "CAMPUS_DIRECTOR") {
    return personDistrictId === user.districtId;
  }

  // CO_DIRECTOR can view in their campus
  if (user.role === "CO_DIRECTOR") {
    return personCampusId === user.campusId;
  }

  return false;
}

/**
 * Check if user can view a need based on visibility
 */
export function canViewNeed(
  user: User | null,
  needVisibility: "LEADERSHIP_ONLY" | "DISTRICT_VISIBLE",
  personDistrictId: string | null
): boolean {
  // Public users cannot view needs
  if (!user) {
    return false;
  }

  // DISTRICT_VISIBLE: visible to any authenticated user in same district
  if (needVisibility === "DISTRICT_VISIBLE") {
    return user.districtId === personDistrictId;
  }

  // LEADERSHIP_ONLY: visible only to leaders in editing scope
  if (needVisibility === "LEADERSHIP_ONLY") {
    if (!isLeaderRole(user.role) || user.approvalStatus !== "ACTIVE") {
      return false;
    }
    // Use same logic as invite notes viewing
    return canViewInviteNotes(user, personDistrictId, null, null);
  }

  return false;
}

/**
 * People scope type for server-side visibility enforcement
 */
export type PeopleScope =
  | { level: "CAMPUS"; campusId: number }
  | { level: "DISTRICT"; districtId: string }
  | { level: "REGION"; regionId: string }
  | { level: "ALL" };

function normalizeRole(role: string) {
  const normalized = role
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  // Campus-level roles - all normalize to appropriate campus scope role
  if (normalized === "CAMPUS_CO_DIRECTOR") return "CO_DIRECTOR";
  if (normalized === "CAMPUS_VOLUNTEER" || normalized === "CAMPUS_INTERN")
    return "STAFF";

  // District-level roles
  if (normalized === "DISTRICT_STAFF") return "DISTRICT_DIRECTOR";

  // Regional-level roles - Regional Staff gets full access
  if (normalized === "REGIONAL_STAFF") return "REGION_DIRECTOR";

  return normalized;
}

const FULL_ACCESS = new Set([
  "NATIONAL_DIRECTOR",
  "NATIONAL_STAFF",
  "REGIONAL_DIRECTOR",
  "REGION_DIRECTOR",
  "FIELD_DIRECTOR",
  "CMC_GO_ADMIN",
  "ADMIN",
]);

const CAMPUS_SCOPED_ROLES = new Set(["STAFF", "CO_DIRECTOR"]);

/**
 * Get people scope for a user based on their role and assignments
 * Determines what people data the user can access
 */
export function getPeopleScope(user: {
  role: string;
  campusId?: number | null;
  districtId?: string | null;
  regionId?: string | null;
}): PeopleScope {
  const role = normalizeRole(user.role);

  if (FULL_ACCESS.has(role)) return { level: "ALL" };

  if (role === "DISTRICT_DIRECTOR") {
    if (!user.regionId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Access denied: missing regionId",
      });
    }
    return { level: "REGION", regionId: user.regionId };
  }

  if (role === "CAMPUS_DIRECTOR") {
    if (!user.districtId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Access denied: missing districtId",
      });
    }
    return { level: "DISTRICT", districtId: user.districtId };
  }

  if (CAMPUS_SCOPED_ROLES.has(role)) {
    if (user.campusId != null)
      return { level: "CAMPUS", campusId: user.campusId };

    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Access denied: missing campusId",
    });
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Access denied: role not permitted",
  });
}

export type PersonAnchors = Pick<
  Person,
  "primaryCampusId" | "primaryDistrictId" | "primaryRegion"
>;

export type UserScopeAnchors = Pick<
  User,
  "role" | "campusId" | "districtId" | "regionId"
>;

/**
 * Check if the given user can access the given person based on the user's people-scope.
 * Uses the person's primary anchors (campus/district/region) for scope comparison.
 */
export function canAccessPerson(
  user: UserScopeAnchors,
  person: PersonAnchors
): boolean {
  const scope = getPeopleScope(user);

  if (scope.level === "ALL") return true;
  if (scope.level === "REGION") return person.primaryRegion === scope.regionId;
  if (scope.level === "DISTRICT")
    return person.primaryDistrictId === scope.districtId;
  return person.primaryCampusId === scope.campusId;
}

/**
 * Drizzle `where` clause that scopes `people` rows to the current user's visibility.
 * Intended for DB-level filtering.
 */
export function peopleScopeWhereClause(user: UserScopeAnchors) {
  const scope = getPeopleScope(user);

  if (scope.level === "ALL") return sql`1=1`;
  if (scope.level === "REGION") return eq(people.primaryRegion, scope.regionId);
  if (scope.level === "DISTRICT")
    return eq(people.primaryDistrictId, scope.districtId);
  return eq(people.primaryCampusId, scope.campusId);
}
