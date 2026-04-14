import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '../../../database/db/index';
import { interviewSessions, interviewMessages } from '../../../database/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { unlockAchievement } from '../utils/gamification';

const MAX_QUESTIONS = 10;

export const interviewRouter = router({

  // ── 1. FIND OR CREATE SESSION ──────────────────────────────────────
  findOrCreate: protectedProcedure
    .input(z.object({ userId: z.string(), userName: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Return existing non-done session
      const [existing] = await db
        .select()
        .from(interviewSessions)
        .where(
          and(
            sql`(${interviewSessions.userAId} = ${input.userId} OR ${interviewSessions.userBId} = ${input.userId})`,
            sql`${interviewSessions.status} != 'done'`,
            sql`${interviewSessions.isPractice} = false`
          )
        )
        .limit(1);
      if (existing) {
        return { session: existing, role: existing.userAId === input.userId ? 'A' : 'B' };
      }

      // Find a waiting session from someone else
      const [available] = await db
        .select()
        .from(interviewSessions)
        .where(
          and(
            eq(interviewSessions.status, 'waiting'),
            sql`${interviewSessions.userBId} IS NULL`,
            sql`${interviewSessions.userAId} != ${input.userId}`,
            sql`${interviewSessions.isPractice} = false`
          )
        )
        .orderBy(sql`${interviewSessions.createdAt} ASC`)
        .limit(1);

      if (available) {
        // Randomly assign who interviews first
        const coinFlip = Math.random() > 0.5;
        const interviewerId = coinFlip ? available.userAId : input.userId;

        await db.update(interviewSessions)
          .set({
            userBId: input.userId,
            userBName: input.userName,
            status: 'active',
            currentTurnStatus: 'questioning',
            currentInterviewerId: interviewerId,
          })
          .where(eq(interviewSessions.id, available.id));

        const [updated] = await db.select().from(interviewSessions).where(eq(interviewSessions.id, available.id));
        
        // Notify both players via Socket.IO
        if (ctx.io) {
          ctx.io.to(`session_${available.id}`).emit('session_update', { type: 'match_found', session: updated });
        }
        
        return { session: updated, role: 'B' };
      }

      // Create a fresh waiting slot
      const insertResult = await db.insert(interviewSessions).values({
        userAId: input.userId,
        userAName: input.userName,
        status: 'waiting',
        currentTurnStatus: 'questioning',
        isPractice: false,
      });
      const insertId = (insertResult as any)[0]?.insertId;
      const [newSession] = await db.select().from(interviewSessions).where(eq(interviewSessions.id, insertId));
      return { session: newSession, role: 'A' };
    }),

  // ── 2. POLL SESSION STATE ──────────────────────────────────────────
  getSession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const [session] = await db.select().from(interviewSessions).where(eq(interviewSessions.id, input.sessionId));
      return session || null;
    }),

  // ── 3. POLL MESSAGES ──────────────────────────────────────────────
  getMessages: protectedProcedure
    .input(z.object({ sessionId: z.number(), since: z.number().optional() }))
    .query(async ({ input }) => {
      const msgs = await db.select()
        .from(interviewMessages)
        .where(
          input.since && input.since > 0
            ? and(eq(interviewMessages.sessionId, input.sessionId), sql`${interviewMessages.id} > ${input.since}`)
            : eq(interviewMessages.sessionId, input.sessionId)
        )
        .orderBy(sql`${interviewMessages.id} ASC`)
        .limit(200);
      return msgs as any[];
    }),

  // ── 4. SEND MESSAGE (Automatic Turn Progression) ──────────────────
  sendMessage: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      userId: z.string(),
      userName: z.string(),
      message: z.string().min(1).max(2000),
    }))
    .mutation(async ({ input, ctx }) => {
      const [session] = await db.select().from(interviewSessions).where(eq(interviewSessions.id, input.sessionId));
      if (!session) throw new Error('Sesión no encontrada');
      if (session.status === 'rating' || session.status === 'done') throw new Error('La sesión ya terminó');

      const isInterviewer = session.currentInterviewerId === input.userId;
      const isInterviewee = !isInterviewer && (session.userAId === input.userId || session.userBId === input.userId);

      // Validate turn
      if (session.currentTurnStatus === 'questioning' && !isInterviewer)
        throw new Error('No es tu turno de preguntar todavía.');
      if (session.currentTurnStatus === 'responding' && !isInterviewee)
        throw new Error('No es tu turno de responder todavía.');

      // Insert message
      await db.insert(interviewMessages).values({
        sessionId: input.sessionId,
        senderId: input.userId,
        senderName: input.userName,
        message: input.message,
        isQuestion: session.currentTurnStatus === 'questioning',
      });

      // Update counters (simple count of total messages in current phase)
      const isUserA = session.userAId === input.userId;
      const newACount = isUserA ? session.aQuestionCount + 1 : session.aQuestionCount;
      const newBCount = !isUserA ? session.bQuestionCount + 1 : session.bQuestionCount;
      const totalMessagesInPhase = newACount + newBCount;

      let nextTurnStatus: 'questioning' | 'awaiting_solicit' | 'responding' | 'awaiting_finish' = session.currentTurnStatus;
      let nextPhase = session.phase;
      let nextStatus: 'waiting' | 'active' | 'phase2' | 'rating' | 'done' = session.status;
      let nextInterviewerId = session.currentInterviewerId;
      let resetA = newACount;
      let resetB = newBCount;

      // Automatically alternate turn after each message
      nextTurnStatus = session.currentTurnStatus === 'questioning' ? 'responding' : 'questioning';

      // Phase ends after 20 messages (10 Q + 10 A)
      if (totalMessagesInPhase >= 20) {
        if (session.phase === 1) {
          // Switch to Phase 2: Role Swap
          nextPhase = 2;
          nextInterviewerId = session.userAId === session.currentInterviewerId ? session.userBId : session.userAId;
          nextTurnStatus = 'questioning';
          resetA = 0;
          resetB = 0;
          // System message notification
          await db.insert(interviewMessages).values({
            sessionId: input.sessionId,
            senderId: 'SYSTEM',
            senderName: 'SISTEMA',
            message: 'FASE 1 COMPLETADA. Intercambio de roles — ¡Ahora te toca evaluar a tu compañero!',
            isQuestion: false,
          });
        } else {
          // End session: Transition to rating
          nextStatus = 'rating';
        }
      }

      await db.update(interviewSessions)
        .set({ 
          currentTurnStatus: nextTurnStatus,
          aQuestionCount: resetA,
          bQuestionCount: resetB,
          phase: nextPhase,
          status: nextStatus as any,
          currentInterviewerId: nextInterviewerId,
          updatedAt: new Date(),
        })
        .where(eq(interviewSessions.id, input.sessionId));

      const [finalSession] = await db.select().from(interviewSessions).where(eq(interviewSessions.id, input.sessionId));
      
      // Notify session room via Socket.IO
      if (ctx.io) {
        ctx.io.to(`session_${input.sessionId}`).emit('session_update', { type: 'new_message', session: finalSession });
      }

      return { success: true };
    }),


  // ── 7. SUBMIT FINAL SCORE ──────────────────────────────────────────
  submitScore: protectedProcedure
    .input(z.object({ sessionId: z.number(), userId: z.string(), score: z.number().min(0).max(20) }))
    .mutation(async ({ input, ctx }) => {
      const [session] = await db.select().from(interviewSessions).where(eq(interviewSessions.id, input.sessionId));
      if (!session) throw new Error('Sesión no encontrada');

      if (session.userAId === input.userId) {
        await db.update(interviewSessions).set({ scoreAtoB: input.score }).where(eq(interviewSessions.id, input.sessionId));
      } else {
        await db.update(interviewSessions).set({ scoreBtoA: input.score }).where(eq(interviewSessions.id, input.sessionId));
      }

      const [updated] = await db.select().from(interviewSessions).where(eq(interviewSessions.id, input.sessionId));
      
      // Auto-finish if both scores are present
      if (updated.scoreAtoB !== null && updated.scoreBtoA !== null) {
        await db.update(interviewSessions).set({ status: 'done' }).where(eq(interviewSessions.id, input.sessionId));
      }

      const [finalSession] = await db.select().from(interviewSessions).where(eq(interviewSessions.id, input.sessionId));
      
      // Achievement Check
      const achievementsUnlocked: any[] = [];
      if (finalSession.status === 'done') {
        const scoreForA = finalSession.scoreBtoA || 0;
        const scoreForB = finalSession.scoreAtoB || 0;
        
        if (scoreForA >= 18) {
          const ach = await unlockAchievement(finalSession.userAId!, 'INTERVIEW_ACE');
          if (ach) achievementsUnlocked.push(ach);
        }
        if (scoreForB >= 18) {
          const ach = await unlockAchievement(finalSession.userBId!, 'INTERVIEW_ACE');
          if (ach) achievementsUnlocked.push(ach);
        }
      }

      if (ctx.io) {
        ctx.io.to(`session_${input.sessionId}`).emit('session_update', { 
          type: 'score_submitted', 
          session: finalSession,
          achievementsUnlocked 
        });
      }
      return { ok: true, achievementsUnlocked };
    }),

  // ── 8. START PRACTICE SESSION ──────────────────────────────────────
  startPractice: protectedProcedure
    .input(z.object({ userId: z.string(), userName: z.string() }))
    .mutation(async ({ input }) => {
      const insertResult = await db.insert(interviewSessions).values({
        userAId: input.userId,
        userAName: input.userName,
        userBId: 'PRACTICE_BOT',
        userBName: 'Evaluador POLIC.ia',
        status: 'active',
        isPractice: true,
        phase: 1,
        currentTurnStatus: 'questioning',
        currentInterviewerId: input.userId, // user starts as interviewer
      });
      const insertId = (insertResult as any)[0]?.insertId;
      const [session] = await db.select().from(interviewSessions).where(eq(interviewSessions.id, insertId));

      // Welcome message
      await db.insert(interviewMessages).values({
        sessionId: insertId,
        senderId: 'PRACTICE_BOT',
        senderName: 'Evaluador POLIC.ia',
        message: '¡Bienvenido a la práctica! Eres el Entrevistador. Formula tu primera pregunta académica y envíala. Los turnos se alternan automáticamente. Esta sesión no afecta tu puntaje real.',
        isQuestion: false,
      });

      return { session, role: 'A' };
    }),

  // ── 9. CANCEL / LEAVE SESSION ──────────────────────────────────────
  cancelSession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.update(interviewSessions)
        .set({ status: 'done' })
        .where(eq(interviewSessions.id, input.sessionId));
        
      if (ctx.io) {
        ctx.io.to(`session_${input.sessionId}`).emit('session_update', { type: 'session_cancelled' });
      }
      return { ok: true };
    }),
});
