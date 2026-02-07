import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { getPeopleScope } from "./_core/authorization";
import { protectedProcedure, router } from "./_core/trpc";

const testRouter = router({
  peopleScope: protectedProcedure.query(({ ctx }) => getPeopleScope(ctx.user)),
});

function expectForbiddenSync(fn: () => unknown) {
  try {
    fn();
    throw new Error("Expected FORBIDDEN");
  } catch (error) {
    expect(error).toBeInstanceOf(TRPCError);
    expect((error as TRPCError).code).toBe("FORBIDDEN");
  }
}

async function expectForbidden(promise: Promise<unknown>) {
  try {
    await promise;
    throw new Error("Expected FORBIDDEN");
  } catch (error) {
    expect(error).toBeInstanceOf(TRPCError);
    expect((error as TRPCError).code).toBe("FORBIDDEN");
  }
}

function createTestContext(
  overrides: Partial<NonNullable<TrpcContext["user"]>>
): TrpcContext {
  return {
    user: {
      id: 1,
      fullName: "Test User",
      email: "test@example.com",
      role: "STAFF" as any,
      campusId: 1,
      districtId: "TEST_DISTRICT",
      regionId: "TEST_REGION",
      approvalStatus: "ACTIVE",
      approvedByUserId: null,
      approvedAt: null,
      createdAt: new Date(),
      lastLoginAt: null,
      openId: null,
      name: null,
      loginMethod: null,
      ...overrides,
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("getPeopleScope fail-closed (missing anchors)", () => {
  it("STAFF without regionId -> FORBIDDEN", () => {
    expectForbiddenSync(() =>
      getPeopleScope({ role: "STAFF", campusId: 1, regionId: null })
    );
  });

  it("CAMPUS_DIRECTOR without regionId -> FORBIDDEN (even if districtId present)", () => {
    expectForbiddenSync(() =>
      getPeopleScope({ role: "CAMPUS_DIRECTOR", campusId: 1, districtId: "D1", regionId: null })
    );
  });

  it("DISTRICT_DIRECTOR without regionId -> FORBIDDEN (even if districtId present)", () => {
    expectForbiddenSync(() =>
      getPeopleScope({
        role: "DISTRICT_DIRECTOR",
        districtId: "TEST_DISTRICT",
        regionId: null,
      })
    );
  });

  it("unmapped role without regionId -> FORBIDDEN", () => {
    expectForbiddenSync(() =>
      getPeopleScope({ role: "SOME_UNKNOWN_ROLE", campusId: 1, regionId: null })
    );
  });
});

describe("API fail-closed (bad user state)", () => {
  it("peopleScope rejects CAMPUS_DIRECTOR without regionId", async () => {
    const ctx = createTestContext({
      role: "CAMPUS_DIRECTOR" as any,
      campusId: 1,
      districtId: null,
      regionId: null,
    });

    const caller = testRouter.createCaller(ctx);
    await expectForbidden(caller.peopleScope());
  });

  it("peopleScope rejects DISTRICT_DIRECTOR without regionId", async () => {
    const ctx = createTestContext({
      role: "DISTRICT_DIRECTOR" as any,
      districtId: "TEST_DISTRICT",
      regionId: null,
    });

    const caller = testRouter.createCaller(ctx);
    await expectForbidden(caller.peopleScope());
  });

  it("peopleScope rejects unmapped roles without regionId", async () => {
    const ctx = createTestContext({
      role: "SOME_UNKNOWN_ROLE" as any,
      campusId: 1,
      regionId: null,
    });

    const caller = testRouter.createCaller(ctx);
    await expectForbidden(caller.peopleScope());
  });
});
