import { describe, it, expect } from "vitest";
import {
  getPeopleScope,
  isDistrictInScope,
  isCampusInScope,
} from "./scopeCheck";

describe("getPeopleScope", () => {
  it("returns null for null user", () => {
    expect(getPeopleScope(null)).toBe(null);
  });

  it("returns null for undefined user", () => {
    expect(getPeopleScope(undefined)).toBe(null);
  });

  it("returns ALL scope for ADMIN role", () => {
    const user = {
      role: "ADMIN",
      campusId: 1,
      districtId: "Colorado",
      regionId: "Rocky Mountain",
    };
    expect(getPeopleScope(user)).toEqual({ level: "ALL" });
  });

  it("returns ALL scope for REGION_DIRECTOR role", () => {
    const user = {
      role: "REGION_DIRECTOR",
      campusId: 1,
      districtId: "Colorado",
      regionId: "Rocky Mountain",
    };
    expect(getPeopleScope(user)).toEqual({ level: "ALL" });
  });

  it("returns REGION scope for DISTRICT_DIRECTOR with regionId", () => {
    const user = {
      role: "DISTRICT_DIRECTOR",
      campusId: 1,
      districtId: "Colorado",
      regionId: "Rocky Mountain",
    };
    expect(getPeopleScope(user)).toEqual({
      level: "REGION",
      regionId: "Rocky Mountain",
    });
  });

  it("returns DISTRICT scope for DISTRICT_DIRECTOR without regionId", () => {
    const user = {
      role: "DISTRICT_DIRECTOR",
      campusId: 1,
      districtId: "Colorado",
      regionId: null,
    };
    expect(getPeopleScope(user)).toEqual({
      level: "DISTRICT",
      districtId: "Colorado",
    });
  });

  it("returns DISTRICT scope for CAMPUS_DIRECTOR with districtId", () => {
    const user = {
      role: "CAMPUS_DIRECTOR",
      campusId: 1,
      districtId: "Colorado",
      regionId: null,
    };
    expect(getPeopleScope(user)).toEqual({
      level: "DISTRICT",
      districtId: "Colorado",
    });
  });

  it("returns CAMPUS scope for CAMPUS_DIRECTOR without districtId", () => {
    const user = {
      role: "CAMPUS_DIRECTOR",
      campusId: 1,
      districtId: null,
      regionId: null,
    };
    expect(getPeopleScope(user)).toEqual({ level: "CAMPUS", campusId: 1 });
  });

  it("returns CAMPUS scope for STAFF role", () => {
    const user = {
      role: "STAFF",
      campusId: 1,
      districtId: "Colorado",
      regionId: null,
    };
    expect(getPeopleScope(user)).toEqual({ level: "CAMPUS", campusId: 1 });
  });

  it("normalizes CO_DIRECTOR to CAMPUS_DIRECTOR", () => {
    const user = {
      role: "CO_DIRECTOR",
      campusId: 1,
      districtId: "Colorado",
      regionId: null,
    };
    expect(getPeopleScope(user)).toEqual({
      level: "DISTRICT",
      districtId: "Colorado",
    });
  });

  it("returns null for user without any location identifiers", () => {
    const user = {
      role: "STAFF",
      campusId: null,
      districtId: null,
      regionId: null,
    };
    expect(getPeopleScope(user)).toBe(null);
  });
});

describe("isDistrictInScope", () => {
  it("returns false for null user", () => {
    expect(isDistrictInScope("Colorado", null)).toBe(false);
  });

  it("returns true for ALL scope", () => {
    const user = {
      role: "ADMIN",
      campusId: 1,
      districtId: "Colorado",
      regionId: "Rocky Mountain",
    };
    expect(isDistrictInScope("Illinois", user, "Great Lakes")).toBe(true);
  });

  it("returns true for matching DISTRICT scope", () => {
    const user = {
      role: "CAMPUS_DIRECTOR",
      campusId: 1,
      districtId: "Colorado",
      regionId: null,
    };
    expect(isDistrictInScope("Colorado", user, "Rocky Mountain")).toBe(true);
  });

  it("returns false for non-matching DISTRICT scope", () => {
    const user = {
      role: "CAMPUS_DIRECTOR",
      campusId: 1,
      districtId: "Colorado",
      regionId: null,
    };
    expect(isDistrictInScope("Illinois", user, "Great Lakes")).toBe(false);
  });

  it("returns true for matching REGION scope", () => {
    const user = {
      role: "DISTRICT_DIRECTOR",
      campusId: 1,
      districtId: "Colorado",
      regionId: "Rocky Mountain",
    };
    expect(isDistrictInScope("Colorado", user, "Rocky Mountain")).toBe(true);
  });

  it("returns false for non-matching REGION scope", () => {
    const user = {
      role: "DISTRICT_DIRECTOR",
      campusId: 1,
      districtId: "Colorado",
      regionId: "Rocky Mountain",
    };
    expect(isDistrictInScope("Illinois", user, "Great Lakes")).toBe(false);
  });

  it("returns false for CAMPUS scope", () => {
    const user = {
      role: "STAFF",
      campusId: 1,
      districtId: null,
      regionId: null,
    };
    expect(isDistrictInScope("Colorado", user, "Rocky Mountain")).toBe(false);
  });
});

describe("isCampusInScope", () => {
  it("returns false for null user", () => {
    expect(isCampusInScope(1, "Colorado", null)).toBe(false);
  });

  it("returns true for ALL scope", () => {
    const user = {
      role: "ADMIN",
      campusId: 1,
      districtId: "Colorado",
      regionId: "Rocky Mountain",
    };
    expect(isCampusInScope(2, "Illinois", user, "Great Lakes")).toBe(true);
  });

  it("returns true for matching CAMPUS scope", () => {
    const user = {
      role: "STAFF",
      campusId: 1,
      districtId: "Colorado",
      regionId: null,
    };
    expect(isCampusInScope(1, "Colorado", user, "Rocky Mountain")).toBe(true);
  });

  it("returns false for non-matching CAMPUS scope", () => {
    const user = {
      role: "STAFF",
      campusId: 1,
      districtId: "Colorado",
      regionId: null,
    };
    expect(isCampusInScope(2, "Illinois", user, "Great Lakes")).toBe(false);
  });

  it("returns true for matching DISTRICT scope", () => {
    const user = {
      role: "CAMPUS_DIRECTOR",
      campusId: 1,
      districtId: "Colorado",
      regionId: null,
    };
    expect(isCampusInScope(2, "Colorado", user, "Rocky Mountain")).toBe(true);
  });

  it("returns false for non-matching DISTRICT scope", () => {
    const user = {
      role: "CAMPUS_DIRECTOR",
      campusId: 1,
      districtId: "Colorado",
      regionId: null,
    };
    expect(isCampusInScope(2, "Illinois", user, "Great Lakes")).toBe(false);
  });

  it("returns true for matching REGION scope", () => {
    const user = {
      role: "DISTRICT_DIRECTOR",
      campusId: 1,
      districtId: "Colorado",
      regionId: "Rocky Mountain",
    };
    expect(isCampusInScope(2, "Wyoming", user, "Rocky Mountain")).toBe(true);
  });

  it("returns false for non-matching REGION scope", () => {
    const user = {
      role: "DISTRICT_DIRECTOR",
      campusId: 1,
      districtId: "Colorado",
      regionId: "Rocky Mountain",
    };
    expect(isCampusInScope(2, "Illinois", user, "Great Lakes")).toBe(false);
  });
});
