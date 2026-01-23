import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  isDistrictInScope,
  isCampusInScope,
  getPeopleScope,
} from "@/lib/scopeCheck";
import { trpc } from "@/lib/trpc";

interface ViewAccessGuardProps {
  children: ReactNode;
  districtId?: string | null;
  regionId?: string | null;
  campusId?: number | null;
  viewMode?: "nation" | "region" | "district" | "campus";
}

/**
 * ViewAccessGuard - Guards access to views based on user scope.
 *
 * Enforces that users can only access views matching their scope:
 * - Campus users can only view their campus
 * - District users can only view their district (and campuses within it)
 * - Region users can only view their region (districts and campuses within it)
 * - Admin users can view everything
 *
 * Redirects unauthorized users to their appropriate home view.
 */
export function ViewAccessGuard({
  children,
  districtId,
  regionId,
  campusId,
  viewMode,
}: ViewAccessGuardProps) {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();

  // Fetch district data if we need to check region scope
  const { data: districts } = trpc.districts.list.useQuery();

  useEffect(() => {
    // Skip checks while loading
    if (loading || !user) return;

    const scope = getPeopleScope(user);

    // If no scope, redirect to home
    if (!scope) {
      setLocation("/");
      return;
    }

    // Check campus access
    if (campusId && viewMode === "campus") {
      // Need to fetch campus details to check district/region
      // For now, just check if campusId matches user's campus
      if (scope.level === "CAMPUS" && scope.campusId !== campusId) {
        setLocation("/?error=access_denied");
        return;
      }
    }

    // Check district access
    if (districtId && (viewMode === "district" || viewMode === "campus")) {
      const district = districts?.find(d => d.id === districtId);
      const districtRegion = district?.region || null;

      if (!isDistrictInScope(districtId, user, districtRegion)) {
        // Redirect to user's appropriate view
        if (scope.level === "CAMPUS" && user.campusId) {
          setLocation(`/?viewMode=campus&campusId=${user.campusId}`);
        } else if (scope.level === "DISTRICT" && user.districtId) {
          setLocation(`/?viewMode=district&districtId=${user.districtId}`);
        } else if (scope.level === "REGION" && user.regionId) {
          setLocation(`/?viewMode=region&regionId=${user.regionId}`);
        } else {
          setLocation("/?error=access_denied");
        }
        return;
      }
    }

    // Check region access
    if (regionId && viewMode === "region") {
      if (scope.level === "REGION" && scope.regionId !== regionId) {
        // Redirect to user's region
        setLocation(`/?viewMode=region&regionId=${scope.regionId}`);
        return;
      } else if (scope.level === "DISTRICT" && user.districtId) {
        // District users can't access region view
        setLocation(`/?viewMode=district&districtId=${user.districtId}`);
        return;
      } else if (scope.level === "CAMPUS" && user.campusId) {
        // Campus users can't access region view
        setLocation(`/?viewMode=campus&campusId=${user.campusId}`);
        return;
      }
    }
  }, [
    user,
    loading,
    districtId,
    regionId,
    campusId,
    viewMode,
    setLocation,
    districts,
  ]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking access...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
