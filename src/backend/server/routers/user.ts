import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db, users, examAttempts, globalNotifications } from '../../../database/db';
import { eq, sql, desc, and, gte } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { logger } from '../utils/logger';
import { USER_FIELDS } from '../utils/constants';
import { unlockAchievement } from '../utils/gamification';

const getCategoryStatsData = async (uid: string) => {
  const stats = await db.execute(sql`
    SELECT 
      la.name as area,
      AVG(aa.is_correct) * 100 as score
    FROM attempt_answers aa
    JOIN exam_attempts ea ON aa.attempt_id = ea.id
    JOIN exam_questions eq ON aa.question_id = eq.id
    JOIN learning_areas la ON eq.area_id = la.id
    WHERE ea.user_id = ${uid} AND ea.started_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY la.id, la.name
  `);
  const rows = Array.isArray(stats) ? (stats[0] || stats) : ((stats as any).rows || []);
  return (rows as any[]).map(r => ({
    area: r.area,
    score: Math.round(Number(r.score || 0))
  }));
};

export const userRouter = router({
  getProfile: protectedProcedure
    .input(z.object({ uid: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify ownership
      if (ctx.userId !== input.uid && ctx.userRole !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized access to this profile' });
      }
      
      let [user] = await db.select(USER_FIELDS).from(users).where(eq(users.uid, input.uid));
      
      if (!user) {
        console.log(`[SYNC] User ${input.uid} not found in MySQL. Provisioning new profile...`);
        await db.insert(users).values({
          uid: input.uid,
          email: ctx.userEmail || 'unknown@polic.ia',
          name: 'Postulante',
          role: 'user',
          membership: 'FREE',
          status: 'ACTIVE',
          lastActive: new Date(),
        });
        [user] = await db.select(USER_FIELDS).from(users).where(eq(users.uid, input.uid));
      }

      if (!user) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to provision user profile' });

      // Lazy downgrade
      if (user.membership === 'PRO' && user.premiumExpiration && user.premiumExpiration < new Date()) {
        await db.update(users).set({ membership: 'FREE', premiumExpiration: null }).where(eq(users.uid, user.uid));
        user.membership = 'FREE';
        user.premiumExpiration = null;
      }

      return { 
        ...user, 
        role: ctx.userRole, // ALWAYS use the context role (it's the source of truth)
        photoURL: user.photoURL,
        honorPoints: user.honorPoints || 0,
        meritPoints: user.meritPoints || 0,
        currentStreak: user.currentStreak || 0,
      };
    }),

  claimDailyLeitner: protectedProcedure
    .input(z.object({ uid: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.userId !== input.uid) throw new TRPCError({ code: 'FORBIDDEN' });
      
      const [user] = await db.select(USER_FIELDS).from(users).where(eq(users.uid, input.uid));
      if (!user) throw new TRPCError({ code: 'NOT_FOUND' });

      const now = new Date();
      const lastUpdate = user.lastStreakUpdate ? new Date(user.lastStreakUpdate) : new Date(0);

      const getDayOffset = (d: Date) => {
        const estTime = new Date(d.getTime() - (5 * 60 * 60 * 1000)); // UTC-5
        return Math.floor(estTime.getTime() / (1000 * 60 * 60 * 24));
      };

      const todayOffset = getDayOffset(now);
      const lastUpdateOffset = getDayOffset(lastUpdate);
      const diffDays = todayOffset - lastUpdateOffset;

      if (diffDays === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ya reclamaste tu recompensa diaria hoy' });
      }

      let streak = diffDays === 1 ? user.currentStreak + 1 : 1;
      let pointsToGive = 50; // default for daily Leitner
      
      if (streak % 5 === 0) {
        pointsToGive += 200; // Streak bonus
      }

      await db.update(users)
        .set({ 
          honorPoints: sql`${users.honorPoints} + ${pointsToGive}`,
          currentStreak: streak,
          lastStreakUpdate: now 
        })
        .where(eq(users.uid, input.uid));

      logger.info(`[REWARD] User ${input.uid} claimed daily reward. Points: ${pointsToGive}, Streak: ${streak}`);

      // Achievement Check
      const achievementsUnlocked: any[] = [];
      if (streak === 7) {
        const ach = await unlockAchievement(input.uid, 'STREAK_7');
        if (ach) achievementsUnlocked.push(ach);
      }

      return { success: true, pointsAwarded: pointsToGive, newStreak: streak, achievementsUnlocked };
    }),

  selectSchool: protectedProcedure
    .input(z.object({ uid: z.string(), school: z.enum(['EO', 'EESTP']) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.userId !== input.uid) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized school selection' });
      }
      
      const [user] = await db.select(USER_FIELDS).from(users).where(eq(users.uid, input.uid));
      
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      if (user.school) {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'La selección de escuela ya ha sido procesada y es irreversible.' 
        });
      }

      await db.update(users)
        .set({ school: input.school })
        .where(eq(users.uid, input.uid));

      const [updatedUser] = await db.select(USER_FIELDS).from(users).where(eq(users.uid, input.uid));

      return { success: true, school: input.school, user: updatedUser };
    }),

  getStats: protectedProcedure
    .input(z.object({ uid: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.userId !== input.uid && ctx.userRole !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized access to stats' });
      }
      
      const [user] = await db.select({
        honorPoints: users.honorPoints,
        meritPoints: users.meritPoints
      }).from(users).where(eq(users.uid, input.uid));

      const stats = await db.select({
        totalAttempts: sql<number>`count(${examAttempts.id})`,
        averageScore: sql<number>`avg(${examAttempts.score})`,
        bestScore: sql<number>`max(${examAttempts.score})`,
        lastExamDate: sql<string>`max(${examAttempts.startedAt})`,
        passedCount: sql<number>`sum(case when ${examAttempts.passed} = 1 then 1 else 0 end)`,
      })
      .from(examAttempts)
      .where(eq(examAttempts.userId, input.uid));

      return {
        ...(stats[0] || { totalAttempts: 0, averageScore: 0, bestScore: 0, lastExamDate: null, passedCount: 0 }),
        honorPoints: user?.honorPoints || 0,
        meritPoints: user?.meritPoints || 0
      };
    }),

  getRanking: protectedProcedure
    .input(z.object({ school: z.enum(['EO', 'EESTP']).optional() }))
    .query(async ({ input }) => {
      let filters = [
        eq(users.status, 'ACTIVE'),
      ];

      if (input.school) {
        filters.push(eq(users.school, input.school));
      }

      const topScores = await db.select({
        uid: users.uid,
        name: users.name,
        photoURL: users.photoURL,
        school: users.school,
        membership: users.membership,
        meritPoints: users.meritPoints,
        honorPoints: users.honorPoints,
        totalPoints: sql<number>`${users.honorPoints} + ${users.meritPoints}`,
        bestScore: sql<number>`(SELECT MAX(score) FROM ${examAttempts} WHERE user_id = ${users.uid})`,
      })
      .from(users)
      .where(and(...filters))
      .orderBy(desc(sql`${users.honorPoints} + ${users.meritPoints}`))
      .limit(100);

      return topScores;
    }),

  /** Calculates school-wide aggregates for the "Battle Board" */
  getSchoolBattleStats: protectedProcedure
    .query(async () => {
      const stats = await db.execute(sql`
        SELECT 
          u.school,
          AVG(ea.score) * 100 as avg_efficacy,
          SUM(u.honor_points) as total_honor,
          COUNT(DISTINCT u.uid) as user_count
        FROM users u
        LEFT JOIN exam_attempts ea ON u.uid = ea.user_id AND ea.started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        WHERE u.school IS NOT NULL AND u.status = 'ACTIVE'
        GROUP BY u.school
      `);

      const rows = Array.isArray(stats) ? (stats[0] || stats) : ((stats as any).rows || []);
      return (rows as any[]).map(r => ({
        school: r.school,
        avgEfficacy: Math.round(Number(r.avg_efficacy || 0)),
        totalHonor: Number(r.total_honor || 0),
        userCount: Number(r.user_count || 0)
      }));
    }),

  updateProfile: protectedProcedure
    .input(z.object({
      uid: z.string(),
      name: z.string().min(1).max(255).optional(),
      photoURL: z.string().max(512).optional(),
      age: z.number().int().min(15).max(100).optional(),
      city: z.string().max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.userId !== input.uid) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized profile update' });
      }

      const [user] = await db.select(USER_FIELDS).from(users).where(eq(users.uid, input.uid));
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      
      // Restricción removida: Permitir actualizaciones sin límite estricto
      // if (user.profileEdited && ctx.userRole !== 'admin') {
      //   throw new TRPCError({ code: 'FORBIDDEN', message: 'El perfil ya ha sido editado previamente' });
      // }
      
      await db.update(users)
        .set({
          ...(input.name && { name: input.name }),
          ...(input.photoURL && { photoURL: input.photoURL }),
          ...(input.age !== undefined && { age: input.age }),
          ...(input.city && { city: input.city }),
          profileEdited: true,
        })
        .where(eq(users.uid, input.uid));

      return { success: true };
    }),

  updateLastSeen: protectedProcedure
    .input(z.object({ uid: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.userId !== input.uid) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized lastSeen update' });
      }
      await db.update(users)
        .set({ lastActive: new Date() })
        .where(eq(users.uid, input.uid));
      return { success: true };
    }),

  getLastBroadcast: protectedProcedure
    .query(async () => {
      const activeBroadcasts = await db.select()
        .from(globalNotifications)
        .where(
          and(
            eq(globalNotifications.isActive, true),
            globalNotifications.expiresAt ? gte(globalNotifications.expiresAt, new Date()) : undefined
          )
        )
        .orderBy(desc(globalNotifications.createdAt))
        .limit(1);
      
      return activeBroadcasts[0] || null;
    }),

  getCategoryStats: protectedProcedure
    .input(z.object({ uid: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.userId !== input.uid && ctx.userRole !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      return await getCategoryStatsData(input.uid);
    }),

  getDashboardSummary: protectedProcedure
    .input(z.object({ uid: z.string(), school: z.enum(['EO', 'EESTP']).optional() }))
    .query(async ({ ctx, input }) => {
      if (ctx.userId !== input.uid && ctx.userRole !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      // Parallelize all primary Dashboard queries
      const [userStats, leitnerStatsRaw, categoryStats, rankResults, broadcastResult] = await Promise.all([
        // 1. Core User Stats
        db.select({
          totalAttempts: sql<number>`count(${examAttempts.id})`,
          averageScore: sql<number>`avg(${examAttempts.score})`,
          bestScore: sql<number>`max(${examAttempts.score})`,
          lastExamDate: sql<string>`max(${examAttempts.startedAt})`,
          passedCount: sql<number>`sum(case when ${examAttempts.passed} = 1 then 1 else 0 end)`,
          meritPoints: sql<number>`(SELECT merit_points FROM users WHERE uid = ${input.uid})`,
          honorPoints: sql<number>`(SELECT honor_points FROM users WHERE uid = ${input.uid})`,
        }).from(examAttempts).where(eq(examAttempts.userId, input.uid)),

        // 2. Leitner Counts
        db.execute(sql`
          SELECT
            COUNT(CASE WHEN state = 'new' AND queue >= 0 THEN 1 END) as new_count,
            COUNT(CASE WHEN state IN ('learning','relearning') AND queue >= 0 THEN 1 END) as learning_count,
            COUNT(CASE WHEN state = 'review' AND queue >= 0 AND (next_review IS NULL OR next_review <= DATE_ADD(NOW(), INTERVAL 4 HOUR)) THEN 1 END) as review_count,
            COUNT(CASE WHEN queue >= 0 THEN 1 END) as total_count
          FROM leitner_cards
          WHERE user_id = ${input.uid}
        `),

        // 3. Category Stats (Clamp 30 days for performance via helper)
        getCategoryStatsData(input.uid),

        // 4. Ranking (Using meritPoints as ordering fallback)
        db.select({
          uid: users.uid,
          meritPoints: users.meritPoints,
          honorPoints: users.honorPoints,
        }).from(users).where(and(
          eq(users.membership, 'PRO'),
          eq(users.status, 'ACTIVE'),
          input.school ? eq(users.school, input.school) : undefined
        )).orderBy(desc(users.meritPoints)).limit(500),

        // 5. Latest Broadcast
        db.select().from(globalNotifications)
          .where(and(
            eq(globalNotifications.isActive, true),
            globalNotifications.expiresAt ? gte(globalNotifications.expiresAt, new Date()) : undefined
          )).orderBy(desc(globalNotifications.createdAt)).limit(1)
      ]);

      // Parse Metrics
      const stats = userStats[0] || { totalAttempts: 0, averageScore: 0, bestScore: 0, lastExamDate: null, passedCount: 0, meritPoints: 0, honorPoints: 0 };
      
      // Parse Leitner
      const lRow = ((leitnerStatsRaw as unknown as any[][])[0] as any[])[0];
      const leitner = {
        newCount: Number(lRow?.new_count || 0),
        learningCount: Number(lRow?.learning_count || 0),
        reviewCount: Number(lRow?.review_count || 0),
        totalCount: Number(lRow?.total_count || 0),
        count: Number(lRow?.new_count || 0) + Number(lRow?.learning_count || 0) + Number(lRow?.review_count || 0),
      };

      // Helper resolved the Category logic completely

      // Resolve Rank Position
      const rankPos = rankResults.findIndex(r => r.uid === input.uid) + 1 || null;

      return {
        stats,
        leitner,
        categoryStats,
        rankPos,
        lastBroadcast: broadcastResult[0] || null
      };
    }),
});
