/**
 * Role-Scope Verification Test Matrix
 * Issue #250: Comprehensive tests for authorization helpers
 *
 * Tests each role's getPeopleScope(), canAccessPerson(), and fail-closed behavior.
 * Based on docs/AUTHORIZATION.md Section 7 requirements.
 */

import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import type { InsertUser } from "../drizzle/schema";
import {
  canAccessPerson,
  canEditCampus,
  canEditDistrict,
  canEditRegion,
  canEditNational,
  getPeopleScope,
  type UserScopeAnchors,
  type PersonAnchors,
} from "./_core/authorization";

// ============================================================================
// Test Fixtures
// ============================================================================

/** Create a user with specified role and anchors */
function createUser(
  role: string,
  overrides: Partial<UserScopeAnchors> = {}
): UserScopeAnchors {
  return {
    role,
    campusId: 1,
    districtId: "DIST-001",
    regionId: "REG-001",
    ...overrides,
  };
}

/** Create person anchors for testing */
function createPerson(overrides: Partial<PersonAnchors> = {}): PersonAnchors {
  return {
    primaryCampusId: 1,
    primaryDistrictId: "DIST-001",
    primaryRegion: "REG-001",
    ...overrides,
  };
}

// ============================================================================
// SECTION 1: getPeopleScope() Tests for Each Role
// ============================================================================

