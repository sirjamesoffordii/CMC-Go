import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePublicAuth } from "./usePublicAuth";

const trpcMocks = vi.hoisted(() => {
  const mockUseQuery = vi.fn();
  const mockUseMutation = vi.fn();
  const mockInvalidate = vi.fn();
  const mockUseUtils = vi.fn(() => ({
    auth: {
      me: {
        invalidate: mockInvalidate,
      },
    },
  }));
  return { mockUseQuery, mockUseMutation, mockUseUtils, mockInvalidate };
});

vi.mock("@/lib/trpc", () => ({
  trpc: {
    auth: {
      me: {
        useQuery: trpcMocks.mockUseQuery,
      },
      logout: {
        useMutation: trpcMocks.mockUseMutation,
      },
    },
    useUtils: trpcMocks.mockUseUtils,
  },
}));

type UseQueryResult = {
  data: unknown;
  isLoading: boolean;
};

type UseMutationResult = {
  mutateAsync: () => Promise<unknown>;
};

const baseUser = {
  id: 2,
  fullName: "Public User",
};

const setDevBypass = (enabled: boolean) => {
  vi.stubEnv("VITE_DEV_BYPASS_AUTH", enabled ? "true" : "");
};

describe("usePublicAuth", () => {
  beforeEach(() => {
    trpcMocks.mockUseQuery.mockReset();
    trpcMocks.mockUseMutation.mockReset();
    trpcMocks.mockInvalidate.mockReset();
    setDevBypass(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns authenticated user state", () => {
    trpcMocks.mockUseQuery.mockReturnValue({
      data: baseUser,
      isLoading: false,
    } as UseQueryResult);
    trpcMocks.mockUseMutation.mockReturnValue({
      mutateAsync: vi.fn(async () => undefined),
    } as UseMutationResult);

    const { result } = renderHook(() => usePublicAuth());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(baseUser);
    expect(result.current.isLoading).toBe(false);
  });

  it("login function exists and is callable", () => {
    trpcMocks.mockUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
    } as UseQueryResult);
    trpcMocks.mockUseMutation.mockReturnValue({
      mutateAsync: vi.fn(async () => undefined),
    } as UseMutationResult);

    const { result } = renderHook(() => usePublicAuth());

    // login() is a placeholder that can trigger a login modal
    // It doesn't throw when called
    expect(() => result.current.login()).not.toThrow();
  });

  it("logs out through tRPC", async () => {
    const mutateAsync = vi.fn(async () => undefined);
    trpcMocks.mockUseQuery.mockReturnValue({
      data: baseUser,
      isLoading: false,
    } as UseQueryResult);
    trpcMocks.mockUseMutation.mockReturnValue({
      mutateAsync,
    } as UseMutationResult);
    trpcMocks.mockInvalidate.mockResolvedValue(undefined);

    const { result } = renderHook(() => usePublicAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(mutateAsync).toHaveBeenCalled();
    expect(trpcMocks.mockInvalidate).toHaveBeenCalled();
  });

  it("returns dev user when bypass is enabled", async () => {
    setDevBypass(true);

    trpcMocks.mockUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
    } as UseQueryResult);

    const mutateAsync = vi.fn(async () => undefined);
    trpcMocks.mockUseMutation.mockReturnValue({
      mutateAsync,
    } as UseMutationResult);

    const { result } = renderHook(() => usePublicAuth());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.user?.fullName).toBe("Dev User");

    await act(async () => {
      await result.current.logout();
    });

    expect(mutateAsync).not.toHaveBeenCalled();
    const [, options] = trpcMocks.mockUseQuery.mock.calls[0];
    expect(options.enabled).toBe(false);
  });
});
