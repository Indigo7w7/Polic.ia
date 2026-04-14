import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db, examProgress, leitnerCards, examAttempts } from '../../../database/db';
import { eq, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const examProgressRouter = router({
  saveProgress: protectedProcedure
    .input(z.object({
      examLevelId: z.number().nullable(),
      isPracticeMode: z.boolean(),
      isMuerteSubita: z.boolean(),
      questions: z.any().optional(), // Puede enviarse solo la primera vez para no saturar payload
      answers: z.record(z.string(), z.number()),
      flaggedQuestions: z.record(z.string(), z.boolean()),
      timeSpentPerQuestion: z.record(z.string(), z.number()),
      timeLeft: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db.select()
        .from(examProgress)
        .where(eq(examProgress.userId, ctx.userId));

      if (existing) {
        await db.update(examProgress).set({
          examLevelId: input.examLevelId,
          isPracticeMode: input.isPracticeMode,
          isMuerteSubita: input.isMuerteSubita,
          // Solo actualizamos questions si las envían (evitar sobreescribir con undef)
          ...(input.questions ? { questions: input.questions } : {}),
          answers: input.answers,
          flaggedQuestions: input.flaggedQuestions,
          timeSpentPerQuestion: input.timeSpentPerQuestion,
          timeLeft: input.timeLeft,
        }).where(eq(examProgress.id, existing.id));
      } else {
        await db.insert(examProgress).values({
          userId: ctx.userId,
          examLevelId: input.examLevelId,
          isPracticeMode: input.isPracticeMode,
          isMuerteSubita: input.isMuerteSubita,
          questions: input.questions || [],
          answers: input.answers,
          flaggedQuestions: input.flaggedQuestions,
          timeSpentPerQuestion: input.timeSpentPerQuestion,
          timeLeft: input.timeLeft,
        });
      }
      return { success: true };
    }),

  loadProgress: protectedProcedure
    .query(async ({ ctx }) => {
      const [progress] = await db.select()
        .from(examProgress)
        .where(eq(examProgress.userId, ctx.userId));

      if (!progress) return null;
      return progress;
    }),

  deleteProgress: protectedProcedure
    .mutation(async ({ ctx }) => {
      await db.delete(examProgress).where(eq(examProgress.userId, ctx.userId));
      return { success: true };
    }),
});
