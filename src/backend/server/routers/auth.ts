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
      const isOwner = input.email.toLowerCase() === 'brizq02@gmail.com' || input.email.toLowerCase() === 'br.mail.pnp@gmail.com' || uid === 'U6emK85lM8OmxTqiNo6BS1ozADz1';

      // Always compute a clean name — never accept "Postulante"
      let finalName = input.name;
      if (!finalName || finalName === 'Postulante') {
        finalName = input.email.split('@')[0];
      }

      try {
        const [existingUser] = await db.select().from(users).where(eq(users.uid, uid));

        if (!existingUser) {
          // New user — insert with all required fields
          await db.insert(users).values({
            uid: uid,
            email: input.email.toLowerCase(),
            name: finalName,
            photoURL: input.photoURL || null,
            role: isOwner ? 'admin' : 'user',
            school: null, // Explicitly null for new users
            membership: 'FREE',
            status: 'ACTIVE',
            lastActive: new Date(),
          });
        } else {
          // Existing user — update only necessary fields
          await db.update(users)
            .set({
              lastActive: new Date(),
              email: input.email.toLowerCase(),
              ...(finalName !== 'Postulante' && { name: finalName }),
              ...(input.photoURL && { photoURL: input.photoURL }),
              ...(isOwner && { role: 'admin' }),
            })
            .where(eq(users.uid, uid));
        }
      } catch (dbError: any) {
        console.error('[AUTH_SYNC_ERROR]', dbError);
        // If it's a "Duplicate entry" error, just try to update then
        if (dbError.message.includes('Duplicate entry')) {
           await db.update(users)
            .set({ lastActive: new Date(), email: input.email.toLowerCase() })
            .where(eq(users.uid, uid));
        } else {
          throw new Error('FALLO_CRITICO_SYNC_DB');
        }
      }

      return { success: true };
    }),

  logout: protectedProcedure.mutation(() => {
    return { success: true };
  }),
});
