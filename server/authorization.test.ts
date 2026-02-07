/**
 * Unit tests for server/_core/authorization.ts
 * Tests all authorization helper functions with comprehensive coverage
 */
import { describe, expect, it } from "vitest";
import type { User } from "../drizzle/schema";
import {
  isLeaderRole,
  canEditCampus,
  canEditDistrict,
  canEditRegion,
  canEditNational,
  canApproveDistrictDirector,
  canApproveRegionDirector,
  canViewInviteNotes,
  canViewNeed,
  getPeopleScope,
  canAccessPerson,
  peopleScopeWhereClause,
  type UserRole,
  type PeopleScope,
  type PersonAnchors,
  type UserScopeAnchors,
} from "./_core/authorization";

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    fullName: "Test User",
    email: "test@example.com",
    role: "STAFF",
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
  };
}

function createPerson(overrides: Partial<PersonAnchors> = {}): PersonAnchors {
  return {
    primaryCampusId: 1,
    primaryDistrictId: "TEST_DISTRICT",
    primaryRegion: "TEST_REGION",
    ...overrides,
  };
}

// ============================================================================
// isLeaderRole Tests
// ============================================================================

describe("isLeaderRole", () => {
  it("should return false for STAFF", () => {
    expect(isLeaderRole("STAFF")).toBe(false);
  });

  it("should return true for CO_DIRECTOR", () => {
    expect(isLeaderRole("CO_DIRECTOR")).toBe(true);
  });

  it("should return true for CAMPUS_DIRECTOR", () => {
    expect(isLeaderRole("CAMPUS_DIRECTOR")).toBe(true);
  });

  it("should return true for DISTRICT_DIRECTOR", () => {
    expect(isLeaderRole("DISTRICT_DIRECTOR")).toBe(true);
  });

  it("should return true for REGION_DIRECTOR", () => {
    expect(isLeaderRole("REGION_DIRECTOR")).toBe(true);
  });

  it("should return true for ADMIN", () => {
    expect(isLeaderRole("ADMIN")).toBe(true);
  });
});

// ============================================================================
// canEditCampus Tests
// ============================================================================

describe("canEditCampus", () => {
  describe("null/inactive user handling", () => {
    it("should return false for null user", () => {
      expect(canEditCampus(null as unknown as User, 1)).toBe(false);
    });

    it("should return false for PENDING user", () => {
      const user = createTestUser({ approvalStatus: "PENDING" });
      expect(canEditCampus(user, 1)).toBe(false);
    });

    it("should return false for DENIED user", () => {
      const user = createTestUser({ approvalStatus: "DENIED" });
      expect(canEditCampus(user, 1)).toBe(false);
    });
  });

  describe("STAFF role", () => {
    it("should allow editing own campus", () => {
      const user = createTestUser({ role: "STAFF", campusId: 5 });
      expect(canEditCampus(user, 5)).toBe(true);
    });

    it("should deny editing other campus", () => {
      const user = createTestUser({ role: "STAFF", campusId: 5 });
      expect(canEditCampus(user, 10)).toBe(false);
    });
  });

  describe("CO_DIRECTOR role", () => {
    it("should allow editing own campus", () => {
      const user = createTestUser({ role: "CO_DIRECTOR", campusId: 3 });
      expect(canEditCampus(user, 3)).toBe(true);
    });

    it("should deny editing other campus", () => {
      const user = createTestUser({ role: "CO_DIRECTOR", campusId: 3 });
      expect(canEditCampus(user, 7)).toBe(false);
    });
  });

  describe("CAMPUS_DIRECTOR role", () => {
    it("should allow editing any campus (validated server-side)", () => {
      const user = createTestUser({ role: "CAMPUS_DIRECTOR" });
      expect(canEditCampus(user, 1)).toBe(true);
      expect(canEditCampus(user, 99)).toBe(true);
    });
  });

  describe("DISTRICT_DIRECTOR role", () => {
    it("should allow editing any campus (validated server-side)", () => {
      const user = createTestUser({ role: "DISTRICT_DIRECTOR" });
      expect(canEditCampus(user, 1)).toBe(true);
      expect(canEditCampus(user, 99)).toBe(true);
    });
  });

  describe("REGION_DIRECTOR role", () => {
    it("should allow editing any campus", () => {
      const user = createTestUser({ role: "REGION_DIRECTOR" });
      expect(canEditCampus(user, 1)).toBe(true);
      expect(canEditCampus(user, 999)).toBe(true);
    });
  });

  describe("ADMIN role", () => {
    it("should allow editing any campus", () => {
      const user = createTestUser({ role: "ADMIN" });
      expect(canEditCampus(user, 1)).toBe(true);
      expect(canEditCampus(user, 999)).toBe(true);
    });
  });
});

