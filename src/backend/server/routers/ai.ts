import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { db, users } from '../../../database/db';
import { eq, sql } from 'drizzle-orm';
import { getAIClient, AI_MODELS } from '../../utils/aiClient';
import { logger } from '../utils/logger';
import { USER_FIELDS } from '../utils/constants';

// System prompt define la personalidad del "General"
const SYSTEM_PROMPT = `
Eres un General de la Policía Nacional del Perú (PNP), veterano y jefe de la junta selectiva. 
Tu misión es entrevistar a un postulante para su ingreso. 
Personalidad: Riguroso, honorable, patriota y observador. No toleras la falta de disciplina ni la falta de ética.
Instrucciones:
1. Haz una pregunta difícil a la vez sobre ética, vocación, doctrina policial o situaciones de crisis.
2. Evalúa la respuesta del usuario. Si es excelente, felicítalo secamente. Si es mediocre, exhígelo más. 
3. Límite: Máximo 10 preguntas. 
4. Condición crítica: Si detectas falta de patriotismo, deshonestidad o cobardía en 3 respuestas, termina la entrevista de inmediato con un veredicto de 'BAJA DESHONROSA'.
5. Diagnóstico Final: Al terminar las 10 preguntas (o antes por falta grave), da un diagnóstico que "preocupe al presidente" (si es malo) o que "devuelva la fe en la institución" (si es excelente). Usa un lenguaje militar formal peruano.
6. Mantén el historial de la conversación para dar seguimiento.
`;

export const aiRouter = router({
  chat: protectedProcedure
    .input(z.object({
      history: z.array(z.object({
        role: z.enum(['user', 'model']),
        parts: z.array(z.object({ text: z.string() }))
      })),
      message: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const genAI = getAIClient();
      if (!genAI) {
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Entorno IA no configurado: Falta la llave de mando.' 
        });
      }

      // Check if user exists & is PRO
      const [user] = await db.select(USER_FIELDS).from(users).where(eq(users.uid, ctx.userId));
      
      if (!user) {
        logger.error(`[AI-CHAT] Profile not found: ${ctx.userId}`);
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No se encontró tu perfil táctico.' });
      }

      if (user.membership !== 'PRO') {
         logger.warn(`[AI-CHAT] Blocked non-PRO user attempt: ${user.email}`);
         throw new TRPCError({ code: 'FORBIDDEN', message: 'El simulador de entrevista personal requiere rango PRO.' });
      }

      try {
        const model = genAI.getGenerativeModel({ model: AI_MODELS.FLASH });

        const chatSession = model.startChat({
          history: input.history,
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7,
          },
        });

        let actualMessage = input.message;
        if (input.history.length === 0) {
           actualMessage = `${SYSTEM_PROMPT}\n\n[INICIO DE ENTREVISTA]\nPostulante: ${input.message}`;
        }

        const result = await chatSession.sendMessage(actualMessage);
        const response = result.response.text();

        // Update honor points randomly if response is positive (gamification)
        if (response.toLowerCase().includes("felicitaciones") || response.toLowerCase().includes("buena respuesta")) {
           await db.update(users)
             .set({ honorPoints: sql`${users.honorPoints} + 10` })
             .where(eq(users.uid, ctx.userId));
        }

        return { response };
      } catch (error: any) {
        logger.error('[AI-CHAT-CRITICAL]', {
          uid: ctx.userId,
          errorMessage: error.message,
        });
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: `Fuerzas de la naturaleza interfirieron: ${error.message || 'Error Desconocido'}` 
        });
      }
    }),
});
