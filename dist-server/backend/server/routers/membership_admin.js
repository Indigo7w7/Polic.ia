import { router, adminProcedure, publicProcedure } from '../trpc';
import { z } from 'zod';
import { db, users, adminLogs, examQuestions, learningAreas, learningContent, globalNotifications } from '../../../database/db';
import { eq, sql, and, like, or } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
export const adminRouter = router({
    // ─── BROADCAST (Alerta Roja) ───
    getActiveBroadcast: publicProcedure.query(async () => {
        const [active] = await db
            .select()
            .from(globalNotifications)
            .where(and(sql `${globalNotifications.isActive} = 1`, sql `(${globalNotifications.expiresAt} IS NULL OR ${globalNotifications.expiresAt} > NOW())`))
            .orderBy(sql `${globalNotifications.createdAt} desc`)
            .limit(1);
        return active || null;
    }),
    // ─── STATS ───
    getAdminStats: adminProcedure.query(async () => {
        const [userCounts] = await db.select({
            total: sql `count(${users.uid})`,
            premium: sql `sum(case when ${users.membership} = 'PRO' then 1 else 0 end)`,
            free: sql `sum(case when ${users.membership} = 'FREE' then 1 else 0 end)`,
            activeUsers: sql `sum(case when ${users.lastActive} >= NOW() - INTERVAL 5 MINUTE then 1 else 0 end)`,
        }).from(users);
        const [revenueObj] = await db.select({
            dailyIncome: sql `sum(case when DATE(${adminLogs.createdAt}) = CURDATE() AND ${adminLogs.action} LIKE '%MANUAL_OVERRIDE: Set % to PRO' then 145 else 0 end)`,
        }).from(adminLogs);
        const [questionsStats] = await db.select({
            total: sql `count(${examQuestions.id})`,
        }).from(examQuestions);
        return {
            totalUsers: Number(userCounts.total) || 0,
            proUsers: Number(userCounts.premium) || 0,
            freeUsers: Number(userCounts.free) || 0,
            onlineCount: Number(userCounts.activeUsers) || 0,
            dailyRevenue: Number(revenueObj.dailyIncome) || 0,
            totalQuestions: Number(questionsStats.total) || 0,
            totalContent: 0,
        };
    }),
    // ─── DASHBOARD STATS ───
    getDashboardStats: adminProcedure.query(async () => {
        const [counts] = await db.select({
            total: sql `count(${users.uid})`,
            pro: sql `sum(case when ${users.membership} = 'PRO' then 1 else 0 end)`,
            free: sql `sum(case when ${users.membership} = 'FREE' then 1 else 0 end)`,
            active: sql `sum(case when ${users.status} = 'ACTIVE' then 1 else 0 end)`,
            blocked: sql `sum(case when ${users.status} = 'BLOCKED' then 1 else 0 end)`,
            online: sql `sum(case when ${users.lastActive} >= NOW() - INTERVAL 5 MINUTE then 1 else 0 end)`,
        }).from(users);
        return {
            totalUsers: Number(counts.total) || 0,
            proUsers: Number(counts.pro) || 0,
            freeUsers: Number(counts.free) || 0,
            activeUsers: Number(counts.active) || 0,
            blockedUsers: Number(counts.blocked) || 0,
            onlineNow: Number(counts.online) || 0,
        };
    }),
    // ─── USER MANAGEMENT ───
    getUsers: adminProcedure
        .input(z.object({ search: z.string().optional() }))
        .query(async ({ input }) => {
        const filters = [];
        if (input?.search) {
            filters.push(or(like(users.name, `%${input.search}%`), like(users.uid, `%${input.search}%`), like(users.email, `%${input.search}%`)));
        }
        const whereClause = filters.length > 0 ? and(...filters) : undefined;
        return await db.select().from(users).where(whereClause).orderBy(sql `${users.createdAt} desc`);
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
    updateUserStatus: adminProcedure
        .input(z.object({
        targetUid: z.string(),
        membership: z.enum(['FREE', 'PRO']).optional(),
        status: z.enum(['ACTIVE', 'BLOCKED']).optional(),
    }))
        .mutation(async ({ input }) => {
        if (input.membership) {
            const expiration = input.membership === 'PRO'
                ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                : null;
            await db.update(users)
                .set({ membership: input.membership, premiumExpiration: expiration })
                .where(eq(users.uid, input.targetUid));
        }
        if (input.status) {
            await db.update(users)
                .set({ status: input.status })
                .where(eq(users.uid, input.targetUid));
        }
        return { success: true };
    }),
    sendBroadcast: adminProcedure
        .input(z.object({
        title: z.string(),
        message: z.string(),
        type: z.enum(['INFO', 'WARNING', 'EVENT']).default('WARNING'),
        durationHours: z.number().default(24)
    }))
        .mutation(async ({ input }) => {
        // Deactivate previous broadcasts
        await db.update(globalNotifications).set({ isActive: false });
        await db.insert(globalNotifications).values({
            title: input.title,
            message: input.message,
            type: input.type,
            isActive: true,
            expiresAt: new Date(Date.now() + input.durationHours * 60 * 60 * 1000)
        });
        return { success: true };
    }),
    deleteUser: adminProcedure
        .input(z.object({ uid: z.string() }))
        .mutation(async ({ input }) => {
        console.log(`[ADMIN] DELETING USER: ${input.uid}`);
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
            count: sql `count(${users.uid})`,
        })
            .from(users)
            .where(sql `${users.lastActive} >= NOW() - INTERVAL 5 MINUTE`);
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
        if (input?.areaId)
            filters.push(eq(examQuestions.areaId, input.areaId));
        if (input?.difficulty)
            filters.push(eq(examQuestions.difficulty, input.difficulty));
        if (input?.schoolType)
            filters.push(eq(examQuestions.schoolType, input.schoolType));
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
        if (input.length === 0)
            return { success: true, count: 0 };
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
            .orderBy(sql `${adminLogs.createdAt} desc`)
            .limit(input?.limit || 50);
    }),
});