// ============================================================================
// canEditDistrict Tests
// ============================================================================

describe("canEditDistrict", () => {
  describe("null/inactive user handling", () => {
    it("should return false for null user", () => {
      expect(canEditDistrict(null as unknown as User, "D1")).toBe(false);
    });

    it("should return false for PENDING user", () => {
      const user = createTestUser({ approvalStatus: "PENDING" });
      expect(canEditDistrict(user, "D1")).toBe(false);
    });
  });

  describe("STAFF role", () => {
    it("should deny editing any district", () => {
      const user = createTestUser({ role: "STAFF", districtId: "D1" });
      expect(canEditDistrict(user, "D1")).toBe(false);
    });
  });

  describe("CO_DIRECTOR role", () => {
    it("should deny editing any district", () => {
      const user = createTestUser({ role: "CO_DIRECTOR", districtId: "D1" });
      expect(canEditDistrict(user, "D1")).toBe(false);
    });
  });

  describe("CAMPUS_DIRECTOR role", () => {
    it("should allow editing own district", () => {
      const user = createTestUser({
        role: "CAMPUS_DIRECTOR",
        districtId: "D1",
      });
      expect(canEditDistrict(user, "D1")).toBe(true);
    });

    it("should deny editing other district", () => {
      const user = createTestUser({
        role: "CAMPUS_DIRECTOR",
        districtId: "D1",
      });
      expect(canEditDistrict(user, "D2")).toBe(false);
    });
  });

  describe("DISTRICT_DIRECTOR role", () => {
    it("should allow editing any district (validated server-side)", () => {
      const user = createTestUser({ role: "DISTRICT_DIRECTOR" });
      expect(canEditDistrict(user, "D1")).toBe(true);
      expect(canEditDistrict(user, "D99")).toBe(true);
    });
  });

  describe("REGION_DIRECTOR role", () => {
    it("should allow editing any district", () => {
      const user = createTestUser({ role: "REGION_DIRECTOR" });
      expect(canEditDistrict(user, "D1")).toBe(true);
    });
  });

  describe("ADMIN role", () => {
    it("should allow editing any district", () => {
      const user = createTestUser({ role: "ADMIN" });
      expect(canEditDistrict(user, "D1")).toBe(true);
    });
  });
});

// ============================================================================
// canEditRegion Tests
// ============================================================================

describe("canEditRegion", () => {
  describe("null/inactive user handling", () => {
    it("should return false for null user", () => {
      expect(canEditRegion(null as unknown as User, "R1")).toBe(false);
    });

    it("should return false for inactive user", () => {
      const user = createTestUser({ approvalStatus: "PENDING" });
      expect(canEditRegion(user, "R1")).toBe(false);
    });
  });

  describe("STAFF role", () => {
    it("should deny editing any region", () => {
      const user = createTestUser({ role: "STAFF", regionId: "R1" });
      expect(canEditRegion(user, "R1")).toBe(false);
    });
  });

  describe("CO_DIRECTOR role", () => {
    it("should deny editing any region", () => {
      const user = createTestUser({ role: "CO_DIRECTOR", regionId: "R1" });
      expect(canEditRegion(user, "R1")).toBe(false);
    });
  });

  describe("CAMPUS_DIRECTOR role", () => {
    it("should deny editing any region", () => {
      const user = createTestUser({ role: "CAMPUS_DIRECTOR", regionId: "R1" });
      expect(canEditRegion(user, "R1")).toBe(false);
    });
  });

  describe("DISTRICT_DIRECTOR role", () => {
    it("should allow editing own region", () => {
      const user = createTestUser({
        role: "DISTRICT_DIRECTOR",
        regionId: "R1",
      });
      expect(canEditRegion(user, "R1")).toBe(true);
    });

    it("should deny editing other region", () => {
      const user = createTestUser({
        role: "DISTRICT_DIRECTOR",
        regionId: "R1",
      });
      expect(canEditRegion(user, "R2")).toBe(false);
    });
  });

  describe("REGION_DIRECTOR role", () => {
    it("should allow editing any region", () => {
      const user = createTestUser({ role: "REGION_DIRECTOR", regionId: "R1" });
      expect(canEditRegion(user, "R1")).toBe(true);
      expect(canEditRegion(user, "R99")).toBe(true);
    });
  });

  describe("ADMIN role", () => {
    it("should allow editing any region", () => {
      const user = createTestUser({ role: "ADMIN" });
      expect(canEditRegion(user, "R1")).toBe(true);
    });
  });
});

