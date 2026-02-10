/**
 * All regions in alphabetical order
 */
export const ALL_REGIONS = [
  "Big Sky",
  "Great Lakes",
  "Great Plains North",
  "Great Plains South",
  "Mid-Atlantic",
  "National Team",
  "Northeast",
  "Northwest",
  "South Central",
  "Southeast",
  "Texico",
  "West Coast",
] as const;

export type RegionName = (typeof ALL_REGIONS)[number];

/**
 * District to region mapping — re-exported from shared/const.ts (single source of truth).
 * Used by both client and server for district→region resolution.
 */
export {
  DISTRICT_REGION_MAP,
  resolvePersonRegion,
} from "../../../shared/const";
