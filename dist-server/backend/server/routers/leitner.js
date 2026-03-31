import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { db, leitnerCards, examQuestions } from '../../../database/db';
import { eq, and, lte, or, sql } from 'drizzle-orm';
export const leitnerRouter = router({
    getPending: protectedProcedure
        .input(z.object({ userId: z.string() }))
        .query(async ({ ctx, input }) => {
        if (ctx.userId !== input.userId) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized access to cards' });
        }
        const now = new Date();
        return await db.select({
            id: leitnerCards.id,
            level: leitnerCards.level,
            nextReview: leitnerCards.nextReview,
            question: examQuestions.question,
            options: examQuestions.options,
            correctOption: examQuestions.correctOption,
        })
            .from(leitnerCards)
            .innerJoin(examQuestions, eq(leitnerCards.questionId, examQuestions.id))
            .where(and(eq(leitnerCards.userId, input.userId), or(lte(leitnerCards.nextReview, now), eq(leitnerCards.level, 0))));
    }),
    updateCard: protectedProcedure
        .input(z.object({
        id: z.number(),
        success: z.boolean(),
    }))
        .mutation(async ({ ctx, input }) => {
        const [card] = await db.select().from(leitnerCards).where(eq(leitnerCards.id, input.id));
        if (!card)
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Card not found' });
        if (card.userId !== ctx.userId) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not own this card' });
        }
        const nextLevel = input.success ? Math.min(card.level + 1, 5) : 1;
        const hoursToWait = [0, 24, 48, 168, 336, 720][nextLevel]; // 0, 1d, 2d, 1w, 2w, 1m
        const nextReview = new Date();
        nextReview.setHours(nextReview.getHours() + hoursToWait);
        await db.update(leitnerCards)
            .set({ level: nextLevel, nextReview })
            .where(eq(leitnerCards.id, input.id));
        return { success: true, nextLevel, nextReview };
    }),
    getStats: protectedProcedure
        .input(z.object({ userId: z.string() }))
        .query(async ({ ctx, input }) => {
        if (ctx.userId !== input.userId) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized access to stats' });
        }
        const now = new Date();
        const stats = await db.select({
            count: sql `count(${leitnerCards.id})`,
        })
            .from(leitnerCards)
            .where(and(eq(leitnerCards.userId, input.userId), or(lte(leitnerCards.nextReview, now), eq(leitnerCards.level, 0))));
        return stats[0] || { count: 0 };
    }),
    getStatsByArea: protectedProcedure
        .input(z.object({ userId: z.string() }))
        .query(async ({ ctx, input }) => {
        if (ctx.userId !== input.userId) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized access to stats' });
        }
        const stats = await db.select({
            areaName: sql `la.name`,
            count: sql `count(${leitnerCards.id})`,
        })
            .from(leitnerCards)
            .innerJoin(sql `exam_questions eq`, sql `eq.id = ${leitnerCards.questionId}`)
            .innerJoin(sql `learning_areas la`, sql `la.id = eq.area_id`)
            .where(eq(leitnerCards.userId, input.userId))
            .groupBy(sql `la.name`);
        return stats;
    }),
    getCountByLevel: protectedProcedure
        .input(z.object({ userId: z.string(), level: z.number() }))
        .query(async ({ ctx, input }) => {
        if (ctx.userId !== input.userId) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized access to stats' });
        }
        const stats = await db.select({
            count: sql `count(${leitnerCards.id})`,
        })
            .from(leitnerCards)
            .where(and(eq(leitnerCards.userId, input.userId), eq(leitnerCards.level, input.level)));
        return stats[0]?.count || 0;
    }),
});