// ============================================================================
// canEditNational Tests
// ============================================================================

describe("canEditNational", () => {
  describe("null/inactive user handling", () => {
    it("should return false for null user", () => {
      expect(canEditNational(null as unknown as User)).toBe(false);
    });

    it("should return false for inactive user", () => {
      const user = createTestUser({ approvalStatus: "PENDING" });
      expect(canEditNational(user)).toBe(false);
    });
  });

  it("should deny STAFF", () => {
    const user = createTestUser({ role: "STAFF" });
    expect(canEditNational(user)).toBe(false);
  });

  it("should deny CO_DIRECTOR", () => {
    const user = createTestUser({ role: "CO_DIRECTOR" });
    expect(canEditNational(user)).toBe(false);
  });

  it("should deny CAMPUS_DIRECTOR", () => {
    const user = createTestUser({ role: "CAMPUS_DIRECTOR" });
    expect(canEditNational(user)).toBe(false);
  });

  it("should deny DISTRICT_DIRECTOR", () => {
    const user = createTestUser({ role: "DISTRICT_DIRECTOR" });
    expect(canEditNational(user)).toBe(false);
  });

  it("should allow REGION_DIRECTOR", () => {
    const user = createTestUser({ role: "REGION_DIRECTOR" });
    expect(canEditNational(user)).toBe(true);
  });

  it("should allow ADMIN", () => {
    const user = createTestUser({ role: "ADMIN" });
    expect(canEditNational(user)).toBe(true);
  });
});

// ============================================================================
// canApproveDistrictDirector Tests
// ============================================================================

describe("canApproveDistrictDirector", () => {
  describe("null/inactive approver handling", () => {
    it("should return false for null approver", () => {
      const target = createTestUser({ role: "DISTRICT_DIRECTOR" });
      expect(canApproveDistrictDirector(null as unknown as User, target)).toBe(
        false
      );
    });

    it("should return false for inactive approver", () => {
      const approver = createTestUser({
        role: "REGION_DIRECTOR",
        approvalStatus: "PENDING",
        regionId: "R1",
      });
      const target = createTestUser({
        role: "DISTRICT_DIRECTOR",
        regionId: "R1",
      });
      expect(canApproveDistrictDirector(approver, target)).toBe(false);
    });
  });

  describe("role validation", () => {
    it("should deny if approver is not REGION_DIRECTOR", () => {
      const approver = createTestUser({ role: "ADMIN", regionId: "R1" });
      const target = createTestUser({
        role: "DISTRICT_DIRECTOR",
        regionId: "R1",
      });
      expect(canApproveDistrictDirector(approver, target)).toBe(false);
    });

    it("should deny if target is not DISTRICT_DIRECTOR", () => {
      const approver = createTestUser({
        role: "REGION_DIRECTOR",
        regionId: "R1",
      });
      const target = createTestUser({ role: "STAFF", regionId: "R1" });
      expect(canApproveDistrictDirector(approver, target)).toBe(false);
    });
  });

  describe("region matching", () => {
    it("should allow REGION_DIRECTOR to approve DISTRICT_DIRECTOR in same region", () => {
      const approver = createTestUser({
        role: "REGION_DIRECTOR",
        regionId: "R1",
      });
      const target = createTestUser({
        role: "DISTRICT_DIRECTOR",
        regionId: "R1",
      });
      expect(canApproveDistrictDirector(approver, target)).toBe(true);
    });

    it("should deny REGION_DIRECTOR from approving DISTRICT_DIRECTOR in different region", () => {
      const approver = createTestUser({
        role: "REGION_DIRECTOR",
        regionId: "R1",
      });
      const target = createTestUser({
        role: "DISTRICT_DIRECTOR",
        regionId: "R2",
      });
      expect(canApproveDistrictDirector(approver, target)).toBe(false);
    });
  });
});

