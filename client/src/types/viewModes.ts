/**
 * View Modes for map-first navigation
 * Allows leaders to scope their view to Nation, Region, District, or Campus level
 */

export type ViewMode = "nation" | "region" | "district" | "campus";

export interface ViewState {
  mode: ViewMode;
  regionId: string | null; // Region name (e.g., "Big Sky", "Great Lakes")
  districtId: string | null; // District ID (e.g., "Colorado", "Illinois")
  campusId: number | null; // Campus ID
  panelOpen: boolean;
}

/**
 * Default view state - nation-level view (full map, no scope applied)
 */
export const DEFAULT_VIEW_STATE: ViewState = {
  mode: "nation",
  regionId: null,
  districtId: null,
  campusId: null,
  panelOpen: false,
};

/**
 * Initialize view state from URL parameters
 * Respects existing URL filters if present
 * Safely handles invalid params - never throws
 */
export function initializeViewStateFromURL(): ViewState {
  try {
    const params = new URLSearchParams(window.location.search);

    // Safely parse mode with validation
    const modeParam = params.get("viewMode");
    const validModes: ViewMode[] = ["nation", "region", "district", "campus"];
    const mode: ViewMode =
      modeParam && validModes.includes(modeParam as ViewMode)
        ? (modeParam as ViewMode)
        : DEFAULT_VIEW_STATE.mode;

    // Safely parse regionId (null if empty string)
    const regionId = params.get("regionId") || null;

    // Safely parse districtId (null if empty string)
    // Support both 'district' (new, shareable) and 'districtId' (legacy) parameters
    const districtId =
      params.get("district") || params.get("districtId") || null;

    // Safely parse campusId with validation
    let campusId: number | null = null;
    const campusIdParam = params.get("campusId");
    if (campusIdParam) {
      const parsed = parseInt(campusIdParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        campusId = parsed;
      }
    }

    // Safely parse panelOpen
    const panelOpen = params.get("panelOpen") === "true";

    return {
      mode,
      regionId,
      districtId,
      campusId,
      panelOpen,
    };
  } catch (error) {
    // If URL parsing fails for any reason, return safe defaults
    console.error("Error parsing URL parameters, using defaults:", error);
    return DEFAULT_VIEW_STATE;
  }
}

/**
 * Update URL with view state (non-navigating)
 */
export function updateURLWithViewState(viewState: ViewState) {
  const params = new URLSearchParams(window.location.search);

  if (viewState.mode !== DEFAULT_VIEW_STATE.mode) {
    params.set("viewMode", viewState.mode);
  } else {
    params.delete("viewMode");
  }

  if (viewState.regionId) {
    params.set("regionId", viewState.regionId);
  } else {
    params.delete("regionId");
  }

  // Use 'district' parameter for cleaner, shareable URLs
  if (viewState.districtId) {
    params.set("district", viewState.districtId);
    // Remove legacy parameter if present
    params.delete("districtId");
  } else {
    params.delete("district");
    params.delete("districtId");
  }

  if (viewState.campusId) {
    params.set("campusId", viewState.campusId.toString());
  } else {
    params.delete("campusId");
  }

  if (viewState.panelOpen) {
    params.set("panelOpen", "true");
  } else {
    params.delete("panelOpen");
  }

  // Update URL without triggering navigation
  const newSearch = params.toString();
  const newUrl = newSearch
    ? `${window.location.pathname}?${newSearch}`
    : window.location.pathname;
  window.history.replaceState({}, "", newUrl);
}
