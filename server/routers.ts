import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
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
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getDistrictById(input.id);
      }),
    updateName: publicProcedure
      .input(z.object({ id: z.number(), name: z.string() }))
      .mutation(async ({ input }) => {
        await db.updateDistrictName(input.id, input.name);
        return { success: true };
      }),
    updateRegion: publicProcedure
      .input(z.object({ id: z.number(), regionId: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateDistrictRegion(input.id, input.regionId);
        return { success: true };
      }),
  }),

  campuses: router({
    list: publicProcedure.query(async () => {
      return await db.getAllCampuses();
    }),
    byDistrict: publicProcedure
      .input(z.object({ districtId: z.number() }))
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
        districtId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const insertId = await db.createCampus(input);
        return { id: insertId, name: input.name, districtId: input.districtId };
      }),
    archive: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCampus(input.id);
        return { success: true };
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
      .input(z.object({ districtId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPeopleByDistrict(input.districtId);
      }),
    byCampus: publicProcedure
      .input(z.object({ campusId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPeopleByCampus(input.campusId);
      }),
    create: protectedProcedure
      .input(z.object({
        personId: z.string(),
        name: z.string(),
        primaryCampusId: z.number().nullable().optional(),
        primaryDistrictId: z.number().nullable().optional(),
        primaryRole: z.string().optional(),
        status: z.enum(["Yes", "Maybe", "No", "Not Invited"]).default("Not Invited"),
        depositPaid: z.boolean().optional(),
        notes: z.string().optional(),
        spouse: z.string().optional(),
        kids: z.number().optional(),
        guests: z.number().optional(),
        childrenAges: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createPerson({
          ...input,
          childrenAges: input.childrenAges ? JSON.stringify(input.childrenAges) : undefined,
          lastEditedBy: ctx.user.name || ctx.user.email || 'Unknown',
          lastEditedAt: new Date(),
        });
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
        kids: z.number().optional(),
        guests: z.number().optional(),
        childrenAges: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updatePerson({
          ...input,
          childrenAges: input.childrenAges ? JSON.stringify(input.childrenAges) : undefined,
          lastEditedBy: ctx.user.name || ctx.user.email || 'Unknown',
          lastEditedAt: new Date(),
        });
        return { success: true };
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
        type: z.enum(["financial", "other"]).default("other"),
        description: z.string(),
        amount: z.number().optional(),
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

  // Admin Console Router
  console: router({
    health: router({
      check: publicProcedure.query(async () => {
        try {
          const dbHealth = await db.getDb();
          return {
            database: dbHealth ? "healthy" : "error",
            timestamp: new Date().toISOString(),
          };
        } catch (error) {
          return {
            database: "error",
            timestamp: new Date().toISOString(),
            error: String(error),
          };
        }
      }),
    }),
    users: router({
      list: publicProcedure
        .input(z.object({ limit: z.number().optional() }).optional())
        .query(async ({ input }) => {
          const allUsers = await db.getAllUsers();
          return input?.limit ? allUsers.slice(0, input.limit) : allUsers;
        }),
    }),
    activityLogs: router({
      list: publicProcedure
        .input(z.object({ limit: z.number().optional() }).optional())
        .query(async ({ input }) => {
          // Return empty array for now - activity logging can be implemented later
          return [];
        }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
