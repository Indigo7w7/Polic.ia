import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { db, leitnerCards, examQuestions, reviewLogs, users, achievements, userAchievements } from '../../../database/db';
import { eq, and, lte, sql, lt, or, isNull, gte } from 'drizzle-orm';
import { unlockAchievement } from '../utils/gamification';
import {
  scheduleCard,
  previewIntervals,
  getTodayCutoff,
  formatInterval,
  type Rating,
  type CardState,
} from '../../../shared/utils/fsrs';

// Undo state es ahora persistido en DB (users.flashcardUndoState)

export const leitnerRouter = router({

  // ── Obtener tarjetas pendientes de la sesión (con Day Rollover) ──────────
  getPending: protectedProcedure
    .input(z.object({ 
      userId: z.string(), 
      limit: z.number().default(30),
      interleave: z.boolean().optional().default(false), // Mezcla estocástica de disciplinas
      deckTag: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.userId !== input.userId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const cutoff = getTodayCutoff(); // Day Rollover: corte a las 4 AM

      const cards = await db.select({
        id: leitnerCards.id,
        state: leitnerCards.state,
        queue: leitnerCards.queue,
        stability: leitnerCards.stability,
        difficulty: leitnerCards.difficulty,
        reps: leitnerCards.reps,
        lapses: leitnerCards.lapses,
        scheduledDays: leitnerCards.scheduledDays,
        elapsedDays: leitnerCards.elapsedDays,
        nextReview: leitnerCards.nextReview,
        lastReview: leitnerCards.lastReview,
        level: leitnerCards.level,
        questionId: leitnerCards.questionId,
        learningContentId: leitnerCards.learningContentId,
        questionIndex: leitnerCards.questionIndex,
        question: sql<string>`COALESCE(${examQuestions.question}, JSON_UNQUOTE(JSON_EXTRACT(${leitnerCards.learningContentId} IS NOT NULL ? (SELECT questions FROM learning_content WHERE id = ${leitnerCards.learningContentId}) : NULL, CONCAT('$[', ${leitnerCards.questionIndex}, '].title'))))`,
        options: sql<any>`COALESCE(${examQuestions.options}, JSON_EXTRACT((SELECT questions FROM learning_content WHERE id = ${leitnerCards.learningContentId}), CONCAT('$[', ${leitnerCards.questionIndex}, '].options')))`,
        correctOption: sql<number>`COALESCE(${examQuestions.correctOption}, CAST(JSON_EXTRACT((SELECT questions FROM learning_content WHERE id = ${leitnerCards.learningContentId}), CONCAT('$[', ${leitnerCards.questionIndex}, '].correctOption')) AS UNSIGNED))`,
      })
      .from(leitnerCards)
      .leftJoin(examQuestions, eq(leitnerCards.questionId, examQuestions.id))
      .where(and(
        eq(leitnerCards.userId, input.userId),
        // Excluir mazos dinámicos (-3), enterradas (-2), y suspendidas (-1)
        gte(leitnerCards.queue, 0),
        input.deckTag ? eq(leitnerCards.deckTag, input.deckTag) : undefined,
        or(
          // Tarjetas nuevas
          eq(leitnerCards.state, 'new'),
          // Tarjetas en aprendizaje/reaprendizaje (siempre disponibles)
          eq(leitnerCards.state, 'learning'),
          eq(leitnerCards.state, 'relearning'),
          // Tarjetas en repaso: solo si ya vencieron
          and(
            eq(leitnerCards.state, 'review'),
            or(
              isNull(leitnerCards.nextReview),
              lte(leitnerCards.nextReview, cutoff)
            )
          )
        )
      ))
      // Orden ANKI: relearning > learning > review > new 
      // Si interleave es true, dispersamos aleatoriamente dentro de cada grupo para forzar discriminación cerebral
      .orderBy(
        sql`FIELD(${leitnerCards.state}, 'relearning', 'learning', 'review', 'new')`,
        input.interleave ? sql`RAND()` : leitnerCards.nextReview
      )
      .limit(input.limit);

      // Añadir preview de intervalos a cada tarjeta
      return cards.map(card => {
        const fsrsCard = {
          stability: card.stability,
          difficulty: card.difficulty,
          elapsedDays: card.elapsedDays,
          scheduledDays: card.scheduledDays,
          reps: card.reps,
          lapses: card.lapses,
          state: card.state as CardState,
        };
        const previews = previewIntervals(fsrsCard);
        return {
          ...card,
          previewIntervals: {
            1: formatInterval(previews[1]),
            2: formatInterval(previews[2]),
            3: formatInterval(previews[3]),
            4: formatInterval(previews[4]),
          },
        };
      });
    }),

  // ── Calificar una tarjeta con FSRS (4 ratings) ───────────────────────────
  reviewCard: protectedProcedure
    .input(z.object({
      id: z.number(),
      ease: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
      timeTaken: z.number().optional(), // ms
    }))
    .mutation(async ({ ctx, input }) => {
      const [card] = await db.select().from(leitnerCards).where(eq(leitnerCards.id, input.id));
      if (!card) throw new TRPCError({ code: 'NOT_FOUND' });
      if (card.userId !== ctx.userId) throw new TRPCError({ code: 'FORBIDDEN' });

      // El estado previo se guardará en BD al final de la rutina

      // ── Calcular días transcurridos ─────────────────────────────────────
      const now = new Date();
      const lastReviewDate = card.lastReview || card.nextReview;
      const elapsedMs = lastReviewDate ? now.getTime() - new Date(lastReviewDate).getTime() : 0;
      const elapsedDays = Math.max(0, Math.round(elapsedMs / (1000 * 60 * 60 * 24)));

      // ── Ejecutar motor FSRS ─────────────────────────────────────────────
      const fsrsCard = {
        stability: card.stability,
        difficulty: card.difficulty,
        elapsedDays,
        scheduledDays: card.scheduledDays,
        reps: card.reps,
        lapses: card.lapses,
        state: card.state as CardState,
      };
      const result = scheduleCard(fsrsCard, input.ease as Rating);

      // ── Calcular próxima revisión ────────────────────────────────────────
      const nextReview = new Date();
      if (result.scheduledDays === 0) {
        nextReview.setMinutes(nextReview.getMinutes() + 10); // dentro de 10min
      } else {
        nextReview.setDate(nextReview.getDate() + result.scheduledDays);
        nextReview.setHours(4, 0, 0, 0); // a las 4 AM del día destino
      }

      const newQueue = result.nextState === 'new' ? 0
        : result.nextState === 'learning' ? 1
        : result.nextState === 'review' ? 2 : 3;

      const newLapses = input.ease === 1 ? card.lapses + 1 : card.lapses;

      // ── Persistir en BD ─────────────────────────────────────────────────
      await db.update(leitnerCards).set({
        stability: result.stability,
        difficulty: result.difficulty,
        state: result.nextState,
        reps: card.reps + 1,
        lapses: newLapses,
        scheduledDays: result.scheduledDays,
        elapsedDays,
        queue: newQueue,
        nextReview,
        lastReview: now,
        level: Math.min((card.level || 0) + (input.ease >= 3 ? 1 : 0), 5),
      }).where(eq(leitnerCards.id, input.id));

      // ── Registrar en review_logs (auditoría) ────────────────────────────
      const [log] = await db.insert(reviewLogs).values({
        cardId: card.id,
        userId: ctx.userId,
        ease: input.ease,
        scheduledDays: result.scheduledDays,
        elapsedDays,
        stabilityBefore: card.stability,
        stabilityAfter: result.stability,
        difficultyBefore: card.difficulty,
        difficultyAfter: result.difficulty,
        stateBefore: card.state as any,
        stateAfter: result.nextState,
        timeTaken: input.timeTaken,
      }).$returningId();

      // ── Persistir estado Undo en el perfil del usuario ──────────────────
      await db.update(users).set({
        flashcardUndoState: {
          cardId: card.id,
          previousState: {
            stability: card.stability, difficulty: card.difficulty,
            state: card.state as CardState, reps: card.reps, lapses: card.lapses,
            scheduledDays: card.scheduledDays, elapsedDays: card.elapsedDays,
            queue: card.queue, nextReview: card.nextReview,
            lastReview: card.lastReview, level: card.level,
          },
          reviewLogId: log?.id,
        }
      }).where(eq(users.uid, ctx.userId));

      // ── Reward points ────────────────────────────────────────────────────
      if (input.ease >= 3) {
        await db.update(users)
          .set({ honorPoints: sql`${users.honorPoints} + 5` })
          .where(eq(users.uid, ctx.userId));
      }

      // ── Achievement Checks ───────────────────────────────────────────────
      const achievementsUnlocked: any[] = [];
      const [stats] = await db.select({ totalReps: sql<number>`SUM(${leitnerCards.reps})` })
        .from(leitnerCards).where(eq(leitnerCards.userId, ctx.userId));
      
      const reps = Number(stats?.totalReps || 0);

      if (reps >= 50) {
        const ach = await unlockAchievement(ctx.userId, 'FLASH_50');
        if (ach) achievementsUnlocked.push(ach);
      }

      if (reps >= 500) {
        const ach = await unlockAchievement(ctx.userId, 'FLASH_500');
        if (ach) achievementsUnlocked.push(ach);
      }

      return {
        success: true,
        nextReview,
        scheduledDays: result.scheduledDays,
        nextState: result.nextState,
        retrievability: Math.round(result.retrievability * 100),
        achievementsUnlocked
      };
    }),

  // ── Deshacer última calificación (Undo/Ctrl+Z) ───────────────────────────
  undoLastReview: protectedProcedure
    .mutation(async ({ ctx }) => {
      const [user] = await db.select({ flashcardUndoState: users.flashcardUndoState }).from(users).where(eq(users.uid, ctx.userId));
      const entry: any = user?.flashcardUndoState;
      if (!entry || !entry.cardId) throw new TRPCError({ code: 'NOT_FOUND', message: 'No hay evaluación para deshacer.' });

      // Restaurar estado anterior de la tarjeta
      await db.update(leitnerCards).set({
        stability: entry.previousState.stability,
        difficulty: entry.previousState.difficulty,
        state: entry.previousState.state,
        reps: entry.previousState.reps,
        lapses: entry.previousState.lapses,
        scheduledDays: entry.previousState.scheduledDays,
        elapsedDays: entry.previousState.elapsedDays,
        queue: entry.previousState.queue,
        nextReview: entry.previousState.nextReview ? new Date(entry.previousState.nextReview) : null,
        lastReview: entry.previousState.lastReview ? new Date(entry.previousState.lastReview) : null,
        level: entry.previousState.level,
      }).where(eq(leitnerCards.id, entry.cardId));

      // Eliminar el log de auditoría
      if (entry.reviewLogId) {
        await db.delete(reviewLogs).where(eq(reviewLogs.id, entry.reviewLogId));
      }

      await db.update(users).set({ flashcardUndoState: null }).where(eq(users.uid, ctx.userId));
      return { success: true };
    }),

  // ── Estadísticas de Sesión ────────────────────────────────────────────────
  getStats: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.userId !== input.userId) throw new TRPCError({ code: 'FORBIDDEN' });
      const cutoff = getTodayCutoff();

      const execResult = await db.execute(sql`
        SELECT
          COUNT(CASE WHEN state = 'new' AND queue >= 0 THEN 1 END) as new_count,
          COUNT(CASE WHEN state IN ('learning','relearning') AND queue >= 0 THEN 1 END) as learning_count,
          COUNT(CASE WHEN state = 'review' AND queue >= 0 AND (next_review IS NULL OR next_review <= ${cutoff}) THEN 1 END) as review_count,
          COUNT(CASE WHEN queue >= 0 THEN 1 END) as total_count
        FROM leitner_cards
        WHERE user_id = ${input.userId}
      `);
      const row = ((execResult as unknown as any[][])[0] as any[])[0];
      return {
        newCount: Number(row?.new_count || 0),
        learningCount: Number(row?.learning_count || 0),
        reviewCount: Number(row?.review_count || 0),
        totalCount: Number(row?.total_count || 0),
        count: Number(row?.new_count || 0) + Number(row?.learning_count || 0) + Number(row?.review_count || 0),
      };
    }),

  // ── Telemetría: Retención Real + Carga Proyectada + Distribución ─────────
  getAnalytics: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.userId !== input.userId) throw new TRPCError({ code: 'FORBIDDEN' });

      const [analyticsResult, forecastResult, diffResult] = await Promise.all([
        db.execute(sql`
          SELECT
            DATE(reviewed_at) as day,
            ROUND(COUNT(CASE WHEN ease > 1 THEN 1 END) * 100.0 / COUNT(*), 1) as retention_pct,
            COUNT(*) as total_reviews
          FROM review_logs
          WHERE user_id = ${input.userId}
            AND reviewed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          GROUP BY DATE(reviewed_at)
          ORDER BY day ASC
        `),
        db.execute(sql`
          SELECT
            DATE(next_review) as due_date,
            COUNT(*) as cards_due
          FROM leitner_cards
          WHERE user_id = ${input.userId}
            AND queue >= 0
            AND next_review BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 DAY)
          GROUP BY DATE(next_review)
          ORDER BY due_date ASC
        `),
        db.execute(sql`
          SELECT
            CASE
              WHEN difficulty <= 3 THEN 'Fácil'
              WHEN difficulty <= 6 THEN 'Moderada'
              ELSE 'Difícil'
            END as difficulty_band,
            COUNT(*) as count
          FROM leitner_cards
          WHERE user_id = ${input.userId} AND queue >= 0
          GROUP BY difficulty_band
        `)
      ]);

      const retentionRows = (analyticsResult as unknown as any[][])[0] as any[];
      const forecastRows = (forecastResult as unknown as any[][])[0] as any[];
      const diffRows = (diffResult as unknown as any[][])[0] as any[];

      return {
        retention: retentionRows as { day: string; retention_pct: number; total_reviews: number }[],
        forecast: forecastRows as { due_date: string; cards_due: number }[],
        difficulty: diffRows as { difficulty_band: string; count: number }[],
      };
    }),

  // ── Métodos legacy (compatibilidad hacia atrás) ───────────────────────────
  updateCard: protectedProcedure
    .input(z.object({ id: z.number(), success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      // Mapear al nuevo reviewCard: success=true → ease 3, false → ease 1
      const ease: Rating = input.success ? 3 : 1;
      const [card] = await db.select().from(leitnerCards).where(eq(leitnerCards.id, input.id));
      if (!card) throw new TRPCError({ code: 'NOT_FOUND' });
      if (card.userId !== ctx.userId) throw new TRPCError({ code: 'FORBIDDEN' });

      const fsrsCard = {
        stability: card.stability, difficulty: card.difficulty,
        elapsedDays: card.elapsedDays, scheduledDays: card.scheduledDays,
        reps: card.reps, lapses: card.lapses, state: card.state as CardState,
      };
      const result = scheduleCard(fsrsCard, ease);
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + Math.max(result.scheduledDays, 1));

      await db.update(leitnerCards).set({
        stability: result.stability, difficulty: result.difficulty,
        state: result.nextState, reps: card.reps + 1,
        lapses: ease === 1 ? card.lapses + 1 : card.lapses,
        scheduledDays: result.scheduledDays, nextReview,
        queue: result.nextState === 'review' ? 2 : 1,
        level: Math.min((card.level || 0) + (input.success ? 1 : 0), 5),
      }).where(eq(leitnerCards.id, input.id));

      return { success: true, nextLevel: card.level, nextReview };
    }),

  getStatsByArea: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.userId !== input.userId) throw new TRPCError({ code: 'FORBIDDEN' });
      const stats = await db.select({
        areaName: sql<string>`la.name`,
        count: sql<number>`count(${leitnerCards.id})`,
      })
      .from(leitnerCards)
      .innerJoin(sql`exam_questions eq`, sql`eq.id = ${leitnerCards.questionId}`)
      .innerJoin(sql`learning_areas la`, sql`la.id = eq.area_id`)
      .where(eq(leitnerCards.userId, input.userId))
      .groupBy(sql`la.name`);
      return stats;
    }),
  // ── Ecosistema: Reentrenamiento sincroniza FSRS por questionId ────────────
  // El Reentrenamiento no conoce el card.id, solo el questionId
  reviewByQuestionId: protectedProcedure
    .input(z.object({
      questionId: z.number(),
      ease: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
      timeTaken: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Buscar o crear la tarjeta
      let [card] = await db.select().from(leitnerCards)
        .where(and(
          eq(leitnerCards.userId, ctx.userId),
          eq(leitnerCards.questionId, input.questionId)
        ));

      if (!card) {
        // La pregunta no tiene tarjeta FSRS aún — crearla como 'learning'
        const nextReview = new Date();
        nextReview.setMinutes(nextReview.getMinutes() + 5);
        await db.insert(leitnerCards).values({
          userId: ctx.userId,
          questionId: input.questionId,
          state: 'learning', queue: 1,
          stability: 0.1, difficulty: 5.0,
          reps: 0, lapses: 0,
          scheduledDays: 0, elapsedDays: 0,
          level: 1, nextReview,
        });
        [card] = await db.select().from(leitnerCards)
          .where(and(
            eq(leitnerCards.userId, ctx.userId),
            eq(leitnerCards.questionId, input.questionId)
          ));
      }

      if (!card) return { success: false };

      // Calcular FSRS y persistir
      const now = new Date();
      const lastReviewDate = card.lastReview || card.nextReview;
      const elapsedMs = lastReviewDate ? now.getTime() - new Date(lastReviewDate).getTime() : 0;
      const elapsedDays = Math.max(0, Math.round(elapsedMs / (1000 * 60 * 60 * 24)));

      const fsrsCard = {
        stability: card.stability, difficulty: card.difficulty,
        elapsedDays, scheduledDays: card.scheduledDays,
        reps: card.reps, lapses: card.lapses, state: card.state as CardState,
      };
      const result = scheduleCard(fsrsCard, input.ease as Rating);

      const nextReview = new Date();
      if (result.scheduledDays === 0) {
        nextReview.setMinutes(nextReview.getMinutes() + 10);
      } else {
        nextReview.setDate(nextReview.getDate() + result.scheduledDays);
      }

      await db.update(leitnerCards).set({
        stability: result.stability, difficulty: result.difficulty,
        state: result.nextState, reps: card.reps + 1,
        lapses: input.ease === 1 ? card.lapses + 1 : card.lapses,
        scheduledDays: result.scheduledDays, elapsedDays,
        queue: result.nextState === 'review' ? 2 : result.nextState === 'learning' ? 1 : 3,
        nextReview, lastReview: now,
      }).where(eq(leitnerCards.id, card.id));

      console.log(`[ECOSYSTEM] Reentrenamiento→FSRS: q#${input.questionId} ease=${input.ease} → ${result.nextState} (+${result.scheduledDays}d)`);
      return { success: true, scheduledDays: result.scheduledDays, nextState: result.nextState };
    }),

  getCountByLevel: protectedProcedure
    .input(z.object({ userId: z.string(), level: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.userId !== input.userId) throw new TRPCError({ code: 'FORBIDDEN' });
      const [res] = await db.select({ count: sql<number>`count(*)` })
        .from(leitnerCards)
        .where(and(eq(leitnerCards.userId, input.userId), eq(leitnerCards.level, input.level)));
      return res?.count || 0;
    }),

  // ── Ecosistema: Sembrar flashcards desde preguntas específicas (ej. desde Galería) ──
  seedFromQuestions: protectedProcedure
    .input(z.object({
      questionIds: z.array(z.number()).min(1).max(50),
    }))
    .mutation(async ({ ctx, input }) => {
      let created = 0;
      let skipped = 0;

      for (const questionId of input.questionIds) {
        const [existing] = await db.select({ id: leitnerCards.id })
          .from(leitnerCards)
          .where(and(
            eq(leitnerCards.userId, ctx.userId),
            eq(leitnerCards.questionId, questionId)
          ));

        if (existing) {
          skipped++;
          continue;
        }

        const nextReview = new Date();
        nextReview.setMinutes(nextReview.getMinutes() + 5); // disponibles casi inmediatamente

        await db.insert(leitnerCards).values({
          userId: ctx.userId,
          questionId,
          state: 'learning',
          queue: 1,
          stability: 0.1,
          difficulty: 5.5, // leve dificultad extra por ser contenido nuevo de galería
          reps: 0,
          lapses: 0,
          scheduledDays: 0,
          elapsedDays: 0,
          level: 0,
          nextReview,
        });
        created++;
      }

      console.log(`[ECOSYSTEM] Galería→FSRS: ${created} tarjetas creadas, ${skipped} ya existían para ${ctx.userId}`);
      return { created, skipped };
    }),

  // ── Motor de Búsqueda FULLTEXT ─────────────────────────────────────────
  searchCards: protectedProcedure
    .input(z.object({ userId: z.string(), query: z.string().min(2) }))
    .query(async ({ ctx, input }) => {
      if (ctx.userId !== input.userId) throw new TRPCError({ code: 'FORBIDDEN' });

      // Búsqueda en exam_questions y opcionalmente en tags
      const results = await db.select({
        id: leitnerCards.id,
        state: leitnerCards.state,
        question: examQuestions.question,
        deckTag: leitnerCards.deckTag,
      })
      .from(leitnerCards)
      .leftJoin(examQuestions, eq(leitnerCards.questionId, examQuestions.id))
      .where(and(
        eq(leitnerCards.userId, input.userId),
        or(
          sql`MATCH(${examQuestions.question}) AGAINST (${input.query} IN BOOLEAN MODE)`,
          eq(leitnerCards.deckTag, input.query)
        )
      ))
      .limit(50);
      
      return results;
    }),

  // ── Pila de Reversión (Undo / Ctrl+Z) ──
  clearUndo: protectedProcedure.mutation(async ({ ctx }) => {
    await db.update(users).set({ flashcardUndoState: null }).where(eq(users.uid, ctx.userId));
    return { success: true };
  }),
});
