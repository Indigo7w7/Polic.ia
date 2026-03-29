import { router, protectedProcedure, adminProcedure } from '../trpc';
import { z } from 'zod';
import { db, users, adminLogs, yapeAudits, examQuestions, learningAreas, learningContent } from '../../../database/db';
import { eq, sql, and, like, or } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const membershipRouter = router({
  submitVoucher: protectedProcedure
    .input(z.object({
      userId: z.string(),
      voucherUrl: z.string(),
      amount: z.number().default(15),
      school: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.userId !== input.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized voucher submission' });
      }
      
      await db.insert(yapeAudits).values({
        userId: input.userId,
        voucherUrl: input.voucherUrl,
        amount: input.amount,
        school: input.school,
        status: 'PENDIENTE',
      });
      return { success: true };
    }),
});

export const adminRouter = router({
  getVouchers: adminProcedure.query(async () => {
    return await db.select().from(yapeAudits).orderBy(sql`${yapeAudits.createdAt} desc`);
  }),
  
  updateVoucherStatus: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['APROBADO', 'RECHAZADO']),
      reason: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      await db.update(yapeAudits)
        .set({ status: input.status })
        .where(eq(yapeAudits.id, input.id));

      if (input.status === 'APROBADO') {
        const [voucher] = await db.select().from(yapeAudits).where(eq(yapeAudits.id, input.id));
        if (voucher) {
          const expiration = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          await db.update(users)
            .set({ membership: 'PRO', premiumExpiration: expiration, ...(voucher.school ? { school: voucher.school as any } : {}) })
            .where(eq(users.uid, voucher.userId));
        }
      }
      return { success: true };
    }),

  // ─── STATS ───
  getAdminStats: adminProcedure.query(async () => {
    const [userCounts] = await db.select({
      total: sql<number>`count(${users.uid})`,
      premium: sql<number>`sum(case when ${users.membership} = 'PRO' then 1 else 0 end)`,
      free: sql<number>`sum(case when ${users.membership} = 'FREE' then 1 else 0 end)`,
    }).from(users);

    const [activeCount] = await db.select({
      count: sql<number>`count(${users.uid})`,
    })
    .from(users)
    .where(sql`${users.lastSeen} >= ${new Date(Date.now() - 5 * 60 * 1000)}`);

    return {
      totalUsers: Number(userCounts.total) || 0,
      premiumUsers: Number(userCounts.premium) || 0,
      freeUsers: Number(userCounts.free) || 0,
      activeUsers: Number(activeCount.count) || 0,
      dailyRevenue: 0,
      totalQuestions: 0,
      totalContent: 0,
    };
  }),

  // ─── USER MANAGEMENT ───
  getUsers: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      membership: z.enum(['FREE', 'PRO', 'ALL']).default('ALL'),
    }).optional())
    .query(async ({ input }) => {
      const filters = [];
      
      if (input?.search) {
        filters.push(or(
          like(users.name, `%${input.search}%`),
          like(users.uid, `%${input.search}%`),
          like(users.email, `%${input.search}%`),
        ));
      }
      if (input?.membership && input.membership !== 'ALL') {
        filters.push(eq(users.membership, input.membership));
      }

      const whereClause = filters.length > 0 ? and(...filters) : undefined;
      return await db.select().from(users).where(whereClause).orderBy(sql`${users.createdAt} desc`);
    }),

  updateUserMembership: adminProcedure
    .input(z.object({
      uid: z.string(),
      membership: z.enum(['FREE', 'PRO']),
    }))
    .mutation(async ({ input }) => {
      console.log(`[ADMIN] Updating membership for ${input.uid} to ${input.membership}`);
      const expiration = input.membership === 'PRO' 
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) 
        : null;

      await db.update(users)
        .set({ 
          membership: input.membership, 
          premiumExpiration: expiration 
        })
        .where(eq(users.uid, input.uid));

      await db.insert(adminLogs).values({
        action: `MANUAL_OVERRIDE: Set ${input.uid} to ${input.membership}`,
      });

      return { success: true };
    }),

  deleteUser: adminProcedure
    .input(z.object({ uid: z.string() }))
    .mutation(async ({ input }) => {
      console.log(`[ADMIN] DELETING USER: ${input.uid}`);
      // In a real app we might want to delete related data, but for now we delete from users
      await db.delete(users).where(eq(users.uid, input.uid));
      await db.insert(adminLogs).values({
        action: `DELETE_USER: Removed ${input.uid} from system`,
      });
      return { success: true };
    }),

  updateUserSchool: adminProcedure
    .input(z.object({
      uid: z.string(),
      school: z.enum(['EO', 'EESTP']),
    }))
    .mutation(async ({ input }) => {
      await db.update(users)
        .set({ school: input.school })
        .where(eq(users.uid, input.uid));

      await db.insert(adminLogs).values({
        action: `Changed school for ${input.uid} to ${input.school}`,
      });

      const [updatedUser] = await db.select().from(users).where(eq(users.uid, input.uid));

      return { success: true, user: updatedUser };
    }),

  getActiveCount: adminProcedure.query(async () => {
    const [result] = await db.select({
      count: sql<number>`count(${users.uid})`,
    })
    .from(users)
    .where(sql`${users.lastSeen} >= ${new Date(Date.now() - 5 * 60 * 1000)}`);
    
    return { count: result.count || 0 };
  }),

  toggleAdminRole: adminProcedure
    .input(z.object({ uid: z.string(), isAdmin: z.boolean() }))
    .mutation(async ({ input }) => {
      await db.update(users)
        .set({ role: input.isAdmin ? 'admin' : 'user' })
        .where(eq(users.uid, input.uid));
      
      await db.insert(adminLogs).values({
        action: `Set ${input.uid} role to ${input.isAdmin ? 'admin' : 'user'}`,
      });
      return { success: true };
    }),

  // ─── LEARNING CONTENT CRUD ───
  getAreas: adminProcedure.query(async () => {
    return await db.select().from(learningAreas);
  }),

  createArea: adminProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      icon: z.string().max(50).optional(),
    }))
    .mutation(async ({ input }) => {
      const [result] = await db.insert(learningAreas).values(input);
      await db.insert(adminLogs).values({ action: `Created area: ${input.name}` });
      return { success: true, id: result.insertId };
    }),

  getContent: adminProcedure
    .input(z.object({ areaId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      if (input?.areaId) {
        return await db.select().from(learningContent).where(eq(learningContent.areaId, input.areaId));
      }
      return await db.select().from(learningContent);
    }),

  createContent: adminProcedure
    .input(z.object({
      areaId: z.number(),
      title: z.string().min(1).max(255),
      body: z.string().min(1),
      level: z.number().min(1).max(10).default(1),
      schoolType: z.enum(['EO', 'EESTP', 'BOTH']).default('BOTH'),
    }))
    .mutation(async ({ input }) => {
      const [result] = await db.insert(learningContent).values(input);
      await db.insert(adminLogs).values({ action: `Created content: ${input.title}` });
      return { success: true, id: result.insertId };
    }),

  updateContent: adminProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(255).optional(),
      body: z.string().min(1).optional(),
      level: z.number().min(1).max(10).optional(),
      schoolType: z.enum(['EO', 'EESTP', 'BOTH']).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.update(learningContent).set(data).where(eq(learningContent.id, id));
      await db.insert(adminLogs).values({ action: `Updated content #${id}` });
      return { success: true };
    }),

  deleteContent: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(learningContent).where(eq(learningContent.id, input.id));
      await db.insert(adminLogs).values({ action: `Deleted content #${input.id}` });
      return { success: true };
    }),

  // ─── EXAM QUESTIONS CRUD ───
  getQuestions: adminProcedure
    .input(z.object({
      areaId: z.number().optional(),
      difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
      schoolType: z.enum(['EO', 'EESTP', 'BOTH']).optional(),
    }).optional())
    .query(async ({ input }) => {
      const filters = [];
      if (input?.areaId) filters.push(eq(examQuestions.areaId, input.areaId));
      if (input?.difficulty) filters.push(eq(examQuestions.difficulty, input.difficulty));
      if (input?.schoolType) filters.push(eq(examQuestions.schoolType, input.schoolType));

      const whereClause = filters.length > 0 ? and(...filters) : undefined;
      return await db.select().from(examQuestions).where(whereClause).limit(200);
    }),

  createQuestion: adminProcedure
    .input(z.object({
      areaId: z.number(),
      question: z.string().min(1),
      options: z.array(z.string()).min(2).max(6),
      correctOption: z.number().min(0),
      difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
      schoolType: z.enum(['EO', 'EESTP', 'BOTH']).default('BOTH'),
    }))
    .mutation(async ({ input }) => {
      if (input.correctOption >= input.options.length) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'correctOption index out of bounds' });
      }
      const [result] = await db.insert(examQuestions).values(input);
      await db.insert(adminLogs).values({ action: `Created question #${result.insertId}` });
      return { success: true, id: result.insertId };
    }),

  updateQuestion: adminProcedure
    .input(z.object({
      id: z.number(),
      question: z.string().min(1).optional(),
      options: z.array(z.string()).min(2).max(6).optional(),
      correctOption: z.number().min(0).optional(),
      difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
      schoolType: z.enum(['EO', 'EESTP', 'BOTH']).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.update(examQuestions).set(data).where(eq(examQuestions.id, id));
      await db.insert(adminLogs).values({ action: `Updated question #${id}` });
      return { success: true };
    }),

  deleteQuestion: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(examQuestions).where(eq(examQuestions.id, input.id));
      await db.insert(adminLogs).values({ action: `Deleted question #${input.id}` });
      return { success: true };
    }),

  bulkIngestQuestions: adminProcedure
    .input(z.array(z.object({
      areaId: z.number(),
      question: z.string(),
      options: z.array(z.string()),
      correctOption: z.number(),
      difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
      schoolType: z.enum(['EO', 'EESTP', 'BOTH']).default('BOTH'),
    })))
    .mutation(async ({ input }) => {
      if (input.length === 0) return { success: true, count: 0 };
      
      await db.insert(examQuestions).values(input);
      await db.insert(adminLogs).values({
        action: `Bulk ingested ${input.length} questions`,
      });

      return { success: true, count: input.length };
    }),

  // ─── ADMIN LOGS ───
  getLogs: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }).optional())
    .query(async ({ input }) => {
      return await db.select()
        .from(adminLogs)
        .orderBy(sql`${adminLogs.createdAt} desc`)
        .limit(input?.limit || 50);
    }),
});
