/**
 * Client-side scope checking utilities.
 * Mirrors server-side getPeopleScope logic for determining if a user can view a district/campus.
 */

export type PeopleScope =
  | { level: "CAMPUS"; campusId: number }
  | { level: "DISTRICT"; districtId: string }
  | { level: "REGION"; regionId: string }
  | { level: "ALL" };

interface User {
  role: string;
  campusId?: number | null;
  districtId?: string | null;
  regionId?: string | null;
}

/**
 * Normalize role names to handle legacy/alternate naming conventions.
 */
function normalizeRole(role: string): string {
  // Campus-level roles - all normalize to appropriate campus scope role
  if (role === "CAMPUS_CO_DIRECTOR" || role === "CO_DIRECTOR")
    return "CAMPUS_DIRECTOR";
  if (role === "CAMPUS_VOLUNTEER" || role === "CAMPUS_INTERN") return "STAFF";

  // District-level roles
  if (role === "DISTRICT_STAFF") return "DISTRICT_DIRECTOR";

  // Regional-level roles - Regional Staff gets full access
  if (role === "REGIONAL_STAFF") return "REGIONAL_DIRECTOR";

  // Handle national-level roles that map to REGION_DIRECTOR or ADMIN
  if (
    role === "NATIONAL_DIRECTOR" ||
    role === "REGIONAL_DIRECTOR" ||
    role === "FIELD_DIRECTOR"
  )
    return "REGION_DIRECTOR";
  if (role === "NATIONAL_STAFF" || role === "CMC_GO_ADMIN") return "ADMIN";

  return role;
}

/**
 * Determine the people viewing scope for a user based on their role and location.
 * Returns the appropriate scope level (CAMPUS, DISTRICT, REGION, or ALL).
 * Returns null if scope cannot be determined (user has no access).
 */
export function getPeopleScope(
  user: User | null | undefined
): PeopleScope | null {
  // Logged out users have NO people scope. Public UI must use aggregate endpoints.
  if (!user) return null;

  const role = normalizeRole(user.role);

  // Full access - REGION_DIRECTOR and ADMIN can see all people
  if (role === "REGION_DIRECTOR" || role === "ADMIN") {
    return { level: "ALL" };
  }

  // Region access - DISTRICT_DIRECTOR can see their region
  if (role === "DISTRICT_DIRECTOR") {
    if (user.regionId) return { level: "REGION", regionId: user.regionId };
    // fail-closed fallback (tightest we can)
    if (user.districtId)
      return { level: "DISTRICT", districtId: user.districtId };
    if (user.campusId) return { level: "CAMPUS", campusId: user.campusId };
    return null; // No scope identifiers
  }

  // District access - CAMPUS_DIRECTOR can see their district
  if (role === "CAMPUS_DIRECTOR") {
    if (user.districtId)
      return { level: "DISTRICT", districtId: user.districtId };
    if (user.campusId) return { level: "CAMPUS", campusId: user.campusId };
    return null; // No scope identifiers
  }

  // Campus access - STAFF and CO_DIRECTOR can only see their campus
  if (role === "STAFF" || role === "CO_DIRECTOR") {
    if (user.campusId) return { level: "CAMPUS", campusId: user.campusId };
    return null; // No campusId
  }

  // Default fallback - try campus first
  if (user.campusId) return { level: "CAMPUS", campusId: user.campusId };
  return null; // No access
}

/**
 * Check if a district is within the user's scope.
 */
export function isDistrictInScope(
  districtId: string,
  user: User | null | undefined,
  districtRegion?: string | null
): boolean {
  const scope = getPeopleScope(user);
  if (!scope) return false;
  if (scope.level === "ALL") return true;
  if (scope.level === "DISTRICT") return scope.districtId === districtId;
  if (scope.level === "REGION") return scope.regionId === districtRegion;
  return false;
}

/**
 * Check if a campus is within the user's scope.
 */
export function isCampusInScope(
  campusId: number,
  campusDistrictId: string | null,
  user: User | null | undefined,
  districtRegion?: string | null
): boolean {
  const scope = getPeopleScope(user);
  if (!scope) return false;
  if (scope.level === "ALL") return true;
  if (scope.level === "CAMPUS") return scope.campusId === campusId;
  if (scope.level === "DISTRICT") return scope.districtId === campusDistrictId;
  if (scope.level === "REGION") return scope.regionId === districtRegion;
  return false;
}
