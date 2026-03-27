import { initTRPC, TRPCError } from '@trpc/server';
import { type CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { db, users } from '../../database/db';
import { eq } from 'drizzle-orm';

import { adminAuth } from './firebaseAdmin';

/**
 * Extracts the Firebase ID token from the Authorization header and verifies it.
 */
export const createContext = async ({ req, res }: CreateExpressContextOptions) => {
  const authHeader = req.headers.authorization;
  let userId: string | null = null;
  let userRole: 'user' | 'admin' = 'user';

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    
    try {
      // In production, verify with firebase-admin
      if (token && token.length > 50) {
        const decodedToken = await adminAuth.verifyIdToken(token);
        userId = decodedToken.uid;
        
        // Fail-safe: Hardcode owner as admin even if DB lookup fails or hasn't happened yet
        if (decodedToken.email === 'brizq02@gmail.com') {
          console.log(`[AUTH] Admin override active for ${decodedToken.email}`);
          userRole = 'admin';
        }
      } else if (process.env.NODE_ENV !== 'production' && token) {
        userId = token;
      }
      
      if (userId) {
        const [user] = await db.select({ 
          role: users.role,
          email: users.email 
        }).from(users).where(eq(users.uid, userId));
        
        if (user) {
          // Sync role from DB unless it's the owner (who is always admin)
          if (user.email === 'brizq02@gmail.com') {
            userRole = 'admin';
          } else {
            userRole = user.role;
          }
        }
      }
    } catch (error) {
      console.error('Auth context error:', error);
    }
  }

  return { req, res, userId, userRole };
};

type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // Add additional context in development
        cause: process.env.NODE_ENV === 'development' ? error.cause : undefined,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Protected procedure: requires a valid authenticated user.
 * Extracts userId from context (set by createContext from auth header).
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

/**
 * Admin procedure: requires authenticated user with 'admin' role.
 * Checks the role from the database via createContext.
 */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.userRole !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});
