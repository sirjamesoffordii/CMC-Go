import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createTestContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("people router", () => {
  it("lists all people", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const people = await caller.people.list();

    expect(Array.isArray(people)).toBe(true);
    expect(people.length).toBeGreaterThan(0);
    
    // Check structure of first person
    if (people.length > 0) {
      const person = people[0];
      expect(person).toHaveProperty("id");
      expect(person).toHaveProperty("personId");
      expect(person).toHaveProperty("name");
      expect(person).toHaveProperty("primaryCampusId");
      expect(person).toHaveProperty("primaryDistrictId");
      expect(person).toHaveProperty("status");
    }
  });

  it("filters people by district", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const allPeople = await caller.people.list();
    if (allPeople.length === 0) return;

    const testDistrictId = allPeople[0].primaryDistrictId;
    if (!testDistrictId) return; // Skip if no district
    const districtPeople = await caller.people.byDistrict({ districtId: testDistrictId });

    expect(Array.isArray(districtPeople)).toBe(true);
    districtPeople.forEach(person => {
      expect(person.primaryDistrictId).toBe(testDistrictId);
    });
  });

  it("updates person status", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const people = await caller.people.list();
    if (people.length === 0) return;

    const testPerson = people[0];
    const newStatus = testPerson.status === "Yes" ? "Maybe" : "Yes";

    const result = await caller.people.updateStatus({
      personId: testPerson.personId,
      status: newStatus,
    });

    expect(result.success).toBe(true);

    // Verify the update
    const updatedPerson = await caller.people.getById({ personId: testPerson.personId });
    expect(updatedPerson?.status).toBe(newStatus);
  });
});

describe("metrics router", () => {
  it("calculates metrics correctly", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const metrics = await caller.metrics.get();

    expect(metrics).toHaveProperty("total");
    expect(metrics).toHaveProperty("invited");
    expect(metrics).toHaveProperty("going");
    expect(metrics).toHaveProperty("percentInvited");

    expect(typeof metrics.total).toBe("number");
    expect(typeof metrics.invited).toBe("number");
    expect(typeof metrics.going).toBe("number");
    expect(typeof metrics.percentInvited).toBe("number");

    expect(metrics.total).toBeGreaterThanOrEqual(0);
    expect(metrics.invited).toBeGreaterThanOrEqual(0);
    expect(metrics.going).toBeGreaterThanOrEqual(0);
    expect(metrics.percentInvited).toBeGreaterThanOrEqual(0);
    expect(metrics.percentInvited).toBeLessThanOrEqual(100);

    // Verify invited count is correct
    const allPeople = await caller.people.list();
    const expectedInvited = allPeople.filter(p => p.status !== "Not Invited").length;
    expect(metrics.invited).toBe(expectedInvited);

    // Verify going count is correct
    const expectedGoing = allPeople.filter(p => p.status === "Yes").length;
    expect(metrics.going).toBe(expectedGoing);
  });
});

describe("districts router", () => {
  it("lists all districts", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const districts = await caller.districts.list();

    expect(Array.isArray(districts)).toBe(true);
    expect(districts.length).toBeGreaterThan(0);

    // Check structure
    if (districts.length > 0) {
      const district = districts[0];
      expect(district).toHaveProperty("id");
      expect(district).toHaveProperty("name");
      expect(district).toHaveProperty("region");
    }
  });

  it("gets district by id", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const districts = await caller.districts.list();
    if (districts.length === 0) return;

    const testDistrictId = districts[0].id;
    const district = await caller.districts.getById({ id: testDistrictId });

    expect(district).toBeDefined();
    expect(district?.id).toBe(testDistrictId);
  });
});

describe("campuses router", () => {
  it("lists all campuses", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const campuses = await caller.campuses.list();

    expect(Array.isArray(campuses)).toBe(true);
    expect(campuses.length).toBeGreaterThan(0);
  });

  it("filters campuses by district", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const allCampuses = await caller.campuses.list();
    if (allCampuses.length === 0) return;

    const testDistrictId = allCampuses[0].districtId;
    const districtCampuses = await caller.campuses.byDistrict({ districtId: testDistrictId });

    expect(Array.isArray(districtCampuses)).toBe(true);
    districtCampuses.forEach(campus => {
      expect(campus.districtId).toBe(testDistrictId);
    });
  });
});
