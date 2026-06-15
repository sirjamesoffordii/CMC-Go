export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = "Please login (10001)";
export const NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

export const DONATION_CAMPAIGN_GOAL_CENTS = 8_200_00;
export const DONATION_CAMPAIGN_DEADLINE_ISO = "2026-07-01";
export const DONATION_CAMPAIGN_DEADLINE_LABEL = "July 1, 2026";

/**
 * Donors who contributed before the live Stripe campaign opened.
 *
 * These are merged with completed Stripe donations from the database to power
 * the public progress widget (total raised, donor count, avatar tooltips).
 * When new Stripe donations come in, they are appended automatically.
 */
export const DONATION_CAMPAIGN_STARTING_DONORS: ReadonlyArray<{
  name: string;
  amountCents: number;
  initials: string;
}> = [
  { name: "Matthew Cooley", amountCents: 25_00, initials: "MC" },
  { name: "Gary Pascal", amountCents: 50_00, initials: "GP" },
  { name: "University of Houston", amountCents: 250_00, initials: "UH" },
  { name: "Crossroads", amountCents: 1_000_00, initials: "CR" },
  { name: "Sir James", amountCents: 3_250_00, initials: "SJ" },
];

export const DONATION_CAMPAIGN_STARTING_RAISED_CENTS =
  DONATION_CAMPAIGN_STARTING_DONORS.reduce((sum, d) => sum + d.amountCents, 0);

export const DONATION_CAMPAIGN_STARTING_FUNDS_GIVEN_CENTS = 4_550_00;
export const DONATION_CAMPAIGN_STARTING_FUNDED_PERSON_COUNT = 10;
export const DONATION_REQUEST_SHEET_ID =
  "1xDGFzsohPoapkFC17IjpuM0vtVxbj-u61uKEh_L5ub0";
export const DONATION_REQUEST_SHEET_GID = "364163300";
export const DONATION_REQUEST_FALLBACK_TOTAL_REQUESTED_CENTS = 8_200_00;
export const DONATION_REQUEST_FALLBACK_STILL_IN_REQUEST_CENTS = 3_650_00;
export const DONATION_REQUEST_FALLBACK_PEOPLE_STILL_IN_REQUEST = 8;

/** Get a two-letter uppercase initials string from a donor's name. */
export function getDonorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * District → Region mapping (fallback for districts not yet seeded in the database).
 *
 * Used by both client (scope checks) and server (authorization) to resolve a
 * person's region when `person.primaryRegion` is null but `primaryDistrictId` is set.
 */
export const DISTRICT_REGION_MAP: Record<string, string> = {
  XAN: "National Team",
  Alabama: "Southeast",
  Alaska: "Northwest",
  Appalachian: "Mid-Atlantic",
  Arizona: "West Coast",
  Arkansas: "South Central",
  Colorado: "Big Sky",
  Georgia: "Southeast",
  Hawaii: "West Coast",
  Illinois: "Great Lakes",
  Indiana: "Great Lakes",
  Iowa: "Great Plains South",
  Kansas: "Great Plains South",
  Kentucky: "Mid-Atlantic",
  Louisiana: "South Central",
  Michigan: "Great Lakes",
  Minnesota: "Great Plains North",
  Mississippi: "Southeast",
  Montana: "Big Sky",
  Nebraska: "Great Plains South",
  NewJersey: "Northeast",
  NewMexico: "Texico",
  NewYork: "Northeast",
  NorthCarolina: "Mid-Atlantic",
  NorthDakota: "Great Plains North",
  "NorthernCal-Nevada": "West Coast",
  NorthernNewEnglend: "Northeast",
  NorthernNewEngland: "Northeast",
  NorthIdaho: "Northwest",
  NorthernMissouri: "Great Plains South",
  NorthTexas: "Texico",
  Ohio: "Great Lakes",
  Oklahoma: "South Central",
  Oregon: "Northwest",
  PeninsularFlorida: "Southeast",
  "Penn-Del": "Northeast",
  Potomac: "Mid-Atlantic",
  SouthCarolina: "Southeast",
  SouthDakota: "Great Plains North",
  SouthernCalifornia: "West Coast",
  SouthernNewEngland: "Northeast",
  SouthIdaho: "Big Sky",
  SouthernMissouri: "Great Plains South",
  SouthTexas: "Texico",
  Tennessee: "Mid-Atlantic",
  Utah: "Big Sky",
  Washington: "Northwest",
  WestFlorida: "Southeast",
  WestTexas: "Texico",
  "Wisconsin-NorthMichigan": "Great Plains North",
  Wyoming: "Big Sky",
  Connecticut: "Northeast",
  Maine: "Northeast",
  Massachusetts: "Northeast",
  Pennsylvania: "Northeast",
  Vermont: "Northeast",
  Virginia: "Mid-Atlantic",
  WestVirginia: "Mid-Atlantic",
  Florida: "Southeast",
  Nevada: "West Coast",
  NorthCalifornia: "West Coast",
  SouthCalifornia: "West Coast",
};

/**
 * Maps district IDs that don't have their own SVG `<path>` in `map.svg` to the
 * composite SVG path `inkscape:label` that geographically contains them.
 *
 * When a user selects one of these districts in the scope dropdown, the map
 * highlights the parent SVG path instead.  Only districts whose ID differs from
 * the SVG label need an entry here; districts whose ID already matches an
 * `inkscape:label` in the SVG are resolved directly.
 */
export const DISTRICT_TO_SVG_PATH: Record<string, string> = {
  // Typo variant → correct SVG label
  NorthernNewEnglend: "NorthernNewEngland",
  // Individual-state districts → composite SVG paths
  Vermont: "NorthernNewEngland",
  Maine: "NorthernNewEngland",
  Connecticut: "SouthernNewEngland",
  Massachusetts: "SouthernNewEngland",
  Pennsylvania: "Penn-Del",
  Virginia: "Potomac",
  WestVirginia: "Appalachian",
  Florida: "PeninsularFlorida",
  Nevada: "NorthernCal-Nevada",
  NorthCalifornia: "NorthernCal-Nevada",
  SouthCalifornia: "SouthernCalifornia",
  NorthIdaho: "SouthIdaho",
};

/**
 * Resolve a district ID to the SVG path label used in `map.svg`.
 * Returns the original ID if it already matches an SVG path.
 */
export function resolveDistrictSvgPath(districtId: string): string {
  return DISTRICT_TO_SVG_PATH[districtId] ?? districtId;
}

/**
 * Resolve a person's region: uses `primaryRegion` if set, otherwise falls back
 * to the district→region static mapping via `primaryDistrictId`.
 */
export function resolvePersonRegion(person: {
  primaryRegion?: string | null;
  primaryDistrictId?: string | null;
}): string | null {
  if (person.primaryRegion) return person.primaryRegion;
  if (person.primaryDistrictId) {
    return DISTRICT_REGION_MAP[person.primaryDistrictId] ?? null;
  }
  return null;
}
