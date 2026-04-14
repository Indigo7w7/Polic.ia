import { router, protectedProcedure } from '../trpc';
import { logger } from '../utils/logger';
import { unlockAchievement } from '../utils/gamification';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { eq, desc, and, sql, ne, inArray } from 'drizzle-orm';
import { db, users, exams, examAttempts, attemptAnswers, leitnerCards, examQuestions, examProgress, achievements, userAchievements } from '../../../database/db';

const SUBMIT_LIMIT_MS = 10000; // 10s cooldown

export const examRouter = router({
  /** Fetch questions from DB dynamically (for admin-uploaded exams or custom ones) */
  getQuestionsByFilter: protectedProcedure
    .input(z.object({
      school: z.enum(['EO', 'EESTP', 'BOTH']).optional(),
      areaId: z.number().optional(),
      areaIds: z.array(z.number()).optional(),
      difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
      examId: z.number().optional(),
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
      if (input.areaIds && input.areaIds.length > 0) {
        filters.push(inArray(examQuestions.areaId, input.areaIds));
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

  /** Smart Exam Generator: Analyzes radar and builds a personalized challenge */
  generateSmartExam: protectedProcedure
    .input(z.object({
      school: z.enum(['EO', 'EESTP']),
      limit: z.number().min(10).max(100).default(50),
      requestedDifficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // 1. Fetch Radar Data (Weaknesses)
      const stats = await db.execute(sql`
        SELECT 
          la.id,
          la.name as area,
          AVG(aa.is_correct) * 100 as score
        FROM attempt_answers aa
        JOIN exam_attempts ea ON aa.attempt_id = ea.id
        JOIN exam_questions eq ON aa.question_id = eq.id
        JOIN learning_areas la ON eq.area_id = la.id
        WHERE ea.user_id = ${ctx.userId}
        GROUP BY la.id, la.name
      `);
      
      const rows = Array.isArray(stats) ? (stats[0] || stats) : ((stats as any).rows || []);
      const areaStats = (rows as any[]).map(r => ({
        id: Number(r.id),
        score: Math.round(Number(r.score || 0))
      }));

      const overallAvg = areaStats.length > 0 
        ? areaStats.reduce((acc, s) => acc + s.score, 0) / areaStats.length 
        : 50;

      // 2. Logic for Difficulty Override (User needs > 70% to choose)
      const canCustomize = overallAvg > 70;
      let finalDifficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM';
      
      if (canCustomize && input.requestedDifficulty) {
        finalDifficulty = input.requestedDifficulty;
      } else {
        if (overallAvg < 45) finalDifficulty = 'EASY';
        else if (overallAvg < 75) finalDifficulty = 'MEDIUM';
        else finalDifficulty = 'HARD';
      }

      // 3. Identify weak areas (Bottom 3)
      const weakAreaIds = areaStats
        .sort((a,b) => a.score - b.score)
        .slice(0, 3)
        .map(a => a.id);

      // 4. Fetch mix of questions
      const filters = [
        sql`(${examQuestions.schoolType} = ${input.school} OR ${examQuestions.schoolType} = 'BOTH')`,
        eq(examQuestions.difficulty, finalDifficulty)
      ];

      // We prioritize weak areas if they exist, otherwise just random.
      // Logic: 60% from weak areas, 40% random from the rest.
      const weakLimit = Math.floor(input.limit * 0.6);
      const restLimit = input.limit - weakLimit;

      let finalQuestions: any[] = [];

      if (weakAreaIds.length > 0) {
        const weakQuestions = await db.select().from(examQuestions)
          .where(and(...filters, inArray(examQuestions.areaId, weakAreaIds)))
          .orderBy(sql`RAND()`)
          .limit(weakLimit);
        
        const restQuestions = await db.select().from(examQuestions)
          .where(and(...filters, sql`${examQuestions.areaId} NOT IN (${sql.join(weakAreaIds, sql`, `)})`))
          .orderBy(sql`RAND()`)
          .limit(restLimit);
        
        finalQuestions = [...weakQuestions, ...restQuestions];
      } else {
        finalQuestions = await db.select().from(examQuestions)
          .where(and(...filters))
          .orderBy(sql`RAND()`)
          .limit(input.limit);
      }

      // Shuffle final result
      return {
        questions: finalQuestions.sort(() => Math.random() - 0.5),
        stats: {
          overallAvg,
          canCustomize,
          determinedDifficulty: finalDifficulty,
          targetAreas: weakAreaIds
        }
      };
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

          // 3. Sincronización FSRS — Conexión Ecosistema (Optimized Bulk Fetch)
          const examQuestionIds = input.answers.map(a => a.questionId);
          const existingCards = await tx.select().from(leitnerCards)
            .where(and(
              eq(leitnerCards.userId, input.userId),
              sql`${leitnerCards.questionId} IN (${sql.join(examQuestionIds, sql`, `)})`
            ));

          const cardMap = new Map(existingCards.map(c => [c.questionId, c]));

          for (const ans of input.answers) {
            const existingCard = cardMap.get(ans.questionId);

            if (existingCard) {
              if (!ans.isCorrect) {
                const nextReview = new Date(Date.now() + 10 * 60000); // 10 min
                await tx.update(leitnerCards).set({
                  state: 'relearning',
                  queue: 3,
                  scheduledDays: 0,
                  lapses: sql`${leitnerCards.lapses} + 1`,
                  nextReview,
                  lastReview: new Date(),
                }).where(eq(leitnerCards.id, existingCard.id));
              } else if (existingCard.state === 'relearning') {
                const nextReview = new Date(Date.now() + 24 * 60 * 60000); // 1 day
                await tx.update(leitnerCards).set({
                  state: 'review',
                  queue: 2,
                  scheduledDays: 1,
                  reps: sql`${leitnerCards.reps} + 1`,
                  nextReview,
                  lastReview: new Date(),
                }).where(eq(leitnerCards.id, existingCard.id));
              } else {
                await tx.update(leitnerCards).set({
                  reps: sql`${leitnerCards.reps} + 1`,
                  level: sql`LEAST(${leitnerCards.level} + 1, 5)`,
                  lastReview: new Date(),
                }).where(eq(leitnerCards.id, existingCard.id));
              }
            } else if (!ans.isCorrect) {
              const nextReview = new Date(Date.now() + 10 * 60000);
              await tx.insert(leitnerCards).values({
                userId: input.userId,
                questionId: ans.questionId,
                state: 'learning',
                queue: 1,
                stability: 0.1,
                difficulty: 5.0,
                reps: 0,
                lapses: 1,
                scheduledDays: 0,
                elapsedDays: 0,
                level: 1,
                nextReview,
              });
            }
          }
        }

        // 3. Calculo de Puntos de Merito (PM)
        // Note: we fetch the best score BEFORE this attempt is fully committed (within TX)
        const [stats] = await tx.select({ bestScore: sql<number>`MAX(${examAttempts.score})` })
          .from(examAttempts).where(eq(examAttempts.userId, input.userId));
        const previousBest = stats?.bestScore || 0;
        
        let meritPointsEarned = 0;
        if (input.passed) meritPointsEarned += 200; 
        
        if (input.score > previousBest && input.score > 0) {
          meritPointsEarned += 500; 
        }

        if (meritPointsEarned > 0) {
           await tx.update(users)
             .set({ meritPoints: sql`${users.meritPoints} + ${meritPointsEarned}` })
             .where(eq(users.uid, input.userId));
        }

        return { success: true, attemptId: attempt.insertId, meritPointsEarned, previousBest };
      });

      // ─── Post-Transaction Processing (Non-Critical path) ───
      const achievementsUnlocked: any[] = [];
      try {
        // 1. FIRST_EXAM check
        const achFirst = await unlockAchievement(input.userId, 'FIRST_EXAM');
        if (achFirst) achievementsUnlocked.push(achFirst);

        // 2. ELITE_OFFICER check (Score >= 85)
        if (input.score >= 85) {
          const achElite = await unlockAchievement(input.userId, 'ELITE_OFFICER');
          if (achElite) achievementsUnlocked.push(achElite);
        }

        // 3. PERFECT_EXAM check (Score === 100)
        if (input.score === 100 && input.answers.length >= 20) {
          const achPerfect = await unlockAchievement(input.userId, 'PERFECT_EXAM');
          if (achPerfect) achievementsUnlocked.push(achPerfect);
        }
      } catch (err) {
        console.error('[EXAM_POST_PROCESS_ERROR]', err);
      }

      const [{ meritPoints }] = await db.select({ meritPoints: users.meritPoints }).from(users).where(eq(users.uid, input.userId));

      return { 
        success: true, 
        attemptId: result.attemptId, 
        meritPointsEarned: result.meritPointsEarned, 
        previousBest: result.previousBest,
        newTotalPoints: meritPoints,
        achievementsUnlocked
      };
    }),

  getHistory: protectedProcedure
    .input(z.object({ 
      userId: z.string(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.userId !== input.userId && ctx.userRole !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized access to history' });
      }
      
      return await db.select()
        .from(examAttempts)
        .where(eq(examAttempts.userId, input.userId))
        .orderBy(desc(examAttempts.startedAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  /** Get available exam levels for the student dashboard */
  getLevels: protectedProcedure
    .query(async () => {
      return await db.select()
        .from(exams)
        .orderBy(exams.school, exams.level);
    }),

  /** Get questions the user HAS FAILED before for "Anti-Failure Zone" */
  getFailedQuestions: protectedProcedure
    .input(z.object({ 
      userId: z.string(), 
      limit: z.number().min(1).max(50).default(30),
      offset: z.number().default(0)
    }))
    .query(async ({ input }) => {
      // Find questions where isCorrect was false for this user
      return await db.select({
        id: examQuestions.id,
        question: examQuestions.question,
        options: examQuestions.options,
        correctOption: examQuestions.correctOption,
        areaId: examQuestions.areaId,
        difficulty: examQuestions.difficulty,
        schoolType: examQuestions.schoolType,
      })
      .from(attemptAnswers)
      .innerJoin(examQuestions, eq(attemptAnswers.questionId, examQuestions.id))
      .innerJoin(examAttempts, eq(attemptAnswers.attemptId, examAttempts.id))
      .where(and(
        eq(examAttempts.userId, input.userId),
        eq(attemptAnswers.isCorrect, false)
      ))
      .groupBy(examQuestions.id) // Get unique failed questions
      .limit(input.limit)
      .offset(input.offset);
    }),
});
