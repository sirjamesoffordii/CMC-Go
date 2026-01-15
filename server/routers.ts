import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { setSessionCookie, clearSessionCookie, getUserIdFromSession } from "./_core/session";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { getPeopleScope } from "./_core/authorization";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { jaroWinklerScore, normalizeDisplayName } from "./_core/fuzzyName";

function sanitizeUserForClient(user: any) {
  const { passwordHash, ...safe } = user ?? {};
  return safe;
}

async function enrichUserWithNames(user: any) {
  const campus = user?.campusId ? await db.getCampusById(user.campusId) : null;
  const district = user?.districtId ? await db.getDistrictById(user.districtId) : null;
  return {
    ...sanitizeUserForClient(user),
    campusName: campus?.name || null,
    districtName: district?.name || null,
    regionName: user?.regionId || null,
  };
}

async function ensureUserAnchors(user: any) {
  if (!user) return null;

  if (user.campusId != null) {
    const campus = await db.getCampusById(user.campusId);
    if (campus) {
      const district = await db.getDistrictById(campus.districtId);
      const next = {
        districtId: campus.districtId,
        regionId: district?.region ?? user.regionId ?? null,
      };

      if (user.districtId !== next.districtId || user.regionId !== next.regionId) {
        await db.updateUser(user.id, next as any);
        return (await db.getUserById(user.id)) ?? user;
      }
    }
  }

  if (user.districtId && !user.regionId) {
    const district = await db.getDistrictById(user.districtId);
    if (district?.region) {
      await db.updateUser(user.id, { regionId: district.region } as any);
      return (await db.getUserById(user.id)) ?? user;
    }
  }

  return user;
}

function requireAnchorsForRole(role: string, anchors: { campusId: number | null; districtId: string | null; regionId: string | null }) {
  const { campusId, districtId, regionId } = anchors;

  // Campus ladder
  if (["STAFF", "CO_DIRECTOR"].includes(role)) {
    if (campusId == null) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Campus is required for this role." });
    }
    return;
  }

  // Campus Director can be campus-anchored or district-anchored
  if (role === "CAMPUS_DIRECTOR") {
    if (campusId == null && !districtId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Campus or District is required for this role." });
    }
    return;
  }

  // District Director requires a district or region anchor
  if (role === "DISTRICT_DIRECTOR") {
    if (!districtId && !regionId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "District (or Region) is required for this role." });
    }
    return;
  }

  // Region Director requires a region anchor
  if (role === "REGION_DIRECTOR") {
    if (!regionId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Region is required for this role." });
    }
    return;
  }

  // Admin/national/other roles are allowed without anchors (aggregate scope)
}