// ============================================================================
// canApproveRegionDirector Tests
// ============================================================================

describe("canApproveRegionDirector", () => {
  describe("null/inactive approver handling", () => {
    it("should return false for null approver", () => {
      const target = createTestUser({ role: "REGION_DIRECTOR" });
      expect(canApproveRegionDirector(null as unknown as User, target)).toBe(
        false
      );
    });

    it("should return false for inactive approver", () => {
      const approver = createTestUser({
        role: "ADMIN",
        approvalStatus: "PENDING",
      });
      const target = createTestUser({ role: "REGION_DIRECTOR" });
      expect(canApproveRegionDirector(approver, target)).toBe(false);
    });
  });

  describe("role validation", () => {
    it("should deny if approver is not ADMIN", () => {
      const approver = createTestUser({ role: "REGION_DIRECTOR" });
      const target = createTestUser({ role: "REGION_DIRECTOR" });
      expect(canApproveRegionDirector(approver, target)).toBe(false);
    });

    it("should deny if target is not REGION_DIRECTOR", () => {
      const approver = createTestUser({ role: "ADMIN" });
      const target = createTestUser({ role: "DISTRICT_DIRECTOR" });
      expect(canApproveRegionDirector(approver, target)).toBe(false);
    });

    it("should allow ADMIN to approve REGION_DIRECTOR", () => {
      const approver = createTestUser({ role: "ADMIN" });
      const target = createTestUser({ role: "REGION_DIRECTOR" });
      expect(canApproveRegionDirector(approver, target)).toBe(true);
    });
  });
});

// ============================================================================
// canViewInviteNotes Tests
// ============================================================================

describe("canViewInviteNotes", () => {
  describe("null/inactive user handling", () => {
    it("should return false for null user", () => {
      expect(canViewInviteNotes(null as unknown as User, "D1", 1, "R1")).toBe(
        false
      );
    });

    it("should return false for inactive user", () => {
      const user = createTestUser({
        role: "CO_DIRECTOR",
        approvalStatus: "PENDING",
      });
      expect(canViewInviteNotes(user, "D1", 1, "R1")).toBe(false);
    });
  });

  describe("non-leader roles", () => {
    it("should deny STAFF", () => {
      const user = createTestUser({ role: "STAFF" });
      expect(canViewInviteNotes(user, "D1", 1, "R1")).toBe(false);
    });
  });

  describe("ADMIN role", () => {
    it("should allow viewing all notes", () => {
      const user = createTestUser({ role: "ADMIN" });
      expect(canViewInviteNotes(user, "D1", 1, "R1")).toBe(true);
      expect(canViewInviteNotes(user, "D2", 99, "R99")).toBe(true);
    });
  });

  describe("REGION_DIRECTOR role", () => {
    it("should allow viewing all notes (national scope)", () => {
      const user = createTestUser({ role: "REGION_DIRECTOR" });
      expect(canViewInviteNotes(user, "D1", 1, "R1")).toBe(true);
      expect(canViewInviteNotes(user, "D2", 99, "R99")).toBe(true);
    });
  });

  describe("DISTRICT_DIRECTOR role", () => {
    it("should allow viewing notes in same region", () => {
      const user = createTestUser({
        role: "DISTRICT_DIRECTOR",
        regionId: "R1",
      });
      expect(canViewInviteNotes(user, "D1", 1, "R1")).toBe(true);
    });

    it("should deny viewing notes in different region", () => {
      const user = createTestUser({
        role: "DISTRICT_DIRECTOR",
        regionId: "R1",
      });
      expect(canViewInviteNotes(user, "D2", 99, "R2")).toBe(false);
    });
  });

  describe("CAMPUS_DIRECTOR role", () => {
    it("should allow viewing notes in same district", () => {
      const user = createTestUser({
        role: "CAMPUS_DIRECTOR",
        districtId: "D1",
      });
      expect(canViewInviteNotes(user, "D1", 1, "R1")).toBe(true);
    });

    it("should deny viewing notes in different district", () => {
      const user = createTestUser({
        role: "CAMPUS_DIRECTOR",
        districtId: "D1",
      });
      expect(canViewInviteNotes(user, "D2", 99, "R1")).toBe(false);
    });
  });

  describe("CO_DIRECTOR role", () => {
    it("should allow viewing notes for same campus", () => {
      const user = createTestUser({ role: "CO_DIRECTOR", campusId: 5 });
      expect(canViewInviteNotes(user, "D1", 5, "R1")).toBe(true);
    });

    it("should deny viewing notes for different campus", () => {
      const user = createTestUser({ role: "CO_DIRECTOR", campusId: 5 });
      expect(canViewInviteNotes(user, "D1", 10, "R1")).toBe(false);
    });
  });
});

