import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("National Staff", () => {
  beforeAll(async () => {
    // Ensure database is initialized
    await db.getDb();
  });

  it("should fetch national staff", async () => {
    const nationalStaff = await db.getNationalStaff();

    // Should return an array (might be empty if no national staff assigned yet)
    expect(Array.isArray(nationalStaff)).toBe(true);

    // If there are national staff, they should have the correct structure
    if (nationalStaff.length > 0) {
      const firstPerson = nationalStaff[0];
      expect(firstPerson).toHaveProperty("personId");
      expect(firstPerson).toHaveProperty("name");
      // National staff are represented as people with no district/region assignment
      expect(firstPerson.primaryDistrictId).toBeNull();
      expect(firstPerson.primaryRegion).toBeNull();
    }
  });

  it("returns only people with no district/region assignment", async () => {
    const nationalStaff = await db.getNationalStaff();

    nationalStaff.forEach(person => {
      expect(person.primaryDistrictId).toBeNull();
      expect(person.primaryRegion).toBeNull();
    });
  });

  it("includes role information when present", async () => {
    const nationalStaff = await db.getNationalStaff();

    // Each person should have either a primaryRole string or null
    nationalStaff.forEach(person => {
      expect(
        person.primaryRole === null || typeof person.primaryRole === "string"
      ).toBe(true);
    });
  });
});