describe("getPeopleScope", () => {
  describe("STAFF role", () => {
    it("returns CAMPUS scope with user's campusId", () => {
      const user = createUser("STAFF", { campusId: 42 });
      const scope = getPeopleScope(user);

      expect(scope).toEqual({ level: "CAMPUS", campusId: 42 });
    });

    it("throws FORBIDDEN when missing campusId (fail-closed)", () => {
      const user = createUser("STAFF", { campusId: null });

      expect(() => getPeopleScope(user)).toThrow(TRPCError);
      expect(() => getPeopleScope(user)).toThrow("missing campusId");
    });
  });

  describe("CO_DIRECTOR role", () => {
    it("returns CAMPUS scope with user's campusId", () => {
      const user = createUser("CO_DIRECTOR", { campusId: 99 });
      const scope = getPeopleScope(user);

      expect(scope).toEqual({ level: "CAMPUS", campusId: 99 });
    });

    it("throws FORBIDDEN when missing campusId (fail-closed)", () => {
      const user = createUser("CO_DIRECTOR", { campusId: null });

      expect(() => getPeopleScope(user)).toThrow(TRPCError);
      expect(() => getPeopleScope(user)).toThrow("missing campusId");
    });
  });

  describe("CAMPUS_DIRECTOR role", () => {
    it("returns DISTRICT scope with user's districtId", () => {
      const user = createUser("CAMPUS_DIRECTOR", { districtId: "DIST-042" });
      const scope = getPeopleScope(user);

      expect(scope).toEqual({ level: "DISTRICT", districtId: "DIST-042" });
    });

    it("throws FORBIDDEN when missing districtId (fail-closed)", () => {
      const user = createUser("CAMPUS_DIRECTOR", { districtId: null });

      expect(() => getPeopleScope(user)).toThrow(TRPCError);
      expect(() => getPeopleScope(user)).toThrow("missing districtId");
    });
  });

  describe("DISTRICT_DIRECTOR role", () => {
    it("returns REGION scope with user's regionId", () => {
      const user = createUser("DISTRICT_DIRECTOR", { regionId: "REG-042" });
      const scope = getPeopleScope(user);

      expect(scope).toEqual({ level: "REGION", regionId: "REG-042" });
    });

    it("throws FORBIDDEN when missing regionId (fail-closed)", () => {
      const user = createUser("DISTRICT_DIRECTOR", { regionId: null });

      expect(() => getPeopleScope(user)).toThrow(TRPCError);
      expect(() => getPeopleScope(user)).toThrow("missing regionId");
    });
  });

  describe("REGION_DIRECTOR role", () => {
    it("returns ALL scope (full/national access)", () => {
      const user = createUser("REGION_DIRECTOR");
      const scope = getPeopleScope(user);

      expect(scope).toEqual({ level: "ALL" });
    });

    it("returns ALL scope even without anchors", () => {
      const user = createUser("REGION_DIRECTOR", {
        campusId: null,
        districtId: null,
        regionId: null,
      });
      const scope = getPeopleScope(user);

      expect(scope).toEqual({ level: "ALL" });
    });
  });

  describe("ADMIN role", () => {
    it("returns ALL scope (full/national access)", () => {
      const user = createUser("ADMIN");
      const scope = getPeopleScope(user);

      expect(scope).toEqual({ level: "ALL" });
    });

    it("returns ALL scope even without anchors", () => {
      const user = createUser("ADMIN", {
        campusId: null,
        districtId: null,
        regionId: null,
      });
      const scope = getPeopleScope(user);

      expect(scope).toEqual({ level: "ALL" });
    });
  });

  describe("role normalization", () => {
    it("normalizes CAMPUS_CO_DIRECTOR to CO_DIRECTOR (CAMPUS scope)", () => {
      const user = createUser("CAMPUS_CO_DIRECTOR", { campusId: 7 });
      const scope = getPeopleScope(user);

      expect(scope).toEqual({ level: "CAMPUS", campusId: 7 });
    });

    it("normalizes CAMPUS_VOLUNTEER to STAFF (CAMPUS scope)", () => {
      const user = createUser("CAMPUS_VOLUNTEER", { campusId: 8 });
      const scope = getPeopleScope(user);

      expect(scope).toEqual({ level: "CAMPUS", campusId: 8 });
    });

    it("normalizes CAMPUS_INTERN to STAFF (CAMPUS scope)", () => {
      const user = createUser("CAMPUS_INTERN", { campusId: 9 });
      const scope = getPeopleScope(user);

      expect(scope).toEqual({ level: "CAMPUS", campusId: 9 });
    });

    it("normalizes DISTRICT_STAFF to DISTRICT_DIRECTOR (REGION scope)", () => {
      const user = createUser("DISTRICT_STAFF", { regionId: "REG-007" });
      const scope = getPeopleScope(user);

      expect(scope).toEqual({ level: "REGION", regionId: "REG-007" });
    });

    it("normalizes REGIONAL_STAFF to REGION_DIRECTOR (ALL scope)", () => {
      const user = createUser("REGIONAL_STAFF");
      const scope = getPeopleScope(user);

      expect(scope).toEqual({ level: "ALL" });
    });

    it("normalizes NATIONAL_DIRECTOR to ALL scope", () => {
      const user = createUser("NATIONAL_DIRECTOR");
      const scope = getPeopleScope(user);

      expect(scope).toEqual({ level: "ALL" });
    });

    it("normalizes FIELD_DIRECTOR to ALL scope", () => {
      const user = createUser("FIELD_DIRECTOR");
      const scope = getPeopleScope(user);

      expect(scope).toEqual({ level: "ALL" });
    });

    it("normalizes CMC_GO_ADMIN to ALL scope", () => {
      const user = createUser("CMC_GO_ADMIN");
      const scope = getPeopleScope(user);

      expect(scope).toEqual({ level: "ALL" });
    });
  });

  describe("unknown roles (fail-closed)", () => {
    it("throws FORBIDDEN for unknown role", () => {
      const user = createUser("UNKNOWN_ROLE");

      expect(() => getPeopleScope(user)).toThrow(TRPCError);
      expect(() => getPeopleScope(user)).toThrow("role not permitted");
    });

    it("throws FORBIDDEN for empty role", () => {
      const user = createUser("");

      expect(() => getPeopleScope(user)).toThrow(TRPCError);
    });
  });
});

// ============================================================================
// SECTION 2: canAccessPerson() Tests - Inside/Outside Scope
// ============================================================================

