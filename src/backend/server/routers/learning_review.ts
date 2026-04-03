import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db, failedDrills, learningContent } from '../../../database/db';
import { eq, and, sql } from 'drizzle-orm';

export const learningReviewRouter = router({
  /** Record a failure in a specific drill question */
  recordDrillFailure: protectedProcedure
    .input(z.object({
      unitId: z.number(),
      questionIndex: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;
      
      // Check if already exists
      const existing = await db.select()
        .from(failedDrills)
        .where(
          and(
            eq(failedDrills.userId, userId),
            eq(failedDrills.unitId, input.unitId),
            eq(failedDrills.questionIndex, input.questionIndex)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update attempts
        await db.update(failedDrills)
          .set({ 
            attempts: sql`${failedDrills.attempts} + 1`,
            lastFailedAt: new Date()
          })
          .where(eq(failedDrills.id, existing[0].id));
      } else {
        // Insert new failure
        await db.insert(failedDrills).values({
          userId,
          unitId: input.unitId,
          questionIndex: input.questionIndex,
        });
      }

      return { success: true };
    }),

  /** Get stats of failed questions for the current user */
  getPerfectionStats: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.userId;
      const results = await db.select({
        unitId: failedDrills.unitId,
        count: sql<number>`count(*)`,
      })
      .from(failedDrills)
      .where(eq(failedDrills.userId, userId))
      .groupBy(failedDrills.unitId);

      return results;
    }),

  /** Get the questions for a perfection session of a specific unit or entire area */
  getPerfectionDrill: protectedProcedure
    .input(z.object({
      unitId: z.number().optional(),
      areaId: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.userId;
      
      let units: any[] = [];

      if (input.unitId) {
        units = await db.select()
          .from(learningContent)
          .where(eq(learningContent.id, input.unitId))
          .limit(1);
      } else if (input.areaId) {
        units = await db.select()
          .from(learningContent)
          .where(eq(learningContent.areaId, input.areaId));
      }

      if (units.length === 0) return [];

      // Get all failed indices for these units
      const failed = await db.select({ 
        unitId: failedDrills.unitId,
        index: failedDrills.questionIndex 
      })
      .from(failedDrills)
      .where(eq(failedDrills.userId, userId));

      const failedMap = new Map<number, Set<number>>();
      failed.forEach(f => {
        if (!f.unitId) return;
        if (!failedMap.has(f.unitId)) failedMap.set(f.unitId, new Set());
        failedMap.get(f.unitId)?.add(f.index);
      });

      const allQuestions: any[] = [];
      units.forEach(u => {
        if (!u.questions) return;
        const indices = failedMap.get(u.id);
        if (indices) {
          const qList = (u.questions as any[]).filter((_, idx) => indices.has(idx));
          allQuestions.push(...qList);
        }
      });

      return allQuestions;
    }),

  /** Remove a failure after the user gets it right in perfection mode (Reset) */
  resolveFailure: protectedProcedure
    .input(z.object({
      unitId: z.number(),
      questionIndex: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.delete(failedDrills)
        .where(
          and(
            eq(failedDrills.userId, ctx.userId),
            eq(failedDrills.unitId, input.unitId),
            eq(failedDrills.questionIndex, input.questionIndex)
          )
        );
      return { success: true };
    }),
});
