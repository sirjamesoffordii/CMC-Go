/**
 * View Modes for map-first navigation
 * Allows leaders to scope their view to Region, District, or Campus level
 */

export type ViewMode = "region" | "district" | "campus";

export interface ViewState {
  mode: ViewMode;
  regionId: string | null; // Region name (e.g., "Big Sky", "Great Lakes")
  districtId: string | null; // District ID (e.g., "Colorado", "Illinois")
  campusId: number | null; // Campus ID
  panelOpen: boolean;
}

/**
 * Default view state - district-scoped view
 */
export const DEFAULT_VIEW_STATE: ViewState = {
  mode: "district",
  regionId: null,
  districtId: null,
  campusId: null,
  panelOpen: false,
};

/**
 * Initialize view state from URL parameters
 * Respects existing URL filters if present
 */
export function initializeViewStateFromURL(): ViewState {
  const params = new URLSearchParams(window.location.search);
  
  const mode = (params.get('viewMode') as ViewMode) || DEFAULT_VIEW_STATE.mode;
  const regionId = params.get('regionId') || null;
  const districtId = params.get('districtId') || null;
  const campusIdParam = params.get('campusId');
  const campusId = campusIdParam ? parseInt(campusIdParam, 10) : null;
  const panelOpen = params.get('panelOpen') === 'true';
  
  return {
    mode,
    regionId,
    districtId,
    campusId,
    panelOpen,
  };
}

/**
 * Update URL with view state (non-navigating)
 */
export function updateURLWithViewState(viewState: ViewState) {
  const params = new URLSearchParams(window.location.search);
  
  if (viewState.mode !== DEFAULT_VIEW_STATE.mode) {
    params.set('viewMode', viewState.mode);
  } else {
    params.delete('viewMode');
  }
  
  if (viewState.regionId) {
    params.set('regionId', viewState.regionId);
  } else {
    params.delete('regionId');
  }
  
  if (viewState.districtId) {
    params.set('districtId', viewState.districtId);
  } else {
    params.delete('districtId');
  }
  
  if (viewState.campusId) {
    params.set('campusId', viewState.campusId.toString());
  } else {
    params.delete('campusId');
  }
  
  if (viewState.panelOpen) {
    params.set('panelOpen', 'true');
  } else {
    params.delete('panelOpen');
  }
  
  // Update URL without triggering navigation
  const newSearch = params.toString();
  const newUrl = newSearch 
    ? `${window.location.pathname}?${newSearch}`
    : window.location.pathname;
  window.history.replaceState({}, '', newUrl);
}
