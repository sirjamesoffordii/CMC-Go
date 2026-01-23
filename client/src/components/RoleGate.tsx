import { useAuth } from "@/_core/hooks/useAuth";
import React, { ReactNode } from "react";

export type UserRole =
  | "STAFF"
  | "CO_DIRECTOR"
  | "CAMPUS_DIRECTOR"
  | "DISTRICT_DIRECTOR"
  | "REGION_DIRECTOR"
  | "ADMIN";

interface RoleGateProps {
  /**
   * Required role(s) to view this content.
   * Can be a single role or array of roles (OR logic).
   */
  role: UserRole | UserRole[];
  /**
   * Content to render if user has required role
   */
  children: ReactNode;
  /**
   * Optional fallback content to render if user doesn't have role
   */
  fallback?: ReactNode;
  /**
   * If true, requires user to be ACTIVE (default: true)
   */
  requireActive?: boolean;
}

/**
 * Role-based view gating component.
 * Shows/hides UI based on user role and approval status.
 *
 * @example
 * ```tsx
 * <RoleGate role="ADMIN">
 *   <AdminPanel />
 * </RoleGate>
 * ```
 *
 * @example Multiple roles (OR logic)
 * ```tsx
 * <RoleGate role={["REGION_DIRECTOR", "ADMIN"]}>
 *   <NationalFeatures />
 * </RoleGate>
 * ```
 */
export function RoleGate({
  role,
  children,
  fallback = null,
  requireActive = true,
}: RoleGateProps) {
  const { user } = useAuth();

  if (!user) {
    return <>{fallback}</>;
  }

  // Check approval status if required
  if (requireActive && user.approvalStatus !== "ACTIVE") {
    return <>{fallback}</>;
  }

  // Check role
  const allowedRoles = Array.isArray(role) ? role : [role];
  const hasRole = allowedRoles.includes(user.role as UserRole);

  if (!hasRole) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
