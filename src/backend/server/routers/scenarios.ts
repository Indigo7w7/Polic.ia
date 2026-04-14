import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { db, policeScenarios, scenarioAttempts, users } from '../../../database/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getAIClient, AI_MODELS } from '../../utils/aiClient';
import { logger } from '../utils/logger';
import { USER_FIELDS } from '../utils/constants';
import { unlockAchievement } from '../utils/gamification';

export const scenariosRouter = router({
  // ── Listar Sesiones y Escenarios ──────────
  list: protectedProcedure.query(async ({ ctx }) => {
    // Buscar todos los escenarios disponibles
    const scenarios = await db.select().from(policeScenarios).orderBy(desc(policeScenarios.createdAt));
    
    // Buscar el estado del usuario en ellos
    const attempts = await db.select().from(scenarioAttempts)
      .where(eq(scenarioAttempts.userId, ctx.userId))
      .orderBy(desc(scenarioAttempts.createdAt));

    return { scenarios, attempts };
  }),

  // ── Empezar o Retomar un Escenario ──────────
  startOrResume: protectedProcedure
    .input(z.object({ scenarioId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // 1. Check if scenario exists
      const [scenario] = await db.select().from(policeScenarios).where(eq(policeScenarios.id, input.scenarioId));
      if (!scenario) throw new TRPCError({ code: 'NOT_FOUND', message: 'Escenario no existe.' });

      // 2. Check for active attempts
      const [existing] = await db.select().from(scenarioAttempts)
        .where(and(eq(scenarioAttempts.userId, ctx.userId), eq(scenarioAttempts.scenarioId, scenario.id), eq(scenarioAttempts.status, 'IN_PROGRESS')));
      
      if (existing) {
        return { attemptId: existing.id, initialEvent: scenario.initialEvent, existingHistory: existing.chatHistory };
      }

      // 3. Create new
      const [{ insertId }] = await db.insert(scenarioAttempts).values({
        userId: ctx.userId,
        scenarioId: scenario.id,
        status: 'IN_PROGRESS',
        chatHistory: [],
      });

      return { attemptId: insertId, initialEvent: scenario.initialEvent, existingHistory: [] };
    }),

  // ── Interactuar con el Escenario (Rol IA) ──────────
  interact: protectedProcedure
    .input(z.object({
      attemptId: z.number(),
      message: z.string(),
      history: z.array(z.object({
        role: z.enum(['user', 'model']),
        parts: z.array(z.object({ text: z.string() }))
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      const genAI = getAIClient();
      if (!genAI) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Entorno IA no configurado.' });

      // Obtener el intento
      const [attempt] = await db.select().from(scenarioAttempts).where(eq(scenarioAttempts.id, input.attemptId));
      if (!attempt) throw new TRPCError({ code: 'NOT_FOUND', message: 'Intento no encontrado.' });
      if (attempt.userId !== ctx.userId) throw new TRPCError({ code: 'FORBIDDEN' });
      if (attempt.status === 'COMPLETED') throw new TRPCError({ code: 'BAD_REQUEST', message: 'El caso ya está cerrado.' });

      // Obtener escenario
      const [scenario] = await db.select().from(policeScenarios).where(eq(policeScenarios.id, attempt.scenarioId!));
      
      const SYSTEM_PROMPT = `
Eres un Simulador de Entorno Policial inmersivo para la plataforma Polic.ia.
Vas a evaluar y jugar un rol dinámico (infractor, víctima o narrador) en el siguiente escenario: 
TITULO: ${scenario.title}
SITUACIÓN BASE: ${scenario.initialEvent}
INSTRUCCIONES DOCTRINALES DE EVALUACION: ${scenario.systemPromptEvaluator}

REGLAS DE ACTUACIÓN:
1. NUNCA rompas el personaje. Eres las personas del entorno. Reacciona a las órdenes del jugador.
2. Si el jugador hace algo ilegal, fatal, o si la situación se resuelve con éxito tras varios mensajes, DA POR TERMINADO EL ESCENARIO.
3. SI decides terminar el escenario, DEBES OBLIGATORIAMENTE añadir al final de tu ÚLTIMO MENSAJE una etiqueta de evaluación exacta con este formato (no cambies mayúsculas ni corchetes):
[EVALUACION]
PUNTUACION: (número de 0 a 100)
APROBADO: (SI o NO)
FEEDBACK: (Escribe tu retroalimentación oficial, citando leyes policiales).
[FIN]
      `;

      try {
        const model = genAI.getGenerativeModel({ model: AI_MODELS.FLASH });
        const chatSession = model.startChat({
          history: input.history, // Frontend provee historial FSRS/Gemini estándar formatiado
          generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
        });

        // Primer payload se inyecta con System Prompt
        let actualMessage = input.message;
        if (input.history.length === 0) {
           actualMessage = `[INSTRUCCIONES DE SISTEMA: ${SYSTEM_PROMPT}]\n\nAcción del Policía: ${input.message}`;
        } else {
           actualMessage = `Acción del Policía: ${input.message}`;
        }

        const result = await chatSession.sendMessage(actualMessage);
        const responseText = result.response.text();

        // Check format for END of simulation
        let scenarioEnded = false;
        let finalScore = 0;
        let isPassed = false;
        let finalFeedback = '';
        
        let cleanedResponse = responseText;

        if (responseText.includes('[EVALUACION]')) {
           scenarioEnded = true;
           const scoreMatch = responseText.match(/PUNTUACION:\s*(\d+)/i);
           const passedMatch = responseText.match(/APROBADO:\s*(SI|NO)/i);
           const feedbackMatch = responseText.match(/FEEDBACK:\s*(.*?)(\n\[FIN\]|$)/is);

           if (scoreMatch) finalScore = parseInt(scoreMatch[1], 10);
           if (passedMatch) isPassed = passedMatch[1].toUpperCase() === 'SI';
           if (feedbackMatch) finalFeedback = feedbackMatch[1].trim();

           // Remove the evaluation block from user's view if desired, or keep it. 
           // Better to keep it cleaned.
           cleanedResponse = responseText.split('[EVALUACION]')[0].trim();
        }

        // Add history memory (Gemini style array)
        const updatedHistory = [
            ...input.history,
            { role: 'user', parts: [{ text: input.message }] },
            { role: 'model', parts: [{ text: responseText }] }
        ];

        // Update DB
        if (scenarioEnded) {
            await db.update(scenarioAttempts).set({
                status: 'COMPLETED',
                score: finalScore,
                isPassed,
                feedback: finalFeedback,
                chatHistory: updatedHistory,
                endedAt: new Date()
            }).where(eq(scenarioAttempts.id, attempt.id));

            // Gamification
            if (isPassed && finalScore >= 60) {
                await db.update(users).set({ 
                    honorPoints: sql`${users.honorPoints} + 50`,
                    meritPoints: sql`${users.meritPoints} + ${finalScore}`
                }).where(eq(users.uid, ctx.userId));
            }

            // Achievement Check
            const achievementsUnlocked: any[] = [];
            const [{ count }] = await db.select({ count: sql<number>`count(*)` })
                .from(scenarioAttempts)
                .where(and(eq(scenarioAttempts.userId, ctx.userId), eq(scenarioAttempts.status, 'COMPLETED')));
            
            if (Number(count) >= 5) {
                const ach = await unlockAchievement(ctx.userId, 'SCENARIO_5');
                if (ach) achievementsUnlocked.push(ach);
            }

            return { 
               response: cleanedResponse, 
               isEnded: scenarioEnded, 
               score: finalScore, 
               passed: isPassed, 
               feedback: finalFeedback,
               achievementsUnlocked
            };

            await db.update(scenarioAttempts).set({
                chatHistory: updatedHistory
            }).where(eq(scenarioAttempts.id, attempt.id));

            return { 
               response: cleanedResponse, 
               isEnded: scenarioEnded, 
               score: finalScore, 
               passed: isPassed, 
               feedback: finalFeedback 
            };
        }
      } catch (error: any) {
        logger.error('[SCENARIO_INTERACT_ERROR]', { attemptId: input.attemptId, error: error.message });
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Fallo del sistema AI: ${error.message}` });
      }
    }),
});
