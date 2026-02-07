import { systemRouter } from "./_core/systemRouter";
import {
  publicProcedure,
  protectedProcedure,
  adminProcedure,
  router,
} from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { storagePut, storageGet } from "./storage";
import { setSessionCookie, clearSessionCookie } from "./_core/session";
import { TRPCError } from "@trpc/server";
import {
  getPeopleScope,
  canAccessPerson,
  canApproveDistrictDirector,
  canApproveRegionDirector,
} from "./_core/authorization";
import { hashPassword, verifyPassword } from "./_core/password";

/** Strip sensitive fields before sending user data to clients */
function sanitizeUser<T extends Record<string, unknown>>(
  user: T
): Omit<T, "passwordHash"> {
  const { passwordHash: _, ...safe } = user as any;
  return safe;
}

/**
 * Get default authorization levels based on role
 * Phase 2: Authorization matrix from design spec
 */
function getDefaultAuthorization(role: string) {
  switch (role) {
    case "NATIONAL_DIRECTOR":
    case "FIELD_DIRECTOR":
    case "CMC_GO_ADMIN":
      return {
        scopeLevel: "NATIONAL" as const,
        viewLevel: "NATIONAL" as const,
        editLevel: "NATIONAL" as const,
      };

    case "NATIONAL_STAFF":
      return {
        scopeLevel: "NATIONAL" as const,
        viewLevel: "NATIONAL" as const,
        editLevel: "XAN" as const, // Can only edit XAN panel members
      };

    case "REGION_DIRECTOR":
    case "REGIONAL_STAFF":
      return {
        scopeLevel: "NATIONAL" as const, // Can access National scope to see everything
        viewLevel: "NATIONAL" as const,
        editLevel: "REGION" as const, // Can only edit their region
      };

    case "DISTRICT_DIRECTOR":
    case "DISTRICT_STAFF":
      return {
        scopeLevel: "REGION" as const,
        viewLevel: "REGION" as const,
        editLevel: "DISTRICT" as const,
      };

    case "CAMPUS_DIRECTOR":
    case "CO_DIRECTOR":
      return {
        scopeLevel: "REGION" as const,
        viewLevel: "DISTRICT" as const,
        editLevel: "CAMPUS" as const,
      };

    case "CAMPUS_INTERN":
    case "CAMPUS_VOLUNTEER":
    default: // STAFF and below
      return {
        scopeLevel: "REGION" as const,
        viewLevel: "CAMPUS" as const,
        editLevel: "CAMPUS" as const,
      };
  }
}

// Roles available for registration (excludes CMC_GO_ADMIN which is pre-seeded)
const REGISTERABLE_ROLES = [
  "STAFF",
  "CO_DIRECTOR",
  "CAMPUS_DIRECTOR",
  "CAMPUS_INTERN",
  "CAMPUS_VOLUNTEER",
  "DISTRICT_DIRECTOR",
  "DISTRICT_STAFF",
  "REGION_DIRECTOR",
  "REGIONAL_STAFF",
  "NATIONAL_STAFF",
  "NATIONAL_DIRECTOR",
  "FIELD_DIRECTOR",
] as const;

// National Team roles (for registration flow - no campus required)
const NATIONAL_TEAM_ROLES = [
  "NATIONAL_STAFF",
  "NATIONAL_DIRECTOR",
  "FIELD_DIRECTOR",
  "REGION_DIRECTOR",
  "REGIONAL_STAFF",
] as const;

// District-level roles (need districtId but not campusId)
const DISTRICT_LEVEL_ROLES = ["DISTRICT_DIRECTOR", "DISTRICT_STAFF"] as const;

// Roles that require overseeRegionId
const ROLES_REQUIRING_OVERSEE_REGION = [
  "REGION_DIRECTOR",
  "REGIONAL_STAFF",
] as const;

