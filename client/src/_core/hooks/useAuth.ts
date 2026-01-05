import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();

  const devBypass = (import.meta as any)?.env?.VITE_DEV_BYPASS_AUTH === "true";

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !devBypass,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      if (devBypass) return;
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(meQuery.data)
    );
    const devUser = devBypass
      ? ({
          id: 0,
          fullName: "Dev User",
          email: "dev@local",
          role: "ADMIN",
          campusId: 0,
          districtId: null,
          regionId: null,
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
      : null;
    return {
      user: devBypass ? devUser : meQuery.data ?? null,
      loading: devBypass ? false : meQuery.isLoading || logoutMutation.isPending,
      error: devBypass ? null : meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: devBypass ? true : Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
    devBypass,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (devBypass) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
    devBypass,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
