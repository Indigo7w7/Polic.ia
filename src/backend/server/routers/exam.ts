import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { db, users, exams, examAttempts, attemptAnswers, leitnerCards, examQuestions } from '../../../database/db';
import { eq, desc, and, sql } from 'drizzle-orm';

export const examRouter = router({
  /** Fetch questions from DB dynamically (for admin-uploaded exams) */
  getQuestionsByFilter: protectedProcedure
    .input(z.object({
      school: z.enum(['EO', 'EESTP', 'BOTH']).optional(),
      areaId: z.number().optional(),
      difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
      examId: z.number().optional(), // Specific level filter
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
      if (input.examId) {
        filters.push(eq(examQuestions.examId, input.examId));
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

        // 3. Calculo de Puntos de Merito (PM)
        const [stats] = await tx.select({ bestScore: sql<number>`MAX(${examAttempts.score})` })
          .from(examAttempts).where(eq(examAttempts.userId, input.userId));
        const previousBest = stats?.bestScore || 0;
        
        let meritPointsEarned = 0;
        if (input.passed) meritPointsEarned += 100; // Por aprobar (> 55% que internamente equivale a 11/20)
        
        // Si anterior era >0 y ahora lo superó, o si es primera vez y sacó buena nota
        if (input.score > previousBest && input.score > 0) {
          meritPointsEarned += 300; // Por romper récord personal
        }

        if (meritPointsEarned > 0) {
           await tx.update(users) // Changed db.users to users
             .set({ meritPoints: sql`${users.meritPoints} + ${meritPointsEarned}` })
             .where(eq(users.uid, input.userId));
        }

        return { success: true, attemptId: attempt.insertId, meritPointsEarned };
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

  /** Get available exam levels for the student dashboard */
  getLevels: protectedProcedure
    .query(async () => {
      return await db.select()
        .from(exams)
        .orderBy(exams.school, exams.level);
    }),
});
