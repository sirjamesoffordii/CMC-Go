import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import {
  setSessionCookie,
  clearSessionCookie,
  getUserIdFromSession,
} from "./_core/session";
import { TRPCError } from "@trpc/server";
import { getPeopleScope, requireAdmin } from "./_core/authorization";

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
        ...ctx.user,
        campusName: campus?.name || null,
        districtName: district?.name || null,
        regionName: ctx.user.regionId || null,
        personName: selectedPerson?.name || null,
      };
    }),

    emailExists: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .query(async ({ input }) => {
        const existing = await db.getUserByEmail(input.email);
        return { exists: Boolean(existing) } as const;
      }),

    // PR 2: Start registration/login
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
            ...user,
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
        const person = await db.getPersonByPersonId(input.personId);
        if (!person) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Person not found",
          });
        }

        const scope = getPeopleScope(ctx.user);

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
            ...user,
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
    createPublic: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          districtId: z.string().min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const scope = getPeopleScope(ctx.user);

        // Enforce scope: campus-level users cannot create new campuses
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

        // Enforce scope: campus-level users cannot create new campuses
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

        // NOTE: There is no "archived" flag in the schema yet; for now archive == delete.
        await db.deleteCampus(input.id);
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
        const scope = getPeopleScope(ctx.user);

        // Check if the person being created is in scope
        if (
          scope.level === "CAMPUS" &&
          input.primaryCampusId !== scope.campusId
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied: can only create people in your campus",
          });
        }
        if (
          scope.level === "DISTRICT" &&
          input.primaryDistrictId !== scope.districtId
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied: can only create people in your district",
          });
        }
        if (
          scope.level === "REGION" &&
          input.primaryRegion !== scope.regionId
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied: can only create people in your region",
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

        await db.updatePersonStatus(input.personId, input.status);
        return { success: true };
      }),
    getById: protectedProcedure
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

        return person;
      }),
    updateName: protectedProcedure
      .input(z.object({ personId: z.string(), name: z.string() }))
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
              campus: z.string().optional(),
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
        const { personId, ...needData } = input;
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
          noteType: z.enum(["GENERAL", "NEED"]).optional(),
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
  approvals: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user);
      return await db.getPendingApprovals("ADMIN");
    }),
    approve: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        requireAdmin(ctx.user);

        const targetUser = await db.getUserById(input.userId);
        if (!targetUser) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }

        await db.approveUser(input.userId, ctx.user.id);
        return { success: true };
      }),
    reject: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        requireAdmin(ctx.user);

        const targetUser = await db.getUserById(input.userId);
        if (!targetUser) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }

        await db.rejectUser(input.userId, ctx.user.id);
        return { success: true };
      }),
  }),

  metrics: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const scope = getPeopleScope(ctx.user);
      return await db.getScopedMetrics(scope);
    }),
    district: protectedProcedure
      .input(z.object({ districtId: z.string() }))
      .query(async ({ input, ctx }) => {
        const scope = getPeopleScope(ctx.user);

        // Validate user has access to this district
        if (scope.level === "CAMPUS") {
          const campus = await db.getCampusById(scope.campusId);
          if (!campus || campus.districtId !== input.districtId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Access denied",
            });
          }
        } else if (scope.level === "DISTRICT" && scope.districtId !== input.districtId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied",
          });
        } else if (scope.level === "REGION") {
          const district = await db.getDistrictById(input.districtId);
          if (!district || district.region !== scope.regionId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Access denied",
            });
          }
        }

        return await db.getDistrictMetrics(input.districtId);
      }),
    allDistricts: protectedProcedure.query(async ({ ctx }) => {
      const scope = getPeopleScope(ctx.user);
      const allMetrics = await db.getAllDistrictMetrics();

      // Filter metrics by scope
      if (scope.level === "ALL") {
        return allMetrics;
      }

      if (scope.level === "REGION") {
        const districts = await db.getAllDistricts();
        const regionDistricts = districts
          .filter(d => d.region === scope.regionId)
          .map(d => d.id);
        return allMetrics.filter(m => regionDistricts.includes(m.districtId));
      }

      if (scope.level === "DISTRICT") {
        return allMetrics.filter(m => m.districtId === scope.districtId);
      }

      if (scope.level === "CAMPUS") {
        const campus = await db.getCampusById(scope.campusId);
        if (campus) {
          return allMetrics.filter(m => m.districtId === campus.districtId);
        }
      }

      return [];
    }),
    region: protectedProcedure
      .input(z.object({ region: z.string() }))
      .query(async ({ input, ctx }) => {
        const scope = getPeopleScope(ctx.user);

        // Validate user has access to this region
        if (scope.level === "CAMPUS" || scope.level === "DISTRICT") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied",
          });
        }

        if (scope.level === "REGION" && scope.regionId !== input.region) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied",
          });
        }

        return await db.getRegionMetrics(input.region);
      }),
    allRegions: protectedProcedure.query(async ({ ctx }) => {
      const scope = getPeopleScope(ctx.user);
      const allMetrics = await db.getAllRegionMetrics();

      // Filter metrics by scope
      if (scope.level === "ALL") {
        return allMetrics;
      }

      if (scope.level === "REGION") {
        return allMetrics.filter(m => m.region === scope.regionId);
      }

      // District and campus users cannot see region-level aggregates
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Access denied",
      });
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

  settings: router({
    get: publicProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        return await db.getSetting(input.key);
      }),
    set: protectedProcedure
      .input(z.object({ key: z.string(), value: z.string() }))
      .mutation(async ({ input, ctx }) => {
        requireAdmin(ctx.user);
        await db.setSetting(input.key, input.value);
        return { success: true };
      }),
    uploadHeaderImage: protectedProcedure
      .input(
        z.object({
          imageData: z.string(), // base64 encoded image
          fileName: z.string(),
          backgroundColor: z.string().optional(), // hex color for background
        })
      )
      .mutation(async ({ input, ctx }) => {
        requireAdmin(ctx.user);

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

          // Save to database
          console.log("[uploadHeaderImage] Saving URL to database");
          await db.setSetting("headerImageUrl", url);

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
    getMembers: publicProcedure
      .input(z.object({ householdId: z.number() }))
      .query(async ({ input }) => {
        return await db.getHouseholdMembers(input.householdId);
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
      .mutation(async ({ input, ctx }) => {
        // Users must be authenticated to create households
        // Scope check not needed as households are shared across the system
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
      .mutation(async ({ input, ctx }) => {
        // Users must be authenticated to update households
        // Scope check not needed as households are shared across the system
        const { id, ...data } = input;
        await db.updateHousehold(id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Users must be authenticated to delete households
        // Scope check not needed as households are shared across the system
        await db.deleteHousehold(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
