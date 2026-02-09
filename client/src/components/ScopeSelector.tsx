/**
 * ScopeSelector - Component for filtering map view by scope level
 *
 * Allows users to switch between NATIONAL, REGION (with region picker), and DISTRICT views.
 * Regions expand to show districts when hovered.
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Globe, ChevronRight, ChevronDown } from "lucide-react";
import { ALL_REGIONS, DISTRICT_REGION_MAP } from "@/lib/regions";

// Scope level ordering (from broadest to narrowest)
const SCOPE_LEVELS = ["NATIONAL", "REGION", "DISTRICT"] as const;
type ScopeLevel = (typeof SCOPE_LEVELS)[number];

// Get accessible scopes based on user's scopeLevel
function getAccessibleScopes(userScopeLevel: ScopeLevel): ScopeLevel[] {
  const userIndex = SCOPE_LEVELS.indexOf(userScopeLevel);
  // User can access their level and all narrower levels
  return SCOPE_LEVELS.slice(userIndex);
}

// Build region -> districts mapping
function buildRegionDistrictsMap(): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  ALL_REGIONS.forEach(region => {
    map[region] = [];
  });
  Object.entries(DISTRICT_REGION_MAP).forEach(([districtId, region]) => {
    if (map[region]) {
      // Avoid duplicates
      if (!map[region].includes(districtId)) {
        map[region].push(districtId);
      }
    }
  });
  // Sort districts alphabetically within each region
  Object.keys(map).forEach(region => {
    map[region].sort();
  });
  return map;
}

// Format district ID to display name
function formatDistrictName(districtId: string): string {
  return districtId
    .replace(/-/g, " - ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

interface ScopeSelectorProps {
  currentScope: ScopeLevel;
  selectedRegion: string | null;
  selectedDistrict: string | null;
  onScopeChange: (
    scope: ScopeLevel,
    regionId?: string | null,
    districtId?: string | null
  ) => void;
  className?: string;
}

export function ScopeSelector({
  currentScope,
  selectedRegion,
  selectedDistrict,
  onScopeChange,
  className = "",
}: ScopeSelectorProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  /** On mobile, tap-to-expand region to show districts (no hover) */
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  const regionDistrictsMap = useMemo(() => buildRegionDistrictsMap(), []);

  // Determine user's scope level from their authorization
  const userScopeLevel: ScopeLevel = user?.scopeLevel || "DISTRICT";
  const accessibleScopes = getAccessibleScopes(userScopeLevel);

  // Determine region-scoped behavior:
  // Regional Directors (REGION_DIRECTOR) with a region should see their region + National,
  // not all regions. Other NATIONAL-scoped users see everything.
  const userRegionId = user?.regionId || user?.overseeRegionId || null;
  const isRegionalDirector =
    (user?.role === "REGION_DIRECTOR" || user?.role === "REGIONAL_STAFF") &&
    !!userRegionId;
  const isRegionScoped =
    userRegionId && (userScopeLevel !== "NATIONAL" || isRegionalDirector);
  const regionsToShow = isRegionScoped ? [userRegionId] : ALL_REGIONS;
  // Regional Directors/Staff CAN see National view (they have viewLevel NATIONAL)
  const showNationalOption = !isRegionScoped || isRegionalDirector;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setHoveredRegion(null);
        setExpandedRegion(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Don't render if user only has one scope option
  if (accessibleScopes.length <= 1) {
    return null;
  }

  // Get display label for current selection
  const getDisplayLabel = (): string => {
    if (currentScope === "DISTRICT" && selectedDistrict) {
      return formatDistrictName(selectedDistrict);
    }
    if (currentScope === "REGION" && selectedRegion) {
      return selectedRegion;
    }
    return "National";
  };

  const handleNationalClick = () => {
    onScopeChange("NATIONAL", null, null);
    setIsOpen(false);
    setHoveredRegion(null);
  };

  const handleRegionClick = (regionId: string) => {
    onScopeChange("REGION", regionId, null);
    setIsOpen(false);
    setHoveredRegion(null);
  };

  const handleDistrictClick = (regionId: string, districtId: string) => {
    onScopeChange("DISTRICT", regionId, districtId);
    setIsOpen(false);
    setHoveredRegion(null);
  };

  const handleRegionHover = (regionId: string | null) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (regionId) {
      setHoveredRegion(regionId);
    } else {
      // Delay hiding to allow mouse to move to submenu
      hoverTimeoutRef.current = window.setTimeout(() => {
        setHoveredRegion(null);
      }, 150);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-colors ${className}`}
      >
        <Globe className="h-4 w-4" />
        <span className="text-sm font-medium">{getDisplayLabel()}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown - scope-selector-dropdown for mobile CSS */}
      {isOpen && (
        <div className="scope-selector-dropdown absolute top-full left-0 mt-1 z-[100] min-w-[180px] bg-white rounded-md shadow-lg border border-gray-200 py-1">
          {/* National option - only for national-scope users */}
          {showNationalOption && (
            <>
              <button
                onClick={handleNationalClick}
                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                  currentScope === "NATIONAL"
                    ? "bg-red-50 text-red-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Globe className="h-4 w-4" />
                <span>National</span>
              </button>
              <div className="border-t border-gray-100 my-1" />
            </>
          )}

          {/* Regions with nested districts (only user's region when region-scoped) */}
          {regionsToShow.map(region => {
            const districts = regionDistrictsMap[region] || [];
            const isRegionActive =
              currentScope === "REGION" && selectedRegion === region;
            const isDistrictInRegion =
              currentScope === "DISTRICT" &&
              selectedRegion === region &&
              selectedDistrict;
            const isHovered = hoveredRegion === region;
            const isExpanded = isMobile ? expandedRegion === region : isHovered;
            const hasDistricts = districts.length > 0;

            return (
              <div
                key={region}
                className="relative"
                onMouseEnter={() => !isMobile && handleRegionHover(region)}
                onMouseLeave={() => !isMobile && handleRegionHover(null)}
              >
                <button
                  onClick={() => {
                    if (isMobile && hasDistricts) {
                      setExpandedRegion(r => (r === region ? null : region));
                      return;
                    }
                    handleRegionClick(region);
                  }}
                  className={`w-full px-3 py-2.5 text-left text-sm flex items-center justify-between gap-2 transition-colors min-h-[44px] ${
                    isRegionActive || isDistrictInRegion
                      ? "bg-red-50 text-red-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span className={isRegionActive ? "font-medium" : ""}>
                    {region}
                  </span>
                  {hasDistricts && (
                    <ChevronRight
                      className={`h-4 w-4 text-gray-400 transition-transform ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    />
                  )}
                </button>

                {/* Districts submenu: flyout on desktop, inline on mobile */}
                {isExpanded && hasDistricts && (
                  <div
                    className={
                      isMobile
                        ? "bg-slate-50 border-t border-slate-100 py-1 max-h-[280px] overflow-y-auto"
                        : "absolute left-full top-0 ml-1 min-w-[200px] bg-white rounded-md shadow-lg border border-gray-200 py-1 max-h-[350px] overflow-y-auto"
                    }
                    onMouseEnter={() => !isMobile && handleRegionHover(region)}
                    onMouseLeave={() => !isMobile && handleRegionHover(null)}
                  >
                    <button
                      onClick={() => handleRegionClick(region)}
                      className={`w-full px-3 py-2.5 text-left text-sm font-medium border-b border-gray-100 transition-colors min-h-[44px] ${
                        isRegionActive
                          ? "bg-red-50 text-red-700"
                          : "text-gray-800 hover:bg-gray-100"
                      }`}
                    >
                      All of {region}
                    </button>

                    {districts.map(districtId => (
                      <button
                        key={districtId}
                        onClick={() => handleDistrictClick(region, districtId)}
                        className={`w-full px-3 py-2.5 text-left text-sm transition-colors min-h-[44px] ${
                          selectedDistrict === districtId
                            ? "bg-red-50 text-red-700 font-medium"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {formatDistrictName(districtId)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Hook for managing scope state with persistence
export function useScopeFilter() {
  const { user } = useAuth();
  const userScopeLevel: ScopeLevel = user?.scopeLevel || "DISTRICT";

  // Get persisted scope from localStorage (cannot use user here - initial render may not have it)
  const getInitialScope = (): ScopeLevel => {
    const stored = localStorage.getItem("cmc-scope-filter");
    if (stored && SCOPE_LEVELS.includes(stored as ScopeLevel)) {
      return stored as ScopeLevel;
    }
    return "NATIONAL";
  };

  const getInitialRegion = (): string | null => {
    return localStorage.getItem("cmc-scope-region") || null;
  };

  const getInitialDistrict = (): string | null => {
    return localStorage.getItem("cmc-scope-district") || null;
  };

  const [currentScope, setCurrentScope] = useState<ScopeLevel>(getInitialScope);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(
    getInitialRegion
  );
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(
    getInitialDistrict
  );

  // Update scope and persist
  const setScopeFilter = (
    scope: ScopeLevel,
    regionId?: string | null,
    districtId?: string | null
  ) => {
    localStorage.setItem("cmc-scope-filter", scope);
    setCurrentScope(scope);

    if (regionId !== undefined) {
      if (regionId) {
        localStorage.setItem("cmc-scope-region", regionId);
      } else {
        localStorage.removeItem("cmc-scope-region");
      }
      setSelectedRegion(regionId);
    }

    if (districtId !== undefined) {
      if (districtId) {
        localStorage.setItem("cmc-scope-district", districtId);
      } else {
        localStorage.removeItem("cmc-scope-district");
      }
      setSelectedDistrict(districtId);
    }
  };

  // Reset to user's default when user changes, or scope is invalid
  useEffect(() => {
    const accessibleScopes = getAccessibleScopes(userScopeLevel);
    if (!accessibleScopes.includes(currentScope)) {
      setCurrentScope(userScopeLevel);
      localStorage.setItem("cmc-scope-filter", userScopeLevel);
      localStorage.removeItem("cmc-scope-region");
      localStorage.removeItem("cmc-scope-district");
      setSelectedRegion(null);
      setSelectedDistrict(null);
    }
  }, [userScopeLevel, currentScope]);

  // Region-scoped users and Regional Directors: default to their region on first load
  // Only applies when there is no saved scope preference (first visit)
  useEffect(() => {
    const userRegionId = user?.regionId || user?.overseeRegionId || null;
    if (!userRegionId) return;
    const isRegionalDirector =
      user?.role === "REGION_DIRECTOR" || user?.role === "REGIONAL_STAFF";
    const isRegionOrDistrict =
      userScopeLevel === "REGION" || userScopeLevel === "DISTRICT";
    // Only default if the user has no stored preference yet
    const hasStoredPreference = !!localStorage.getItem("cmc-scope-filter");
    if ((isRegionOrDistrict || isRegionalDirector) && !hasStoredPreference) {
      setCurrentScope("REGION");
      setSelectedRegion(userRegionId);
      setSelectedDistrict(null);
      localStorage.setItem("cmc-scope-filter", "REGION");
      localStorage.setItem("cmc-scope-region", userRegionId);
      localStorage.removeItem("cmc-scope-district");
    }
     
  }, [user?.regionId, user?.overseeRegionId, user?.role, userScopeLevel]);

  return {
    currentScope,
    selectedRegion,
    selectedDistrict,
    setScopeFilter,
    userScopeLevel,
    accessibleScopes: getAccessibleScopes(userScopeLevel),
  };
}

export default ScopeSelector;
