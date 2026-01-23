import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { RoleGate } from "./RoleGate";
import * as useAuthModule from "@/_core/hooks/useAuth";

// Mock the useAuth hook
vi.mock("@/_core/hooks/useAuth");

describe("RoleGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows children when user has the required role", () => {
    vi.spyOn(useAuthModule, "useAuth").mockReturnValue({
      user: {
        id: 1,
        role: "ADMIN",
        approvalStatus: "ACTIVE",
      } as any,
      loading: false,
      error: null,
      isAuthenticated: true,
      refresh: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
      isAdmin: true,
      isRegionDirectorOrAbove: true,
      isDistrictDirectorOrAbove: true,
      isCampusDirectorOrAbove: true,
      isActive: true,
    });

    render(
      <RoleGate role="ADMIN">
        <div>Admin Content</div>
      </RoleGate>
    );

    expect(screen.getByText("Admin Content")).toBeInTheDocument();
  });

  it("hides children when user does not have the required role", () => {
    vi.spyOn(useAuthModule, "useAuth").mockReturnValue({
      user: {
        id: 1,
        role: "STAFF",
        approvalStatus: "ACTIVE",
      } as any,
      loading: false,
      error: null,
      isAuthenticated: true,
      refresh: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
      isAdmin: false,
      isRegionDirectorOrAbove: false,
      isDistrictDirectorOrAbove: false,
      isCampusDirectorOrAbove: false,
      isActive: true,
    });

    render(
      <RoleGate role="ADMIN">
        <div>Admin Content</div>
      </RoleGate>
    );

    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });

  it("shows fallback when user does not have the required role", () => {
    vi.spyOn(useAuthModule, "useAuth").mockReturnValue({
      user: {
        id: 1,
        role: "STAFF",
        approvalStatus: "ACTIVE",
      } as any,
      loading: false,
      error: null,
      isAuthenticated: true,
      refresh: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
      isAdmin: false,
      isRegionDirectorOrAbove: false,
      isDistrictDirectorOrAbove: false,
      isCampusDirectorOrAbove: false,
      isActive: true,
    });

    render(
      <RoleGate role="ADMIN" fallback={<div>Access Denied</div>}>
        <div>Admin Content</div>
      </RoleGate>
    );

    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
    expect(screen.getByText("Access Denied")).toBeInTheDocument();
  });

  it("accepts multiple roles (OR logic)", () => {
    vi.spyOn(useAuthModule, "useAuth").mockReturnValue({
      user: {
        id: 1,
        role: "REGION_DIRECTOR",
        approvalStatus: "ACTIVE",
      } as any,
      loading: false,
      error: null,
      isAuthenticated: true,
      refresh: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
      isAdmin: false,
      isRegionDirectorOrAbove: true,
      isDistrictDirectorOrAbove: true,
      isCampusDirectorOrAbove: true,
      isActive: true,
    });

    render(
      <RoleGate role={["REGION_DIRECTOR", "ADMIN"]}>
        <div>National Content</div>
      </RoleGate>
    );

    expect(screen.getByText("National Content")).toBeInTheDocument();
  });

  it("hides children when user is not active and requireActive is true", () => {
    vi.spyOn(useAuthModule, "useAuth").mockReturnValue({
      user: {
        id: 1,
        role: "ADMIN",
        approvalStatus: "PENDING_APPROVAL",
      } as any,
      loading: false,
      error: null,
      isAuthenticated: true,
      refresh: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
      isAdmin: true,
      isRegionDirectorOrAbove: true,
      isDistrictDirectorOrAbove: true,
      isCampusDirectorOrAbove: true,
      isActive: false,
    });

    render(
      <RoleGate role="ADMIN" requireActive={true}>
        <div>Admin Content</div>
      </RoleGate>
    );

    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });

  it("shows children when user is not active but requireActive is false", () => {
    vi.spyOn(useAuthModule, "useAuth").mockReturnValue({
      user: {
        id: 1,
        role: "ADMIN",
        approvalStatus: "PENDING_APPROVAL",
      } as any,
      loading: false,
      error: null,
      isAuthenticated: true,
      refresh: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
      isAdmin: true,
      isRegionDirectorOrAbove: true,
      isDistrictDirectorOrAbove: true,
      isCampusDirectorOrAbove: true,
      isActive: false,
    });

    render(
      <RoleGate role="ADMIN" requireActive={false}>
        <div>Admin Content</div>
      </RoleGate>
    );

    expect(screen.getByText("Admin Content")).toBeInTheDocument();
  });

  it("hides children when user is null", () => {
    vi.spyOn(useAuthModule, "useAuth").mockReturnValue({
      user: null,
      loading: false,
      error: null,
      isAuthenticated: false,
      refresh: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
      isAdmin: false,
      isRegionDirectorOrAbove: false,
      isDistrictDirectorOrAbove: false,
      isCampusDirectorOrAbove: false,
      isActive: false,
    });

    render(
      <RoleGate role="ADMIN">
        <div>Admin Content</div>
      </RoleGate>
    );

    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });
});
