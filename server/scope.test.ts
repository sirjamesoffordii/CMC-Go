import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

/**
 * Tests for data visibility scoping - Issue #122
 * Ensures users only see data within their scope (district/region/campus)
 */

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      fullName: "Admin User",
      email: "admin@example.com",
      role: "ADMIN",
      campusId: 1,
      districtId: null,
      regionId: null,
      approvalStatus: "ACTIVE",
      approvedByUserId: null,
      approvedAt: null,
      createdAt: new Date(),
      lastLoginAt: null,
      openId: null,
      name: null,
      loginMethod: null,
      personId: null,
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createDistrictDirectorContext(
  districtId: string,
  regionId: string
): TrpcContext {
  return {
    user: {
      id: 2,
      fullName: "District Director",
      email: "dd@example.com",
      role: "DISTRICT_DIRECTOR",
      campusId: 1,
      districtId,
      regionId,
      approvalStatus: "ACTIVE",
      approvedByUserId: null,
      approvedAt: null,
      createdAt: new Date(),
      lastLoginAt: null,
      openId: null,
      name: null,
      loginMethod: null,
      personId: null,
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createRegionDirectorContext(regionId: string): TrpcContext {
  return {
    user: {
      id: 3,
      fullName: "Region Director",
      email: "rd@example.com",
      role: "REGION_DIRECTOR",
      campusId: 1,
      districtId: null,
      regionId,
      approvalStatus: "ACTIVE",
      approvedByUserId: null,
      approvedAt: null,
      createdAt: new Date(),
      lastLoginAt: null,
      openId: null,
      name: null,
      loginMethod: null,
      personId: null,
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createCampusStaffContext(campusId: number): TrpcContext {
  return {
    user: {
      id: 4,
      fullName: "Campus Staff",
      email: "staff@example.com",
      role: "STAFF",
      campusId,
      districtId: null,
      regionId: null,
      approvalStatus: "ACTIVE",
      approvedByUserId: null,
      approvedAt: null,
      createdAt: new Date(),
      lastLoginAt: null,
      openId: null,
      name: null,
      loginMethod: null,
      personId: null,
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Data visibility scoping - Issue #122", () => {
  describe("people.list scoping", () => {
    it("admin sees all people", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const people = await caller.people.list();
      expect(Array.isArray(people)).toBe(true);
      expect(people.length).toBeGreaterThan(0);
    });

    it("district director sees only their region's people", async () => {
      const adminCtx = createAdminContext();
      const adminCaller = appRouter.createCaller(adminCtx);

      // Get a district to test with
      const allPeople = await adminCaller.people.list();
      if (allPeople.length === 0) return;

      const testPerson = allPeople.find(
        p => p.primaryDistrictId && p.primaryRegion
      );
      if (!testPerson) return;

      const districtId = testPerson.primaryDistrictId!;
      const regionId = testPerson.primaryRegion!;

      // Create district director context
      const ddCtx = createDistrictDirectorContext(districtId, regionId);
      const ddCaller = appRouter.createCaller(ddCtx);

      const ddPeople = await ddCaller.people.list();

      // All people should be from the same region
      ddPeople.forEach(person => {
        expect(person.primaryRegion).toBe(regionId);
      });

      // Should be a subset of all people
      expect(ddPeople.length).toBeLessThanOrEqual(allPeople.length);
    });

    it("campus staff sees only their campus people", async () => {
      const adminCtx = createAdminContext();
      const adminCaller = appRouter.createCaller(adminCtx);

      const allPeople = await adminCaller.people.list();
      if (allPeople.length === 0) return;

      const testPerson = allPeople.find(p => p.primaryCampusId);
      if (!testPerson) return;

      const campusId = testPerson.primaryCampusId!;

      const staffCtx = createCampusStaffContext(campusId);
      const staffCaller = appRouter.createCaller(staffCtx);

      const staffPeople = await staffCaller.people.list();

      // All people should be from the same campus
      staffPeople.forEach(person => {
        expect(person.primaryCampusId).toBe(campusId);
      });

      // Should be a subset of all people
      expect(staffPeople.length).toBeLessThanOrEqual(allPeople.length);
    });
  });

  describe("districts.list scoping", () => {
    it("admin sees all districts", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const districts = await caller.districts.list();
      expect(Array.isArray(districts)).toBe(true);
      expect(districts.length).toBeGreaterThan(0);
    });

    it("region director sees only their region's districts", async () => {
      const adminCtx = createAdminContext();
      const adminCaller = appRouter.createCaller(adminCtx);

      const allDistricts = await adminCaller.districts.list();
      if (allDistricts.length === 0) return;

      const testDistrict = allDistricts[0];
      const regionId = testDistrict.region;

      const rdCtx = createRegionDirectorContext(regionId);
      const rdCaller = appRouter.createCaller(rdCtx);

      const rdDistricts = await rdCaller.districts.list();

      // All districts should be from the same region
      rdDistricts.forEach(district => {
        expect(district.region).toBe(regionId);
      });

      // Should be a subset of all districts
      expect(rdDistricts.length).toBeLessThanOrEqual(allDistricts.length);
    });

    it("district director sees only their district", async () => {
      const adminCtx = createAdminContext();
      const adminCaller = appRouter.createCaller(adminCtx);

      const allDistricts = await adminCaller.districts.list();
      if (allDistricts.length === 0) return;

      const testDistrict = allDistricts[0];
      const districtId = testDistrict.id;
      const regionId = testDistrict.region;

      const ddCtx = createDistrictDirectorContext(districtId, regionId);
      const ddCaller = appRouter.createCaller(ddCtx);

      const ddDistricts = await ddCaller.districts.list();

      // Should only see their district
      expect(ddDistricts.length).toBeLessThanOrEqual(1);
      if (ddDistricts.length > 0) {
        expect(ddDistricts[0].id).toBe(districtId);
      }
    });
  });

  describe("metrics scoping", () => {
    it("admin sees all metrics", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const metrics = await caller.metrics.get();

      expect(metrics).toHaveProperty("going");
      expect(metrics).toHaveProperty("maybe");
      expect(metrics).toHaveProperty("notGoing");
      expect(metrics).toHaveProperty("notInvited");
      expect(metrics).toHaveProperty("total");
      expect(metrics.total).toBeGreaterThanOrEqual(0);
    });

    it("district director sees only their region metrics", async () => {
      const adminCtx = createAdminContext();
      const adminCaller = appRouter.createCaller(adminCtx);

      const allPeople = await adminCaller.people.list();
      if (allPeople.length === 0) return;

      const testPerson = allPeople.find(
        p => p.primaryDistrictId && p.primaryRegion
      );
      if (!testPerson) return;

      const districtId = testPerson.primaryDistrictId!;
      const regionId = testPerson.primaryRegion!;

      const ddCtx = createDistrictDirectorContext(districtId, regionId);
      const ddCaller = appRouter.createCaller(ddCtx);

      const ddMetrics = await ddCaller.metrics.get();
      const allMetrics = await adminCaller.metrics.get();

      // District director's metrics should be a subset of admin's metrics
      expect(ddMetrics.total).toBeLessThanOrEqual(allMetrics.total);
      expect(ddMetrics.going).toBeLessThanOrEqual(allMetrics.going);
    });

    it("campus staff sees only their campus metrics", async () => {
      const adminCtx = createAdminContext();
      const adminCaller = appRouter.createCaller(adminCtx);

      const allPeople = await adminCaller.people.list();
      if (allPeople.length === 0) return;

      const testPerson = allPeople.find(p => p.primaryCampusId);
      if (!testPerson) return;

      const campusId = testPerson.primaryCampusId!;

      const staffCtx = createCampusStaffContext(campusId);
      const staffCaller = appRouter.createCaller(staffCtx);

      const staffMetrics = await staffCaller.metrics.get();
      const allMetrics = await adminCaller.metrics.get();

      // Campus staff metrics should be a subset of admin's metrics
      expect(staffMetrics.total).toBeLessThanOrEqual(allMetrics.total);
    });

    it("district director cannot access other district's metrics", async () => {
      const adminCtx = createAdminContext();
      const adminCaller = appRouter.createCaller(adminCtx);

      const allDistricts = await adminCaller.districts.list();
      if (allDistricts.length < 2) return;

      const district1 = allDistricts[0];
      const district2 = allDistricts[1];

      const ddCtx = createDistrictDirectorContext(
        district1.id,
        district1.region
      );
      const ddCaller = appRouter.createCaller(ddCtx);

      // Should be able to access their own district
      await expect(
        ddCaller.metrics.district({ districtId: district1.id })
      ).resolves.toBeDefined();

      // Should NOT be able to access another district (if in different region)
      if (district1.region !== district2.region) {
        await expect(
          ddCaller.metrics.district({ districtId: district2.id })
        ).rejects.toThrow();
      }
    });
  });

  describe("No data leakage", () => {
    it("users cannot see people outside their scope", async () => {
      const adminCtx = createAdminContext();
      const adminCaller = appRouter.createCaller(adminCtx);

      const allPeople = await adminCaller.people.list();
      if (allPeople.length < 2) return;

      // Find people from different districts
      const person1 = allPeople.find(p => p.primaryDistrictId);
      const person2 = allPeople.find(
        p => p.primaryDistrictId && p.primaryDistrictId !== person1?.primaryDistrictId
      );

      if (!person1 || !person2) return;

      const district1 = person1.primaryDistrictId!;
      const region1 = person1.primaryRegion!;

      const ddCtx = createDistrictDirectorContext(district1, region1);
      const ddCaller = appRouter.createCaller(ddCtx);

      const ddPeople = await ddCaller.people.list();

      // Ensure person2 is NOT in the district director's people list
      // (only if they're from different regions)
      if (person1.primaryRegion !== person2.primaryRegion) {
        const person2InList = ddPeople.find(p => p.personId === person2.personId);
        expect(person2InList).toBeUndefined();
      }
    });
  });
});
