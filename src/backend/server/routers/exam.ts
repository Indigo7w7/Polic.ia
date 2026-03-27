import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { db, examAttempts, attemptAnswers, leitnerCards, examQuestions } from '../../../database/db';
import { eq, desc, and, sql } from 'drizzle-orm';

export const examRouter = router({
  /** Fetch questions from DB dynamically (for admin-uploaded exams) */
  getQuestionsByFilter: protectedProcedure
    .input(z.object({
      school: z.enum(['EO', 'EESTP', 'BOTH']).optional(),
      areaId: z.number().optional(),
      difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
      limit: z.number().min(1).max(200).default(100),
    }))
    .query(async ({ input }) => {
      let query = db.select().from(examQuestions);
      const filters = [];
      
      if (input.school) {
        filters.push(sql`(${examQuestions.schoolType} = ${input.school} OR ${examQuestions.schoolType} = 'BOTH')`);
      }
      if (input.areaId) {
        filters.push(eq(examQuestions.areaId, input.areaId));
      }
      if (input.difficulty) {
        filters.push(eq(examQuestions.difficulty, input.difficulty));
      }

      const whereClause = filters.length > 0 ? and(...filters) : undefined;
      
      const questions = await db.select()
        .from(examQuestions)
        .where(whereClause)
        .orderBy(sql`RAND()`)
        .limit(input.limit);

      return questions;
    }),

  /** Submit exam attempt wrapped in a transaction for atomicity */
  submitAttempt: protectedProcedure
    .input(z.object({
      userId: z.string(),
      score: z.number(),
      passed: z.boolean(),
      answers: z.array(z.object({
        questionId: z.number(),
        chosenOption: z.number(),
        isCorrect: z.boolean(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.userId !== input.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized attempt submission' });
      }
      
      // Wrap entire operation in a transaction for atomicity
      const result = await db.transaction(async (tx) => {
        // 1. Insert exam attempt
        const [attempt] = await tx.insert(examAttempts).values({
          userId: input.userId,
          score: input.score,
          passed: input.passed,
          endedAt: new Date(),
        });

        // 2. Insert all answers
        if (input.answers.length > 0) {
          await tx.insert(attemptAnswers).values(
            input.answers.map((ans) => ({
              attemptId: attempt.insertId,
              questionId: ans.questionId,
              chosenOption: ans.chosenOption,
              isCorrect: ans.isCorrect,
            }))
          );

          // 3. Update Leitner Cards
          for (const ans of input.answers) {
            const [existingCard] = await tx.select().from(leitnerCards)
              .where(and(
                eq(leitnerCards.userId, input.userId),
                eq(leitnerCards.questionId, ans.questionId)
              ));
            
            if (existingCard) {
              const nextLevel = ans.isCorrect ? Math.min(existingCard.level + 1, 5) : 1;
              const hoursToWait = [0, 24, 48, 168, 336, 720][nextLevel];
              const nextReview = new Date();
              nextReview.setHours(nextReview.getHours() + hoursToWait);

              await tx.update(leitnerCards)
                .set({ level: nextLevel, nextReview })
                .where(eq(leitnerCards.id, existingCard.id));
            } else if (!ans.isCorrect) {
              const nextReview = new Date();
              nextReview.setHours(nextReview.getHours() + 24);

              await tx.insert(leitnerCards).values({
                userId: input.userId,
                questionId: ans.questionId,
                level: 1,
                nextReview,
              });
            }
          }
        }

        return { success: true, attemptId: attempt.insertId };
      });

      return result;
    }),

  getHistory: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.userId !== input.userId && ctx.userRole !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized access to history' });
      }
      
      return await db.select()
        .from(examAttempts)
        .where(eq(examAttempts.userId, input.userId))
        .orderBy(desc(examAttempts.startedAt));
    }),
});
