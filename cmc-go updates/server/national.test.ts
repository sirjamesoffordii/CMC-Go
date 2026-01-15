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
      expect(firstPerson).toHaveProperty("roleTitle");
      expect(firstPerson).toHaveProperty("assignmentType");
      expect(firstPerson.assignmentType).toBe("National");
    }
  });

  it("should return people with National assignment type only", async () => {
    const nationalStaff = await db.getNationalStaff();
    
    // All returned people should have National assignment type
    nationalStaff.forEach(person => {
      expect(person.assignmentType).toBe("National");
    });
  });

  it("should include role titles for national staff", async () => {
    const nationalStaff = await db.getNationalStaff();
    
    // Each person should have either a role title or null
    nationalStaff.forEach(person => {
      expect(person.roleTitle === null || typeof person.roleTitle === "string").toBe(true);
    });
  });
});
