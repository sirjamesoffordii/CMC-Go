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
        // Authentication disabled - allow all users to update campus names
        await db.updateCampusName(input.id, input.name);
        return { success: true };
      }),
    create: publicProcedure
      .input(z.object({
        name: z.string(),
        districtId: z.string(),
      }))
      .mutation(async ({ input }) => {
        // Authentication disabled - allow all users to create campuses
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
    list: publicProcedure.query(async ({ ctx }) => {
      try {
        // Authentication disabled - return all people data
        const allPeople = await db.getAllPeople();
        return allPeople;
      } catch (error) {
        console.error("[people.list] Error:", error instanceof Error ? error.message : String(error));
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch people list",
        });
      }
    }),
    getNational: publicProcedure.query(async ({ ctx }) => {
      // Authentication disabled - return all national staff data
      return await db.getNationalStaff();
    }),
    byDistrict: publicProcedure
      .input(z.object({ districtId: z.string() }))
      .query(async ({ input, ctx }) => {
        // Authentication disabled - allow viewing any district
        return await db.getPeopleByDistrictId(input.districtId);
      }),
    byCampus: publicProcedure
      .input(z.object({ campusId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Authentication disabled - allow viewing any campus
        return await db.getPeopleByCampusId(input.campusId);
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
        // Authentication disabled - allow all users to create people
        
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
          
          // Add last edited tracking (use 'System' if no user)
          createData.lastEdited = new Date();
          createData.lastEditedBy = ctx.user?.fullName || ctx.user?.email || 'System';
          
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
        // Authentication disabled - allow all users to update status
        
        // PR 3: Update status (authentication disabled)
        await db.updatePersonStatus(
          input.personId, 
          input.status
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
        // Authentication disabled - allow all users to update names
        
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
        // Authentication disabled - allow all users to update people
        
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
        
        // Add last edited tracking (use 'System' if no user)
        updateData.lastEdited = new Date();
        updateData.lastEditedBy = ctx.user?.fullName || ctx.user?.email || 'System';
        
        await db.updatePerson(personId, updateData);
        return { success: true };
      }),
    delete: publicProcedure
      .input(z.object({ personId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        // Authentication disabled - allow all users to delete people
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
        // Authentication disabled - allow all users to view status history
        const person = await db.getPersonByPersonId(input.personId);
        if (!person) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
        }
        
        return await db.getStatusHistory(input.personId, input.limit);
      }),
    // PR 3: Revert status change
    revertStatusChange: publicProcedure
      .input(z.object({
        statusChangeId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Authentication disabled - allow all users to revert status changes
        return await db.revertStatusChange(input.statusChangeId, ctx.user?.id || null);
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
        // Authentication disabled - return all needs
        return await db.getNeedsByPersonId(input.personId);
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
        // Authentication disabled - allow all users to create needs
        await db.createNeed({
          ...input,
          createdById: ctx.user?.id || null,
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
        // Authentication disabled - allow all users to update need visibility
        await db.updateNeedVisibility(input.needId, input.visibility);
        return { success: true };
      }),
    listActive: publicProcedure.query(async () => {
      try {
        return await db.getAllActiveNeeds();
      } catch (error) {
        console.error("[needs.listActive] Error:", error instanceof Error ? error.message : String(error));
        if (error instanceof Error && error.message.includes('createdById') || error.message.includes('createdByUserId')) {
          console.error("[needs.listActive] Schema mismatch detected: Check database column name");
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch active needs",
        });
      }
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
        // Authentication disabled - allow all users to view invite notes
        const person = await db.getPersonByPersonId(input.personId);
        if (!person) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
        }
        
        return await db.getInviteNotesByPersonId(input.personId);
      }),
    create: publicProcedure
      .input(z.object({
        personId: z.string(),
        content: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Authentication disabled - allow all users to create invite notes
        const person = await db.getPersonByPersonId(input.personId);
        if (!person) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
        }
        
        await db.createInviteNote({
          personId: input.personId,
          content: input.content,
          createdByUserId: ctx.user?.id || null,
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