describe("canAccessPerson", () => {
  describe("STAFF role - CAMPUS scope", () => {
    const staff = createUser("STAFF", { campusId: 10 });

    it("allows access to person at same campus (inside-scope)", () => {
      const person = createPerson({ primaryCampusId: 10 });

      expect(canAccessPerson(staff, person)).toBe(true);
    });

    it("denies access to person at different campus (outside-scope)", () => {
      const person = createPerson({ primaryCampusId: 99 });

      expect(canAccessPerson(staff, person)).toBe(false);
    });

    it("denies access when person has null primaryCampusId", () => {
      const person = createPerson({ primaryCampusId: null });

      expect(canAccessPerson(staff, person)).toBe(false);
    });

    it("ignores person's district/region - only checks campus", () => {
      // Same campus, different district and region
      const person = createPerson({
        primaryCampusId: 10,
        primaryDistrictId: "DIFFERENT-DIST",
        primaryRegion: "DIFFERENT-REG",
      });

      expect(canAccessPerson(staff, person)).toBe(true);
    });
  });

  describe("CO_DIRECTOR role - CAMPUS scope", () => {
    const coDirector = createUser("CO_DIRECTOR", { campusId: 20 });

    it("allows access to person at same campus (inside-scope)", () => {
      const person = createPerson({ primaryCampusId: 20 });

      expect(canAccessPerson(coDirector, person)).toBe(true);
    });

    it("denies access to person at different campus (outside-scope)", () => {
      const person = createPerson({ primaryCampusId: 99 });

      expect(canAccessPerson(coDirector, person)).toBe(false);
    });
  });

  describe("CAMPUS_DIRECTOR role - DISTRICT scope", () => {
    const campusDirector = createUser("CAMPUS_DIRECTOR", {
      districtId: "DIST-100",
    });

    it("allows access to person in same district (inside-scope)", () => {
      const person = createPerson({ primaryDistrictId: "DIST-100" });

      expect(canAccessPerson(campusDirector, person)).toBe(true);
    });

    it("denies access to person in different district (outside-scope)", () => {
      const person = createPerson({ primaryDistrictId: "DIST-999" });

      expect(canAccessPerson(campusDirector, person)).toBe(false);
    });

    it("denies access when person has null primaryDistrictId", () => {
      const person = createPerson({ primaryDistrictId: null });

      expect(canAccessPerson(campusDirector, person)).toBe(false);
    });

    it("ignores person's campus/region - only checks district", () => {
      // Same district, different campus and region
      const person = createPerson({
        primaryCampusId: 999,
        primaryDistrictId: "DIST-100",
        primaryRegion: "DIFFERENT-REG",
      });

      expect(canAccessPerson(campusDirector, person)).toBe(true);
    });
  });

  describe("DISTRICT_DIRECTOR role - REGION scope", () => {
    const districtDirector = createUser("DISTRICT_DIRECTOR", {
      regionId: "REG-200",
    });

    it("allows access to person in same region (inside-scope)", () => {
      const person = createPerson({ primaryRegion: "REG-200" });

      expect(canAccessPerson(districtDirector, person)).toBe(true);
    });

    it("denies access to person in different region (outside-scope)", () => {
      const person = createPerson({ primaryRegion: "REG-999" });

      expect(canAccessPerson(districtDirector, person)).toBe(false);
    });

    it("denies access when person has null primaryRegion", () => {
      const person = createPerson({ primaryRegion: null });

      expect(canAccessPerson(districtDirector, person)).toBe(false);
    });

    it("ignores person's campus/district - only checks region", () => {
      // Same region, different campus and district
      const person = createPerson({
        primaryCampusId: 999,
        primaryDistrictId: "DIFFERENT-DIST",
        primaryRegion: "REG-200",
      });

      expect(canAccessPerson(districtDirector, person)).toBe(true);
    });
  });

  describe("REGION_DIRECTOR role - ALL scope", () => {
    const regionDirector = createUser("REGION_DIRECTOR");

    it("allows access to any person (full national access)", () => {
      const person = createPerson({
        primaryCampusId: 999,
        primaryDistrictId: "ANY-DIST",
        primaryRegion: "ANY-REG",
      });

      expect(canAccessPerson(regionDirector, person)).toBe(true);
    });

    it("allows access even when person has null anchors", () => {
      const person = createPerson({
        primaryCampusId: null,
        primaryDistrictId: null,
        primaryRegion: null,
      });

      expect(canAccessPerson(regionDirector, person)).toBe(true);
    });
  });

  describe("ADMIN role - ALL scope", () => {
    const admin = createUser("ADMIN");

    it("allows access to any person (full national access)", () => {
      const person = createPerson({
        primaryCampusId: 999,
        primaryDistrictId: "ANY-DIST",
        primaryRegion: "ANY-REG",
      });

      expect(canAccessPerson(admin, person)).toBe(true);
    });

    it("allows access even when person has null anchors", () => {
      const person = createPerson({
        primaryCampusId: null,
        primaryDistrictId: null,
        primaryRegion: null,
      });

      expect(canAccessPerson(admin, person)).toBe(true);
    });
  });
});

