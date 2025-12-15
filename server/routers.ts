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
  }),

  people: router({
    list: publicProcedure.query(async () => {
      return await db.getAllPeople();
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
        name: z.string(),
        campusId: z.number(),
        districtId: z.string(),
        status: z.enum(["Not invited yet", "Maybe", "Going", "Not Going"]).default("Not invited yet"),
        role: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createPerson(input);
        return { success: true };
      }),
    updateStatus: publicProcedure
      .input(z.object({
        personId: z.number(),
        status: z.enum(["Not invited yet", "Maybe", "Going", "Not Going"]),
      }))
      .mutation(async ({ input }) => {
        await db.updatePersonStatus(input.personId, input.status);
        return { success: true };
      }),
    getById: publicProcedure
      .input(z.object({ personId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPersonById(input.personId);
      }),
    updateName: publicProcedure
      .input(z.object({ personId: z.number(), name: z.string() }))
      .mutation(async ({ input }) => {
        await db.updatePersonName(input.personId, input.name);
        return { success: true };
      }),
  }),

  needs: router({
    byPerson: publicProcedure
      .input(z.object({ personId: z.number() }))
      .query(async ({ input }) => {
        return await db.getNeedsByPerson(input.personId);
      }),
    create: publicProcedure
      .input(z.object({
        personId: z.number(),
        type: z.enum(["Financial", "Other"]),
        amount: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createNeed({
          ...input,
          isActive: true,
        });
        // Update person's lastUpdated
        const person = await db.getPersonById(input.personId);
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
      .input(z.object({ personId: z.number() }))
      .query(async ({ input }) => {
        return await db.getNotesByPerson(input.personId);
      }),
    create: publicProcedure
      .input(z.object({
        personId: z.number(),
        text: z.string(),
        isLeaderOnly: z.boolean().default(false),
      }))
      .mutation(async ({ input }) => {
        await db.createNote(input);
        // Update person's lastUpdated
        const person = await db.getPersonById(input.personId);
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
    uploadHeaderImage: publicProcedure
      .input(z.object({ 
        imageData: z.string(), // base64 encoded image
        fileName: z.string(),
      }))
      .mutation(async ({ input }) => {
        // Convert base64 to buffer
        const base64Data = input.imageData.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Upload to S3
        const fileKey = `header-images/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, 'image/jpeg');
        
        // Save to database
        await db.setSetting('headerImageUrl', url);
        
        return { url };
      }),
  }),
});

export type AppRouter = typeof appRouter;
