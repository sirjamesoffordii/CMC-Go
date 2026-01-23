/**
 * Authentication Hook - PR 2
 *
 * Uses real authentication via tRPC
 */

import { trpc } from "@/lib/trpc";

export function usePublicAuth() {
  // Dev-only bypass to avoid blocking local development on auth.
  // Enable with: VITE_DEV_BYPASS_AUTH=true
  const devBypass = (import.meta as any)?.env?.VITE_DEV_BYPASS_AUTH === "true";

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: !devBypass,
  });
  const logoutMutation = trpc.auth.logout.useMutation();

  const user = devBypass
    ? ({
        id: 0,
        fullName: "Dev User",
        email: "dev@local",
        role: "ADMIN",
        campusId: 0,
        districtId: null,
        regionId: null,
        personId: "dev-person",
        personName: "Dev Person",
        approvalStatus: "ACTIVE",
        approvedByUserId: null,
        approvedAt: null,
        createdAt: new Date(),
        lastLoginAt: null,
        openId: null,
        name: null,
        loginMethod: null,
        campusName: null,
        districtName: null,
        regionName: null,
      } as any)
    : meQuery.data;

  const isAuthenticated = devBypass ? true : !!user;

  return {
    isAuthenticated,
    user,
    isLoading: devBypass ? false : meQuery.isLoading,
    login: () => {
      // Login is handled via auth.start
      // This function can trigger a login modal/dialog
      console.log("[usePublicAuth] Login - use auth.start");
    },
    logout: async () => {
      if (devBypass) return;
      await logoutMutation.mutateAsync();
    },
  };
}
