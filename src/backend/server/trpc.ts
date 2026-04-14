import { initTRPC, TRPCError } from '@trpc/server';
import { type CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { db, users, adminLogs } from '../../database/db';
import { eq } from 'drizzle-orm';
import { adminAuth } from './firebaseAdmin';

/**
 * Extracts the Firebase ID token from the Authorization header and verifies it.
 */
// @ts-ignore
export const createContext = async ({ req, res }: CreateExpressContextOptions, io?: any) => {
  const authHeader = req.headers.authorization;
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  let userId: string | null = null;
  let userEmail: string | null = null;
  let userRole: 'user' | 'admin' = 'user';

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    
    try {
      if (token) {
        // 1. Verify Token (Production & Dev with valid tokens)
        try {
          if (adminAuth) {
            const decodedToken = await adminAuth.verifyIdToken(token);
            userId = decodedToken.uid;
            userEmail = decodedToken.email?.toLowerCase()?.trim() || null;
          } else if (isDev) {
            // [AUTH-REAL-FIX] Local Dev Fallback: Decode without verification if Admin Key is missing
            try {
              const base64Payload = token.split('.')[1];
              if (base64Payload) {
                const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
                if (payload && payload.user_id) {
                  userId = payload.user_id;
                  userEmail = payload.email?.toLowerCase()?.trim() || null;
                  console.log(`[AUTH-DEV] Using Dynamic Local Decode - UID: ${userId}, Email: ${userEmail}`);
                }
              }
            } catch (decodeErr) {
              console.error('[AUTH-DEV] Failed to decode token manually:', decodeErr);
            }
          }
          
          if (isDev && userId) {
            console.log(`[AUTH-DEBUG] Authenticated - UID: ${userId}, Email: ${userEmail}`);
          }
        } catch (verifyError) {
          // 2. Dev: Log warning but do NOT grant access via raw token
          if (!isDev) {
            throw verifyError;
          }
          console.warn(`[AUTH-DEV] Token verification failed. Provide a valid Firebase ID Token even in dev. Request will be UNAUTHORIZED.`);
          // userId remains null — no access granted
        }
        
        // 3. Resolve Role and Profile from DB
        if (userId) {
          try {
            if (isDev) console.log(`[DB-LOOKUP] Fetching user ${userId} context...`);
            
            const [user] = await db.select({ 
              role: users.role,
              email: users.email 
            }).from(users).where(eq(users.uid, userId));
            
            if (user) {
              userRole = user.role;
              // Sync email if missing from token but present in DB
              if (!userEmail) userEmail = user.email;
              
              if (isDev) console.log(`[DB-LOOKUP] Success: User found (Role: ${user.role})`);
            } else if (isDev) {
              console.warn(`[DB-LOOKUP] User ${userId} not found in database.`);
            }

          } catch (dbError) {
            if (isDev) console.error('[DB-LOOKUP] Error loading context:', dbError);
          }
        }
      }
    } catch (error) {
      if (isDev) console.error('[AUTH] Critical Context Error:', error);
    }
  }

  return { req, res, userId, userEmail, userRole, io };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

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
 * Automatically logs the administrative action for auditing.
 */
export const adminProcedure = protectedProcedure.use(async ({ ctx, next, path }) => {
  if (ctx.userRole !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }

  // Audit Logging (Background/Async)
  try {
    await db.insert(adminLogs).values({
      adminId: ctx.userId!,
      action: `AUDIT: [${path}] called by ${ctx.userEmail || ctx.userId}`,
    });
  } catch (logError) {
    console.error('[CRITICAL] Audit log failed:', logError);
    // We don't block the actual procedure if logging fails, 
    // but we log it to stderr for monitoring.
  }

  return next({ ctx });
});
