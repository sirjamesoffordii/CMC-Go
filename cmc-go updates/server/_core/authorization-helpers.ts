/**
 * Authorization helper functions for mutations
 * PR 2: Enforce editing permissions
 */

import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { 
  canEditCampus, 
  canEditDistrict, 
  canEditRegion, 
  canEditNational 
} from "./authorization";

/**
 * Check if user can edit a person based on their campus/district/region
 */
export async function canEditPerson(user: User, personId: string): Promise<boolean> {
  if (!user || user.approvalStatus !== "ACTIVE") {
    return false;
  }
  
  const person = await db.getPersonByPersonId(personId);
  if (!person) {
    return false;
  }
  
  // If person has a campus, check campus-level permissions
  if (person.primaryCampusId) {
    return canEditCampus(user, person.primaryCampusId);
  }
  
  // If person has a district but no campus, check district-level permissions
  if (person.primaryDistrictId) {
    // Need to verify the district belongs to user's region if they're a district/region director
    if (user.role === "DISTRICT_DIRECTOR" || user.role === "REGION_DIRECTOR" || user.role === "ADMIN") {
      const district = await db.getDistrictById(person.primaryDistrictId);
      if (district) {
        if (user.role === "DISTRICT_DIRECTOR") {
          return user.regionId === district.region;
        }
        if (user.role === "REGION_DIRECTOR" || user.role === "ADMIN") {
          return canEditRegion(user, district.region);
        }
      }
    }
    return canEditDistrict(user, person.primaryDistrictId);
  }
  
  // If person is national-level, check national permissions
  if (person.primaryRegion || person.nationalCategory) {
    return canEditNational(user);
  }
  
  return false;
}

