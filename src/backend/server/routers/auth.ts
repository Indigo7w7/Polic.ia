import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db, users } from '../../../database/db';
import { eq } from 'drizzle-orm';

export const authRouter = router({
  login: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string(),
      photoURL: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const uid = ctx.userId;
      const isOwner = input.email === 'brizq02@gmail.com';

      // Always compute a clean name — never accept "Postulante"
      let finalName = input.name;
      if (!finalName || finalName === 'Postulante') {
        finalName = input.email.split('@')[0];
      }

      const [existingUser] = await db.select().from(users).where(eq(users.uid, uid));

      if (!existingUser) {
        // New user — insert with all required fields to avoid NOT NULL violations
        await db.insert(users).values({
          uid,
          email: input.email,
          name: finalName,
          photoURL: input.photoURL,
          role: isOwner ? 'admin' : 'user',
          membership: 'FREE',
          status: 'ACTIVE',
          lastActive: new Date(),
        });
      } else {
        // Existing user — always update lastActive + force admin for owner
        await db.update(users)
          .set({
            lastActive: new Date(),
            email: input.email,
            ...(finalName !== 'Postulante' && { name: finalName }),
            ...(input.photoURL && { photoURL: input.photoURL }),
            ...(isOwner && { role: 'admin' }),
          })
          .where(eq(users.uid, uid));
      }

      return { success: true };
    }),

  logout: protectedProcedure.mutation(() => {
    return { success: true };
  }),
});
