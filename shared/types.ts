/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

import type { District, Campus, Person } from "../drizzle/schema";

/**
 * District with region name from join
 */
export type DistrictWithRegion = Omit<District, 'regionId'> & {
  regionId: number;
  region: string | null;
};

/**
 * Campus with district info
 */
export type CampusWithDistrict = Campus & {
  district?: DistrictWithRegion;
};

/**
 * Person with campus and district info
 */
export type PersonWithRelations = Person & {
  campus?: Campus;
  district?: DistrictWithRegion;
};
