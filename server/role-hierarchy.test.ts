import { describe, expect, it } from "vitest";
import {
  isAdmin,
  isRegionDirector,
  isDistrictDirector,
  isCampusDirector,
  isAtLeast,
  canManage,
  type UserRole,
} from "./_core/authorization";

describe("Role hierarchy helpers", () => {
  describe("isAdmin", () => {
    it("returns true for ADMIN role", () => {
      expect(isAdmin("ADMIN")).toBe(true);
    });

    it("returns false for non-ADMIN roles", () => {
      expect(isAdmin("REGION_DIRECTOR")).toBe(false);
      expect(isAdmin("DISTRICT_DIRECTOR")).toBe(false);
      expect(isAdmin("CAMPUS_DIRECTOR")).toBe(false);
      expect(isAdmin("CO_DIRECTOR")).toBe(false);
      expect(isAdmin("STAFF")).toBe(false);
    });
  });

  describe("isRegionDirector", () => {
    it("returns true for REGION_DIRECTOR role", () => {
      expect(isRegionDirector("REGION_DIRECTOR")).toBe(true);
    });

    it("returns false for non-REGION_DIRECTOR roles", () => {
      expect(isRegionDirector("ADMIN")).toBe(false);
      expect(isRegionDirector("DISTRICT_DIRECTOR")).toBe(false);
      expect(isRegionDirector("CAMPUS_DIRECTOR")).toBe(false);
      expect(isRegionDirector("CO_DIRECTOR")).toBe(false);
      expect(isRegionDirector("STAFF")).toBe(false);
    });
  });

  describe("isDistrictDirector", () => {
    it("returns true for DISTRICT_DIRECTOR role", () => {
      expect(isDistrictDirector("DISTRICT_DIRECTOR")).toBe(true);
    });

    it("returns false for non-DISTRICT_DIRECTOR roles", () => {
      expect(isDistrictDirector("ADMIN")).toBe(false);
      expect(isDistrictDirector("REGION_DIRECTOR")).toBe(false);
      expect(isDistrictDirector("CAMPUS_DIRECTOR")).toBe(false);
      expect(isDistrictDirector("CO_DIRECTOR")).toBe(false);
      expect(isDistrictDirector("STAFF")).toBe(false);
    });
  });

  describe("isCampusDirector", () => {
    it("returns true for CAMPUS_DIRECTOR role", () => {
      expect(isCampusDirector("CAMPUS_DIRECTOR")).toBe(true);
    });

    it("returns false for non-CAMPUS_DIRECTOR roles", () => {
      expect(isCampusDirector("ADMIN")).toBe(false);
      expect(isCampusDirector("REGION_DIRECTOR")).toBe(false);
      expect(isCampusDirector("DISTRICT_DIRECTOR")).toBe(false);
      expect(isCampusDirector("CO_DIRECTOR")).toBe(false);
      expect(isCampusDirector("STAFF")).toBe(false);
    });
  });

  describe("isAtLeast", () => {
    it("returns true for same role level", () => {
      expect(isAtLeast("ADMIN", "ADMIN")).toBe(true);
      expect(isAtLeast("REGION_DIRECTOR", "REGION_DIRECTOR")).toBe(true);
      expect(isAtLeast("DISTRICT_DIRECTOR", "DISTRICT_DIRECTOR")).toBe(true);
      expect(isAtLeast("CAMPUS_DIRECTOR", "CAMPUS_DIRECTOR")).toBe(true);
      expect(isAtLeast("CO_DIRECTOR", "CO_DIRECTOR")).toBe(true);
      expect(isAtLeast("STAFF", "STAFF")).toBe(true);
    });

    it("returns true for higher role levels", () => {
      expect(isAtLeast("ADMIN", "REGION_DIRECTOR")).toBe(true);
      expect(isAtLeast("ADMIN", "DISTRICT_DIRECTOR")).toBe(true);
      expect(isAtLeast("ADMIN", "CAMPUS_DIRECTOR")).toBe(true);
      expect(isAtLeast("ADMIN", "CO_DIRECTOR")).toBe(true);
      expect(isAtLeast("ADMIN", "STAFF")).toBe(true);

      expect(isAtLeast("REGION_DIRECTOR", "DISTRICT_DIRECTOR")).toBe(true);
      expect(isAtLeast("REGION_DIRECTOR", "CAMPUS_DIRECTOR")).toBe(true);
      expect(isAtLeast("REGION_DIRECTOR", "CO_DIRECTOR")).toBe(true);
      expect(isAtLeast("REGION_DIRECTOR", "STAFF")).toBe(true);

      expect(isAtLeast("DISTRICT_DIRECTOR", "CAMPUS_DIRECTOR")).toBe(true);
      expect(isAtLeast("DISTRICT_DIRECTOR", "CO_DIRECTOR")).toBe(true);
      expect(isAtLeast("DISTRICT_DIRECTOR", "STAFF")).toBe(true);

      expect(isAtLeast("CAMPUS_DIRECTOR", "CO_DIRECTOR")).toBe(true);
      expect(isAtLeast("CAMPUS_DIRECTOR", "STAFF")).toBe(true);

      expect(isAtLeast("CO_DIRECTOR", "STAFF")).toBe(true);
    });

    it("returns false for lower role levels", () => {
      expect(isAtLeast("STAFF", "CO_DIRECTOR")).toBe(false);
      expect(isAtLeast("STAFF", "CAMPUS_DIRECTOR")).toBe(false);
      expect(isAtLeast("STAFF", "DISTRICT_DIRECTOR")).toBe(false);
      expect(isAtLeast("STAFF", "REGION_DIRECTOR")).toBe(false);
      expect(isAtLeast("STAFF", "ADMIN")).toBe(false);

      expect(isAtLeast("CO_DIRECTOR", "CAMPUS_DIRECTOR")).toBe(false);
      expect(isAtLeast("CO_DIRECTOR", "DISTRICT_DIRECTOR")).toBe(false);
      expect(isAtLeast("CO_DIRECTOR", "REGION_DIRECTOR")).toBe(false);
      expect(isAtLeast("CO_DIRECTOR", "ADMIN")).toBe(false);

      expect(isAtLeast("CAMPUS_DIRECTOR", "DISTRICT_DIRECTOR")).toBe(false);
      expect(isAtLeast("CAMPUS_DIRECTOR", "REGION_DIRECTOR")).toBe(false);
      expect(isAtLeast("CAMPUS_DIRECTOR", "ADMIN")).toBe(false);

      expect(isAtLeast("DISTRICT_DIRECTOR", "REGION_DIRECTOR")).toBe(false);
      expect(isAtLeast("DISTRICT_DIRECTOR", "ADMIN")).toBe(false);

      expect(isAtLeast("REGION_DIRECTOR", "ADMIN")).toBe(false);
    });
  });

  describe("canManage", () => {
    it("returns false for same role level", () => {
      expect(canManage("ADMIN", "ADMIN")).toBe(false);
      expect(canManage("REGION_DIRECTOR", "REGION_DIRECTOR")).toBe(false);
      expect(canManage("DISTRICT_DIRECTOR", "DISTRICT_DIRECTOR")).toBe(false);
      expect(canManage("CAMPUS_DIRECTOR", "CAMPUS_DIRECTOR")).toBe(false);
      expect(canManage("CO_DIRECTOR", "CO_DIRECTOR")).toBe(false);
      expect(canManage("STAFF", "STAFF")).toBe(false);
    });

    it("returns true when manager role is higher", () => {
      expect(canManage("ADMIN", "REGION_DIRECTOR")).toBe(true);
      expect(canManage("ADMIN", "DISTRICT_DIRECTOR")).toBe(true);
      expect(canManage("ADMIN", "CAMPUS_DIRECTOR")).toBe(true);
      expect(canManage("ADMIN", "CO_DIRECTOR")).toBe(true);
      expect(canManage("ADMIN", "STAFF")).toBe(true);

      expect(canManage("REGION_DIRECTOR", "DISTRICT_DIRECTOR")).toBe(true);
      expect(canManage("REGION_DIRECTOR", "CAMPUS_DIRECTOR")).toBe(true);
      expect(canManage("REGION_DIRECTOR", "CO_DIRECTOR")).toBe(true);
      expect(canManage("REGION_DIRECTOR", "STAFF")).toBe(true);

      expect(canManage("DISTRICT_DIRECTOR", "CAMPUS_DIRECTOR")).toBe(true);
      expect(canManage("DISTRICT_DIRECTOR", "CO_DIRECTOR")).toBe(true);
      expect(canManage("DISTRICT_DIRECTOR", "STAFF")).toBe(true);

      expect(canManage("CAMPUS_DIRECTOR", "CO_DIRECTOR")).toBe(true);
      expect(canManage("CAMPUS_DIRECTOR", "STAFF")).toBe(true);

      expect(canManage("CO_DIRECTOR", "STAFF")).toBe(true);
    });

    it("returns false when manager role is lower", () => {
      expect(canManage("STAFF", "CO_DIRECTOR")).toBe(false);
      expect(canManage("STAFF", "CAMPUS_DIRECTOR")).toBe(false);
      expect(canManage("STAFF", "DISTRICT_DIRECTOR")).toBe(false);
      expect(canManage("STAFF", "REGION_DIRECTOR")).toBe(false);
      expect(canManage("STAFF", "ADMIN")).toBe(false);

      expect(canManage("CO_DIRECTOR", "CAMPUS_DIRECTOR")).toBe(false);
      expect(canManage("CO_DIRECTOR", "DISTRICT_DIRECTOR")).toBe(false);
      expect(canManage("CO_DIRECTOR", "REGION_DIRECTOR")).toBe(false);
      expect(canManage("CO_DIRECTOR", "ADMIN")).toBe(false);

      expect(canManage("CAMPUS_DIRECTOR", "DISTRICT_DIRECTOR")).toBe(false);
      expect(canManage("CAMPUS_DIRECTOR", "REGION_DIRECTOR")).toBe(false);
      expect(canManage("CAMPUS_DIRECTOR", "ADMIN")).toBe(false);

      expect(canManage("DISTRICT_DIRECTOR", "REGION_DIRECTOR")).toBe(false);
      expect(canManage("DISTRICT_DIRECTOR", "ADMIN")).toBe(false);

      expect(canManage("REGION_DIRECTOR", "ADMIN")).toBe(false);
    });
  });
});