// ============================================================================
// SECTION 3: Fail-Closed Tests - Missing Anchors
// ============================================================================

describe("fail-closed behavior", () => {
  describe("canAccessPerson throws when user missing required anchor", () => {
    it("throws FORBIDDEN for STAFF without campusId", () => {
      const user = createUser("STAFF", { campusId: null });
      const person = createPerson();

      expect(() => canAccessPerson(user, person)).toThrow(TRPCError);
      expect(() => canAccessPerson(user, person)).toThrow("missing campusId");
    });

    it("throws FORBIDDEN for CO_DIRECTOR without campusId", () => {
      const user = createUser("CO_DIRECTOR", { campusId: null });
      const person = createPerson();

      expect(() => canAccessPerson(user, person)).toThrow(TRPCError);
      expect(() => canAccessPerson(user, person)).toThrow("missing campusId");
    });

    it("throws FORBIDDEN for CAMPUS_DIRECTOR without districtId", () => {
      const user = createUser("CAMPUS_DIRECTOR", { districtId: null });
      const person = createPerson();

      expect(() => canAccessPerson(user, person)).toThrow(TRPCError);
      expect(() => canAccessPerson(user, person)).toThrow("missing districtId");
    });

    it("throws FORBIDDEN for DISTRICT_DIRECTOR without regionId", () => {
      const user = createUser("DISTRICT_DIRECTOR", { regionId: null });
      const person = createPerson();

      expect(() => canAccessPerson(user, person)).toThrow(TRPCError);
      expect(() => canAccessPerson(user, person)).toThrow("missing regionId");
    });
  });

  describe("REGION_DIRECTOR and ADMIN do NOT require anchors", () => {
    it("REGION_DIRECTOR works without any anchors", () => {
      const user = createUser("REGION_DIRECTOR", {
        campusId: null,
        districtId: null,
        regionId: null,
      });
      const person = createPerson();

      expect(() => canAccessPerson(user, person)).not.toThrow();
      expect(canAccessPerson(user, person)).toBe(true);
    });

    it("ADMIN works without any anchors", () => {
      const user = createUser("ADMIN", {
        campusId: null,
        districtId: null,
        regionId: null,
      });
      const person = createPerson();

      expect(() => canAccessPerson(user, person)).not.toThrow();
      expect(canAccessPerson(user, person)).toBe(true);
    });
  });

  describe("campusId = 0 is treated as valid (not null)", () => {
    it("STAFF with campusId = 0 does not throw", () => {
      const user = createUser("STAFF", { campusId: 0 });
      const person = createPerson({ primaryCampusId: 0 });

      // campusId 0 is falsy but should still work
      expect(() => canAccessPerson(user, person)).not.toThrow();
      expect(canAccessPerson(user, person)).toBe(true);
    });
  });
});

// ============================================================================
// SECTION 4: canEditCampus Tests (uses User type with approvalStatus)
// ============================================================================

