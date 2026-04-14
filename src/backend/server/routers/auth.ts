import { router, protectedProcedure, publicProcedure } from '../trpc';
import { z } from 'zod';
import { db, users } from '../../../database/db';
import { eq, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { USER_FIELDS } from '../utils/constants';
export const authRouter = router({
  getPublicStats: publicProcedure.query(async () => {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(users);
    return { 
      totalUsers: result?.count || 0 
    };
  }),

  login: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string(),
      photoURL: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const uid = ctx.userId;
      let finalName = input.name;
      if (!finalName || finalName === 'Postulante') {
        finalName = input.email.split('@')[0];
      }

      const [existingUser] = await db.select(USER_FIELDS).from(users).where(eq(users.uid, uid));

      if (!existingUser) {
        await db.insert(users).values({
          uid: uid,
          email: input.email.toLowerCase(),
          name: finalName,
          photoURL: input.photoURL || null,
          role: 'user',
          membership: 'FREE',
          status: 'ACTIVE',
        });
      } else {
        await db.update(users)
          .set({
            lastActive: new Date(),
            email: input.email.toLowerCase(),
            ...(finalName !== 'Postulante' && { name: finalName }),
            ...(input.photoURL && { photoURL: input.photoURL }),
          })
          .where(eq(users.uid, uid));
      }
      return { success: true };
    }),

  adminLogin: protectedProcedure
    .input(z.object({ secretToken: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const ADMIN_SECRET = process.env.ADMIN_SECRET_TOKEN;
      if (!ADMIN_SECRET || input.secretToken !== ADMIN_SECRET) {
        throw new TRPCError({ 
          code: 'UNAUTHORIZED', 
          message: 'Código de mando inválido. Intento registrado.' 
        });
      }

      await db.update(users)
        .set({ role: 'admin' })
        .where(eq(users.uid, ctx.userId));

      return { success: true };
    }),

  logout: protectedProcedure.mutation(() => {
    return { success: true };
  }),
});
