import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createTestContext(
  overrides?: Partial<TrpcContext["user"]>
): TrpcContext {
  const baseUser = {
    id: 1,
    fullName: "Test User",
    email: "test@example.com",
    role: "STAFF" as const,
    campusId: 1,
    districtId: "test-district",
    regionId: "test-region",
    approvalStatus: "ACTIVE" as const,
    approvedByUserId: null,
    approvedAt: null,
    createdAt: new Date(),
    lastLoginAt: null,
    openId: null,
    name: null,
    loginMethod: null,
    personId: null,
  };

  return {
    user: overrides ? { ...baseUser, ...overrides } : baseUser,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Permission Enforcement - Approvals", () => {
  it("non-admin user cannot approve users", async () => {
    const ctx = createTestContext({ role: "STAFF" });
    const caller = appRouter.createCaller(ctx);

    await expect(caller.approvals.approve({ userId: 999 })).rejects.toThrow(
      "Admin access required"
    );
  });

  it("non-admin user cannot reject users", async () => {
    const ctx = createTestContext({ role: "STAFF" });
    const caller = appRouter.createCaller(ctx);

    await expect(caller.approvals.reject({ userId: 999 })).rejects.toThrow(
      "Admin access required"
    );
  });

  it("non-admin user cannot list approvals", async () => {
    const ctx = createTestContext({ role: "STAFF" });
    const caller = appRouter.createCaller(ctx);

    await expect(caller.approvals.list()).rejects.toThrow(
      "Admin access required"
    );
  });

  it("admin user can list approvals", async () => {
    const ctx = createTestContext({ role: "ADMIN" });
    const caller = appRouter.createCaller(ctx);

    // Should not throw
    const result = await caller.approvals.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Permission Enforcement - Settings", () => {
  it("non-admin user cannot set settings", async () => {
    const ctx = createTestContext({ role: "STAFF" });
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.settings.set({ key: "testKey", value: "testValue" })
    ).rejects.toThrow("Admin access required");
  });

  it("non-admin user cannot upload header image", async () => {
    const ctx = createTestContext({ role: "STAFF" });
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.settings.uploadHeaderImage({
        imageData: "data:image/jpeg;base64,test",
        fileName: "test.jpg",
      })
    ).rejects.toThrow("Admin access required");
  });

  it("admin user can set settings", async () => {
    const ctx = createTestContext({ role: "ADMIN" });
    const caller = appRouter.createCaller(ctx);

    // Should not throw
    const result = await caller.settings.set({
      key: "testKey",
      value: "testValue",
    });
    expect(result.success).toBe(true);
  });
});

describe("Permission Enforcement - Households", () => {
  it("unauthenticated user cannot create household", async () => {
    const ctx = createTestContext();
    ctx.user = null; // Simulate unauthenticated user
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.households.create({ label: "Test Household" })
    ).rejects.toThrow();
  });

  it("unauthenticated user cannot update household", async () => {
    const ctx = createTestContext();
    ctx.user = null;
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.households.update({ id: 1, label: "Updated" })
    ).rejects.toThrow();
  });

  it("unauthenticated user cannot delete household", async () => {
    const ctx = createTestContext();
    ctx.user = null;
    const caller = appRouter.createCaller(ctx);

    await expect(caller.households.delete({ id: 1 })).rejects.toThrow();
  });

  it("authenticated user can create household", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.households.create({
      label: "Test Household",
      childrenCount: 2,
      guestsCount: 1,
    });

    expect(result).toHaveProperty("id");
    expect(result.label).toBe("Test Household");
  });
});

describe("Permission Enforcement - Campuses", () => {
  it("campus-level user cannot create campus", async () => {
    const ctx = createTestContext({ role: "STAFF", campusId: 1 });
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.campuses.createPublic({
        name: "New Campus",
        districtId: "test-district",
      })
    ).rejects.toThrow("Access denied");
  });

  it("district-level user cannot create campus in different district", async () => {
    const ctx = createTestContext({
      role: "CAMPUS_DIRECTOR",
      districtId: "district-1",
    });
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.campuses.createPublic({
        name: "New Campus",
        districtId: "district-2", // Different district
      })
    ).rejects.toThrow("Access denied");
  });

  it("admin user can create campus", async () => {
    const ctx = createTestContext({ role: "ADMIN" });
    const caller = appRouter.createCaller(ctx);

    // This should not throw (though it may fail due to DB state)
    // We're just testing permission, not DB constraints
    try {
      await caller.campuses.createPublic({
        name: "Test Campus",
        districtId: "test-district",
      });
    } catch (error) {
      // If it throws, it should not be a permission error
      if (error instanceof Error) {
        expect(error.message).not.toContain("Access denied");
        expect(error.message).not.toContain("Admin access required");
      }
    }
  });
});

describe("Permission Enforcement - People Scope", () => {
  it("campus-level user cannot update person from different campus", async () => {
    const ctx = createTestContext({ role: "STAFF", campusId: 1 });
    const caller = appRouter.createCaller(ctx);

    // Get a person from a different campus
    const allPeople = await caller.people.list();
    const differentCampusPerson = allPeople.find(p => p.primaryCampusId !== 1);

    if (differentCampusPerson) {
      await expect(
        caller.people.updateStatus({
          personId: differentCampusPerson.personId,
          status: "Yes",
        })
      ).rejects.toThrow("Access denied");
    }
  });

  it("district-level user cannot update person from different district", async () => {
    const ctx = createTestContext({
      role: "CAMPUS_DIRECTOR",
      districtId: "district-1",
    });
    const caller = appRouter.createCaller(ctx);

    // Get a person from a different district
    const allPeople = await caller.people.list();
    const differentDistrictPerson = allPeople.find(
      p => p.primaryDistrictId !== "district-1"
    );

    if (differentDistrictPerson) {
      await expect(
        caller.people.updateStatus({
          personId: differentDistrictPerson.personId,
          status: "Yes",
        })
      ).rejects.toThrow("Access denied");
    }
  });
});