describe("canEditCampus", () => {
  function createFullUser(
    role: string,
    overrides: Partial<{
      campusId: number | null;
      districtId: string | null;
      regionId: string | null;
      approvalStatus: "ACTIVE" | "PENDING" | "INACTIVE";
    }> = {}
  ) {
    return {
      id: 1,
      fullName: "Test User",
      email: "test@example.com",
      role: role as InsertUser["role"],
      campusId: 1,
      districtId: "DIST-001",
      regionId: "REG-001",
      approvalStatus: "ACTIVE" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      loginProvider: "google" as const,
      providerId: "123",
      ...overrides,
    };
  }

  describe("STAFF and CO_DIRECTOR - own campus only", () => {
    it("STAFF can edit their own campus", () => {
      const user = createFullUser("STAFF", { campusId: 5 });

      expect(canEditCampus(user, 5)).toBe(true);
    });

    it("STAFF cannot edit different campus", () => {
      const user = createFullUser("STAFF", { campusId: 5 });

      expect(canEditCampus(user, 99)).toBe(false);
    });

    it("CO_DIRECTOR can edit their own campus", () => {
      const user = createFullUser("CO_DIRECTOR", { campusId: 10 });

      expect(canEditCampus(user, 10)).toBe(true);
    });

    it("CO_DIRECTOR cannot edit different campus", () => {
      const user = createFullUser("CO_DIRECTOR", { campusId: 10 });

      expect(canEditCampus(user, 99)).toBe(false);
    });
  });

  describe("CAMPUS_DIRECTOR - entire district", () => {
    it("CAMPUS_DIRECTOR can edit any campus (district-level)", () => {
      const user = createFullUser("CAMPUS_DIRECTOR");

      // Returns true - actual district check done at query time
      expect(canEditCampus(user, 1)).toBe(true);
      expect(canEditCampus(user, 99)).toBe(true);
    });
  });

  describe("DISTRICT_DIRECTOR - entire region", () => {
    it("DISTRICT_DIRECTOR can edit any campus (region-level)", () => {
      const user = createFullUser("DISTRICT_DIRECTOR");

      expect(canEditCampus(user, 1)).toBe(true);
      expect(canEditCampus(user, 999)).toBe(true);
    });
  });

  describe("REGION_DIRECTOR and ADMIN - full national access", () => {
    it("REGION_DIRECTOR can edit any campus", () => {
      const user = createFullUser("REGION_DIRECTOR");

      expect(canEditCampus(user, 1)).toBe(true);
      expect(canEditCampus(user, 999)).toBe(true);
    });

    it("ADMIN can edit any campus", () => {
      const user = createFullUser("ADMIN");

      expect(canEditCampus(user, 1)).toBe(true);
      expect(canEditCampus(user, 999)).toBe(true);
    });
  });

  describe("approvalStatus requirements", () => {
    it("PENDING user cannot edit any campus", () => {
      const user = createFullUser("STAFF", {
        campusId: 5,
        approvalStatus: "PENDING",
      });

      expect(canEditCampus(user, 5)).toBe(false);
    });

    it("INACTIVE user cannot edit any campus", () => {
      const user = createFullUser("ADMIN", { approvalStatus: "INACTIVE" });

      expect(canEditCampus(user, 1)).toBe(false);
    });

    it("null user returns false", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing null edge case
      expect(canEditCampus(null as any, 1)).toBe(false);
    });
  });
});

// ============================================================================
// SECTION 5: canEditDistrict Tests
// ============================================================================

