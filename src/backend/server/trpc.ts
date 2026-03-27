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
      if (token && token.length > 50) { // Typical Firebase token is long
        const decodedToken = await adminAuth.verifyIdToken(token);
        userId = decodedToken.uid;
      } else if (process.env.NODE_ENV !== 'production' && token) {
        // Dev fallback: accept UID directly as token if not in production
        userId = token;
      }
      
      if (userId) {
        // Look up user role and email from DB
        const [user] = await db.select({ 
          role: users.role,
          email: users.email 
        }).from(users).where(eq(users.uid, userId));
        
        if (user) {
          // Hard lock for owner email to bridge any DB sync lag
          userRole = (user.email === 'brizq02@gmail.com') ? 'admin' : user.role;
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
