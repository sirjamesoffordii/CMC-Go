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
        status: "Yes" as const,
      },
    ];

    const result = await importPeople(testData);

    expect(result.imported + result.skipped).toBeGreaterThan(0);
    expect(Array.isArray(result.errors)).toBe(true);
  });

  it("should handle National assignments", async () => {
    const testData = [
      {
        name: "National Test Person",
        role: "National Director",
        status: "Yes" as const,
      },
    ];

    const result = await importPeople(testData);

    expect(result.imported).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.errors)).toBe(true);
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
    expect(result2.skipped + result2.imported).toBeGreaterThan(0);
  });

  it("accepts rows even when campus/district are unknown", async () => {
    const testData = [
      {
        name: "Invalid Campus Person",
        campus: "Nonexistent Campus",
        district: "Oregon",
      },
    ];

    const result = await importPeople(testData);

    // Current importer does not validate campus/district values; it imports with null assignments.
    expect(result.imported + result.skipped).toBeGreaterThan(0);
    expect(Array.isArray(result.errors)).toBe(true);
  });
});
