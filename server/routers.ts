import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
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
    list: publicProcedure.query(async () => {
      return await db.getAllPeople();
    }),
    getNational: publicProcedure.query(async () => {
      return await db.getNationalStaff();
    }),
    byDistrict: publicProcedure
      .input(z.object({ districtId: z.string() }))
      .query(async ({ input }) => {
        return await db.getPeopleByDistrict(input.districtId);
      }),
    byCampus: publicProcedure
      .input(z.object({ campusId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPeopleByCampus(input.campusId);
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
          if (ctx.user?.name || ctx.user?.email) {
            createData.lastEditedBy = ctx.user.name || ctx.user.email || 'Unknown';
          }
          
          console.log('[people.create] Creating person with data:', JSON.stringify(createData, null, 2));
          
          const result = await db.createPerson(createData);
          console.log('[people.create] Person created successfully, insertId:', result);
          
          return { success: true, insertId: result };
        } catch (error) {
          console.error('[people.create] Error creating person:', error);
          throw new Error(`Failed to create person: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }),
    updateStatus: publicProcedure
      .input(z.object({
        personId: z.string(),
        status: z.enum(["Yes", "Maybe", "No", "Not Invited"]),
      }))
      .mutation(async ({ input }) => {
        await db.updatePersonStatus(input.personId, input.status);
        return { success: true };
      }),
    getById: publicProcedure
      .input(z.object({ personId: z.string() }))
      .query(async ({ input }) => {
        return await db.getPersonByPersonId(input.personId);
      }),
    updateName: publicProcedure
      .input(z.object({ personId: z.string(), name: z.string() }))
      .mutation(async ({ input }) => {
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
          console.error('Error checking person data for validation:', error);
        }
        
        // Add last edited tracking
        updateData.lastEdited = new Date();
        if (ctx.user?.name || ctx.user?.email) {
          updateData.lastEditedBy = ctx.user.name || ctx.user.email || 'Unknown';
        }
        
        await db.updatePerson(personId, updateData);
        return { success: true };
      }),
    delete: publicProcedure
      .input(z.object({ personId: z.string() }))
      .mutation(async ({ input }) => {
        await db.deletePerson(input.personId);
        return { success: true };
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
      .query(async ({ input }) => {
        return await db.getNeedsByPersonId(input.personId);
      }),
    create: publicProcedure
      .input(z.object({
        personId: z.string(),
        type: z.enum(["Financial", "Transportation", "Housing", "Other"]),
        description: z.string(),
        amount: z.number().optional(),
        isActive: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        await db.createNeed(input);
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
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { personId, ...needData } = input;
        if (input.type && input.description !== undefined) {
          await db.updateOrCreateNeed(personId, {
            type: input.type,
            description: input.description,
            amount: input.amount,
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
    listActive: publicProcedure.query(async () => {
      return await db.getAllActiveNeeds();
    }),
  }),

  notes: router({
    byPerson: publicProcedure
      .input(z.object({ personId: z.string() }))
      .query(async ({ input }) => {
        return await db.getNotesByPersonId(input.personId);
      }),
    create: publicProcedure
      .input(z.object({
        personId: z.string(),
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
