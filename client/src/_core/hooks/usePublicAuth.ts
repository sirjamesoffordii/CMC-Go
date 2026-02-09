/**
 * Authentication Hook - PR 2
 *
 * Uses real authentication via tRPC
 */

import { trpc } from "@/lib/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";

/** Output type from auth.me query - used for devBypass user */
type AuthMeOutput = NonNullable<inferRouterOutputs<AppRouter>["auth"]["me"]>;

export function usePublicAuth() {
  // Dev-only bypass to avoid blocking local development on auth.
  // Enable with: VITE_DEV_BYPASS_AUTH=true
  const devBypass = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: !devBypass,
  });
  const logoutMutation = trpc.auth.logout.useMutation();
  const utils = trpc.useUtils();

  const devUser: AuthMeOutput = {
    id: 0,
    fullName: "Dev User",
    email: "dev@local",
    role: "ADMIN",
    campusId: 0,
    districtId: null,
    regionId: null,
    overseeRegionId: null,
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
    scopeLevel: "NATIONAL",
    viewLevel: "NATIONAL",
    editLevel: "NATIONAL",
    isBanned: false,
    roleLabel: null,
    roleTitle: null,
    linkedPersonId: null,
  };

  const user = devBypass ? devUser : meQuery.data;

  const isAuthenticated = devBypass ? true : !!user;

  return {
    isAuthenticated,
    user,
    isLoading: devBypass ? false : meQuery.isLoading,
    login: () => {
      // Login is handled via auth.start
    },
    logout: async () => {
      if (devBypass) return;
      await logoutMutation.mutateAsync();
      await utils.auth.me.invalidate();
    },
  };
}