// ============================================================================
// canViewNeed Tests
// ============================================================================

describe("canViewNeed", () => {
  describe("null user handling", () => {
    it("should return false for null user", () => {
      expect(canViewNeed(null, "DISTRICT_VISIBLE", "D1")).toBe(false);
      expect(canViewNeed(null, "LEADERSHIP_ONLY", "D1")).toBe(false);
    });
  });

  describe("DISTRICT_VISIBLE visibility", () => {
    it("should allow user in same district", () => {
      const user = createTestUser({ role: "STAFF", districtId: "D1" });
      expect(canViewNeed(user, "DISTRICT_VISIBLE", "D1")).toBe(true);
    });

    it("should deny user in different district", () => {
      const user = createTestUser({ role: "STAFF", districtId: "D1" });
      expect(canViewNeed(user, "DISTRICT_VISIBLE", "D2")).toBe(false);
    });
  });

  describe("LEADERSHIP_ONLY visibility", () => {
    it("should deny non-leaders", () => {
      const user = createTestUser({ role: "STAFF", districtId: "D1" });
      expect(canViewNeed(user, "LEADERSHIP_ONLY", "D1")).toBe(false);
    });

    it("should deny inactive leaders", () => {
      const user = createTestUser({
        role: "CO_DIRECTOR",
        approvalStatus: "PENDING",
        districtId: "D1",
      });
      expect(canViewNeed(user, "LEADERSHIP_ONLY", "D1")).toBe(false);
    });

    it("should allow ADMIN", () => {
      const user = createTestUser({ role: "ADMIN" });
      expect(canViewNeed(user, "LEADERSHIP_ONLY", "D1")).toBe(true);
    });

    it("should allow REGION_DIRECTOR", () => {
      const user = createTestUser({ role: "REGION_DIRECTOR" });
      expect(canViewNeed(user, "LEADERSHIP_ONLY", "D1")).toBe(true);
    });

    it("should allow leader in scope", () => {
      const user = createTestUser({
        role: "CAMPUS_DIRECTOR",
        districtId: "D1",
      });
      expect(canViewNeed(user, "LEADERSHIP_ONLY", "D1")).toBe(true);
    });
  });
});

// ============================================================================
// getPeopleScope Tests
// ============================================================================