describe("canEditDistrict", () => {
  function createFullUser(
    role: string,
    overrides: Partial<{
      districtId: string | null;
      regionId: string | null;
      approvalStatus: "ACTIVE" | "PENDING" | "INACTIVE";
    }> = {}
  ) {
    return {
      id: 1,
      fullName: "Test User",
      email: "test@example.com",
      role: role as InsertUser["role"],
      campusId: 1,
      districtId: "DIST-001",
      regionId: "REG-001",
      approvalStatus: "ACTIVE" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      loginProvider: "google" as const,
      providerId: "123",
      ...overrides,
    };
  }

  describe("STAFF and CO_DIRECTOR - cannot edit districts", () => {
    it("STAFF cannot edit any district", () => {
      const user = createFullUser("STAFF", { districtId: "DIST-001" });

      expect(canEditDistrict(user, "DIST-001")).toBe(false);
      expect(canEditDistrict(user, "OTHER")).toBe(false);
    });

    it("CO_DIRECTOR cannot edit any district", () => {
      const user = createFullUser("CO_DIRECTOR", { districtId: "DIST-001" });

      expect(canEditDistrict(user, "DIST-001")).toBe(false);
    });
  });

  describe("CAMPUS_DIRECTOR - own district only", () => {
    it("CAMPUS_DIRECTOR can edit their own district", () => {
      const user = createFullUser("CAMPUS_DIRECTOR", {
        districtId: "DIST-050",
      });

      expect(canEditDistrict(user, "DIST-050")).toBe(true);
    });

    it("CAMPUS_DIRECTOR cannot edit different district", () => {
      const user = createFullUser("CAMPUS_DIRECTOR", {
        districtId: "DIST-050",
      });

      expect(canEditDistrict(user, "DIST-999")).toBe(false);
    });
  });

  describe("DISTRICT_DIRECTOR - entire region", () => {
    it("DISTRICT_DIRECTOR can edit any district (region-level)", () => {
      const user = createFullUser("DISTRICT_DIRECTOR");

      expect(canEditDistrict(user, "DIST-001")).toBe(true);
      expect(canEditDistrict(user, "ANY-DISTRICT")).toBe(true);
    });
  });

  describe("REGION_DIRECTOR and ADMIN - full national access", () => {
    it("REGION_DIRECTOR can edit any district", () => {
      const user = createFullUser("REGION_DIRECTOR");

      expect(canEditDistrict(user, "ANY-DISTRICT")).toBe(true);
    });

    it("ADMIN can edit any district", () => {
      const user = createFullUser("ADMIN");

      expect(canEditDistrict(user, "ANY-DISTRICT")).toBe(true);
    });
  });
});

// ============================================================================
// SECTION 6: canEditRegion Tests
// ============================================================================

describe("canEditRegion", () => {
  function createFullUser(
    role: string,
    overrides: Partial<{
      regionId: string | null;
      approvalStatus: "ACTIVE" | "PENDING" | "INACTIVE";
    }> = {}
  ) {
    return {
      id: 1,
      fullName: "Test User",
      email: "test@example.com",
      role: role as InsertUser["role"],
      campusId: 1,
      districtId: "DIST-001",
      regionId: "REG-001",
      approvalStatus: "ACTIVE" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      loginProvider: "google" as const,
      providerId: "123",
      ...overrides,
    };
  }

  describe("STAFF, CO_DIRECTOR, CAMPUS_DIRECTOR - cannot edit regions", () => {
    it("STAFF cannot edit any region", () => {
      const user = createFullUser("STAFF");

      expect(canEditRegion(user, "REG-001")).toBe(false);
    });

    it("CO_DIRECTOR cannot edit any region", () => {
      const user = createFullUser("CO_DIRECTOR");

      expect(canEditRegion(user, "REG-001")).toBe(false);
    });

    it("CAMPUS_DIRECTOR cannot edit any region", () => {
      const user = createFullUser("CAMPUS_DIRECTOR");

      expect(canEditRegion(user, "REG-001")).toBe(false);
    });
  });

  describe("DISTRICT_DIRECTOR - own region only", () => {
    it("DISTRICT_DIRECTOR can edit their own region", () => {
      const user = createFullUser("DISTRICT_DIRECTOR", { regionId: "REG-050" });

      expect(canEditRegion(user, "REG-050")).toBe(true);
    });

    it("DISTRICT_DIRECTOR cannot edit different region", () => {
      const user = createFullUser("DISTRICT_DIRECTOR", { regionId: "REG-050" });

      expect(canEditRegion(user, "REG-999")).toBe(false);
    });
  });

  describe("REGION_DIRECTOR and ADMIN - full national access", () => {
    it("REGION_DIRECTOR can edit any region", () => {
      const user = createFullUser("REGION_DIRECTOR");

      expect(canEditRegion(user, "ANY-REGION")).toBe(true);
    });

    it("ADMIN can edit any region", () => {
      const user = createFullUser("ADMIN");

      expect(canEditRegion(user, "ANY-REGION")).toBe(true);
    });
  });
});

