/**
 * ScopeSelector - Component for filtering map view by scope level
 *
 * Allows users to switch between NATIONAL, REGION, and DISTRICT views
 * based on their scopeLevel authorization.
 */

import { useAuth } from "@/_core/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, Map, MapPin } from "lucide-react";

// Scope level ordering (from broadest to narrowest)
const SCOPE_LEVELS = ["NATIONAL", "REGION", "DISTRICT"] as const;
type ScopeLevel = (typeof SCOPE_LEVELS)[number];

// Level display configuration
const SCOPE_CONFIG: Record<
  ScopeLevel,
  { label: string; icon: typeof Globe; description: string }
> = {
  NATIONAL: {
    label: "National",
    icon: Globe,
    description: "View all districts",
  },
  REGION: {
    label: "Region",
    icon: Map,
    description: "View your region",
  },
  DISTRICT: {
    label: "District",
    icon: MapPin,
    description: "View your district",
  },
};

// Get accessible scopes based on user's scopeLevel
function getAccessibleScopes(userScopeLevel: ScopeLevel): ScopeLevel[] {
  const userIndex = SCOPE_LEVELS.indexOf(userScopeLevel);
  // User can access their level and all narrower levels
  return SCOPE_LEVELS.slice(userIndex);
}

interface ScopeSelectorProps {
  currentScope: ScopeLevel;
  onScopeChange: (scope: ScopeLevel) => void;
  className?: string;
}

export function ScopeSelector({
  currentScope,
  onScopeChange,
  className = "",
}: ScopeSelectorProps) {
  const { user } = useAuth();

  // Determine user's scope level from their authorization
  const userScopeLevel: ScopeLevel = user?.scopeLevel || "DISTRICT";
  const accessibleScopes = getAccessibleScopes(userScopeLevel);

  // Don't render if user only has one scope option
  if (accessibleScopes.length <= 1) {
    return null;
  }

  const CurrentIcon = SCOPE_CONFIG[currentScope].icon;

  return (
    <Select
      value={currentScope}
      onValueChange={v => onScopeChange(v as ScopeLevel)}
    >
      <SelectTrigger className={`w-[140px] ${className}`}>
        <div className="flex items-center gap-2">
          <CurrentIcon className="h-4 w-4" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {accessibleScopes.map(scope => {
          const config = SCOPE_CONFIG[scope];
          const Icon = config.icon;
          return (
            <SelectItem key={scope} value={scope}>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{config.label}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
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
    // Default to user's scope level
    return userScopeLevel;
  };

  const [currentScope, setCurrentScope] = useState<ScopeLevel>(getInitialScope);

  // Update scope and persist
  const setScopeFilter = (scope: ScopeLevel) => {
    localStorage.setItem("cmc-scope-filter", scope);
    setCurrentScope(scope);
  };

  // Reset to user's default when user changes
  useEffect(() => {
    const accessibleScopes = getAccessibleScopes(userScopeLevel);
    if (!accessibleScopes.includes(currentScope)) {
      setCurrentScope(userScopeLevel);
      localStorage.setItem("cmc-scope-filter", userScopeLevel);
    }
  }, [userScopeLevel, currentScope]);

  return {
    currentScope,
    setScopeFilter,
    userScopeLevel,
    accessibleScopes: getAccessibleScopes(userScopeLevel),
  };
}

// Import required hooks
import { useState, useEffect } from "react";

export default ScopeSelector;
