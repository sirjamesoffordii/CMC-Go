/**
 * Authentication Hook - PR 2
 * 
 * Uses real authentication via tRPC
 */

import { trpc } from "@/lib/trpc";

export function usePublicAuth() {
  const { data: user, isLoading } = trpc.auth.me.useQuery();
  const logoutMutation = trpc.auth.logout.useMutation();
  
  const isAuthenticated = !!user;
  
  return {
    isAuthenticated,
    user,
    isLoading,
    login: () => {
      // Login is handled via auth.start and auth.verify endpoints
      // This function can trigger a login modal/dialog
      console.log("[usePublicAuth] Login - use auth.start and auth.verify");
    },
    logout: async () => {
      await logoutMutation.mutateAsync();
    },
  };
}

