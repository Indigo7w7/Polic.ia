import { db, achievements, userAchievements, users } from '../../../database/db';
import { eq, and, sql } from 'drizzle-orm';

export interface UnlockedAchievement {
  code: string;
  title: string;
  description: string;
  icon: string;
  pointsReward: number;
}

/**
 * Internal logic to check and unlock an achievement.
 * Returns the object if newly unlocked, null otherwise.
 */
export async function unlockAchievement(userId: string, code: string): Promise<UnlockedAchievement | null> {
  // 1. Find achievement by code
  const [achievement] = await db.select().from(achievements).where(eq(achievements.code, code));
  if (!achievement) return null;

  // 2. Check if already unlocked
  const [existing] = await db.select().from(userAchievements)
    .where(and(
      eq(userAchievements.userId, userId),
      eq(userAchievements.achievementId, achievement.id)
    ));
  
  if (existing) return null;

  // 3. Unlock
  await db.insert(userAchievements).values({
    userId,
    achievementId: achievement.id,
  });

  // 4. Reward Merit Points
  if (achievement.pointsReward > 0) {
    await db.update(users)
      .set({ meritPoints: sql`${users.meritPoints} + ${achievement.pointsReward}` })
      .where(eq(users.uid, userId));
  }

  return {
    code: achievement.code,
    title: achievement.title,
    description: achievement.description!,
    icon: achievement.icon!,
    pointsReward: achievement.pointsReward,
  };
}