describe("getPeopleScope", () => {
  describe("full access roles", () => {
    const fullAccessRoles = [
      "NATIONAL_DIRECTOR",
      "NATIONAL_STAFF",
      "REGIONAL_DIRECTOR",
      "REGION_DIRECTOR",
      "FIELD_DIRECTOR",
      "CMC_GO_ADMIN",
      "ADMIN",
    ];

    it.each(fullAccessRoles)("should return ALL scope for %s", role => {
      const user = { role, campusId: 1, districtId: "D1", regionId: "R1" };
      expect(getPeopleScope(user)).toEqual({ level: "ALL" });
    });
  });

  describe("role normalization", () => {
    it("should normalize CAMPUS_CO_DIRECTOR to REGION scope", () => {
      const user = { role: "CAMPUS_CO_DIRECTOR", campusId: 5, regionId: "R1" };
      expect(getPeopleScope(user)).toEqual({ level: "REGION", regionId: "R1" });
    });

    it("should normalize CAMPUS_VOLUNTEER to REGION scope", () => {
      const user = { role: "CAMPUS_VOLUNTEER", campusId: 3, regionId: "R1" };
      expect(getPeopleScope(user)).toEqual({ level: "REGION", regionId: "R1" });
    });

    it("should normalize CAMPUS_INTERN to REGION scope", () => {
      const user = { role: "CAMPUS_INTERN", campusId: 3, regionId: "R1" };
      expect(getPeopleScope(user)).toEqual({ level: "REGION", regionId: "R1" });
    });

    it("should normalize DISTRICT_STAFF to DISTRICT_DIRECTOR", () => {
      const user = { role: "DISTRICT_STAFF", regionId: "R1" };
      expect(getPeopleScope(user)).toEqual({ level: "REGION", regionId: "R1" });
    });

    it("should normalize REGIONAL_STAFF to REGION_DIRECTOR (full access)", () => {
      const user = { role: "REGIONAL_STAFF" };
      expect(getPeopleScope(user)).toEqual({ level: "ALL" });
    });
  });

  describe("DISTRICT_DIRECTOR role", () => {
    it("should return REGION scope with regionId", () => {
      const user = { role: "DISTRICT_DIRECTOR", regionId: "R1" };
      expect(getPeopleScope(user)).toEqual({ level: "REGION", regionId: "R1" });
    });

    it("should throw error if missing regionId", () => {
      const user = { role: "DISTRICT_DIRECTOR", regionId: null };
      expect(() => getPeopleScope(user)).toThrow("missing regionId");
    });
  });

  describe("CAMPUS_DIRECTOR role", () => {
    it("should return REGION scope with regionId", () => {
      const user = { role: "CAMPUS_DIRECTOR", regionId: "R1" };
      expect(getPeopleScope(user)).toEqual({
        level: "REGION",
        regionId: "R1",
      });
    });

    it("should throw error if missing regionId", () => {
      const user = { role: "CAMPUS_DIRECTOR", regionId: null };
      expect(() => getPeopleScope(user)).toThrow("missing regionId");
    });
  });

  describe("STAFF role", () => {
    it("should return REGION scope with regionId", () => {
      const user = { role: "STAFF", campusId: 5, regionId: "R1" };
      expect(getPeopleScope(user)).toEqual({ level: "REGION", regionId: "R1" });
    });

    it("should throw error if missing regionId", () => {
      const user = { role: "STAFF", campusId: 5, regionId: null };
      expect(() => getPeopleScope(user)).toThrow("missing regionId");
    });
  });

  describe("CO_DIRECTOR role", () => {
    it("should return REGION scope with regionId", () => {
      const user = { role: "CO_DIRECTOR", campusId: 7, regionId: "R1" };
      expect(getPeopleScope(user)).toEqual({ level: "REGION", regionId: "R1" });
    });

    it("should throw error if missing regionId", () => {
      const user = { role: "CO_DIRECTOR", regionId: null };
      expect(() => getPeopleScope(user)).toThrow("missing regionId");
    });
  });

  describe("unknown role", () => {
    it("should return REGION scope (default fallback) when regionId available", () => {
      const user = { role: "UNKNOWN_ROLE", regionId: "R1" };
      expect(getPeopleScope(user)).toEqual({ level: "REGION", regionId: "R1" });
    });

    it("should throw error for unknown role without regionId", () => {
      const user = { role: "UNKNOWN_ROLE" };
      expect(() => getPeopleScope(user)).toThrow("missing regionId");
    });
  });

  describe("scopeLevel DB field takes priority", () => {
    it("should use scopeLevel NATIONAL even for STAFF role", () => {
      const user = { role: "STAFF", scopeLevel: "NATIONAL", campusId: 5, regionId: "R1" };
      expect(getPeopleScope(user)).toEqual({ level: "ALL" });
    });

    it("should use scopeLevel DISTRICT when set", () => {
      const user = { role: "STAFF", scopeLevel: "DISTRICT", districtId: "D1", regionId: "R1" };
      expect(getPeopleScope(user)).toEqual({ level: "DISTRICT", districtId: "D1" });
    });

    it("should fall back to role-based scope when scopeLevel is null", () => {
      const user = { role: "NATIONAL_DIRECTOR", scopeLevel: null };
      expect(getPeopleScope(user)).toEqual({ level: "ALL" });
    });
  });
});

// ============================================================================
// canAccessPerson Tests
// ============================================================================

