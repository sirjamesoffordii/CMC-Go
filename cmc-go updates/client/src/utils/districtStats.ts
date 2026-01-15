import { Person } from "../../../drizzle/schema";

export interface DistrictStats {
  yes: number;
  maybe: number;
  no: number;
  notInvited: number;
  total: number;
}

/**
 * Calculate district statistics from a list of people.
 * This ensures consistent stats calculation across tooltips, panels, and map metrics.
 * 
 * @param people - Array of people to calculate stats from
 * @param districtId - District ID to filter by (if null, uses all people)
 * @returns DistrictStats object with counts for each status
 */
export function calculateDistrictStats(
  people: Person[],
  districtId: string | null = null
): DistrictStats {
  // Filter by district if districtId is provided
  const districtPeople = districtId
    ? people.filter(p => p.primaryDistrictId === districtId)
    : people;

  // Calculate stats
  const stats: DistrictStats = {
    yes: 0,
    maybe: 0,
    no: 0,
    notInvited: 0,
    total: districtPeople.length,
  };

  districtPeople.forEach(person => {
    // Handle null/undefined status as "Not Invited"
    const status = person.status || "Not Invited";
    switch (status) {
      case "Yes":
        stats.yes++;
        break;
      case "Maybe":
        stats.maybe++;
        break;
      case "No":
        stats.no++;
        break;
      case "Not Invited":
        stats.notInvited++;
        break;
      default:
        // Unknown status values are counted as "Not Invited" to ensure total matches
        stats.notInvited++;
        break;
    }
  });

  return stats;
}

/**
 * Convert DistrictStats to the format used by DistrictPanel (going/notGoing instead of yes/no)
 */
export interface DistrictPanelStats {
  going: number;
  maybe: number;
  notGoing: number;
  notInvited: number;
}

export function toDistrictPanelStats(stats: DistrictStats): DistrictPanelStats {
  return {
    going: stats.yes,
    maybe: stats.maybe,
    notGoing: stats.no,
    notInvited: stats.notInvited,
  };
}

