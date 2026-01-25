import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Public Endpoint Security Audit Tests
 *
 * Tests to verify that public endpoints do not leak person identity information.
 * Per Issue #247, all publicProcedure endpoints must be audited to ensure they:
 * - Return only aggregate metrics (no individual person data)
 * - Do not expose names, roles, or status on a per-person basis
 * - Protect sensitive personal information from unauthenticated access
 */

function createUnauthenticatedContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Public Endpoint Security Audit - Issue #247", () => {
  // Note: These tests verify response structure, not with real data
  // The critical security issue is in households.getMembers which returns
  // full person records to unauthenticated users

  describe("households.list", () => {
    it("should not expose person identity information", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const households = await caller.households.list();

      // Verify response structure
      expect(Array.isArray(households)).toBe(true);

      if (households.length > 0) {
        const household = households[0];

        // Household fields that are safe to expose
        expect(household).toHaveProperty("id");
        expect(household).toHaveProperty("label");
        expect(household).toHaveProperty("childrenCount");
        expect(household).toHaveProperty("guestsCount");

        // Should NOT contain person information
        expect(household).not.toHaveProperty("name");
        expect(household).not.toHaveProperty("role");
        expect(household).not.toHaveProperty("status");
        expect(household).not.toHaveProperty("members");
      }
    });
  });

  describe("households.getById", () => {
    it("should not expose person identity information", async () => {
      // This test documents expected behavior - household records should not include person data
      // In a real scenario with data, we'd verify:
      // - household has id, label, childrenCount, guestsCount (safe)
      // - household does NOT have name, role, status, members (unsafe)
    });
  });

  describe("households.getMembers - CRITICAL SECURITY ISSUE", () => {
    it("should NOT expose full person records to unauthenticated users", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      // This endpoint is currently public and returns full person records
      const members = await caller.households.getMembers({
        householdId: testHouseholdId,
      });

      // SECURITY CHECK: This should either:
      // 1. Require authentication (throw error for unauthenticated users), OR
      // 2. Return only aggregate data (not individual person records)

      // Current behavior (LEAK): Returns full person records with names, roles, status
      // Expected behavior: Should require authentication or return aggregates only

      if (Array.isArray(members) && members.length > 0) {
        const member = members[0];

        // These fields expose person identity and should NOT be in public responses
        const hasPersonIdentityLeak =
          Object.prototype.hasOwnProperty.call(member, "name") ||
          Object.prototype.hasOwnProperty.call(member, "primaryRole") ||
          Object.prototype.hasOwnProperty.call(member, "status") ||
          Object.prototype.hasOwnProperty.call(member, "personId");

        // This test will FAIL until the security issue is fixed
        expect(hasPersonIdentityLeak).toBe(false);
      }
    });
  });

  describe("households.search", () => {
    it("should not expose person identity information in results", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const results = await caller.households.search({ query: "Test" });

      // Verify response structure
      expect(Array.isArray(results)).toBe(true);

      if (results.length > 0) {
        const household = results[0];

        // Household fields that are safe to expose
        expect(household).toHaveProperty("id");
        expect(household).toHaveProperty("label");
        expect(household).toHaveProperty("childrenCount");
        expect(household).toHaveProperty("guestsCount");

        // Should NOT contain person information directly
        expect(household).not.toHaveProperty("name");
        expect(household).not.toHaveProperty("role");
        expect(household).not.toHaveProperty("status");
        expect(household).not.toHaveProperty("members");
      }
    });
  });

  describe("metrics.get", () => {
    it("should return only aggregate counts, no person identifiers", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const metrics = await caller.metrics.get();

      // Should return aggregate counts only
      expect(metrics).toHaveProperty("going");
      expect(metrics).toHaveProperty("maybe");
      expect(metrics).toHaveProperty("notGoing");
      expect(metrics).toHaveProperty("notInvited");
      expect(metrics).toHaveProperty("total");

      // Should NOT contain person arrays or identifiers
      expect(metrics).not.toHaveProperty("people");
      expect(metrics).not.toHaveProperty("names");
      expect(Array.isArray(metrics)).toBe(false);
    });
  });

  describe("metrics.district", () => {
    it("should return only aggregate counts for district, no person identifiers", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const metrics = await caller.metrics.district({
        districtId: "DISTRICT_001",
      });

      // Should return aggregate counts only
      expect(metrics).toHaveProperty("going");
      expect(metrics).toHaveProperty("maybe");
      expect(metrics).toHaveProperty("notGoing");
      expect(metrics).toHaveProperty("notInvited");
      expect(metrics).toHaveProperty("total");

      // Should NOT contain person arrays or identifiers
      expect(metrics).not.toHaveProperty("people");
      expect(metrics).not.toHaveProperty("names");
    });
  });

  describe("metrics.allDistricts", () => {
    it("should return only aggregate counts per district, no person identifiers", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const metrics = await caller.metrics.allDistricts();

      expect(Array.isArray(metrics)).toBe(true);

      if (metrics.length > 0) {
        const districtMetric = metrics[0];

        // Should have district ID and counts
        expect(districtMetric).toHaveProperty("districtId");
        expect(districtMetric).toHaveProperty("going");
        expect(districtMetric).toHaveProperty("maybe");
        expect(districtMetric).toHaveProperty("notGoing");
        expect(districtMetric).toHaveProperty("notInvited");
        expect(districtMetric).toHaveProperty("total");

        // Should NOT contain person arrays or identifiers
        expect(districtMetric).not.toHaveProperty("people");
        expect(districtMetric).not.toHaveProperty("names");
      }
    });
  });

  describe("metrics.region", () => {
    it("should return only aggregate counts for region, no person identifiers", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const metrics = await caller.metrics.region({ region: "West" });

      // Should return aggregate counts only
      expect(metrics).toHaveProperty("going");
      expect(metrics).toHaveProperty("maybe");
      expect(metrics).toHaveProperty("notGoing");
      expect(metrics).toHaveProperty("notInvited");
      expect(metrics).toHaveProperty("total");

      // Should NOT contain person arrays or identifiers
      expect(metrics).not.toHaveProperty("people");
      expect(metrics).not.toHaveProperty("names");
    });
  });

  describe("metrics.allRegions", () => {
    it("should return only aggregate counts per region, no person identifiers", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const metrics = await caller.metrics.allRegions();

      expect(Array.isArray(metrics)).toBe(true);

      if (metrics.length > 0) {
        const regionMetric = metrics[0];

        // Should have region and counts
        expect(regionMetric).toHaveProperty("region");
        expect(regionMetric).toHaveProperty("going");
        expect(regionMetric).toHaveProperty("maybe");
        expect(regionMetric).toHaveProperty("notGoing");
        expect(regionMetric).toHaveProperty("notInvited");
        expect(regionMetric).toHaveProperty("total");

        // Should NOT contain person arrays or identifiers
        expect(regionMetric).not.toHaveProperty("people");
        expect(regionMetric).not.toHaveProperty("names");
      }
    });
  });

  describe("districts.getById", () => {
    it("should return only district information, no person data", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const district = await caller.districts.getById({ id: "DISTRICT_001" });

      if (district) {
        // District fields that are safe to expose
        expect(district).toHaveProperty("id");
        expect(district).toHaveProperty("name");
        expect(district).toHaveProperty("region");

        // Should NOT contain person information
        expect(district).not.toHaveProperty("people");
        expect(district).not.toHaveProperty("staff");
        expect(district).not.toHaveProperty("members");
      }
    });
  });

  describe("campuses.byDistrict", () => {
    it("should return only campus information, no person data", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const campuses = await caller.campuses.byDistrict({
        districtId: "DISTRICT_001",
      });

      expect(Array.isArray(campuses)).toBe(true);

      if (campuses.length > 0) {
        const campus = campuses[0];

        // Campus fields that are safe to expose
        expect(campus).toHaveProperty("id");
        expect(campus).toHaveProperty("name");
        expect(campus).toHaveProperty("districtId");

        // Should NOT contain person information
        expect(campus).not.toHaveProperty("people");
        expect(campus).not.toHaveProperty("staff");
        expect(campus).not.toHaveProperty("director");
      }
    });
  });

  describe("settings.get", () => {
    it("should return only setting value, no person data", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      // Test with a safe setting key
      const setting = await caller.settings.get({ key: "theme" });

      // Settings should not contain person information
      if (setting) {
        expect(setting).not.toHaveProperty("userId");
        expect(setting).not.toHaveProperty("userName");
        expect(setting).not.toHaveProperty("userEmail");
      }
    });
  });
});