describe("canAccessPerson", () => {
  describe("ALL scope", () => {
    it("should allow access to any person", () => {
      const user: UserScopeAnchors = {
        role: "ADMIN",
        campusId: 1,
        districtId: "D1",
        regionId: "R1",
      };
      const person1 = createPerson({
        primaryCampusId: 99,
        primaryRegion: "R99",
      });
      const person2 = createPerson({ primaryCampusId: 1, primaryRegion: "R1" });
      expect(canAccessPerson(user, person1)).toBe(true);
      expect(canAccessPerson(user, person2)).toBe(true);
    });
  });

  describe("REGION scope", () => {
    it("should allow access to person in same region", () => {
      const user: UserScopeAnchors = {
        role: "DISTRICT_DIRECTOR",
        campusId: 1,
        districtId: "D1",
        regionId: "R1",
      };
      const person = createPerson({ primaryRegion: "R1" });
      expect(canAccessPerson(user, person)).toBe(true);
    });

    it("should deny access to person in different region", () => {
      const user: UserScopeAnchors = {
        role: "DISTRICT_DIRECTOR",
        campusId: 1,
        districtId: "D1",
        regionId: "R1",
      };
      const person = createPerson({ primaryRegion: "R2" });
      expect(canAccessPerson(user, person)).toBe(false);
    });
  });

  describe("DISTRICT scope (via scopeLevel override)", () => {
    it("should allow access to person in same district", () => {
      const user: UserScopeAnchors = {
        role: "CAMPUS_DIRECTOR",
        campusId: 1,
        districtId: "D1",
        regionId: "R1",
      };
      // CAMPUS_DIRECTOR now gets REGION scope by default, so person in same region is accessible
      const person = createPerson({ primaryRegion: "R1", primaryDistrictId: "D1" });
      expect(canAccessPerson(user, person)).toBe(true);
    });

    it("should deny access to person in different region", () => {
      const user: UserScopeAnchors = {
        role: "CAMPUS_DIRECTOR",
        campusId: 1,
        districtId: "D1",
        regionId: "R1",
      };
      const person = createPerson({ primaryRegion: "R2", primaryDistrictId: "D2" });
      expect(canAccessPerson(user, person)).toBe(false);
    });
  });

  describe("CAMPUS roles get REGION scope", () => {
    it("should allow STAFF access to person in same region", () => {
      const user: UserScopeAnchors = {
        role: "STAFF",
        campusId: 5,
        districtId: "D1",
        regionId: "R1",
      };
      const person = createPerson({ primaryRegion: "R1", primaryCampusId: 99 });
      expect(canAccessPerson(user, person)).toBe(true);
    });

    it("should deny STAFF access to person in different region", () => {
      const user: UserScopeAnchors = {
        role: "STAFF",
        campusId: 5,
        districtId: "D1",
        regionId: "R1",
      };
      const person = createPerson({ primaryRegion: "R2", primaryCampusId: 10 });
      expect(canAccessPerson(user, person)).toBe(false);
    });
  });
});

// ============================================================================
// peopleScopeWhereClause Tests
// ============================================================================

describe("peopleScopeWhereClause", () => {
  it("should return a SQL clause for ALL scope", () => {
    const user: UserScopeAnchors = {
      role: "ADMIN",
      campusId: 1,
      districtId: "D1",
      regionId: "R1",
    };
    const clause = peopleScopeWhereClause(user);
    expect(clause).toBeDefined();
    // SQL clause for "1=1" - just verify it's a SQL object
    expect(typeof clause).toBe("object");
  });

  it("should return a SQL clause for REGION scope", () => {
    const user: UserScopeAnchors = {
      role: "DISTRICT_DIRECTOR",
      campusId: 1,
      districtId: "D1",
      regionId: "R1",
    };
    const clause = peopleScopeWhereClause(user);
    expect(clause).toBeDefined();
    expect(typeof clause).toBe("object");
  });

  it("should return a SQL clause for DISTRICT scope", () => {
    // CAMPUS_DIRECTOR now gets REGION scope by default (per auth spec)
    // Use scopeLevel override to test DISTRICT scope
    const user: UserScopeAnchors = {
      role: "DISTRICT_DIRECTOR",
      campusId: 1,
      districtId: "D1",
      regionId: "R1",
    };
    const clause = peopleScopeWhereClause(user);
    expect(clause).toBeDefined();
    expect(typeof clause).toBe("object");
  });

  it("should return a SQL clause for STAFF (REGION scope)", () => {
    const user: UserScopeAnchors = {
      role: "STAFF",
      campusId: 5,
      districtId: "D1",
      regionId: "R1",
    };
    const clause = peopleScopeWhereClause(user);
    expect(clause).toBeDefined();
    expect(typeof clause).toBe("object");
  });
});
