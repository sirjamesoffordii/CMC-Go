// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { TRPCClientError } from "@trpc/client";
import { useAuth } from "./useAuth";

const trpcMocks = vi.hoisted(() => {
  const mockUseQuery = vi.fn();
  const mockUseMutation = vi.fn();
  const mockSetData = vi.fn();
  const mockInvalidate = vi.fn();
  const mockUseUtils = vi.fn(() => ({
    auth: {
      me: {
        setData: mockSetData,
        invalidate: mockInvalidate,
      },
    },
  }));
  return {
    mockUseQuery,
    mockUseMutation,
    mockSetData,
    mockInvalidate,
    mockUseUtils,
  };
});

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: trpcMocks.mockUseUtils,
    auth: {
      me: {
        useQuery: trpcMocks.mockUseQuery,
      },
      logout: {
        useMutation: trpcMocks.mockUseMutation,
      },
    },
  },
}));

type UseQueryResult = {
  data: unknown;
  isLoading: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
};

type UseMutationResult = {
  mutateAsync: () => Promise<unknown>;
  isPending: boolean;
  error: unknown;
};

const baseUser = {
  id: 1,
  fullName: "Test User",
};

const makeQuery = (
  overrides: Partial<UseQueryResult> = {}
): UseQueryResult => ({
  data: baseUser,
  isLoading: false,
  error: null,
  refetch: vi.fn(async () => undefined),
  ...overrides,
});

const makeMutation = (
  overrides: Partial<UseMutationResult> = {}
): UseMutationResult => ({
  mutateAsync: vi.fn(async () => undefined),
  isPending: false,
  error: null,
  ...overrides,
});

const setDevBypass = (enabled: boolean) => {
  vi.stubEnv("VITE_DEV_BYPASS_AUTH", enabled ? "true" : "");
};

describe("useAuth", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    localStorage.clear();
    trpcMocks.mockUseQuery.mockReset();
    trpcMocks.mockUseMutation.mockReset();
    trpcMocks.mockSetData.mockReset();
    trpcMocks.mockInvalidate.mockReset();
    trpcMocks.mockUseUtils.mockClear();
    setDevBypass(false);
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      value: originalLocation,
      configurable: true,
    });
    vi.unstubAllEnvs();
  });

  it("returns auth state and stores user info", () => {
    trpcMocks.mockUseQuery.mockReturnValue(makeQuery());
    trpcMocks.mockUseMutation.mockReturnValue(makeMutation());

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toEqual(baseUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(localStorage.getItem("cmc-go-user-info")).toBe(
      JSON.stringify(baseUser)
    );
  });

  it("logs out and clears cached user", async () => {
    const mutation = makeMutation();
    trpcMocks.mockUseQuery.mockReturnValue(makeQuery());
    trpcMocks.mockUseMutation.mockReturnValue(mutation);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(mutation.mutateAsync).toHaveBeenCalled();
    expect(trpcMocks.mockSetData).toHaveBeenCalledWith(undefined, null);
    expect(trpcMocks.mockInvalidate).toHaveBeenCalled();
  });

  it("ignores unauthorized errors during logout", async () => {
    const mutationError = Object.assign(new Error("UNAUTHORIZED"), {
      data: { code: "UNAUTHORIZED" },
    });
    Object.setPrototypeOf(mutationError, TRPCClientError.prototype);

    const mutation = makeMutation({
      mutateAsync: vi.fn(async () => {
        throw mutationError;
      }),
    });
    trpcMocks.mockUseQuery.mockReturnValue(makeQuery());
    trpcMocks.mockUseMutation.mockReturnValue(mutation);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(trpcMocks.mockSetData).toHaveBeenCalledWith(undefined, null);
    expect(trpcMocks.mockInvalidate).toHaveBeenCalled();
  });

  it("redirects when unauthenticated and redirect is enabled", async () => {
    trpcMocks.mockUseQuery.mockReturnValue(
      makeQuery({ data: null, isLoading: false })
    );
    trpcMocks.mockUseMutation.mockReturnValue(makeMutation());

    Object.defineProperty(window, "location", {
      value: { pathname: "/current", href: "http://localhost/current" },
      configurable: true,
      writable: true,
    });

    renderHook(() =>
      useAuth({ redirectOnUnauthenticated: true, redirectPath: "/login" })
    );

    await waitFor(() => {
      expect(window.location.href).toBe("/login");
    });
  });

  it("returns dev user when bypass is enabled", () => {
    setDevBypass(true);
    trpcMocks.mockUseQuery.mockReturnValue(makeQuery());
    trpcMocks.mockUseMutation.mockReturnValue(makeMutation());

    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.user?.fullName).toBe("Dev User");
    const [, options] = trpcMocks.mockUseQuery.mock.calls[0];
    expect(options.enabled).toBe(false);
  });
});
