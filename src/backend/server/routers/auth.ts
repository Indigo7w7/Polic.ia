import { router, publicProcedure, protectedProcedure } from '../trpc';
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
      // Use verified userId from context
      const uid = ctx.userId;

      const [existingUser] = await db.select().from(users).where(eq(users.uid, uid));
      
      let finalName = input.name;
      if (!finalName || finalName === 'Postulante') {
        finalName = input.email.split('@')[0];
      }

      if (!existingUser) {
        await db.insert(users).values({
          uid: uid,
          email: input.email,
          name: finalName,
          photoURL: input.photoURL,
          role: input.email === 'brizq02@gmail.com' ? 'admin' : 'user',
          lastActive: new Date(),
        });
      } else {
        await db.update(users)
          .set({ 
            lastActive: new Date(),
            email: input.email,
            // Force admin for the owner email
            ...(input.email === 'brizq02@gmail.com' && { role: 'admin' })
          })
          .where(eq(users.uid, uid));
      }

      return { success: true, user: existingUser || { ...input, name: finalName || input.email.split('@')[0], uid } };
    }),

  logout: protectedProcedure.mutation(() => {
    return { success: true };
  }),
});
