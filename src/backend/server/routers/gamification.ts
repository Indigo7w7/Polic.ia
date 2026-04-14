import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db, achievements, userAchievements, users } from '../../../database/db';
import { eq, and, sql } from 'drizzle-orm';

export const gamificationRouter = router({
  /** Fetch all achievements with current user's unlocked status */
  getAchievements: protectedProcedure
    .query(async ({ ctx }) => {
      const allAchievements = await db.select().from(achievements);
      const unlockedOnes = await db.select({
        achievementId: userAchievements.achievementId,
        unlockedAt: userAchievements.unlockedAt,
      })
      .from(userAchievements)
      .where(eq(userAchievements.userId, ctx.userId));

      const unlockedIds = new Set(unlockedOnes.map(u => u.achievementId));

      return allAchievements.map(a => ({
        ...a,
        isUnlocked: unlockedIds.has(a.id),
        unlockedAt: unlockedOnes.find(u => u.achievementId === a.id)?.unlockedAt || null,
      }));
    }),

  /** Specific procedure to trigger an achievement check (usually internal, but exposed for client-side events if needed) */
  checkAndUnlock: protectedProcedure
    .input(z.object({
      code: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [achievement] = await db.select().from(achievements).where(eq(achievements.code, input.code));
      if (!achievement) return { success: false, message: 'Achievement not found' };

      const [existing] = await db.select().from(userAchievements)
        .where(and(
          eq(userAchievements.userId, ctx.userId),
          eq(userAchievements.achievementId, achievement.id)
        ));

      if (existing) return { success: false, alreadyUnlocked: true };

      // Unlock it
      await db.insert(userAchievements).values({
        userId: ctx.userId,
        achievementId: achievement.id,
      });

      // Award points if any
      if (achievement.pointsReward && achievement.pointsReward > 0) {
        await db.update(users)
          .set({ meritPoints: sql`${users.meritPoints} + ${achievement.pointsReward}` })
          .where(eq(users.uid, ctx.userId));
      }

      return { success: true, achievement };
    }),
});