// ============================================================================
// SECTION 7: canEditNational Tests
// ============================================================================

describe("canEditNational", () => {
  function createFullUser(
    role: string,
    overrides: Partial<{
      approvalStatus: "ACTIVE" | "PENDING" | "INACTIVE";
    }> = {}
  ) {
    return {
      id: 1,
      fullName: "Test User",
      email: "test@example.com",
      role: role as InsertUser["role"],
      campusId: 1,
      districtId: "DIST-001",
      regionId: "REG-001",
      approvalStatus: "ACTIVE" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      loginProvider: "google" as const,
      providerId: "123",
      ...overrides,
    };
  }

  describe("lower roles cannot edit nationally", () => {
    it("STAFF cannot edit nationally", () => {
      expect(canEditNational(createFullUser("STAFF"))).toBe(false);
    });

    it("CO_DIRECTOR cannot edit nationally", () => {
      expect(canEditNational(createFullUser("CO_DIRECTOR"))).toBe(false);
    });

    it("CAMPUS_DIRECTOR cannot edit nationally", () => {
      expect(canEditNational(createFullUser("CAMPUS_DIRECTOR"))).toBe(false);
    });

    it("DISTRICT_DIRECTOR cannot edit nationally", () => {
      expect(canEditNational(createFullUser("DISTRICT_DIRECTOR"))).toBe(false);
    });
  });

  describe("REGION_DIRECTOR and ADMIN can edit nationally", () => {
    it("REGION_DIRECTOR can edit nationally", () => {
      expect(canEditNational(createFullUser("REGION_DIRECTOR"))).toBe(true);
    });

    it("ADMIN can edit nationally", () => {
      expect(canEditNational(createFullUser("ADMIN"))).toBe(true);
    });
  });

  describe("approvalStatus requirements", () => {
    it("PENDING ADMIN cannot edit nationally", () => {
      const user = createFullUser("ADMIN", { approvalStatus: "PENDING" });

      expect(canEditNational(user)).toBe(false);
    });

    it("INACTIVE REGION_DIRECTOR cannot edit nationally", () => {
      const user = createFullUser("REGION_DIRECTOR", {
        approvalStatus: "INACTIVE",
      });

      expect(canEditNational(user)).toBe(false);
    });
  });
});

// ============================================================================
// SECTION 8: Edge Cases and Integration Scenarios
// ============================================================================

