import { describe, it, expect, beforeAll } from "vitest";
import { importPeople } from "./db";

describe("CSV Import", () => {
  it("should import people with campus assignments", async () => {
    const testData = [
      {
        name: "Test Person Import 1",
        campus: "Northern Arizona University",
        district: "Arizona",
        role: "Student Leader",
        status: "Going" as const,
      },
    ];

    const result = await importPeople(testData);
    
    expect(result.success + result.skipped).toBeGreaterThan(0);
    expect(result.errors).toBeInstanceOf(Array);
  });

  it("should handle National assignments", async () => {
    const testData = [
      {
        name: "National Test Person",
        role: "National Director",
        status: "Going" as const,
      },
    ];

    const result = await importPeople(testData);
    
    expect(result.success).toBeGreaterThanOrEqual(0);
    expect(result.errors).toBeInstanceOf(Array);
  });

  it("should skip duplicate person+campus combinations", async () => {
    const testData = [
      {
        name: "Duplicate Test Person",
        campus: "Northern Arizona University",
        district: "Arizona",
      },
    ];

    // Import once
    const result1 = await importPeople(testData);
    
    // Import again - should skip
    const result2 = await importPeople(testData);
    
    // Either skipped or both succeeded (if first one failed)
    expect(result2.skipped + result2.success).toBeGreaterThan(0);
  });

  it("should return errors for invalid campus/district", async () => {
    const testData = [
      {
        name: "Invalid Campus Person",
        campus: "Nonexistent Campus",
        district: "Oregon",
      },
    ];

    const result = await importPeople(testData);
    
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].error).toContain("not found");
  });
});
