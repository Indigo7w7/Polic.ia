import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db, learningProgress, users, contentFsrsMap, leitnerCards } from '../../../database/db';
import { eq, and, desc } from 'drizzle-orm';

export const learningProgressRouter = router({
  /** Mark a unit as completed with a specific score and award honor points (0-20) */
  completeUnit: protectedProcedure
    .input(z.object({
      unitId: z.number(),
      score: z.number(),
      totalQuestions: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;

      // BUG-03 FIX: Guard against division by zero
      if (input.totalQuestions <= 0) {
        return { success: false, pointsAdded: 0, totalUnitPoints: 0 };
      }

      const awardedPoints = Math.round((input.score / input.totalQuestions) * 20);

      return await db.transaction(async (tx) => {
        // 1. Check current progress
        const [existing] = await tx.select()
          .from(learningProgress)
          .where(
            and(
              eq(learningProgress.userId, userId),
              eq(learningProgress.unitId, input.unitId)
            )
          )
          .limit(1);

        // BUG-04 FIX: Use the same denominator (current totalQuestions) for fair comparison.
        // This is intentional — we compare on the same scale to avoid inflating old scores.
        const currentBestPoints = existing
          ? Math.round(((existing.score || 0) / input.totalQuestions) * 20)
          : 0;
        const pointsDifference = Math.max(0, awardedPoints - currentBestPoints);

        // 2. Update Progress Record
        if (existing) {
          if (input.score > (existing.score || 0)) {
            await tx.update(learningProgress)
              .set({ score: input.score, completedAt: new Date() })
              .where(eq(learningProgress.id, existing.id));
          }
        } else {
          await tx.insert(learningProgress).values({
            userId,
            unitId: input.unitId,
            score: input.score,
          });
        }

        // 3. Award Honor Points to User Profile
        if (pointsDifference > 0) {
          const [user] = await tx.select().from(users).where(eq(users.uid, userId));
          if (user) {
            await tx.update(users)
              .set({ 
                honorPoints: (user.honorPoints || 0) + pointsDifference,
                lastActive: new Date()
              })
              .where(eq(users.uid, userId));
          }
        }

        // 4. ECOSISTEMA V2: Propagación de flashcards FSRS
        // Al completar la unidad, asignamos las tarjetas al usuario si es que no las tiene.
        const mapEntries = await tx.select().from(contentFsrsMap).where(eq(contentFsrsMap.contentId, input.unitId));
        if (mapEntries.length > 0) {
          const existingCards = await tx.select()
            .from(leitnerCards)
            .where(
              and(
                eq(leitnerCards.userId, userId),
                eq(leitnerCards.learningContentId, input.unitId)
              )
            );
          const existingSet = new Set(existingCards.map(c => c.questionIndex));
          
          const newCards = [];
          for (const map of mapEntries) {
            if (map.questionIndex !== null && !existingSet.has(map.questionIndex)) {
              newCards.push({
                userId,
                learningContentId: input.unitId,
                questionIndex: map.questionIndex,
                deckTag: map.deckTag,
                state: 'new' as const,
                stability: 0.1,
                difficulty: 5.0,
                reps: 0,
                lapses: 0,
                scheduledDays: 0,
                elapsedDays: 0,
                queue: 0,
                mod: Date.now()
              });
            }
          }
          if (newCards.length > 0) {
            await tx.insert(leitnerCards).values(newCards);
          }
        }

        return { 
          success: true, 
          pointsAdded: pointsDifference,
          totalUnitPoints: awardedPoints 
        };
      });
    }),

  /** Get all completed units for the current user */
  getUserProgress: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.userId;
      
      const progress = await db.select()
        .from(learningProgress)
        .where(eq(learningProgress.userId, userId))
        .orderBy(desc(learningProgress.completedAt));

      return progress;
    }),

  /** Get the global leaderboard (Top students by Honor Points) */
  getLeaderboard: protectedProcedure
    .query(async () => {
      const topUsers = await db.select({
        uid: users.uid,
        name: users.name,
        photoURL: users.photoURL,
        honorPoints: users.honorPoints,
        meritPoints: users.meritPoints, // BUG-11 FIX: renamed from misleading 'rank' alias
      })
      .from(users)
      .where(eq(users.status, 'ACTIVE'))
      .orderBy(desc(users.honorPoints))
      .limit(100);

      return topUsers;
    }),
});
