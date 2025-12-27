import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { setSessionCookie, clearSessionCookie, getUserIdFromSession } from "./_core/session";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    // PR 2: Get current user with district/region/campus names
    me: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return null;
      
      // Get campus, district, and region names
      const campus = ctx.user.campusId ? await db.getCampusById(ctx.user.campusId) : null;
      const district = ctx.user.districtId ? await db.getDistrictById(ctx.user.districtId) : null;
      
      return {
        ...ctx.user,
        campusName: campus?.name || null,
        districtName: district?.name || null,
        regionName: ctx.user.regionId || null,
      };
    }),
    
    // PR 2: Start registration/login - send verification code
    start: publicProcedure
      .input(z.object({
        fullName: z.string().min(1),
        email: z.string().email(),
        role: z.enum(["STAFF", "CO_DIRECTOR", "CAMPUS_DIRECTOR", "DISTRICT_DIRECTOR", "REGION_DIRECTOR"]),
        campusId: z.number(),
      }))
      .mutation(async ({ input }) => {
        // Check if user already exists
        const existingUser = await db.getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "User with this email already exists",
          });
        }
        
        // Generate verification code (6 digits)
        const code = crypto.randomInt(100000, 999999).toString();
        
        // Store code in auth_tokens table (expires in 15 minutes)
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        await db.createAuthToken({
          token: code,
          email: input.email,
          expiresAt,
          consumedAt: null,
        });
        
        // TODO: Send email with verification code
        // PR 6: Removed PII from logs - only log in development without email
        if (process.env.NODE_ENV === "development") {
          console.log(`[Auth] Verification code sent (code: ${code})`);
        }
        
        // Store registration data temporarily (in a real system, you'd use Redis or similar)
        // For now, we'll store it in the auth token's metadata or create a separate table
        // For simplicity, we'll require the user to provide the same data in the verify step
        
        return {
          success: true,
          message: "Verification code sent to email",
          // In development, return the code for testing
          ...(process.env.NODE_ENV === "development" && { code }),
        };
      }),
    
    // PR 2: Verify code and complete registration/login
    verify: publicProcedure
      .input(z.object({
        email: z.string().email(),
        code: z.string().length(6),
        // Registration data (only needed for new users)
        fullName: z.string().min(1).optional(),
        role: z.enum(["STAFF", "CO_DIRECTOR", "CAMPUS_DIRECTOR", "DISTRICT_DIRECTOR", "REGION_DIRECTOR"]).optional(),
        campusId: z.number().optional(),
      }))
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
        await db.updateUserLastSignedIn(user.id);
        
        // Create session
        setSessionCookie(ctx.req, ctx.res, user.id);
        
        // Get campus, district, and region names
        const campus = user.campusId ? await db.getCampusById(user.campusId) : null;
        const district = user.districtId ? await db.getDistrictById(user.districtId) : null;
        
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
    list: publicProcedure.query(async () => {
      return await db.getAllDistricts();
    }),
    getById: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return await db.getDistrictById(input.id);
      }),
    updateName: publicProcedure
      .input(z.object({ id: z.string(), name: z.string() }))
      .mutation(async ({ input }) => {
        await db.updateDistrictName(input.id, input.name);
        return { success: true };
      }),
    updateRegion: publicProcedure
      .input(z.object({ id: z.string(), region: z.string() }))
      .mutation(async ({ input }) => {
        await db.updateDistrictRegion(input.id, input.region);
        return { success: true };
      }),
  }),

  campuses: router({
    list: publicProcedure.query(async () => {
      return await db.getAllCampuses();
    }),
    byDistrict: publicProcedure
      .input(z.object({ districtId: z.string() }))
      .query(async ({ input }) => {
        return await db.getCampusesByDistrict(input.districtId);
      }),
    updateName: publicProcedure
      .input(z.object({ id: z.number(), name: z.string() }))
      .mutation(async ({ input }) => {
        await db.updateCampusName(input.id, input.name);
        return { success: true };
      }),
    create: publicProcedure
      .input(z.object({
        name: z.string(),
        districtId: z.string(),
      }))
      .mutation(async ({ input }) => {
        const insertId = await db.createCampus(input);
        return { id: insertId, name: input.name, districtId: input.districtId };
      }),
  }),

  people: router({
    list: publicProcedure.query(async ({ ctx }) => {
      const isAuthenticated = !!ctx.user;
      if (isAuthenticated && ctx.user) {
        // PR 2: Authenticated users see full data for their district only
        const allPeople = await db.getAllPeople();
        return allPeople.filter(p => p.primaryDistrictId === ctx.user!.districtId);
      }
      // Public mode: return sanitized placeholder data
      const allPeople = await db.getAllPeople();
      return allPeople.map(p => db.sanitizePersonForPublic(p));
    }),
    getNational: publicProcedure.query(async ({ ctx }) => {
      const isAuthenticated = !!ctx.user;
      if (isAuthenticated) {
        return await db.getNationalStaff();
      }
      // Public mode: return sanitized placeholder data
      const nationalStaff = await db.getNationalStaff();
      return nationalStaff.map(p => db.sanitizePersonForPublic(p));
    }),
    byDistrict: publicProcedure
      .input(z.object({ districtId: z.string() }))
      .query(async ({ input, ctx }) => {
        const isAuthenticated = !!ctx.user;
        if (isAuthenticated && ctx.user) {
          // PR 2: Authenticated users can only view their own district
          if (ctx.user.districtId !== input.districtId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You can only view people in your district",
            });
          }
          return await db.getPeopleByDistrictId(input.districtId);
        }
        // Public mode: return sanitized placeholder data
        const districtPeople = await db.getPeopleByDistrictId(input.districtId);
        return districtPeople.map(p => db.sanitizePersonForPublic(p));
      }),
    byCampus: publicProcedure
      .input(z.object({ campusId: z.number() }))
      .query(async ({ input, ctx }) => {
        const isAuthenticated = !!ctx.user;
        if (isAuthenticated && ctx.user) {
          // PR 2: Authenticated users can only view campuses in their district
          const campus = await db.getCampusById(input.campusId);
          if (!campus || campus.districtId !== ctx.user.districtId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You can only view people in your district",
            });
          }
          return await db.getPeopleByCampusId(input.campusId);
        }
        // Public mode: return sanitized placeholder data
        const campusPeople = await db.getPeopleByCampusId(input.campusId);
        return campusPeople.map(p => db.sanitizePersonForPublic(p));
      }),
    create: publicProcedure
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
        childrenAges: z.string().optional(), // JSON string array
        householdId: z.number().nullable().optional(),
        householdRole: z.enum(["primary", "member"]).optional(),
        spouseAttending: z.boolean().optional(),
        childrenCount: z.number().min(0).max(10).optional(),
        guestsCount: z.number().min(0).max(10).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
        }
        
        // PR 2: Check editing permissions based on where person is being created
        const { canEditCampus, canEditDistrict, canEditRegion, canEditNational } = await import("./_core/authorization");
        
        if (input.primaryCampusId) {
          if (!canEditCampus(ctx.user, input.primaryCampusId)) {
            throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to create people in this campus" });
          }
        } else if (input.primaryDistrictId) {
          if (!canEditDistrict(ctx.user, input.primaryDistrictId)) {
            throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to create people in this district" });
          }
        } else if (input.primaryRegion) {
          if (!canEditRegion(ctx.user, input.primaryRegion)) {
            throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to create people in this region" });
          }
        } else if (input.nationalCategory) {
          if (!canEditNational(ctx.user)) {
            throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to create national-level people" });
          }
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
          
          // Add last edited tracking
          createData.lastEdited = new Date();
          createData.lastEditedBy = ctx.user.fullName || ctx.user.email || 'Unknown';
          
          // PR 6: Removed verbose logging (no PII)
          
          const result = await db.createPerson(createData);
          // PR 6: Removed verbose logging (no PII)
          
          return { success: true, insertId: result };
        } catch (error) {
          // PR 6: Error logging without PII
          if (process.env.NODE_ENV === "development") {
            console.error('[people.create] Error:', error instanceof Error ? error.message : String(error));
          }
          throw new Error(`Failed to create person: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }),
    updateStatus: publicProcedure
      .input(z.object({
        personId: z.string(),
        status: z.enum(["Yes", "Maybe", "No", "Not Invited"]),
        note: z.string().optional(), // PR 3: Optional note for status change
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
        }
        
        // PR 2: Check editing permissions
        const { canEditPerson } = await import("./_core/authorization-helpers");
        if (!(await canEditPerson(ctx.user, input.personId))) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to edit this person" });
        }
        
        // PR 3: Update status with audit logging
        await db.updatePersonStatus(
          input.personId, 
          input.status, 
          ctx.user.id, 
          "UI",
          input.note
        );
        return { success: true };
      }),
    getById: publicProcedure
      .input(z.object({ personId: z.string() }))
      .query(async ({ input }) => {
        return await db.getPersonByPersonId(input.personId);
      }),
    updateName: publicProcedure
      .input(z.object({ personId: z.string(), name: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
        }
        
        // PR 2: Check editing permissions
        const { canEditPerson } = await import("./_core/authorization-helpers");
        if (!(await canEditPerson(ctx.user, input.personId))) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to edit this person" });
        }
        
        await db.updatePersonName(input.personId, input.name);
        return { success: true };
      }),
    update: publicProcedure
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
        childrenAges: z.string().optional(), // JSON string array
        householdId: z.number().nullable().optional(),
        householdRole: z.enum(["primary", "member"]).optional(),
        spouseAttending: z.boolean().optional(),
        childrenCount: z.number().min(0).max(10).optional(),
        guestsCount: z.number().min(0).max(10).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
        }
        
        // PR 2: Check editing permissions
        const { canEditPerson } = await import("./_core/authorization-helpers");
        if (!(await canEditPerson(ctx.user, input.personId))) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to edit this person" });
        }
        
        const { personId, ...data } = input;
        const updateData: any = { ...data };
        
        // Convert null to undefined for optional fields (Drizzle handles undefined better)
        if (updateData.primaryCampusId === null) {
          updateData.primaryCampusId = undefined;
        }
        if (updateData.householdId === null) {
          updateData.householdId = undefined;
        }
        
        // Validation: spouseAttending or childrenCount > 0 requires householdId
        // Get current person data to check existing values if not all provided
        try {
          const currentPerson = await db.getPersonByPersonId(personId);
          const finalSpouseAttending = updateData.spouseAttending !== undefined ? updateData.spouseAttending : (currentPerson?.spouseAttending ?? false);
          const finalChildrenCount = updateData.childrenCount !== undefined ? updateData.childrenCount : (currentPerson?.childrenCount ?? 0);
          const finalHouseholdId = updateData.householdId !== undefined ? updateData.householdId : (currentPerson?.householdId ?? null);
          
          if ((finalSpouseAttending || finalChildrenCount > 0) && !finalHouseholdId) {
            // Instead of throwing, reset spouseAttending and childrenCount to defaults
            console.warn('Household required but not linked. Resetting spouseAttending and childrenCount.');
            updateData.spouseAttending = false;
            updateData.childrenCount = 0;
          }
        } catch (error) {
          // If person doesn't exist or query fails, just log and continue
          // PR 6: Error logging without PII
          if (process.env.NODE_ENV === "development") {
            console.error('Error checking person data:', error instanceof Error ? error.message : String(error));
          }
        }
        
        // Add last edited tracking
        updateData.lastEdited = new Date();
        updateData.lastEditedBy = ctx.user.fullName || ctx.user.email || 'Unknown';
        
        await db.updatePerson(personId, updateData);
        return { success: true };
      }),
    delete: publicProcedure
      .input(z.object({ personId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
        }
        
        // PR 2: Check editing permissions
        const { canEditPerson } = await import("./_core/authorization-helpers");
        if (!(await canEditPerson(ctx.user, input.personId))) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to delete this person" });
        }
        
        await db.deletePerson(input.personId);
        return { success: true };
      }),
    // PR 3: Status history endpoint
    statusHistory: publicProcedure
      .input(z.object({
        personId: z.string(),
        limit: z.number().min(1).max(100).optional().default(20),
      }))
      .query(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
        }
        
        // PR 2: Check viewing permissions (must be able to view person)
        const person = await db.getPersonByPersonId(input.personId);
        if (!person) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
        }
        
        // Check if user can view this person (district-scoped for authenticated users)
        const { canEditPerson } = await import("./_core/authorization-helpers");
        if (!(await canEditPerson(ctx.user, input.personId))) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to view this person's history" });
        }
        
        return await db.getStatusHistory(input.personId, input.limit);
      }),
    // PR 3: Revert status change (admin only)
    revertStatusChange: publicProcedure
      .input(z.object({
        statusChangeId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
        }
        
        // Only admins can revert
        if (ctx.user.role !== "ADMIN") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can revert status changes" });
        }
        
        return await db.revertStatusChange(input.statusChangeId, ctx.user.id);
      }),
    importCSV: publicProcedure
      .input(z.object({
        rows: z.array(z.object({
          name: z.string(),
          campus: z.string().optional(), // Optional for National assignments
          district: z.string().optional(), // Optional for National assignments
          role: z.string().optional(),
          status: z.enum(["Yes", "Maybe", "No", "Not Invited"]).optional(),
          notes: z.string().optional(),
        }))
      }))
      .mutation(async ({ input }) => {
        return await db.importPeople(input.rows);
      }),
  }),

  needs: router({
    byPerson: publicProcedure
      .input(z.object({ personId: z.string() }))
      .query(async ({ input, ctx }) => {
        const isAuthenticated = !!ctx.user;
        const isLeader = ctx.user?.role === "admin";
        return await db.getNeedsByPersonId(input.personId, isAuthenticated, isLeader);
      }),
    create: publicProcedure
      .input(z.object({
        personId: z.string(),
        type: z.enum(["Financial", "Transportation", "Housing", "Other"]),
        description: z.string(),
        amount: z.number().optional(),
        visibility: z.enum(["LEADERSHIP_ONLY", "DISTRICT_VISIBLE"]).default("LEADERSHIP_ONLY"),
        isActive: z.boolean().default(true),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
        }
        
        // PR 2: Only leaders can create needs
        const { isLeaderRole } = await import("./_core/authorization");
        if (!isLeaderRole(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only leaders can create needs" });
        }
        
        await db.createNeed({
          ...input,
          createdByUserId: ctx.user.id,
        });
        // Update person's lastUpdated
        const person = await db.getPersonByPersonId(input.personId);
        if (person) {
          await db.updatePersonStatus(input.personId, person.status);
        }
        return { success: true };
      }),
    updateOrCreate: publicProcedure
      .input(z.object({
        personId: z.string(),
        type: z.enum(["Financial", "Transportation", "Housing", "Other"]).optional(),
        description: z.string().optional(),
        amount: z.number().optional(),
        visibility: z.enum(["LEADERSHIP_ONLY", "DISTRICT_VISIBLE"]).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { personId, ...needData } = input;
        if (input.type && input.description !== undefined) {
          await db.updateOrCreateNeed(personId, {
            type: input.type,
            description: input.description,
            amount: input.amount,
            visibility: input.visibility,
            isActive: input.isActive ?? true,
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
    delete: publicProcedure
      .input(z.object({ personId: z.string() }))
      .mutation(async ({ input }) => {
        await db.deleteNeedByPersonId(input.personId);
        return { success: true };
      }),
    toggleActive: publicProcedure
      .input(z.object({
        needId: z.number(),
        isActive: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        await db.toggleNeedActive(input.needId, input.isActive);
        return { success: true };
      }),
    updateVisibility: publicProcedure
      .input(z.object({
        needId: z.number(),
        visibility: z.enum(["LEADERSHIP_ONLY", "DISTRICT_VISIBLE"]),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
        }
        
        const { isLeaderRole } = await import("./_core/authorization");
        if (!isLeaderRole(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only leaders can update need visibility" });
        }
        
        await db.updateNeedVisibility(input.needId, input.visibility);
        return { success: true };
      }),
    listActive: publicProcedure.query(async () => {
      return await db.getAllActiveNeeds();
    }),
  }),

  notes: router({
    byPerson: publicProcedure
      .input(z.object({ personId: z.string(), category: z.enum(["INVITE", "INTERNAL"]).optional() }))
      .query(async ({ input }) => {
        return await db.getNotesByPersonId(input.personId, input.category);
      }),
    create: publicProcedure
      .input(z.object({
        personId: z.string(),
        category: z.enum(["INVITE", "INTERNAL"]).default("INTERNAL"),
        content: z.string(),
        createdBy: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createNote(input);
        // Update person's lastUpdated
        const person = await db.getPersonByPersonId(input.personId);
        if (person) {
          await db.updatePersonStatus(input.personId, person.status);
        }
        return { success: true };
      }),
  }),

  // PR 2: Invite Notes (leaders-only)
  inviteNotes: router({
    byPerson: publicProcedure
      .input(z.object({ personId: z.string() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
        }
        
        // Get person to check district/campus/region
        const person = await db.getPersonByPersonId(input.personId);
        if (!person) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
        }
        
        // Import authorization helpers
        const { canViewInviteNotes } = await import("./_core/authorization");
        if (!canViewInviteNotes(ctx.user, person.primaryDistrictId, person.primaryCampusId, person.primaryRegion)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You cannot view invite notes for this person" });
        }
        
        return await db.getInviteNotesByPersonId(input.personId);
      }),
    create: publicProcedure
      .input(z.object({
        personId: z.string(),
        content: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
        }
        
        // Import authorization helpers
        const { isLeaderRole } = await import("./_core/authorization");
        if (!isLeaderRole(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only leaders can create invite notes" });
        }
        
        // Get person to check district/campus/region
        const person = await db.getPersonByPersonId(input.personId);
        if (!person) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
        }
        
        const { canViewInviteNotes } = await import("./_core/authorization");
        if (!canViewInviteNotes(ctx.user, person.primaryDistrictId, person.primaryCampusId, person.primaryRegion)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You cannot create invite notes for this person" });
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
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
      }
      
      const { canApproveDistrictDirector, canApproveRegionDirector } = await import("./_core/authorization");
      
      if (ctx.user.role === "REGION_DIRECTOR" && ctx.user.approvalStatus === "ACTIVE") {
        return await db.getPendingApprovals("REGION_DIRECTOR", ctx.user.regionId || undefined);
      } else if (ctx.user.role === "ADMIN") {
        return await db.getPendingApprovals("ADMIN");
      }
      
      throw new TRPCError({ code: "FORBIDDEN", message: "You cannot view approvals" });
    }),
    approve: publicProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
        }
        
        const targetUser = await db.getUserById(input.userId);
        if (!targetUser) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }
        
        const { canApproveDistrictDirector, canApproveRegionDirector } = await import("./_core/authorization");
        
        if (targetUser.role === "DISTRICT_DIRECTOR") {
          if (!canApproveDistrictDirector(ctx.user, targetUser)) {
            throw new TRPCError({ code: "FORBIDDEN", message: "You cannot approve this user" });
          }
        } else if (targetUser.role === "REGION_DIRECTOR") {
          if (!canApproveRegionDirector(ctx.user, targetUser)) {
            throw new TRPCError({ code: "FORBIDDEN", message: "You cannot approve this user" });
          }
        } else {
          throw new TRPCError({ code: "BAD_REQUEST", message: "User does not require approval" });
        }
        
        await db.approveUser(input.userId, ctx.user.id);
        return { success: true };
      }),
    reject: publicProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
        }
        
        const targetUser = await db.getUserById(input.userId);
        if (!targetUser) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }
        
        const { canApproveDistrictDirector, canApproveRegionDirector } = await import("./_core/authorization");
        
        if (targetUser.role === "DISTRICT_DIRECTOR") {
          if (!canApproveDistrictDirector(ctx.user, targetUser)) {
            throw new TRPCError({ code: "FORBIDDEN", message: "You cannot reject this user" });
          }
        } else if (targetUser.role === "REGION_DIRECTOR") {
          if (!canApproveRegionDirector(ctx.user, targetUser)) {
            throw new TRPCError({ code: "FORBIDDEN", message: "You cannot reject this user" });
          }
        } else {
          throw new TRPCError({ code: "BAD_REQUEST", message: "User does not require approval" });
        }
        
        await db.rejectUser(input.userId, ctx.user.id);
        return { success: true };
      }),
  }),

  metrics: router({
    get: publicProcedure.query(async () => {
      return await db.getMetrics();
    }),
  }),

  followUp: router({
    list: publicProcedure.query(async () => {
      return await db.getFollowUpPeople();
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
      return await db.getAllHouseholds();
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