async function ensureLinkedPersonForUser(user: any): Promise<string | null> {
  if (!user) return null;
  if (user.linkedPersonId) return user.linkedPersonId;

  const personId = `U_${user.id}_${nanoid(10)}`;

  // Prefer deriving placement from user anchors.
  const primaryCampusId = user.campusId ?? null;
  const primaryDistrictId = user.districtId ?? null;
  const primaryRegion = user.regionId ?? null;

  await db.createPerson({
    personId,
    name: user.fullName,
    primaryCampusId,
    primaryDistrictId: primaryDistrictId ?? undefined,
    primaryRegion: primaryRegion ?? undefined,
    primaryRole: user.roleTitle || user.role,
    nationalCategory: primaryCampusId == null && !primaryDistrictId && !primaryRegion ? (user.roleTitle || user.role) : undefined,
    status: "Not Invited",
    depositPaid: false,
    lastEdited: new Date(),
    lastEditedBy: user.fullName || user.email || "System",
  } as any);

  await db.updateUserLinkedPersonId(user.id, personId);
  return personId;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return null;
      const canonical = (await db.getUserById(ctx.user.id)) ?? ctx.user;
      const hydrated = (await ensureUserAnchors(canonical)) ?? canonical;
      return enrichUserWithNames(hydrated);
    }),

    signIn: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const email = input.email.trim().toLowerCase();
        const user = await db.getUserByEmail(email);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
        }

        const ok = await bcrypt.compare(input.password, user.passwordHash);
        if (!ok) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
        }

        const hydrated = (await ensureUserAnchors(user)) ?? user;

        // Create session + update last login
        setSessionCookie(ctx.req, ctx.res, hydrated.id);
        await db.updateUserLastLoginAt(hydrated.id);

        // Ensure person link exists (auto-create)
        await ensureLinkedPersonForUser(hydrated);

        const finalUser = (await db.getUserById(hydrated.id)) ?? hydrated;
        return {
          success: true,
          user: await enrichUserWithNames(finalUser),
        };
      }),

    findPersonMatches: publicProcedure
      .input(z.object({
        fullName: z.string().min(1),
      }))
      .query(async ({ input }) => {
        const candidates = await db.searchPeopleByName(input.fullName, 60);
        const scored = candidates
          .map((p) => ({
            personId: p.personId,
            name: p.name,
            primaryCampusId: p.primaryCampusId,
            primaryDistrictId: p.primaryDistrictId,
            primaryRegion: p.primaryRegion,
            primaryRole: p.primaryRole,
            nationalCategory: p.nationalCategory,
            score: jaroWinklerScore(input.fullName, p.name),
          }))
          .filter((c) => c.score >= 0.78)
          .sort((a, b) => b.score - a.score)
          .slice(0, 8);

        return { candidates: scored };
      }),

    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(8),
        fullName: z.string().min(1),
        // Role is the authoritative scope role string used by server enforcement.
        role: z.string().min(1),
        // Optional UI-friendly label
        roleTitle: z.string().optional(),
        // Anchors (derived when possible)
        campusId: z.number().nullable().optional(),
        districtId: z.string().nullable().optional(),
        regionId: z.string().nullable().optional(),
        // Optional person linkage from fuzzy match
        matchedPersonId: z.string().nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const email = input.email.trim().toLowerCase();
        const existing = await db.getUserByEmail(email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "User with this email already exists" });
        }

        const matchedPerson = input.matchedPersonId
          ? await db.getPersonByPersonId(input.matchedPersonId)
          : null;

        const canonicalName = normalizeDisplayName(matchedPerson?.name ?? input.fullName);

        let campusId: number | null = input.campusId ?? null;
        let districtId: string | null = input.districtId ?? null;
        let regionId: string | null = input.regionId ?? null;

        if (campusId == null && matchedPerson?.primaryCampusId != null) {
          campusId = matchedPerson.primaryCampusId;
        }
        if (!districtId && matchedPerson?.primaryDistrictId) {
          districtId = matchedPerson.primaryDistrictId;
        }
        if (!regionId && matchedPerson?.primaryRegion) {
          regionId = matchedPerson.primaryRegion;
        }

        // Derive district/region from campus, and region from district.
        if (campusId != null) {
          const campus = await db.getCampusById(campusId);
          if (!campus) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Selected campus not found" });
          }
          districtId = campus.districtId;
          const district = await db.getDistrictById(campus.districtId);
          regionId = district?.region ?? regionId;
        } else if (districtId) {
          const district = await db.getDistrictById(districtId);
          if (!district) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Selected district not found" });
          }
          regionId = district.region;
        }

        requireAnchorsForRole(input.role, { campusId, districtId, regionId });

        const passwordHash = await bcrypt.hash(input.password, 12);
        const userId = await db.createUser({
          fullName: canonicalName,
          email,
          role: input.role,
          roleTitle: input.roleTitle ?? null,
          passwordHash,
          campusId,
          districtId,
          regionId,
          linkedPersonId: matchedPerson?.personId ?? null,
        } as any);

        const created = await db.getUserById(userId);
        if (!created) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create user" });
        }

        const hydrated = (await ensureUserAnchors(created)) ?? created;
        setSessionCookie(ctx.req, ctx.res, hydrated.id);
        await db.updateUserLastLoginAt(hydrated.id);

        if (!hydrated.linkedPersonId) {
          await ensureLinkedPersonForUser(hydrated);
        }

        const finalUser = (await db.getUserById(hydrated.id)) ?? hydrated;
        return {
          success: true,
          user: await enrichUserWithNames(finalUser),
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
        console.error("[districts.publicList] Error:", error instanceof Error ? error.message : String(error));
        if (error instanceof Error && error.message.includes("DATABASE_URL")) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection not configured. Please set DATABASE_URL or MYSQL_* environment variables.",
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
        console.error("[districts.list] Error:", error instanceof Error ? error.message : String(error));
        if (error instanceof Error && error.message.includes("DATABASE_URL")) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection not configured. Please set DATABASE_URL or MYSQL_* environment variables.",
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
    updateName: publicProcedure
      .input(z.object({ id: z.string(), name: z.string() }))
      .mutation(async ({ input }) => {
        // Authentication disabled - allow all users to update district names
        await db.updateDistrictName(input.id, input.name);
        return { success: true };
      }),
    updateRegion: publicProcedure
      .input(z.object({ id: z.string(), region: z.string() }))
      .mutation(async ({ input }) => {
        // Authentication disabled - allow all users to update district regions
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
          return allCampuses.filter(c => regionDistrictIds.includes(c.districtId));
        }

        if (scope.level === "DISTRICT") {
          return allCampuses.filter(c => c.districtId === scope.districtId);
        }

        if (scope.level === "CAMPUS") {
          return allCampuses.filter(c => c.id === scope.campusId);
        }

        return [];
      } catch (error) {
        console.error("[campuses.list] Error:", error instanceof Error ? error.message : String(error));
        if (error instanceof Error && error.message.includes("DATABASE_URL")) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection not configured. Please set DATABASE_URL or MYSQL_* environment variables.",
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
    searchPublic: publicProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ input }) => {
        return await db.searchCampusesByName(input.query, 20);
      }),
    createPublic: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        districtId: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const existing = await db.getCampusByNameAndDistrict(input.name, input.districtId);
        if (existing) {
          return { id: existing.id, name: existing.name, districtId: existing.districtId, created: false };
        }
        const insertId = await db.createCampus({ name: input.name, districtId: input.districtId });
        return { id: insertId, name: input.name, districtId: input.districtId, created: true };
      }),
    updateName: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const scope = getPeopleScope(ctx.user);
        const campus = await db.getCampusById(input.id);
        if (!campus) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Campus not found" });
        }

        // Enforce scope: must be in-scope for this campus
        if (scope.level === "CAMPUS" && campus.id !== scope.campusId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "DISTRICT" && campus.districtId !== scope.districtId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "REGION") {
          const district = await db.getDistrictById(campus.districtId);
          if (!district || district.region !== scope.regionId) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
          }
        }

        await db.updateCampusName(input.id, input.name);
        return { success: true };
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        districtId: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const scope = getPeopleScope(ctx.user);

        // Enforce scope: campus-scope users cannot create new campuses
        if (scope.level === "CAMPUS") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "DISTRICT" && input.districtId !== scope.districtId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "REGION") {
          const district = await db.getDistrictById(input.districtId);
          if (!district || district.region !== scope.regionId) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
          }
        }

        const insertId = await db.createCampus(input);
        return { id: insertId, name: input.name, districtId: input.districtId };
      }),
    archive: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        // NOTE: There is no "archived" flag in the schema yet; for now archive == delete.
        await db.deleteCampus(input.id);
        return { success: true };
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        // Authentication disabled - allow all users to delete campuses
        await db.deleteCampus(input.id);
        return { success: true };
      }),
  }),

  people: router({
    getByPersonId: protectedProcedure
      .input(z.object({ personId: z.string().min(1) }))
      .query(async ({ input, ctx }) => {
        const person = await db.getPersonByPersonId(input.personId);
        if (!person) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
        }

        const scope = getPeopleScope(ctx.user);

        // Scope check: ensure the target person is visible in the user's scope.
        if (scope.level === "CAMPUS" && person.primaryCampusId !== scope.campusId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "DISTRICT" && person.primaryDistrictId !== scope.districtId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "REGION" && person.primaryRegion !== scope.regionId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        return person;
      }),
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
        console.error("[people.list] Error:", error instanceof Error ? error.message : String(error));
        // Check if it's a database connection error
        if (error instanceof Error && error.message.includes("DATABASE_URL")) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection not configured. Please set DATABASE_URL or MYSQL_* environment variables.",
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
        if (scope.level === "CAMPUS" ||
            (scope.level === "DISTRICT" && scope.districtId !== input.districtId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        if (scope.level === "REGION") {
          // Need to verify the district belongs to the user's region
          const district = await db.getDistrictById(input.districtId);
          if (!district || district.region !== scope.regionId) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
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
            throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
          }
        }

        if (scope.level === "REGION") {
          // Need to verify the campus belongs to the user's region
          const campus = await db.getCampusById(input.campusId);
          if (!campus) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
          }
          const district = await db.getDistrictById(campus.districtId);
          if (!district || district.region !== scope.regionId) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
          }
        }

        return await db.getPeopleByCampusId(input.campusId);
      }),
    create: protectedProcedure
      .input(z.object({
        personId: z.string(),
        name: z.string(),
        primaryCampusId: z.number().nullable().optional(),
        primaryDistrictId: z.string().optional(),
        primaryRegion: z.string().optional(),
        primaryRole: z.string().optional(),
        nationalCategory: z.string().optional(),
        status: z.enum(["Yes", "Maybe", "No", "Not Invited"]).default("Not Invited"),
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
      }))
      .mutation(async ({ input, ctx }) => {
        const scope = getPeopleScope(ctx.user);

        // Check if the person being created is in scope
        if (scope.level === "CAMPUS" && input.primaryCampusId !== scope.campusId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied: can only create people in your campus" });
        }
        if (scope.level === "DISTRICT" && input.primaryDistrictId !== scope.districtId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied: can only create people in your district" });
        }
        if (scope.level === "REGION" && input.primaryRegion !== scope.regionId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied: can only create people in your region" });
        }

        try {
          console.log('[people.create] Received input:', JSON.stringify(input, null, 2));

          // Build createData object, only including fields that have values
          const createData: any = {
            personId: input.personId,
            name: input.name,
            status: input.status || 'Not Invited',
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
          if (input.primaryCampusId !== undefined && input.primaryCampusId !== null) {
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
          createData.lastEditedBy = ctx.user?.fullName || ctx.user?.email || 'System';

          const result = await db.createPerson(createData);

          return { success: true, insertId: result };
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.error('[people.create] Error:', error instanceof Error ? error.message : String(error));
          }
          throw new Error(`Failed to create person: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }),
    updateStatus: protectedProcedure
      .input(z.object({
        personId: z.string(),
        status: z.enum(["Yes", "Maybe", "No", "Not Invited"]),
        note: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const person = await db.getPersonByPersonId(input.personId);
        if (!person) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (scope.level === "CAMPUS" && person.primaryCampusId !== scope.campusId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "DISTRICT" && person.primaryDistrictId !== scope.districtId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "REGION" && person.primaryRegion !== scope.regionId) {
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
          throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (scope.level === "CAMPUS" && person.primaryCampusId !== scope.campusId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "DISTRICT" && person.primaryDistrictId !== scope.districtId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "REGION" && person.primaryRegion !== scope.regionId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        return person;
      }),
    updateName: protectedProcedure
      .input(z.object({ personId: z.string(), name: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const person = await db.getPersonByPersonId(input.personId);
        if (!person) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (scope.level === "CAMPUS" && person.primaryCampusId !== scope.campusId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "DISTRICT" && person.primaryDistrictId !== scope.districtId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "REGION" && person.primaryRegion !== scope.regionId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        await db.updatePersonName(input.personId, input.name);
        return { success: true };
      }),
    update: protectedProcedure
      .input(z.object({
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
      }))
      .mutation(async ({ input, ctx }) => {
        const { personId, ...data } = input;

        const person = await db.getPersonByPersonId(personId);
        if (!person) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (scope.level === "CAMPUS" && person.primaryCampusId !== scope.campusId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "DISTRICT" && person.primaryDistrictId !== scope.districtId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "REGION" && person.primaryRegion !== scope.regionId) {
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
          const finalSpouseAttending = updateData.spouseAttending !== undefined ? updateData.spouseAttending : (person.spouseAttending ?? false);
          const finalChildrenCount = updateData.childrenCount !== undefined ? updateData.childrenCount : (person.childrenCount ?? 0);
          const finalHouseholdId = updateData.householdId !== undefined ? updateData.householdId : (person.householdId ?? null);

          if ((finalSpouseAttending || finalChildrenCount > 0) && !finalHouseholdId) {
            console.warn('Household required but not linked. Resetting spouseAttending and childrenCount.');
            updateData.spouseAttending = false;
            updateData.childrenCount = 0;
          }
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.error('Error checking person data:', error instanceof Error ? error.message : String(error));
          }
        }

        // Add last edited tracking
        updateData.lastEdited = new Date();
        updateData.lastEditedBy = ctx.user?.fullName || ctx.user?.email || 'System';

        await db.updatePerson(personId, updateData);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ personId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const person = await db.getPersonByPersonId(input.personId);
        if (!person) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (scope.level === "CAMPUS" && person.primaryCampusId !== scope.campusId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "DISTRICT" && person.primaryDistrictId !== scope.districtId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "REGION" && person.primaryRegion !== scope.regionId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        await db.deletePerson(input.personId);
        return { success: true };
      }),
    statusHistory: protectedProcedure
      .input(z.object({
        personId: z.string(),
        limit: z.number().min(1).max(100).optional().default(20),
      }))
      .query(async ({ input, ctx }) => {
        const person = await db.getPersonByPersonId(input.personId);
        if (!person) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (scope.level === "CAMPUS" && person.primaryCampusId !== scope.campusId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "DISTRICT" && person.primaryDistrictId !== scope.districtId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "REGION" && person.primaryRegion !== scope.regionId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        return await db.getStatusHistory(input.personId, input.limit);
      }),
    revertStatusChange: protectedProcedure
      .input(z.object({
        statusChangeId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Need to get the person associated with this status change
        const statusChanges = await db.getStatusHistory("", 1000); // Get many to find the one we need
        const statusChange = statusChanges.find(sc => sc.id === input.statusChangeId);
        if (!statusChange) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Status change not found" });
        }

        const person = await db.getPersonByPersonId(statusChange.personId);
        if (!person) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (scope.level === "CAMPUS" && person.primaryCampusId !== scope.campusId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "DISTRICT" && person.primaryDistrictId !== scope.districtId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "REGION" && person.primaryRegion !== scope.regionId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        return await db.revertStatusChange(input.statusChangeId, ctx.user?.id || null);
      }),
    importCSV: protectedProcedure
      .input(z.object({
        rows: z.array(z.object({
          name: z.string(),
          campus: z.string().optional(),
          district: z.string().optional(),
          role: z.string().optional(),
          status: z.enum(["Yes", "Maybe", "No", "Not Invited"]).optional(),
          notes: z.string().optional(),
        }))
      }))
      .mutation(async ({ input, ctx }) => {
        const scope = getPeopleScope(ctx.user);

        // Only allow ALL scope users to import (typically admins/directors)
        if (scope.level !== "ALL") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied: bulk import requires full access" });
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
          throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (scope.level === "CAMPUS" && person.primaryCampusId !== scope.campusId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "DISTRICT" && person.primaryDistrictId !== scope.districtId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "REGION" && person.primaryRegion !== scope.regionId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        return await db.getNeedsByPersonId(input.personId);
      }),
    create: protectedProcedure
      .input(z.object({
        personId: z.string(),
        type: z.enum(["Financial", "Transportation", "Housing", "Other"]),
        description: z.string(),
        amount: z.number().optional(),
        visibility: z.enum(["LEADERSHIP_ONLY", "DISTRICT_VISIBLE"]).default("LEADERSHIP_ONLY"),
        isActive: z.boolean().default(true),
      }))
      .mutation(async ({ input, ctx }) => {
        const person = await db.getPersonByPersonId(input.personId);
        if (!person) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (scope.level === "CAMPUS" && person.primaryCampusId !== scope.campusId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "DISTRICT" && person.primaryDistrictId !== scope.districtId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "REGION" && person.primaryRegion !== scope.regionId) {
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
      .input(z.object({
        personId: z.string(),
        type: z.enum(["Financial", "Transportation", "Housing", "Other"]).optional(),
        description: z.string().optional(),
        amount: z.number().optional(),
        visibility: z.enum(["LEADERSHIP_ONLY", "DISTRICT_VISIBLE"]).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { personId, ...needData } = input;
        const person = await db.getPersonByPersonId(personId);
        if (!person) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (scope.level === "CAMPUS" && person.primaryCampusId !== scope.campusId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "DISTRICT" && person.primaryDistrictId !== scope.districtId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "REGION" && person.primaryRegion !== scope.regionId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        if (input.type && input.description !== undefined) {
          await db.updateOrCreateNeed(personId, {
            type: input.type,
            description: input.description,
            amount: input.amount,
            visibility: input.visibility,
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
          throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (scope.level === "CAMPUS" && person.primaryCampusId !== scope.campusId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "DISTRICT" && person.primaryDistrictId !== scope.districtId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "REGION" && person.primaryRegion !== scope.regionId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        await db.deleteNeedByPersonId(input.personId);
        return { success: true };
      }),
    toggleActive: protectedProcedure
      .input(z.object({
        needId: z.number(),
        isActive: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Get the need to find the person (must work for active + inactive needs)
        const need = await db.getNeedById(input.needId);
        if (!need) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Need not found" });
        }

        const person = await db.getPersonByPersonId(need.personId);
        if (!person) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (scope.level === "CAMPUS" && person.primaryCampusId !== scope.campusId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "DISTRICT" && person.primaryDistrictId !== scope.districtId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "REGION" && person.primaryRegion !== scope.regionId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        await db.toggleNeedActive(input.needId, input.isActive);
        return { success: true };
      }),
    updateVisibility: protectedProcedure
      .input(z.object({
        needId: z.number(),
        visibility: z.enum(["LEADERSHIP_ONLY", "DISTRICT_VISIBLE"]),
      }))
      .mutation(async ({ input, ctx }) => {
        // Get the need to find the person (must work for active + inactive needs)
        const need = await db.getNeedById(input.needId);
        if (!need) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Need not found" });
        }

        const person = await db.getPersonByPersonId(need.personId);
        if (!person) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (scope.level === "CAMPUS" && person.primaryCampusId !== scope.campusId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "DISTRICT" && person.primaryDistrictId !== scope.districtId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "REGION" && person.primaryRegion !== scope.regionId) {
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
          } else if (scope.level === "REGION" && person.primaryRegion === scope.regionId) {
            filteredNeeds.push(need);
          } else if (scope.level === "DISTRICT" && person.primaryDistrictId === scope.districtId) {
            filteredNeeds.push(need);
          } else if (scope.level === "CAMPUS" && person.primaryCampusId === scope.campusId) {
            filteredNeeds.push(need);
          }
        }

        return filteredNeeds;
      } catch (error) {
        console.error("[needs.listActive] Error:", error instanceof Error ? error.message : String(error));
        if (error instanceof Error && error.message.includes("DATABASE_URL")) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection not configured. Please set DATABASE_URL or MYSQL_* environment variables.",
          });
        }
        throw error;
      }
    }),
  }),

  notes: router({
    byPerson: protectedProcedure
      .input(z.object({ personId: z.string(), category: z.enum(["INVITE", "INTERNAL"]).optional() }))
      .query(async ({ input, ctx }) => {
        const person = await db.getPersonByPersonId(input.personId);
        if (!person) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (scope.level === "CAMPUS" && person.primaryCampusId !== scope.campusId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "DISTRICT" && person.primaryDistrictId !== scope.districtId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "REGION" && person.primaryRegion !== scope.regionId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        return await db.getNotesByPersonId(input.personId, input.category);
      }),
    create: protectedProcedure
      .input(z.object({
        personId: z.string(),
        category: z.enum(["INVITE", "INTERNAL"]).default("INTERNAL"),
        content: z.string(),
        noteType: z.enum(["GENERAL", "NEED"]).optional(),
        createdBy: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const person = await db.getPersonByPersonId(input.personId);
        if (!person) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (scope.level === "CAMPUS" && person.primaryCampusId !== scope.campusId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "DISTRICT" && person.primaryDistrictId !== scope.districtId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "REGION" && person.primaryRegion !== scope.regionId) {
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
          throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (scope.level === "CAMPUS" && person.primaryCampusId !== scope.campusId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "DISTRICT" && person.primaryDistrictId !== scope.districtId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "REGION" && person.primaryRegion !== scope.regionId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        return await db.getInviteNotesByPersonId(input.personId);
      }),
    create: protectedProcedure
      .input(z.object({
        personId: z.string(),
        content: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const person = await db.getPersonByPersonId(input.personId);
        if (!person) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
        }

        const scope = getPeopleScope(ctx.user);

        // Check if person is in scope
        if (scope.level === "CAMPUS" && person.primaryCampusId !== scope.campusId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "DISTRICT" && person.primaryDistrictId !== scope.districtId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (scope.level === "REGION" && person.primaryRegion !== scope.regionId) {
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
    list: publicProcedure.query(async ({ ctx }) => {
      // Authentication disabled - allow all users to view approvals
      return await db.getPendingApprovals("ADMIN");
    }),
    approve: publicProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Authentication disabled - allow all users to approve
        const targetUser = await db.getUserById(input.userId);
        if (!targetUser) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }
        
        await db.approveUser(input.userId, ctx.user?.id || null);
        return { success: true };
      }),
    reject: publicProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Authentication disabled - allow all users to reject
        const targetUser = await db.getUserById(input.userId);
        if (!targetUser) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }
        
        await db.rejectUser(input.userId, ctx.user?.id || null);
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
        if (scope.level === "REGION" && person.primaryRegion === scope.regionId) return true;
        if (scope.level === "DISTRICT" && person.primaryDistrictId === scope.districtId) return true;
        if (scope.level === "CAMPUS" && person.primaryCampusId === scope.campusId) return true;
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
    set: publicProcedure
      .input(z.object({ key: z.string(), value: z.string() }))
      .mutation(async ({ input }) => {
        await db.setSetting(input.key, input.value);
        return { success: true };
      }),
    uploadHeaderImage: publicProcedure
      .input(z.object({ 
        imageData: z.string(), // base64 encoded image
        fileName: z.string(),
        backgroundColor: z.string().optional(), // hex color for background
      }))
      .mutation(async ({ input }) => {
        try {
          console.log('[uploadHeaderImage] Starting upload for:', input.fileName);
          
          // Convert base64 to buffer
          const base64Data = input.imageData.split(',')[1];
          if (!base64Data) {
            throw new Error('Invalid base64 image data');
          }
          const buffer = Buffer.from(base64Data, 'base64');
          console.log('[uploadHeaderImage] Buffer size:', buffer.length);
          
          // Upload to S3
          const fileKey = `header-images/${Date.now()}-${input.fileName}`;
          console.log('[uploadHeaderImage] Uploading to S3 with key:', fileKey);
          const { url } = await storagePut(fileKey, buffer, 'image/jpeg');
          console.log('[uploadHeaderImage] S3 upload successful, URL:', url);
          
          // Save to database
          console.log('[uploadHeaderImage] Saving URL to database');
          await db.setSetting('headerImageUrl', url);
          
          // Save background color if provided
          if (input.backgroundColor) {
            console.log('[uploadHeaderImage] Saving background color:', input.backgroundColor);
            await db.setSetting('headerBgColor', input.backgroundColor);
          }
          console.log('[uploadHeaderImage] Database save successful');
          
          return { url, backgroundColor: input.backgroundColor };
        } catch (error) {
          console.error('[uploadHeaderImage] Error:', error);
          throw error;
        }
      }),
  }),

  households: router({
    list: publicProcedure.query(async () => {
      try {
        return await db.getAllHouseholds();
      } catch (error) {
        console.error("[households.list] Error:", error instanceof Error ? error.message : String(error));
        // Check if it's a database connection error
        if (error instanceof Error && error.message.includes("DATABASE_URL")) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection not configured. Please set DATABASE_URL or MYSQL_* environment variables.",
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
    create: publicProcedure
      .input(z.object({
        label: z.string().optional(),
        childrenCount: z.number().default(0),
        guestsCount: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        const insertId = await db.createHousehold(input);
        return { id: insertId, ...input };
      }),
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        label: z.string().optional(),
        childrenCount: z.number().optional(),
        guestsCount: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateHousehold(id, data);
        return { success: true };
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteHousehold(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