describe("edge cases and integration scenarios", () => {
  describe("scope hierarchy is correctly enforced", () => {
    it("CAMPUS scope is narrowest - cannot access other campuses", () => {
      const staff = createUser("STAFF", { campusId: 1 });
      const sameCampus = createPerson({ primaryCampusId: 1 });
      const differentCampus = createPerson({ primaryCampusId: 2 });

      expect(canAccessPerson(staff, sameCampus)).toBe(true);
      expect(canAccessPerson(staff, differentCampus)).toBe(false);
    });

    it("DISTRICT scope includes all campuses in district", () => {
      const campusDir = createUser("CAMPUS_DIRECTOR", { districtId: "D-1" });
      const sameDistrict1 = createPerson({
        primaryCampusId: 1,
        primaryDistrictId: "D-1",
      });
      const sameDistrict2 = createPerson({
        primaryCampusId: 99,
        primaryDistrictId: "D-1",
      });
      const diffDistrict = createPerson({ primaryDistrictId: "D-999" });

      expect(canAccessPerson(campusDir, sameDistrict1)).toBe(true);
      expect(canAccessPerson(campusDir, sameDistrict2)).toBe(true);
      expect(canAccessPerson(campusDir, diffDistrict)).toBe(false);
    });

    it("REGION scope includes all districts in region", () => {
      const distDir = createUser("DISTRICT_DIRECTOR", { regionId: "R-1" });
      const sameRegion1 = createPerson({
        primaryDistrictId: "D-1",
        primaryRegion: "R-1",
      });
      const sameRegion2 = createPerson({
        primaryDistrictId: "D-99",
        primaryRegion: "R-1",
      });
      const diffRegion = createPerson({ primaryRegion: "R-999" });

      expect(canAccessPerson(distDir, sameRegion1)).toBe(true);
      expect(canAccessPerson(distDir, sameRegion2)).toBe(true);
      expect(canAccessPerson(distDir, diffRegion)).toBe(false);
    });

    it("ALL scope includes everything", () => {
      const admin = createUser("ADMIN");
      const person1 = createPerson({
        primaryCampusId: 1,
        primaryDistrictId: "D-1",
        primaryRegion: "R-1",
      });
      const person2 = createPerson({
        primaryCampusId: 999,
        primaryDistrictId: "D-999",
        primaryRegion: "R-999",
      });
      const personNoAnchors = createPerson({
        primaryCampusId: null,
        primaryDistrictId: null,
        primaryRegion: null,
      });

      expect(canAccessPerson(admin, person1)).toBe(true);
      expect(canAccessPerson(admin, person2)).toBe(true);
      expect(canAccessPerson(admin, personNoAnchors)).toBe(true);
    });
  });

  describe("role variations are handled consistently", () => {
    const testCases = [
      { role: "STAFF", expectedLevel: "CAMPUS" },
      { role: "staff", expectedLevel: "CAMPUS" }, // lowercase
      { role: " STAFF ", expectedLevel: "CAMPUS" }, // whitespace
      { role: "Co-Director", expectedLevel: "CAMPUS" }, // mixed case with dash
      { role: "CO_DIRECTOR", expectedLevel: "CAMPUS" },
      { role: "Campus Director", expectedLevel: "DISTRICT" }, // space separator
      { role: "CAMPUS_DIRECTOR", expectedLevel: "DISTRICT" },
      { role: "District-Director", expectedLevel: "REGION" }, // dash separator
      { role: "DISTRICT_DIRECTOR", expectedLevel: "REGION" },
      { role: "Region Director", expectedLevel: "ALL" },
      { role: "REGION_DIRECTOR", expectedLevel: "ALL" },
      { role: "admin", expectedLevel: "ALL" }, // lowercase
      { role: "ADMIN", expectedLevel: "ALL" },
    ];

    testCases.forEach(({ role, expectedLevel }) => {
      it(`role "${role}" maps to ${expectedLevel} scope`, () => {
        const user = createUser(role);
        const scope = getPeopleScope(user);

        expect(scope.level).toBe(expectedLevel);
      });
    });
  });

  describe("boundary conditions", () => {
    it("campusId: 0 is valid (not treated as null/missing)", () => {
      const user = createUser("STAFF", { campusId: 0 });
      const scope = getPeopleScope(user);

      expect(scope).toEqual({ level: "CAMPUS", campusId: 0 });
    });

    it("empty string districtId is treated as falsy - throws FORBIDDEN (fail-closed)", () => {
      const user = createUser("CAMPUS_DIRECTOR", { districtId: "" });

      // Empty string is falsy, so fails closed correctly
      expect(() => getPeopleScope(user)).toThrow(TRPCError);
      expect(() => getPeopleScope(user)).toThrow("missing districtId");
    });

    it("empty string regionId is treated as falsy - throws FORBIDDEN (fail-closed)", () => {
      const user = createUser("DISTRICT_DIRECTOR", { regionId: "" });

      // Empty string is falsy, so fails closed correctly
      expect(() => getPeopleScope(user)).toThrow(TRPCError);
      expect(() => getPeopleScope(user)).toThrow("missing regionId");
    });
  });
});