export const appRouter = router({
  system: systemRouter,
  auth: router({
    // PR 2: Get current user with district/region/campus names
    me: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return null;

      // Get campus, district, and region names
      const campus = ctx.user.campusId
        ? await db.getCampusById(ctx.user.campusId)
        : null;
      const district = ctx.user.districtId
        ? await db.getDistrictById(ctx.user.districtId)
        : null;
      const selectedPerson = ctx.user.personId
        ? await db.getPersonByPersonId(ctx.user.personId)
        : null;

      return {
        ...sanitizeUser(ctx.user),
        campusName: campus?.name || null,
        districtName: district?.name || null,
        regionName: ctx.user.regionId || ctx.user.overseeRegionId || null,
        personName: selectedPerson?.name || null,
      };
    }),

    emailExists: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .query(async ({ input }) => {
        const existing = await db.getUserByEmail(input.email);
        return { exists: Boolean(existing) } as const;
      }),

    // Password-based login
    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const user = await db.getUserByEmail(input.email);

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User doesn't exist. Create a new user.",
          });
        }

        if (!user.passwordHash) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Wrong password.",
          });
        }

        // Check if user is banned
        if (user.isBanned) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Your account has been suspended",
          });
        }

        const isValid = await verifyPassword(input.password, user.passwordHash);
        if (!isValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Wrong password.",
          });
        }

        await db.updateUserLastLoginAt(user.id);
        setSessionCookie(ctx.req, ctx.res, user.id);

        const campus = user.campusId
          ? await db.getCampusById(user.campusId)
          : null;
        const district = user.districtId
          ? await db.getDistrictById(user.districtId)
          : null;

        return {
          success: true,
          user: {
            ...sanitizeUser(user),
            campusName: campus?.name || null,
            districtName: district?.name || null,
            regionName: user.regionId || null,
          },
        };
      }),

    // Password-based registration
    register: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(1),
          fullName: z.string().min(1),
          role: z.enum(REGISTERABLE_ROLES),
          // For campus-based roles
          campusId: z.number().optional(),
          // For district-level roles (DISTRICT_DIRECTOR, DISTRICT_STAFF)
          districtId: z.string().optional(),
          // For Regional Directors/Staff - which region they oversee
          overseeRegionId: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Check if user already exists
        const existingUser = await db.getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "An account with this email already exists",
          });
        }

        const isNationalTeamRole = (
          NATIONAL_TEAM_ROLES as readonly string[]
        ).includes(input.role);
        const isDistrictLevelRole = (
          DISTRICT_LEVEL_ROLES as readonly string[]
        ).includes(input.role);
        const requiresOverseeRegion = (
          ROLES_REQUIRING_OVERSEE_REGION as readonly string[]
        ).includes(input.role);

        // Validate based on role type
        if (isNationalTeamRole) {
          // National team members don't need campus
          if (requiresOverseeRegion && !input.overseeRegionId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Regional Directors and Regional Staff must specify which region they oversee",
            });
          }
        } else if (isDistrictLevelRole) {
          // District-level roles need districtId but not campusId
          if (!input.districtId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "District is required for this role",
            });
          }
        } else {
          // Campus-based roles need campus
          if (!input.campusId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Campus is required for this role",
            });
          }
        }

        // Get campus/district/region info based on role type
        let campusId: number | null = null;
        let districtId: string | null = null;
        let regionId: string | null = null;

        if (input.campusId) {
          // Campus-based roles
          const campus = await db.getCampusById(input.campusId);
          if (!campus) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Campus not found",
            });
          }
          const district = await db.getDistrictById(campus.districtId);
          if (!district) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "District not found",
            });
          }
          campusId = campus.id;
          districtId = campus.districtId;
          regionId = district.region;
        } else if (input.districtId) {
          // District-level roles (DISTRICT_DIRECTOR, DISTRICT_STAFF)
          const district = await db.getDistrictById(input.districtId);
          if (!district) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "District not found",
            });
          }
          districtId = district.id;
          regionId = district.region;
        }

        // For regional roles, set their oversee region
        const overseeRegionId = requiresOverseeRegion
          ? input.overseeRegionId || null
          : null;

        // For regional roles (REGION_DIRECTOR, REGIONAL_STAFF), set regionId to their oversee region
        // so they can properly filter the map to their region
        if (requiresOverseeRegion && overseeRegionId) {
          regionId = overseeRegionId;
        }

        // Hash password
        const passwordHash = await hashPassword(input.password);

        // Get default authorization levels
        const authLevels = getDefaultAuthorization(input.role);

        // Create user
        const userId = await db.createUser({
          fullName: input.fullName,
          email: input.email,
          passwordHash,
          role: input.role,
          campusId,
          districtId,
          regionId,
          overseeRegionId,
          ...authLevels,
          approvalStatus: "PENDING_APPROVAL", // Require admin approval
        });

        const user = await db.getUserById(userId);
        if (!user) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create user",
          });
        }

        // Auto-create a person record so the user shows up in the district panel
        const personId = `user-${userId}`;
        try {
          await db.createPerson({
            personId,
            name: input.fullName,
            primaryRole: input.role,
            primaryCampusId: campusId,
            primaryDistrictId: districtId,
            primaryRegion: regionId,
            status: "Not Invited",
          });
          // Link user to person record
          await db.updateUserPersonId(userId, personId);
        } catch (personError) {
          // Non-fatal: user can still function without a person record
          console.error(
            "[register] Failed to create person record:",
            personError
          );
        }

        // Set session
        await db.updateUserLastLoginAt(user.id);
        setSessionCookie(ctx.req, ctx.res, user.id);

        // Get names for response
        const campus = user.campusId
          ? await db.getCampusById(user.campusId)
          : null;
        const district = user.districtId
          ? await db.getDistrictById(user.districtId)
          : null;

        return {
          success: true,
          user: {
            ...sanitizeUser(user),
            campusName: campus?.name || null,
            districtName: district?.name || null,
            regionName: user.regionId || null,
          },
        };
      }),

    // Request password reset - sends a 6-digit code
    forgotPassword: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const user = await db.getUserByEmail(input.email);

        // Always return success to prevent email enumeration
        if (!user) {
          console.log(
            `[ForgotPassword] No user found for email: ${input.email}`
          );
          return { success: true };
        }

        // Generate a 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Store the code with 15-minute expiration
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        await db.createAuthToken({
          token: code,
          email: input.email,
          expiresAt,
        });

        // Import ENV for email configuration
        const { ENV } = await import("./_core/env");

        // Send email via Resend API if configured
        if (ENV.RESEND_API_KEY) {
          try {
            const response = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${ENV.RESEND_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: ENV.FROM_EMAIL,
                to: [input.email],
                subject: "CMC Go - Password Reset Code",
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #dc2626;">CMC Go Password Reset</h2>
                    <p>You requested a password reset for your CMC Go account.</p>
                    <p>Your reset code is:</p>
                    <div style="background: #f1f5f9; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                      <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0f172a;">${code}</span>
                    </div>
                    <p style="color: #64748b; font-size: 14px;">This code expires in 15 minutes.</p>
                    <p style="color: #64748b; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
                  </div>
                `,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              console.error(
                `[ForgotPassword] Resend API error: ${response.status}`,
                errorData
              );
              // Fall back to console log
              console.log(
                `[ForgotPassword] Reset code for ${input.email}: ${code}`
              );
            } else {
              console.log(
                `[ForgotPassword] Email sent successfully to ${input.email}`
              );
            }
          } catch (error) {
            console.error(`[ForgotPassword] Failed to send email:`, error);
            // Fall back to console log
            console.log(
              `[ForgotPassword] Reset code for ${input.email}: ${code}`
            );
          }
        } else {
          // No email service configured - log to console
          console.log(
            `[ForgotPassword] RESEND_API_KEY not configured. Reset code for ${input.email}: ${code}`
          );
          console.log(
            `[ForgotPassword] To enable email, add RESEND_API_KEY to your environment`
          );
        }

        console.log(
          `[ForgotPassword] Code expires at: ${expiresAt.toISOString()}`
        );

        return { success: true };
      }),

    // Verify reset code and reset password
    resetPassword: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          code: z.string().length(6),
          newPassword: z.string().min(1),
        })
      )
      .mutation(async ({ input }) => {
        // Verify the code
        const authToken = await db.getAuthToken(input.code);

        if (!authToken || authToken.email !== input.email) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid or expired reset code",
          });
        }

        // Get the user
        const user = await db.getUserByEmail(input.email);
        if (!user) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid or expired reset code",
          });
        }

        // Hash the new password
        const passwordHash = await hashPassword(input.newPassword);

        // Update the password
        await db.updateUserPassword(user.id, passwordHash);

        // Consume the token so it can't be reused
        await db.consumeAuthToken(input.code);

        return { success: true };
      }),

    // Legacy: Start registration/login (kept for backward compatibility)
    start: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          fullName: z.string().min(1).optional(),
          role: z
            .enum([
              "STAFF",
              "CO_DIRECTOR",
              "CAMPUS_DIRECTOR",
              "CAMPUS_INTERN",
              "CAMPUS_VOLUNTEER",
              "DISTRICT_DIRECTOR",
              "REGION_DIRECTOR",
            ])
            .optional(),
          campusId: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        let user = await db.getUserByEmail(input.email);

        if (!user) {
          if (!input.fullName || !input.role || !input.campusId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Registration data required for new users",
            });
          }

          const campus = await db.getCampusById(input.campusId);
          if (!campus) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Campus not found",
            });
          }

          const district = await db.getDistrictById(campus.districtId);
          if (!district) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "District not found",
            });
          }

          const userId = await db.createUser({
            fullName: input.fullName,
            email: input.email,
            role: input.role,
            campusId: input.campusId,
            districtId: campus.districtId,
            regionId: district.region,
          });

          user = await db.getUserById(userId);
          if (!user) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to create user",
            });
          }
        }

        await db.updateUserLastLoginAt(user.id);
        setSessionCookie(ctx.req, ctx.res, user.id);

        const campus = user.campusId
          ? await db.getCampusById(user.campusId)
          : null;
        const district = user.districtId
          ? await db.getDistrictById(user.districtId)
          : null;

        return {
          success: true,
          user: {
            ...sanitizeUser(user),
            campusName: campus?.name || null,
            districtName: district?.name || null,
            regionName: user.regionId || null,
          },
        };
      }),

    personSuggestions: protectedProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ input, ctx }) => {
        const scope = getPeopleScope(ctx.user);
        return await db.searchPeopleByNameInScope(input.query, scope, 20);
      }),

    setPerson: protectedProcedure
      .input(z.object({ personId: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        const person = await db.getPersonByPersonIdInScope(
          input.personId,
          ctx.user
        );
        if (!person) {
          const exists = await db.personExists(input.personId);
          if (!exists) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Person not found",
            });
          }

          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        await db.updateUserPersonId(ctx.user.id, person.personId);
        return { success: true } as const;
      }),

    createAndLinkPerson: protectedProcedure
      .input(z.object({ name: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        const personId = `user-${ctx.user.id}-${Date.now()}`;

        await db.createPerson({
          personId,
          name: input.name,
          primaryCampusId: ctx.user.campusId ?? null,
          primaryDistrictId: ctx.user.districtId ?? null,
          primaryRegion: ctx.user.regionId ?? null,
          primaryRole: ctx.user.role,
        } as any);

        await db.updateUserPersonId(ctx.user.id, personId);
        return { success: true, personId } as const;
      }),

    // PR 2: Verify code and complete registration/login
    verify: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          code: z.string().length(6),
          // Registration data (only needed for new users)
          fullName: z.string().min(1).optional(),
          role: z
            .enum([
              "STAFF",
              "CO_DIRECTOR",
              "CAMPUS_DIRECTOR",
              "CAMPUS_INTERN",
              "CAMPUS_VOLUNTEER",
              "DISTRICT_DIRECTOR",
              "REGION_DIRECTOR",
            ])
            .optional(),
          campusId: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Verify code
        const token = await db.getAuthToken(input.code);
        if (!token || token.email !== input.email) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid or expired verification code",
          });
        }

        // Check if user exists
        let user = await db.getUserByEmail(input.email);

        if (!user) {
          // New user - create account
          if (!input.fullName || !input.role || !input.campusId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Registration data required for new users",
            });
          }

          const userId = await db.createUser({
            fullName: input.fullName,
            email: input.email,
            role: input.role,
            campusId: input.campusId,
          });

          user = await db.getUserById(userId);
          if (!user) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to create user",
            });
          }
        }

        // Consume token
        await db.consumeAuthToken(input.code);

        // Update last login
        await db.updateUserLastLoginAt(user.id);

        // Create session
        setSessionCookie(ctx.req, ctx.res, user.id);

        // Get campus, district, and region names
        const campus = user.campusId
          ? await db.getCampusById(user.campusId)
          : null;
        const district = user.districtId
          ? await db.getDistrictById(user.districtId)
          : null;

        return {
          success: true,
          user: {
            ...sanitizeUser(user),
            campusName: campus?.name || null,
            districtName: district?.name || null,
            regionName: user.regionId || null,
          },
        };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      clearSessionCookie(ctx.req, ctx.res);
      return {
        success: true,
      } as const;
    }),
  }),

  // Admin router - User management endpoints
  admin: router({
    users: router({
      // List all users with joined names
      list: adminProcedure.query(async () => {
        const users = await db.getAllUsers();
        return users.map(user => ({
          ...user,
          isActiveSession:
            user.lastLoginAt &&
            new Date(user.lastLoginAt).getTime() > Date.now() - 30 * 60 * 1000,
        }));
      }),

      // Update user role
      updateRole: adminProcedure
        .input(
          z.object({
            userId: z.number(),
            role: z.enum([
              "STAFF",
              "CO_DIRECTOR",
              "CAMPUS_DIRECTOR",
              "CAMPUS_INTERN",
              "CAMPUS_VOLUNTEER",
              "DISTRICT_DIRECTOR",
              "DISTRICT_STAFF",
              "REGION_DIRECTOR",
              "REGIONAL_STAFF",
              "NATIONAL_STAFF",
              "NATIONAL_DIRECTOR",
              "FIELD_DIRECTOR",
              "CMC_GO_ADMIN",
              "ADMIN",
            ]),
          })
        )
        .mutation(async ({ input }) => {
          await db.updateUserRole(input.userId, input.role);
          return { success: true };
        }),

      // Update user approval status
      updateStatus: adminProcedure
        .input(
          z.object({
            userId: z.number(),
            approvalStatus: z.enum(["ACTIVE", "DISABLED"]),
          })
        )
        .mutation(async ({ input }) => {
          await db.updateUserApprovalStatus(input.userId, input.approvalStatus);
          return { success: true };
        }),

      // Update authorization levels (scope, view, edit)
      updateAuthLevels: adminProcedure
        .input(
          z.object({
            userId: z.number(),
            scopeLevel: z.enum(["NATIONAL", "REGION", "DISTRICT"]).optional(),
            viewLevel: z
              .enum(["NATIONAL", "REGION", "DISTRICT", "CAMPUS"])
              .optional(),
            editLevel: z
              .enum(["NATIONAL", "XAN", "REGION", "DISTRICT", "CAMPUS"])
              .optional(),
          })
        )
        .mutation(async ({ input }) => {
          const { userId, ...levels } = input;
          await db.updateUserAuthLevels(userId, levels);
          return { success: true };
        }),

      // Delete user
      delete: adminProcedure
        .input(z.object({ userId: z.number() }))
        .mutation(async ({ input }) => {
          await db.deleteUser(input.userId);
          return { success: true };
        }),
    }),

    sessions: router({
      // List active sessions (users logged in within threshold)
      listActive: adminProcedure.query(async () => {
        return await db.getActiveSessions(30); // 30 minute threshold
      }),
    }),
  }),

  districts: router({
    publicList: publicProcedure.query(async () => {
      try {
        return await db.getAllDistricts();
      } catch (error) {
        console.error(
          "[districts.publicList] Error:",
          error instanceof Error ? error.message : String(error)
        );
        if (error instanceof Error && error.message.includes("DATABASE_URL")) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "Database connection not configured. Please set DATABASE_URL or MYSQL_* environment variables.",
          });
        }
        throw error;
      }
    }),
    list: protectedProcedure.query(async ({ ctx }) => {
      try {
        const scope = getPeopleScope(ctx.user);

        // Return all districts for ALL scope, otherwise filtered by user's scope
        const allDistricts = await db.getAllDistricts();

        if (scope.level === "ALL") {
          return allDistricts;
        }

        // Filter districts by scope
        if (scope.level === "REGION") {
          return allDistricts.filter(d => d.region === scope.regionId);
        }

        if (scope.level === "DISTRICT") {
          return allDistricts.filter(d => d.id === scope.districtId);
        }

        if (scope.level === "CAMPUS") {
          // Get the district that contains the user's campus
          const campus = await db.getCampusById(scope.campusId);
          if (campus) {
            return allDistricts.filter(d => d.id === campus.districtId);
          }
        }

        return [];
      } catch (error) {
        console.error(
          "[districts.list] Error:",
          error instanceof Error ? error.message : String(error)
        );
        if (error instanceof Error && error.message.includes("DATABASE_URL")) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "Database connection not configured. Please set DATABASE_URL or MYSQL_* environment variables.",
          });
        }
        throw error;
      }
    }),
    getById: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return await db.getDistrictById(input.id);
      }),
    updateName: protectedProcedure
      .input(z.object({ id: z.string(), name: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const scope = getPeopleScope(ctx.user);

        if (scope.level === "DISTRICT" && scope.districtId !== input.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        if (scope.level === "REGION") {
          const district = await db.getDistrictById(input.id);
          if (!district || district.region !== scope.regionId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Access denied",
            });
          }
        }

        if (scope.level === "CAMPUS") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        await db.updateDistrictName(input.id, input.name);
        return { success: true };
      }),
    updateRegion: protectedProcedure
      .input(z.object({ id: z.string(), region: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const scope = getPeopleScope(ctx.user);

        if (scope.level === "DISTRICT" && scope.districtId !== input.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        if (scope.level === "REGION") {
          const district = await db.getDistrictById(input.id);
          if (!district || district.region !== scope.regionId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Access denied",
            });
          }
        }

        if (scope.level === "CAMPUS") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        await db.updateDistrictRegion(input.id, input.region);
        return { success: true };
      }),
  }),

  campuses: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      try {
        const scope = getPeopleScope(ctx.user);

        // Return all campuses for ALL scope, otherwise filtered by user's scope
        const allCampuses = await db.getAllCampuses();

        if (scope.level === "ALL") {
          return allCampuses;
        }

        // Filter campuses by scope
        if (scope.level === "REGION") {
          // Get all districts in the region first
          const allDistricts = await db.getAllDistricts();
          const regionDistrictIds = allDistricts
            .filter(d => d.region === scope.regionId)
            .map(d => d.id);
          return allCampuses.filter(c =>
            regionDistrictIds.includes(c.districtId)
          );
        }

        if (scope.level === "DISTRICT") {
          return allCampuses.filter(c => c.districtId === scope.districtId);
        }

        if (scope.level === "CAMPUS") {
          return allCampuses.filter(c => c.id === scope.campusId);
        }

        return [];
      } catch (error) {
        console.error(
          "[campuses.list] Error:",
          error instanceof Error ? error.message : String(error)
        );
        if (error instanceof Error && error.message.includes("DATABASE_URL")) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "Database connection not configured. Please set DATABASE_URL or MYSQL_* environment variables.",
          });
        }
        throw error;
      }
    }),
    byDistrict: publicProcedure
      .input(z.object({ districtId: z.string() }))
      .query(async ({ input }) => {
        return await db.getCampusesByDistrict(input.districtId);
      }),
    createPublic: publicProcedure
      .input(
        z.object({
          name: z.string().min(1),
          districtId: z.string().min(1),
        })
      )
      .mutation(async ({ input }) => {
        const existing = await db.getCampusByNameAndDistrict(
          input.name,
          input.districtId
        );
        if (existing) {
          return {
            id: existing.id,
            name: existing.name,
            districtId: existing.districtId,
            created: false,
          };
        }
        const insertId = await db.createCampus({
          name: input.name,
          districtId: input.districtId,
        });
        return {
          id: insertId,
          name: input.name,
          districtId: input.districtId,
          created: true,
        };
      }),
    updateName: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const scope = getPeopleScope(ctx.user);
        const campus = await db.getCampusById(input.id);
        if (!campus) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Campus not found",
          });
        }

        // Enforce scope: must be in-scope for this campus
        if (scope.level === "CAMPUS" && campus.id !== scope.campusId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "DISTRICT" &&
          campus.districtId !== scope.districtId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "REGION") {
          const district = await db.getDistrictById(campus.districtId);
          if (!district || district.region !== scope.regionId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Access denied",
            });
          }
        }

        await db.updateCampusName(input.id, input.name);
        return { success: true };
      }),
    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          districtId: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const scope = getPeopleScope(ctx.user);

        // Enforce scope: campus-scope users cannot create new campuses
        if (scope.level === "CAMPUS") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "DISTRICT" &&
          input.districtId !== scope.districtId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "REGION") {
          const district = await db.getDistrictById(input.districtId);
          if (!district || district.region !== scope.regionId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Access denied",
            });
          }
        }

        const insertId = await db.createCampus(input);
        return { id: insertId, name: input.name, districtId: input.districtId };
      }),
    archive: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const scope = getPeopleScope(ctx.user);
        const campus = await db.getCampusById(input.id);
        if (!campus) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Campus not found",
          });
        }

        // Authorization: Campus users cannot archive
        if (scope.level === "CAMPUS") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        if (
          scope.level === "DISTRICT" &&
          campus.districtId !== scope.districtId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        if (scope.level === "REGION") {
          const district = await db.getDistrictById(campus.districtId);
          if (!district || district.region !== scope.regionId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Access denied",
            });
          }
        }

        // Check if campus has people assigned
        const peopleCount = await db.countPeopleByCampusId(input.id);
        if (peopleCount > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot archive campus with ${peopleCount} people assigned. Move or remove people first.`,
          });
        }

        // NOTE: There is no "archived" flag in the schema yet; for now archive == delete.
        await db.deleteCampus(input.id);
        return { success: true };
      }),
    updateDisplayOrder: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          displayOrder: z.number().min(0),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const scope = getPeopleScope(ctx.user);
        const campus = await db.getCampusById(input.id);
        if (!campus) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Campus not found",
          });
        }

        // Authorization: Campus users cannot reorder
        if (scope.level === "CAMPUS") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        if (
          scope.level === "DISTRICT" &&
          campus.districtId !== scope.districtId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        if (scope.level === "REGION") {
          const district = await db.getDistrictById(campus.districtId);
          if (!district || district.region !== scope.regionId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Access denied",
            });
          }
        }

        await db.updateCampusDisplayOrder(input.id, input.displayOrder);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const scope = getPeopleScope(ctx.user);
        const campus = await db.getCampusById(input.id);
        if (!campus) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Campus not found",
          });
        }

        if (scope.level === "CAMPUS" && campus.id !== scope.campusId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        if (
          scope.level === "DISTRICT" &&
          campus.districtId !== scope.districtId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        if (scope.level === "REGION") {
          const district = await db.getDistrictById(campus.districtId);
          if (!district || district.region !== scope.regionId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Access denied",
            });
          }
        }

        await db.deleteCampus(input.id);
        return { success: true };
      }),
  }),

  people: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      try {
        const scope = getPeopleScope(ctx.user);

        switch (scope.level) {
          case "ALL":
            return await db.getAllPeople();
          case "REGION":
            return await db.getPeopleByRegionId(scope.regionId);
          case "DISTRICT":
            return await db.getPeopleByDistrictId(scope.districtId);
          case "CAMPUS":
            return await db.getPeopleByCampusId(scope.campusId);
        }
      } catch (error) {
        console.error(
          "[people.list] Error:",
          error instanceof Error ? error.message : String(error)
        );
        // Check if it's a database connection error
        if (error instanceof Error && error.message.includes("DATABASE_URL")) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "Database connection not configured. Please set DATABASE_URL or MYSQL_* environment variables.",
          });
        }
        throw error;
      }
    }),
    getNational: protectedProcedure.query(async ({ ctx }) => {
      const scope = getPeopleScope(ctx.user);
      if (scope.level !== "ALL") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      return await db.getNationalStaff();
    }),
    byDistrict: protectedProcedure
      .input(z.object({ districtId: z.string() }))
      .query(async ({ input, ctx }) => {
        const scope = getPeopleScope(ctx.user);

        // Check if district is in scope
        if (
          scope.level === "CAMPUS" ||
          (scope.level === "DISTRICT" && scope.districtId !== input.districtId)
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        if (scope.level === "REGION") {
          // Need to verify the district belongs to the user's region
          const district = await db.getDistrictById(input.districtId);
          if (!district || district.region !== scope.regionId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Access denied",
            });
          }
        }

        return await db.getPeopleByDistrictId(input.districtId);
      }),
    byCampus: protectedProcedure
      .input(z.object({ campusId: z.number() }))
      .query(async ({ input, ctx }) => {
        const scope = getPeopleScope(ctx.user);

        // Check if campus is in scope
        if (scope.level === "CAMPUS" && scope.campusId !== input.campusId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        if (scope.level === "DISTRICT") {
          // Need to verify the campus belongs to the user's district
          const campus = await db.getCampusById(input.campusId);
          if (!campus || campus.districtId !== scope.districtId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Access denied",
            });
          }
        }

        if (scope.level === "REGION") {
          // Need to verify the campus belongs to the user's region
          const campus = await db.getCampusById(input.campusId);
          if (!campus) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Access denied",
            });
          }
          const district = await db.getDistrictById(campus.districtId);
          if (!district || district.region !== scope.regionId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Access denied",
            });
          }
        }

        return await db.getPeopleByCampusId(input.campusId);
      }),
    create: protectedProcedure
      .input(
        z.object({
          personId: z.string(),
          name: z.string(),
          primaryCampusId: z.number().nullable().optional(),
          primaryDistrictId: z.string().optional(),
          primaryRegion: z.string().optional(),
          primaryRole: z.string().optional(),
          nationalCategory: z.string().optional(),
          status: z
            .enum(["Yes", "Maybe", "No", "Not Invited"])
            .default("Not Invited"),
          depositPaid: z.boolean().optional(),
          notes: z.string().optional(),
          spouse: z.string().optional(),
          kids: z.string().optional(),
          guests: z.string().optional(),
          childrenAges: z.string().optional(),
          householdId: z.number().nullable().optional(),
          householdRole: z.enum(["primary", "member"]).optional(),
          spouseAttending: z.boolean().optional(),
          childrenCount: z.number().min(0).max(10).optional(),
          guestsCount: z.number().min(0).max(10).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (
          !canAccessPerson(ctx.user, {
            primaryCampusId: input.primaryCampusId ?? null,
            primaryDistrictId: input.primaryDistrictId ?? null,
            primaryRegion: input.primaryRegion ?? null,
          })
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied: can only create people within your scope",
          });
        }

        try {
          console.log(
            "[people.create] Received input:",
            JSON.stringify(input, null, 2)
          );

          // Build createData object, only including fields that have values
          const createData: any = {
            personId: input.personId,
            name: input.name,
            status: input.status || "Not Invited",
            depositPaid: input.depositPaid ?? false,
          };

          // Only add optional fields if they have values
          if (input.primaryDistrictId) {
            createData.primaryDistrictId = input.primaryDistrictId;
          }
          if (input.primaryRegion) {
            createData.primaryRegion = input.primaryRegion;
          }
          if (input.primaryRole) {
            createData.primaryRole = input.primaryRole;
          }
          if (
            input.primaryCampusId !== undefined &&
            input.primaryCampusId !== null
          ) {
            createData.primaryCampusId = input.primaryCampusId;
          }
          if (input.nationalCategory) {
            createData.nationalCategory = input.nationalCategory;
          }
          if (input.notes) {
            createData.notes = input.notes;
          }
          if (input.spouse) {
            createData.spouse = input.spouse;
          }
          if (input.kids) {
            createData.kids = input.kids;
          }
          if (input.guests) {
            createData.guests = input.guests;
          }
          if (input.childrenAges) {
            createData.childrenAges = input.childrenAges;
          }

          // Add household fields
          if (input.householdId !== undefined && input.householdId !== null) {
            createData.householdId = input.householdId;
          }
          if (input.householdRole) {
            createData.householdRole = input.householdRole;
          }
          if (input.spouseAttending !== undefined) {
            createData.spouseAttending = input.spouseAttending;
          }
          if (input.childrenCount !== undefined) {
            createData.childrenCount = input.childrenCount;
          }
          if (input.guestsCount !== undefined) {
            createData.guestsCount = input.guestsCount;
          }

          // Add last edited tracking
          createData.lastEdited = new Date();
          createData.lastEditedBy =
            ctx.user?.fullName || ctx.user?.email || "System";

          const result = await db.createPerson(createData);

          return { success: true, insertId: result };
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.error(
              "[people.create] Error:",
              error instanceof Error ? error.message : String(error)
            );
          }
          throw new Error(
            `Failed to create person: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }),
    updateStatus: protectedProcedure
      .input(
        z.object({
          personId: z.string(),
          status: z.enum(["Yes", "Maybe", "No", "Not Invited"]),
          note: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const person = await db.getPersonByPersonIdInScope(
          input.personId,
          ctx.user
        );
        if (!person) {
          const exists = await db.personExists(input.personId);
          if (!exists) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Person not found",
            });
          }

          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        await db.updatePersonStatus(input.personId, input.status);
        return { success: true };
      }),
    getById: protectedProcedure
      .input(z.object({ personId: z.string() }))
      .query(async ({ input, ctx }) => {
        const person = await db.getPersonByPersonIdInScope(
          input.personId,
          ctx.user
        );
        if (person) return person;

        const exists = await db.personExists(input.personId);
        if (!exists) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Person not found",
          });
        }

        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }),
    updateName: protectedProcedure
      .input(z.object({ personId: z.string(), name: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const person = await db.getPersonByPersonIdInScope(
          input.personId,
          ctx.user
        );
        if (!person) {
          const exists = await db.personExists(input.personId);
          if (!exists) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Person not found",
            });
          }

          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        await db.updatePersonName(input.personId, input.name);
        return { success: true };
      }),
    update: protectedProcedure
      .input(
        z.object({
          personId: z.string(),
          name: z.string().optional(),
          primaryRole: z.string().optional(),
          primaryCampusId: z.number().nullable().optional(),
          status: z.enum(["Yes", "Maybe", "No", "Not Invited"]).optional(),
          depositPaid: z.boolean().optional(),
          notes: z.string().optional(),
          spouse: z.string().optional(),
          kids: z.string().optional(),
          guests: z.string().optional(),
          childrenAges: z.string().optional(),
          householdId: z.number().nullable().optional(),
          householdRole: z.enum(["primary", "member"]).optional(),
          spouseAttending: z.boolean().optional(),
          childrenCount: z.number().min(0).max(10).optional(),
          guestsCount: z.number().min(0).max(10).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { personId, ...data } = input;

        const person = await db.getPersonByPersonId(personId);
        if (!person) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Person not found",
          });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (
          scope.level === "CAMPUS" &&
          person.primaryCampusId !== scope.campusId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "DISTRICT" &&
          person.primaryDistrictId !== scope.districtId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "REGION" &&
          person.primaryRegion !== scope.regionId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        const updateData: any = { ...data };

        // Convert null to undefined for optional fields (Drizzle handles undefined better)
        if (updateData.primaryCampusId === null) {
          updateData.primaryCampusId = undefined;
        }
        if (updateData.householdId === null) {
          updateData.householdId = undefined;
        }

        // Validation: spouseAttending or childrenCount > 0 requires householdId
        try {
          const finalSpouseAttending =
            updateData.spouseAttending !== undefined
              ? updateData.spouseAttending
              : (person.spouseAttending ?? false);
          const finalChildrenCount =
            updateData.childrenCount !== undefined
              ? updateData.childrenCount
              : (person.childrenCount ?? 0);
          const finalHouseholdId =
            updateData.householdId !== undefined
              ? updateData.householdId
              : (person.householdId ?? null);

          if (
            (finalSpouseAttending || finalChildrenCount > 0) &&
            !finalHouseholdId
          ) {
            console.warn(
              "Household required but not linked. Resetting spouseAttending and childrenCount."
            );
            updateData.spouseAttending = false;
            updateData.childrenCount = 0;
          }
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.error(
              "Error checking person data:",
              error instanceof Error ? error.message : String(error)
            );
          }
        }

        // Add last edited tracking
        updateData.lastEdited = new Date();
        updateData.lastEditedBy =
          ctx.user?.fullName || ctx.user?.email || "System";

        await db.updatePerson(personId, updateData);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ personId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const person = await db.getPersonByPersonId(input.personId);
        if (!person) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Person not found",
          });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (
          scope.level === "CAMPUS" &&
          person.primaryCampusId !== scope.campusId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "DISTRICT" &&
          person.primaryDistrictId !== scope.districtId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "REGION" &&
          person.primaryRegion !== scope.regionId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        await db.deletePerson(input.personId);
        return { success: true };
      }),
    moveToCampus: protectedProcedure
      .input(
        z.object({
          personId: z.string(),
          targetCampusId: z.number().nullable(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const person = await db.getPersonByPersonId(input.personId);
        if (!person) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Person not found",
          });
        }

        const scope = getPeopleScope(ctx.user);

        // Authorization: Campus users cannot move people
        if (scope.level === "CAMPUS") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        // Check if person is in scope (must be able to access source)
        if (
          scope.level === "DISTRICT" &&
          person.primaryDistrictId !== scope.districtId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "REGION" &&
          person.primaryRegion !== scope.regionId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        // If target campus is specified, verify it's in scope
        if (input.targetCampusId !== null) {
          const targetCampus = await db.getCampusById(input.targetCampusId);
          if (!targetCampus) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Target campus not found",
            });
          }

          // Check if target campus is within user's scope
          if (
            scope.level === "DISTRICT" &&
            targetCampus.districtId !== scope.districtId
          ) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Target campus is outside your district",
            });
          }
          if (scope.level === "REGION") {
            const targetDistrict = await db.getDistrictById(
              targetCampus.districtId
            );
            if (!targetDistrict || targetDistrict.region !== scope.regionId) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "Target campus is outside your region",
              });
            }
          }
        }

        // Update person's campus
        await db.updatePerson(input.personId, {
          primaryCampusId: input.targetCampusId,
          lastEdited: new Date(),
          lastEditedBy: ctx.user?.fullName || ctx.user?.email || "System",
        });

        return { success: true };
      }),
    statusHistory: protectedProcedure
      .input(
        z.object({
          personId: z.string(),
          limit: z.number().min(1).max(100).optional().default(20),
        })
      )
      .query(async ({ input, ctx }) => {
        const person = await db.getPersonByPersonId(input.personId);
        if (!person) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Person not found",
          });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (
          scope.level === "CAMPUS" &&
          person.primaryCampusId !== scope.campusId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "DISTRICT" &&
          person.primaryDistrictId !== scope.districtId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "REGION" &&
          person.primaryRegion !== scope.regionId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        return await db.getStatusHistory(input.personId, input.limit);
      }),
    revertStatusChange: protectedProcedure
      .input(
        z.object({
          statusChangeId: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Need to get the person associated with this status change
        const statusChanges = await db.getStatusHistory("", 1000); // Get many to find the one we need
        const statusChange = statusChanges.find(
          sc => sc.id === input.statusChangeId
        );
        if (!statusChange) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Status change not found",
          });
        }

        const person = await db.getPersonByPersonId(statusChange.personId);
        if (!person) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Person not found",
          });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (
          scope.level === "CAMPUS" &&
          person.primaryCampusId !== scope.campusId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "DISTRICT" &&
          person.primaryDistrictId !== scope.districtId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "REGION" &&
          person.primaryRegion !== scope.regionId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        return await db.revertStatusChange(
          input.statusChangeId,
          ctx.user?.id || null
        );
      }),
    importCSV: protectedProcedure
      .input(
        z.object({
          rows: z.array(
            z.object({
              name: z.string(),
              campus: z.string().optional(), // Optional for leadership roles (DD, DS, RD, etc.)
              district: z.string().optional(),
              role: z.string().optional(),
              status: z.enum(["Yes", "Maybe", "No", "Not Invited"]).optional(),
              notes: z.string().optional(),
            })
          ),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const scope = getPeopleScope(ctx.user);

        // Only allow ALL scope users to import (typically admins/directors)
        if (scope.level !== "ALL") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied: bulk import requires full access",
          });
        }

        return await db.importPeople(input.rows);
      }),
  }),

  needs: router({
    byPerson: protectedProcedure
      .input(z.object({ personId: z.string() }))
      .query(async ({ input, ctx }) => {
        const person = await db.getPersonByPersonId(input.personId);
        if (!person) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Person not found",
          });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (
          scope.level === "CAMPUS" &&
          person.primaryCampusId !== scope.campusId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "DISTRICT" &&
          person.primaryDistrictId !== scope.districtId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "REGION" &&
          person.primaryRegion !== scope.regionId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        return await db.getNeedsByPersonId(input.personId);
      }),
    create: protectedProcedure
      .input(
        z.object({
          personId: z.string(),
          type: z.enum(["Financial", "Transportation", "Housing", "Other"]),
          description: z.string(),
          amount: z.number().optional(),
          visibility: z
            .enum(["LEADERSHIP_ONLY", "DISTRICT_VISIBLE"])
            .default("LEADERSHIP_ONLY"),
          isActive: z.boolean().default(true),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const person = await db.getPersonByPersonId(input.personId);
        if (!person) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Person not found",
          });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (
          scope.level === "CAMPUS" &&
          person.primaryCampusId !== scope.campusId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "DISTRICT" &&
          person.primaryDistrictId !== scope.districtId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "REGION" &&
          person.primaryRegion !== scope.regionId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        await db.createNeed({
          ...input,
          createdById: ctx.user?.id || null,
        });
        // Update person's lastUpdated
        await db.updatePersonStatus(input.personId, person.status);
        return { success: true };
      }),
    updateOrCreate: protectedProcedure
      .input(
        z.object({
          personId: z.string(),
          type: z
            .enum(["Financial", "Transportation", "Housing", "Other"])
            .optional(),
          description: z.string().optional(),
          amount: z.number().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { personId } = input;
        const person = await db.getPersonByPersonId(personId);
        if (!person) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Person not found",
          });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (
          scope.level === "CAMPUS" &&
          person.primaryCampusId !== scope.campusId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "DISTRICT" &&
          person.primaryDistrictId !== scope.districtId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "REGION" &&
          person.primaryRegion !== scope.regionId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        if (input.type && input.description !== undefined) {
          await db.updateOrCreateNeed(personId, {
            type: input.type,
            description: input.description,
            amount: input.amount,
            isActive: input.isActive ?? true,
            createdById: ctx.user.id,
          });
        } else if (input.isActive !== undefined) {
          // Just update isActive
          const existing = await db.getNeedByPersonId(personId);
          if (existing) {
            await db.toggleNeedActive(existing.id, input.isActive);
          }
        }
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ personId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const person = await db.getPersonByPersonId(input.personId);
        if (!person) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Person not found",
          });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (
          scope.level === "CAMPUS" &&
          person.primaryCampusId !== scope.campusId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "DISTRICT" &&
          person.primaryDistrictId !== scope.districtId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "REGION" &&
          person.primaryRegion !== scope.regionId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        await db.deleteNeedByPersonId(input.personId);
        return { success: true };
      }),
    toggleActive: protectedProcedure
      .input(
        z.object({
          needId: z.number(),
          isActive: z.boolean(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Get the need to find the person (must work for active + inactive needs)
        const need = await db.getNeedById(input.needId);
        if (!need) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Need not found" });
        }

        const person = await db.getPersonByPersonId(need.personId);
        if (!person) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Person not found",
          });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (
          scope.level === "CAMPUS" &&
          person.primaryCampusId !== scope.campusId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "DISTRICT" &&
          person.primaryDistrictId !== scope.districtId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "REGION" &&
          person.primaryRegion !== scope.regionId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        await db.toggleNeedActive(input.needId, input.isActive);
        return { success: true };
      }),
    updateVisibility: protectedProcedure
      .input(
        z.object({
          needId: z.number(),
          visibility: z.enum(["LEADERSHIP_ONLY", "DISTRICT_VISIBLE"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Get the need to find the person (must work for active + inactive needs)
        const need = await db.getNeedById(input.needId);
        if (!need) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Need not found" });
        }

        const person = await db.getPersonByPersonId(need.personId);
        if (!person) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Person not found",
          });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (
          scope.level === "CAMPUS" &&
          person.primaryCampusId !== scope.campusId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "DISTRICT" &&
          person.primaryDistrictId !== scope.districtId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "REGION" &&
          person.primaryRegion !== scope.regionId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        await db.updateNeedVisibility(input.needId, input.visibility);
        return { success: true };
      }),
    listActive: protectedProcedure.query(async ({ ctx }) => {
      try {
        const scope = getPeopleScope(ctx.user);
        const allNeeds = await db.getAllActiveNeeds();

        // Filter needs by scope - need to check each need's person
        const filteredNeeds = [];
        for (const need of allNeeds) {
          const person = await db.getPersonByPersonId(need.personId);
          if (!person) continue;

          // Check if person is in scope
          if (scope.level === "ALL") {
            filteredNeeds.push(need);
          } else if (
            scope.level === "REGION" &&
            person.primaryRegion === scope.regionId
          ) {
            filteredNeeds.push(need);
          } else if (
            scope.level === "DISTRICT" &&
            person.primaryDistrictId === scope.districtId
          ) {
            filteredNeeds.push(need);
          } else if (
            scope.level === "CAMPUS" &&
            person.primaryCampusId === scope.campusId
          ) {
            filteredNeeds.push(need);
          }
        }

        return filteredNeeds;
      } catch (error) {
        console.error(
          "[needs.listActive] Error:",
          error instanceof Error ? error.message : String(error)
        );
        if (error instanceof Error && error.message.includes("DATABASE_URL")) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "Database connection not configured. Please set DATABASE_URL or MYSQL_* environment variables.",
          });
        }
        throw error;
      }
    }),
  }),

  notes: router({
    byPerson: protectedProcedure
      .input(
        z.object({
          personId: z.string(),
          category: z.enum(["INVITE", "INTERNAL"]).optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        const person = await db.getPersonByPersonId(input.personId);
        if (!person) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Person not found",
          });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (
          scope.level === "CAMPUS" &&
          person.primaryCampusId !== scope.campusId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "DISTRICT" &&
          person.primaryDistrictId !== scope.districtId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "REGION" &&
          person.primaryRegion !== scope.regionId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        return await db.getNotesByPersonId(input.personId, input.category);
      }),
    create: protectedProcedure
      .input(
        z.object({
          personId: z.string(),
          category: z.enum(["INVITE", "INTERNAL"]).default("INTERNAL"),
          content: z.string(),
          noteType: z.enum(["GENERAL", "REQUEST"]).optional(),
          createdBy: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const person = await db.getPersonByPersonId(input.personId);
        if (!person) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Person not found",
          });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (
          scope.level === "CAMPUS" &&
          person.primaryCampusId !== scope.campusId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "DISTRICT" &&
          person.primaryDistrictId !== scope.districtId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "REGION" &&
          person.primaryRegion !== scope.regionId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        await db.createNote({
          ...input,
          noteType: input.noteType ?? "GENERAL",
        });
        // Update person's lastUpdated
        await db.updatePersonStatus(input.personId, person.status);
        return { success: true };
      }),
  }),

  // PR 2: Invite Notes (leaders-only)
  inviteNotes: router({
    byPerson: protectedProcedure
      .input(z.object({ personId: z.string() }))
      .query(async ({ input, ctx }) => {
        const person = await db.getPersonByPersonId(input.personId);
        if (!person) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Person not found",
          });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (
          scope.level === "CAMPUS" &&
          person.primaryCampusId !== scope.campusId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "DISTRICT" &&
          person.primaryDistrictId !== scope.districtId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "REGION" &&
          person.primaryRegion !== scope.regionId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        return await db.getInviteNotesByPersonId(input.personId);
      }),
    create: protectedProcedure
      .input(
        z.object({
          personId: z.string(),
          content: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const person = await db.getPersonByPersonId(input.personId);
        if (!person) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Person not found",
          });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (
          scope.level === "CAMPUS" &&
          person.primaryCampusId !== scope.campusId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "DISTRICT" &&
          person.primaryDistrictId !== scope.districtId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (
          scope.level === "REGION" &&
          person.primaryRegion !== scope.regionId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        await db.createInviteNote({
          personId: input.personId,
          content: input.content,
          createdByUserId: ctx.user.id,
        });

        return { success: true };
      }),
  }),

  // PR 2: Approvals
  // AUTHORIZATION: Protected - requires authentication and role-based checks
  // - list: ADMIN sees all, REGION_DIRECTOR sees their region, others see none
  // - approve/reject: Uses canApproveDistrictDirector/canApproveRegionDirector helpers
  approvals: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      // Only ADMIN can view all pending approvals
      // Other roles will be filtered by their scope
      if (ctx.user.role === "ADMIN") {
        return await db.getPendingApprovals("ADMIN");
      } else if (ctx.user.role === "REGION_DIRECTOR") {
        // REGION_DIRECTOR can see approvals in their region
        return await db.getPendingApprovals("REGION_DIRECTOR");
      } else {
        // Other roles cannot view approvals
        return [];
      }
    }),
    approve: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const targetUser = await db.getUserById(input.userId);
        if (!targetUser) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }

        // Check if approver has permission to approve this user
        if (targetUser.role === "DISTRICT_DIRECTOR") {
          if (!canApproveDistrictDirector(ctx.user, targetUser)) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Not authorized to approve this user",
            });
          }
        } else if (targetUser.role === "REGION_DIRECTOR") {
          if (!canApproveRegionDirector(ctx.user, targetUser)) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Not authorized to approve this user",
            });
          }
        } else {
          // For other roles, only ADMIN can approve
          if (ctx.user.role !== "ADMIN") {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Not authorized to approve this user",
            });
          }
        }

        await db.approveUser(input.userId, ctx.user.id);
        return { success: true };
      }),
    reject: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const targetUser = await db.getUserById(input.userId);
        if (!targetUser) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }

        // Check if approver has permission to reject this user
        if (targetUser.role === "DISTRICT_DIRECTOR") {
          if (!canApproveDistrictDirector(ctx.user, targetUser)) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Not authorized to reject this user",
            });
          }
        } else if (targetUser.role === "REGION_DIRECTOR") {
          if (!canApproveRegionDirector(ctx.user, targetUser)) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Not authorized to reject this user",
            });
          }
        } else {
          // For other roles, only ADMIN can reject
          if (ctx.user.role !== "ADMIN") {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Not authorized to reject this user",
            });
          }
        }

        await db.rejectUser(input.userId, ctx.user.id);
        return { success: true };
      }),
  }),

  metrics: router({
    get: publicProcedure.query(async () => {
      return await db.getMetrics();
    }),
    district: publicProcedure
      .input(z.object({ districtId: z.string() }))
      .query(async ({ input }) => {
        return await db.getDistrictMetrics(input.districtId);
      }),
    districtLeadership: publicProcedure
      .input(z.object({ districtId: z.string() }))
      .query(async ({ input }) => {
        return await db.getDistrictLeadershipCounts(input.districtId);
      }),
    campusesByDistrict: publicProcedure
      .input(z.object({ districtId: z.string() }))
      .query(async ({ input }) => {
        return await db.getCampusMetricsByDistrict(input.districtId);
      }),
    districtNeeds: publicProcedure
      .input(z.object({ districtId: z.string() }))
      .query(async ({ input }) => {
        return await db.getDistrictNeedsSummary(input.districtId);
      }),
    needsAggregate: publicProcedure.query(async () => {
      return await db.getNeedsAggregateSummary();
    }),
    allDistricts: publicProcedure.query(async () => {
      // Public aggregate endpoint - everyone can see district counts
      return await db.getAllDistrictMetrics();
    }),
    region: publicProcedure
      .input(z.object({ region: z.string() }))
      .query(async ({ input }) => {
        return await db.getRegionMetrics(input.region);
      }),
    allRegions: publicProcedure.query(async () => {
      // Public aggregate endpoint - everyone can see region counts
      return await db.getAllRegionMetrics();
    }),
  }),

  followUp: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const scope = getPeopleScope(ctx.user);
      const allFollowUpPeople = await db.getFollowUpPeople();

      // Filter by scope
      return allFollowUpPeople.filter(person => {
        if (scope.level === "ALL") return true;
        if (scope.level === "REGION" && person.primaryRegion === scope.regionId)
          return true;
        if (
          scope.level === "DISTRICT" &&
          person.primaryDistrictId === scope.districtId
        )
          return true;
        if (
          scope.level === "CAMPUS" &&
          person.primaryCampusId === scope.campusId
        )
          return true;
        return false;
      });
    }),
  }),

  // AUTHORIZATION: Settings - Admin-only for mutations, public for queries
  settings: router({
    getSettings: publicProcedure.query(async () => {
      return await db.getAllSettings();
    }),
    get: publicProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        return await db.getSetting(input.key);
      }),
    updateSettings: adminProcedure
      .input(z.record(z.string(), z.string()))
      .mutation(async ({ input }) => {
        await db.updateSettings(input);
        return { success: true };
      }),
    // Get a fresh presigned URL for the header image
    // This is needed because stored URLs expire (presigned)
    getHeaderImageUrl: publicProcedure.query(async () => {
      const setting = await db.getSetting("headerImageKey");
      if (!setting || !setting.value) {
        return { url: null };
      }
      try {
        const { url } = await storageGet(setting.value);
        return { url };
      } catch (error) {
        console.error(
          "[getHeaderImageUrl] Failed to get presigned URL:",
          error
        );
        return { url: null };
      }
    }),
    set: adminProcedure
      .input(z.object({ key: z.string(), value: z.string() }))
      .mutation(async ({ input }) => {
        await db.setSetting(input.key, input.value);
        return { success: true };
      }),
    uploadHeaderImage: adminProcedure
      .input(
        z.object({
          imageData: z.string(), // base64 encoded image
          fileName: z.string(),
          backgroundColor: z.string().optional(), // hex color for background
        })
      )
      .mutation(async ({ input }) => {
        try {
          console.log(
            "[uploadHeaderImage] Starting upload for:",
            input.fileName
          );

          // Convert base64 to buffer
          const base64Data = input.imageData.split(",")[1];
          if (!base64Data) {
            throw new Error("Invalid base64 image data");
          }
          const buffer = Buffer.from(base64Data, "base64");
          console.log("[uploadHeaderImage] Buffer size:", buffer.length);

          // Upload to S3
          const fileKey = `header-images/${Date.now()}-${input.fileName}`;
          console.log("[uploadHeaderImage] Uploading to S3 with key:", fileKey);
          const { url } = await storagePut(fileKey, buffer, "image/jpeg");
          console.log("[uploadHeaderImage] S3 upload successful, URL:", url);

          // Save the file KEY (not URL) to database - URLs are presigned and expire
          // The key is used to generate fresh presigned URLs on retrieval
          console.log(
            "[uploadHeaderImage] Saving file key to database:",
            fileKey
          );
          await db.setSetting("headerImageKey", fileKey);

          // Save background color if provided
          if (input.backgroundColor) {
            console.log(
              "[uploadHeaderImage] Saving background color:",
              input.backgroundColor
            );
            await db.setSetting("headerBgColor", input.backgroundColor);
          }
          console.log("[uploadHeaderImage] Database save successful");

          return { url, backgroundColor: input.backgroundColor };
        } catch (error) {
          console.error("[uploadHeaderImage] Error:", error);
          throw error;
        }
      }),
  }),

  // AUTHORIZATION: Households - Public read, protected write
  // Queries are public for data access, all mutations require authentication
  households: router({
    list: publicProcedure.query(async () => {
      try {
        return await db.getAllHouseholds();
      } catch (error) {
        console.error(
          "[households.list] Error:",
          error instanceof Error ? error.message : String(error)
        );
        // Check if it's a database connection error
        if (error instanceof Error && error.message.includes("DATABASE_URL")) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "Database connection not configured. Please set DATABASE_URL or MYSQL_* environment variables.",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch households list",
        });
      }
    }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getHouseholdById(input.id);
      }),
    getMembers: protectedProcedure
      .input(z.object({ householdId: z.number() }))
      .query(async ({ input, ctx }) => {
        // SECURITY FIX (Issue #247): Require authentication to view household members
        // Person records contain sensitive identity information (names, roles, status)
        const scope = getPeopleScope(ctx.user);

        // Get all members of the household
        const members = await db.getHouseholdMembers(input.householdId);

        // Filter members based on user's scope
        return members.filter(person => {
          if (scope.level === "ALL") return true;
          if (
            scope.level === "REGION" &&
            person.primaryRegion === scope.regionId
          )
            return true;
          if (
            scope.level === "DISTRICT" &&
            person.primaryDistrictId === scope.districtId
          )
            return true;
          if (
            scope.level === "CAMPUS" &&
            person.primaryCampusId === scope.campusId
          )
            return true;
          return false;
        });
      }),
    search: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        return await db.searchHouseholds(input.query);
      }),
    create: protectedProcedure
      .input(
        z.object({
          label: z.string().optional(),
          childrenCount: z.number().default(0),
          guestsCount: z.number().default(0),
        })
      )
      .mutation(async ({ input }) => {
        const insertId = await db.createHousehold(input);
        return { id: insertId, ...input };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          label: z.string().optional(),
          childrenCount: z.number().optional(),
          guestsCount: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateHousehold(id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteHousehold(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
