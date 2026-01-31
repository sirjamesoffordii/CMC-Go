/**
 * ScopeSelector - Component for filtering map view by scope level
 *
 * Allows users to switch between NATIONAL, REGION (with region picker), and DISTRICT views.
 * Regions expand to show districts when hovered.
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
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
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  const regionDistrictsMap = useMemo(() => buildRegionDistrictsMap(), []);

  // Determine user's scope level from their authorization
  const userScopeLevel: ScopeLevel = user?.scopeLevel || "DISTRICT";
  const accessibleScopes = getAccessibleScopes(userScopeLevel);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setHoveredRegion(null);
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

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[180px] bg-white rounded-md shadow-lg border border-gray-200 py-1">
          {/* National option */}
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

          {/* Regions with nested districts */}
          {ALL_REGIONS.map(region => {
            const districts = regionDistrictsMap[region] || [];
            const isRegionActive =
              currentScope === "REGION" && selectedRegion === region;
            const isDistrictInRegion =
              currentScope === "DISTRICT" &&
              selectedRegion === region &&
              selectedDistrict;
            const isHovered = hoveredRegion === region;

            return (
              <div
                key={region}
                className="relative"
                onMouseEnter={() => handleRegionHover(region)}
                onMouseLeave={() => handleRegionHover(null)}
              >
                <button
                  onClick={() => handleRegionClick(region)}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between gap-2 transition-colors ${
                    isRegionActive || isDistrictInRegion
                      ? "bg-red-50 text-red-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span className={isRegionActive ? "font-medium" : ""}>
                    {region}
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>

                {/* Districts submenu */}
                {isHovered && districts.length > 0 && (
                  <div
                    className="absolute left-full top-0 ml-1 min-w-[200px] bg-white rounded-md shadow-lg border border-gray-200 py-1 max-h-[350px] overflow-y-auto"
                    onMouseEnter={() => handleRegionHover(region)}
                    onMouseLeave={() => handleRegionHover(null)}
                  >
                    {/* Region header - click to select whole region */}
                    <button
                      onClick={() => handleRegionClick(region)}
                      className={`w-full px-3 py-2 text-left text-sm font-medium border-b border-gray-100 transition-colors ${
                        isRegionActive
                          ? "bg-red-50 text-red-700"
                          : "text-gray-800 hover:bg-gray-100"
                      }`}
                    >
                      All of {region}
                    </button>

                    {/* Districts in region */}
                    {districts.map(districtId => (
                      <button
                        key={districtId}
                        onClick={() => handleDistrictClick(region, districtId)}
                        className={`w-full px-3 py-1.5 text-left text-sm transition-colors ${
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

  // Get persisted scope from localStorage
  const getInitialScope = (): ScopeLevel => {
    const stored = localStorage.getItem("cmc-scope-filter");
    if (stored && SCOPE_LEVELS.includes(stored as ScopeLevel)) {
      const storedScope = stored as ScopeLevel;
      // Ensure user has access to stored scope
      const userIndex = SCOPE_LEVELS.indexOf(userScopeLevel);
      const storedIndex = SCOPE_LEVELS.indexOf(storedScope);
      if (storedIndex >= userIndex) {
        return storedScope;
      }
    }
    // Default to NATIONAL
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

  // Reset to user's default when user changes
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
