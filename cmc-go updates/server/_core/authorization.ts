/**
 * Authorization helpers for PR 2
 * Implements the editing ladder and viewing rules
 */

import type { User } from "../../drizzle/schema";

export type UserRole = "STAFF" | "CO_DIRECTOR" | "CAMPUS_DIRECTOR" | "DISTRICT_DIRECTOR" | "REGION_DIRECTOR" | "ADMIN";

/**
 * Check if a role is a leader role (CO_DIRECTOR+)
 */
export function isLeaderRole(role: UserRole): boolean {
  return ["CO_DIRECTOR", "CAMPUS_DIRECTOR", "DISTRICT_DIRECTOR", "REGION_DIRECTOR", "ADMIN"].includes(role);
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
export function canApproveDistrictDirector(approverUser: User, targetUser: User): boolean {
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
export function canApproveRegionDirector(approverUser: User, targetUser: User): boolean {
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
export function canViewInviteNotes(user: User, personDistrictId: string | null, personCampusId: number | null, personRegion: string | null): boolean {
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
export function canViewNeed(user: User | null, needVisibility: "LEADERSHIP_ONLY" | "DISTRICT_VISIBLE", personDistrictId: string | null): boolean {
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

