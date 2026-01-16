import { Person } from "../../../drizzle/schema";
import { Household } from "../../../drizzle/schema";

/**
 * Calculate household-aggregated totals for children and guests.
 * Prevents double-counting for married staff who share a household.
 * 
 * @param people - Array of people to aggregate
 * @param households - Array of all households (to get counts)
 * @returns Object with families count, children total, and guests total
 */
export function calculateHouseholdTotals(people: Person[], households: Household[] = []) {
  // Track unique households we've counted
  const countedHouseholdIds = new Set<number>();
  
  // Track solo people (no household) for fallback counts
  const soloChildren = new Map<string, number>();
  const soloGuests = new Map<string, number>();
  
  // Process each person
  people.forEach(person => {
    if (person.householdId) {
      // Person is in a household - mark household for counting
      countedHouseholdIds.add(person.householdId);
    } else {
      // Solo person - use fallback counts (new fields or legacy)
      const childrenCount = person.childrenCount ?? (person.kids ? parseInt(person.kids, 10) || 0 : 0);
      const guestsCount = person.guestsCount ?? (person.guests ? parseInt(person.guests, 10) || 0 : 0);
      
      if (childrenCount > 0) {
        soloChildren.set(person.personId, childrenCount);
      }
      if (guestsCount > 0) {
        soloGuests.set(person.personId, guestsCount);
      }
    }
  });
  
  // Sum unique households (each household counted once)
  let householdChildrenTotal = 0;
  let householdGuestsTotal = 0;
  
  countedHouseholdIds.forEach(householdId => {
    const household = households.find(h => h.id === householdId);
    if (household) {
      householdChildrenTotal += household.childrenCount || 0;
      householdGuestsTotal += household.guestsCount || 0;
    }
  });
  
  // Sum solo people
  const soloChildrenTotal = Array.from(soloChildren.values())
    .reduce((sum, count) => sum + count, 0);
  const soloGuestsTotal = Array.from(soloGuests.values())
    .reduce((sum, count) => sum + count, 0);
  
  // Total families = unique households + solo people with counts
  const families = countedHouseholdIds.size + (soloChildren.size > 0 || soloGuests.size > 0 ? 1 : 0);
  
  return {
    families,
    children: householdChildrenTotal + soloChildrenTotal,
    guests: householdGuestsTotal + soloGuestsTotal,
  };
}

