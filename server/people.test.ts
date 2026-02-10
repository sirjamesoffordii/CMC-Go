import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { createNeed, toggleNeedActive } from "./db";

function createTestContext(): TrpcContext {
  return {
    user: {
      id: 1,
      fullName: "Test Admin",
      email: "test-admin@example.com",
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
      scopeLevel: "NATIONAL",
      viewLevel: "NATIONAL",
      editLevel: "NATIONAL",
    },
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
    const districtPeople = await caller.people.byDistrict({
      districtId: testDistrictId,
    });

    expect(Array.isArray(districtPeople)).toBe(true);
    districtPeople.forEach(person => {
      expect(person.primaryDistrictId).toBe(testDistrictId);
    });
  });

  it("updates person status", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const people = await caller.people.list();
    expect(people.length).toBeGreaterThan(0);

    const testPerson = people[0];
    const originalStatus = testPerson.status;
    const newStatus = originalStatus === "Yes" ? "Maybe" : "Yes";

    // Ensure this person will appear in Follow-Up regardless of their status by
    // creating a temporary active need.
    const needId = await createNeed({
      personId: testPerson.personId,
      type: "Other",
      description: "test need (status propagation)",
      visibility: "LEADERSHIP_ONLY",
      createdById: ctx.user.id,
      isActive: true,
      resolvedAt: null,
    });

    try {
      const followUpBefore = await caller.followUp.list();
      expect(followUpBefore.some(p => p.personId === testPerson.personId)).toBe(
        true
      );

      const result = await caller.people.updateStatus({
        personId: testPerson.personId,
        status: newStatus,
      });

      expect(result.success).toBe(true);

      // Verify the update propagates across the same queries the UI uses.
      const updatedPerson = await caller.people.getById({
        personId: testPerson.personId,
      });
      expect(updatedPerson?.status).toBe(newStatus);

      const peopleAfter = await caller.people.list();
      const listPerson = peopleAfter.find(
        p => p.personId === testPerson.personId
      );
      expect(listPerson?.status).toBe(newStatus);

      const followUpAfter = await caller.followUp.list();
      const followUpPerson = followUpAfter.find(
        p => p.personId === testPerson.personId
      );
      expect(followUpPerson?.status).toBe(newStatus);
    } finally {
      // Cleanup to reduce cross-test interference.
      try {
        if (originalStatus !== newStatus) {
          await caller.people.updateStatus({
            personId: testPerson.personId,
            status: originalStatus,
          });
        }
      } finally {
        await toggleNeedActive(needId, false);
      }
    }
  });
});

describe("metrics router", () => {
  it("calculates metrics correctly", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const metrics = await caller.metrics.get();

    expect(metrics).toHaveProperty("going");
    expect(metrics).toHaveProperty("maybe");
    expect(metrics).toHaveProperty("notGoing");
    expect(metrics).toHaveProperty("notInvited");
    expect(metrics).toHaveProperty("total");

    expect(typeof metrics.going).toBe("number");
    expect(typeof metrics.maybe).toBe("number");
    expect(typeof metrics.notGoing).toBe("number");
    expect(typeof metrics.notInvited).toBe("number");
    expect(typeof metrics.total).toBe("number");

    expect(metrics.total).toBeGreaterThanOrEqual(0);
    expect(metrics.going).toBeGreaterThanOrEqual(0);
    expect(metrics.maybe).toBeGreaterThanOrEqual(0);
    expect(metrics.notGoing).toBeGreaterThanOrEqual(0);
    expect(metrics.notInvited).toBeGreaterThanOrEqual(0);

    // Verify counts are correct
    const allPeople = await caller.people.list();
    expect(metrics.going).toBe(
      allPeople.filter(p => p.status === "Yes").length
    );
    expect(metrics.maybe).toBe(
      allPeople.filter(p => p.status === "Maybe").length
    );
    expect(metrics.notGoing).toBe(
      allPeople.filter(p => p.status === "No").length
    );
    expect(metrics.notInvited).toBe(
      allPeople.filter(p => p.status === "Not Invited").length
    );
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
    const districtCampuses = await caller.campuses.byDistrict({
      districtId: testDistrictId,
    });

    expect(Array.isArray(districtCampuses)).toBe(true);
    districtCampuses.forEach(campus => {
      expect(campus.districtId).toBe(testDistrictId);
    });
  });
});
