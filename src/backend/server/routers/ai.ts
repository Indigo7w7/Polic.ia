import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db, users } from '../../../database/db';
import { eq, sql } from 'drizzle-orm';

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
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Entorno IA no configurado por el comando central.' });
      }

      // Check if user is PRO
      const [user] = await db.select().from(users).where(eq(users.uid, ctx.userId));
      if (user.membership !== 'PRO') {
         throw new TRPCError({ code: 'FORBIDDEN', message: 'El simulador de entrevista IA requiere rango PRO.' });
      }

      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const chatSession = model.startChat({
          history: input.history,
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7,
          },
        });

        // Prepend system prompt if history is empty (first message)
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
        console.error('Gemini Error Details:', {
          message: error.message,
          stack: error.stack,
          code: error.code,
          status: error.status
        });
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: `Fuerzas de la naturaleza interfirieron con la conexión IA: ${error.message || 'Error Desconocido'}` 
        });
      }
    }),
});
