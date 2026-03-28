import { router, adminProcedure } from '../trpc';
import { z } from 'zod';
import { db, exams, examQuestions } from '../../../database/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const adminExamRouter = router({
  /** Upload a new exam level */
  uploadExam: adminProcedure
    .input(z.object({
      school: z.enum(['EO', 'EESTP']),
      title: z.string().optional(),
      isDemo: z.boolean().optional().default(false),
      questions: z.array(z.object({
        question: z.string(),
        options: z.array(z.string()),
        correctOption: z.number(),
        areaId: z.number().optional().default(1),
        difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional().default('MEDIUM'),
      })),
    }))
    .mutation(async ({ input }) => {
      // 1. Determine the next level for this school
      const [lastExam] = await db.select()
        .from(exams)
        .where(eq(exams.school, input.school))
        .orderBy(desc(exams.level))
        .limit(1);
      
      const nextLevel = (lastExam?.level || 0) + 1;
      const finalTitle = input.title || `Nivel ${nextLevel.toString().padStart(2, '0')}`;

      // 2. Perform atomic insertion
      return await db.transaction(async (tx) => {
        // Create the exam container
        const [newExam] = await tx.insert(exams).values({
          school: input.school,
          level: nextLevel,
          title: finalTitle,
          isDemo: input.isDemo,
        });

        const examId = newExam.insertId;

        // Insert questions linked to this exam
        if (input.questions.length > 0) {
          await tx.insert(examQuestions).values(
            input.questions.map(q => ({
              examId: examId,
              areaId: q.areaId,
              question: q.question,
              options: q.options,
              correctOption: q.correctOption,
              difficulty: q.difficulty,
              schoolType: input.school, // Align with question table convention
            }))
          );
        }

        return { success: true, level: nextLevel, examId };
      });
    }),

  /** Get all exams for management */
  getExams: adminProcedure
    .query(async () => {
      return await db.select()
        .from(exams)
        .orderBy(desc(exams.createdAt));
    }),

  /** Delete an exam and its questions */
  deleteExam: adminProcedure
    .input(z.object({ examId: z.number() }))
    .mutation(async ({ input }) => {
      return await db.transaction(async (tx) => {
        // 1. Delete questions first (or cascade if FK allows, but manual for safety)
        await tx.delete(examQuestions).where(eq(examQuestions.examId, input.examId));
        // 2. Delete exam record
        await tx.delete(exams).where(eq(exams.id, input.examId));
        return { success: true };
      });
    }),
});
