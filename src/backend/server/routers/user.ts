import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db, users, examAttempts } from '../../../database/db';
import { eq, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const userRouter = router({
  getProfile: protectedProcedure
    .input(z.object({ uid: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify ownership
      if (ctx.userId !== input.uid && ctx.userRole !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized access to this profile' });
      }
      
      const [user] = await db.select().from(users).where(eq(users.uid, input.uid));
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      
      // Auto-promote owner to admin
      if (user.email === 'brizq02@gmail.com' && user.role !== 'admin') {
        await db.update(users).set({ role: 'admin' }).where(eq(users.uid, user.uid));
        user.role = 'admin';
      }

      // Lazy downgrade: if user is PRO but expiration date is in the past, downgrade to FREE
      if (user.membership === 'PRO' && user.premiumExpiration && user.premiumExpiration < new Date()) {
        await db.update(users)
          .set({ membership: 'FREE', premiumExpiration: null })
          .where(eq(users.uid, user.uid));
        
        user.membership = 'FREE';
        user.premiumExpiration = null;
      }

      return user;
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

      return { success: true, school: input.school };
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
      
      await db.update(users)
        .set({
          ...(input.name && { name: input.name }),
          ...(input.photoURL && { photoURL: input.photoURL }),
          ...(input.age !== undefined && { age: input.age }),
          ...(input.city && { city: input.city }),
        })
        .where(eq(users.uid, input.uid));

      return { success: true };
    }),
});
