import { describe, expect, it } from "vitest";
import { QueryBuilder } from "drizzle-orm/mysql-core";
import { people } from "../drizzle/schema";
import {
  canAccessPerson,
  peopleScopeWhereClause,
  type UserScopeAnchors,
} from "./_core/authorization";

describe("people visibility helpers", () => {
  describe("canAccessPerson", () => {
    it("allows ALL scope to access any person", () => {
      const user: UserScopeAnchors = {
        role: "ADMIN",
        campusId: 1,
        districtId: null,
        regionId: null,
      };

      expect(
        canAccessPerson(user, {
          primaryCampusId: null,
          primaryDistrictId: null,
          primaryRegion: null,
        })
      ).toBe(true);
    });

    it("enforces CAMPUS scope by primaryCampusId", () => {
      const user: UserScopeAnchors = {
        role: "STAFF",
        campusId: 5,
        districtId: "D-1",
        regionId: "R-1",
      };

      expect(
        canAccessPerson(user, {
          primaryCampusId: 5,
          primaryDistrictId: "D-999",
          primaryRegion: "R-999",
        })
      ).toBe(true);

      expect(
        canAccessPerson(user, {
          primaryCampusId: 6,
          primaryDistrictId: "D-1",
          primaryRegion: "R-1",
        })
      ).toBe(false);

      expect(
        canAccessPerson(user, {
          primaryCampusId: null,
          primaryDistrictId: "D-1",
          primaryRegion: "R-1",
        })
      ).toBe(false);
    });

    it("enforces DISTRICT scope by primaryDistrictId (CAMPUS_DIRECTOR)", () => {
      const user: UserScopeAnchors = {
        role: "CAMPUS_DIRECTOR",
        campusId: 5,
        districtId: "D-1",
        regionId: "R-1",
      };

      expect(
        canAccessPerson(user, {
          primaryCampusId: 999,
          primaryDistrictId: "D-1",
          primaryRegion: "R-999",
        })
      ).toBe(true);

      expect(
        canAccessPerson(user, {
          primaryCampusId: 5,
          primaryDistrictId: "D-2",
          primaryRegion: "R-1",
        })
      ).toBe(false);

      expect(
        canAccessPerson(user, {
          primaryCampusId: 5,
          primaryDistrictId: null,
          primaryRegion: "R-1",
        })
      ).toBe(false);
    });

    it("enforces REGION scope by primaryRegion (DISTRICT_DIRECTOR with regionId)", () => {
      const user: UserScopeAnchors = {
        role: "DISTRICT_DIRECTOR",
        campusId: 5,
        districtId: "D-1",
        regionId: "R-1",
      };

      expect(
        canAccessPerson(user, {
          primaryCampusId: 999,
          primaryDistrictId: "D-999",
          primaryRegion: "R-1",
        })
      ).toBe(true);

      expect(
        canAccessPerson(user, {
          primaryCampusId: 5,
          primaryDistrictId: "D-1",
          primaryRegion: "R-2",
        })
      ).toBe(false);
    });

    it("throws FORBIDDEN when DISTRICT_DIRECTOR has no regionId (fail-closed)", () => {
      const user: UserScopeAnchors = {
        role: "DISTRICT_DIRECTOR",
        campusId: 5,
        districtId: "D-1",
        regionId: null,
      };

      expect(() =>
        canAccessPerson(user, {
          primaryCampusId: 999,
          primaryDistrictId: "D-1",
          primaryRegion: "R-999",
        })
      ).toThrow("Access denied: missing regionId");
    });
  });

  describe("peopleScopeWhereClause", () => {
    function toSql(user: UserScopeAnchors) {
      const qb = new QueryBuilder();
      const built = qb
        .select({ personId: people.personId })
        .from(people)
        .where(peopleScopeWhereClause(user))
        .toSQL();

      return built;
    }

    it("returns 1=1 for ALL scope", () => {
      const user: UserScopeAnchors = {
        role: "ADMIN",
        campusId: 1,
        districtId: null,
        regionId: null,
      };

      const built = toSql(user);
      expect(built.sql).toContain("1=1");
      expect(built.params).toEqual([]);
    });

    it("returns primaryCampusId filter for CAMPUS scope", () => {
      const user: UserScopeAnchors = {
        role: "STAFF",
        campusId: 42,
        districtId: "D-1",
        regionId: "R-1",
      };

      const built = toSql(user);
      expect(built.sql).toContain("primaryCampusId");
      expect(built.params).toEqual([42]);
    });

    it("returns primaryDistrictId filter for DISTRICT scope", () => {
      const user: UserScopeAnchors = {
        role: "CAMPUS_DIRECTOR",
        campusId: 42,
        districtId: "D-42",
        regionId: "R-1",
      };

      const built = toSql(user);
      expect(built.sql).toContain("primaryDistrictId");
      expect(built.params).toEqual(["D-42"]);
    });

    it("returns primaryRegion filter for REGION scope", () => {
      const user: UserScopeAnchors = {
        role: "DISTRICT_DIRECTOR",
        campusId: 42,
        districtId: "D-42",
        regionId: "R-42",
      };

      const built = toSql(user);
      expect(built.sql).toContain("primaryRegion");
      expect(built.params).toEqual(["R-42"]);
    });

    it("normalizes campus-level aliases to CAMPUS scope", () => {
      const aliases = [
        "CAMPUS_VOLUNTEER",
        "Campus Volunteer",
        "CAMPUS_INTERN",
        "Campus Intern",
        "CAMPUS_CO_DIRECTOR",
        "Campus Co-Director",
      ];

      for (const role of aliases) {
        const built = toSql({
          role,
          campusId: 7,
          districtId: "D-7",
          regionId: "R-7",
        });

        expect(built.sql).toContain("primaryCampusId");
        expect(built.params).toEqual([7]);
      }
    });

    it("normalizes district-level aliases to DISTRICT_DIRECTOR scope", () => {
      const aliases = ["DISTRICT_STAFF", "District Staff"];

      for (const role of aliases) {
        const built = toSql({
          role,
          campusId: 7,
          districtId: "D-7",
          regionId: "R-7",
        });

        expect(built.sql).toContain("primaryRegion");
        expect(built.params).toEqual(["R-7"]);
      }
    });

    it("normalizes regional/full-access aliases to ALL scope", () => {
      const fullAccessRoles = [
        "REGIONAL_STAFF",
        "Regional Staff",
        "REGION_DIRECTOR",
        "REGIONAL_DIRECTOR",
        "FIELD_DIRECTOR",
        "NATIONAL_STAFF",
        "NATIONAL_DIRECTOR",
        "CMC_GO_ADMIN",
        "ADMIN",
      ];

      for (const role of fullAccessRoles) {
        const built = toSql({
          role,
          campusId: 7,
          districtId: "D-7",
          regionId: "R-7",
        });

        expect(built.sql).toContain("1=1");
        expect(built.params).toEqual([]);
      }
    });
  });
});
