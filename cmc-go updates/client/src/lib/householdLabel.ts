/**
 * Derives a household label from a person's full name.
 * 
 * Rules:
 * - Split the trimmed name by spaces (collapsing multiple spaces)
 * - Use the LAST token as the last name
 * - If there is only one token, use that token as the last name
 * - Format as "<LastName> Household"
 * 
 * @param fullName - The person's full name (e.g., "John Offord", "Mary Jane Smith")
 * @returns The household label (e.g., "Offord Household", "Smith Household")
 * 
 * @example
 * deriveHouseholdLabel("John Offord") // "Offord Household"
 * deriveHouseholdLabel("Mary Jane Smith") // "Smith Household"
 * deriveHouseholdLabel("Madonna") // "Madonna Household"
 * deriveHouseholdLabel("  John   Doe  ") // "Doe Household"
 */
export function deriveHouseholdLabel(fullName: string): string {
  // Trim and collapse multiple spaces into single spaces
  const trimmed = fullName.trim().replace(/\s+/g, ' ');
  
  // If empty after trimming, return empty string (caller should handle validation)
  if (!trimmed) {
    return '';
  }
  
  // Split by spaces and get the last token
  const tokens = trimmed.split(' ');
  const lastName = tokens[tokens.length - 1];
  
  // Format as "<LastName> Household"
  return `${lastName} Household`;
}

