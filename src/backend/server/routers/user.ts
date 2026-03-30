import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db, users, examAttempts, globalNotifications } from '../../../database/db';
import { eq, sql, desc, and, gte } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const userRouter = router({
  getProfile: protectedProcedure
    .input(z.object({ uid: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify ownership
      if (ctx.userId !== input.uid && ctx.userRole !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized access to this profile' });
      }
      
      let [user] = await db.select().from(users).where(eq(users.uid, input.uid));

      const isPrincipalAdmin = ctx.userEmail === 'brizq02@gmail.com';

      if (!user) {
        console.log(`[SYNC] User ${input.uid} not found in MySQL. Provisioning new profile...`);
        await db.insert(users).values({
          uid: input.uid,
          email: ctx.userEmail || 'unknown@polic.ia',
          name: isPrincipalAdmin ? 'Admin Principal' : 'Postulante',
          role: isPrincipalAdmin ? 'admin' : 'user',
          membership: 'FREE',
        });
        [user] = await db.select().from(users).where(eq(users.uid, input.uid));
      }

      if (!user) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to provision user profile' });
      
      // Mandatory Elevation for Principal Admin (verified via Firebase Email)
      if (isPrincipalAdmin && user.role !== 'admin') {
        console.log('[SECURITY] Verified Principal Admin detected. Forcing role elevation.');
        await db.update(users).set({ role: 'admin', email: 'brizq02@gmail.com' }).where(eq(users.uid, user.uid));
        user.role = 'admin';
      }

      // Lazy downgrade
      if (user.membership === 'PRO' && user.premiumExpiration && user.premiumExpiration < new Date()) {
        await db.update(users).set({ membership: 'FREE', premiumExpiration: null }).where(eq(users.uid, user.uid));
        user.membership = 'FREE';
        user.premiumExpiration = null;
      }

      return { 
        ...user, 
        role: ctx.userRole, // ALWAYS use the context role (it's the source of truth)
        photoURL: user.photoURL 
      };
    }),

  selectSchool: protectedProcedure
    .input(z.object({ uid: z.string(), school: z.enum(['EO', 'EESTP']) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.userId !== input.uid) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized school selection' });
      }
      
      const [user] = await db.select().from(users).where(eq(users.uid, input.uid));
      
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      if (user.school) throw new TRPCError({ code: 'FORBIDDEN', message: 'School selection is irreversible' });

      await db.update(users)
        .set({ school: input.school })
        .where(eq(users.uid, input.uid));

      const [updatedUser] = await db.select().from(users).where(eq(users.uid, input.uid));

      return { success: true, school: input.school, user: updatedUser };
    }),

  getStats: protectedProcedure
    .input(z.object({ uid: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.userId !== input.uid && ctx.userRole !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized access to stats' });
      }
      
      const stats = await db.select({
        totalAttempts: sql<number>`count(${examAttempts.id})`,
        averageScore: sql<number>`avg(${examAttempts.score})`,
        bestScore: sql<number>`max(${examAttempts.score})`,
        lastExamDate: sql<string>`max(${examAttempts.startedAt})`,
        passedCount: sql<number>`sum(case when ${examAttempts.passed} = 1 then 1 else 0 end)`,
      })
      .from(examAttempts)
      .where(eq(examAttempts.userId, input.uid));

      return stats[0] || { totalAttempts: 0, averageScore: 0, bestScore: 0, lastExamDate: null, passedCount: 0 };
    }),

  getRanking: protectedProcedure
    .query(async () => {
      const topScores = await db.select({
        uid: users.uid,
        name: users.name,
        photoURL: users.photoURL,
        bestScore: sql<number>`max(${examAttempts.score})`,
      })
      .from(examAttempts)
      .innerJoin(users, eq(examAttempts.userId, users.uid))
      .groupBy(users.uid)
      .orderBy(sql`max(${examAttempts.score}) desc`)
      .limit(100);

      return topScores;
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

      const [user] = await db.select().from(users).where(eq(users.uid, input.uid));
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      
      if (user.profileEdited && ctx.userRole !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'El perfil ya ha sido editado previamente (Límite: 1 vez)' });
      }
      
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
        .set({ lastSeen: new Date() })
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
});
