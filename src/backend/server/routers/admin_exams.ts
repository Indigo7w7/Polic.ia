import { router, adminProcedure } from '../trpc';
import { z } from 'zod';
import { db, exams, examQuestions, examMaterials } from '../../../database/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { ingestLocalExams } from '../utils/examIngest';

export const adminExamRouter = router({
  /** Upload a new exam level */
  uploadExam: adminProcedure
    .input(z.object({
      school: z.enum(['EO', 'EESTP']),
      level: z.number().optional(),
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
      // 1. Determine level (use provided or auto-increment)
      let finalLevel = input.level;
      if (!finalLevel) {
        const [lastExam] = await db.select()
          .from(exams)
          .where(eq(exams.school, input.school))
          .orderBy(desc(exams.level))
          .limit(1);
        finalLevel = (lastExam?.level || 0) + 1;
      }
      
      const finalTitle = input.title || `Nivel ${finalLevel.toString().padStart(2, '0')}`;

      // 2. Perform atomic insertion with potential overwrite
      return await db.transaction(async (tx) => {
        // Check for existing
        let [existing]: any[] = await tx.select().from(exams)
          .where(and(eq(exams.school, input.school), eq(exams.level, finalLevel)));
        
        if (existing) {
          // Overwrite: delete questions first
          await tx.delete(examQuestions).where(eq(examQuestions.examId, existing.id));
          // Update title/isDemo if changed
          await tx.update(exams).set({ title: finalTitle, isDemo: input.isDemo }).where(eq(exams.id, existing.id));
        } else {
          // Create new
          const [newExam] = await tx.insert(exams).values({
            school: input.school,
            level: finalLevel,
            title: finalTitle,
            isDemo: input.isDemo,
          });
          existing = { id: newExam.insertId };
        }

        const examId = (existing as any).id;

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
              schoolType: input.school,
            }))
          );
        }

        return { success: true, level: finalLevel, examId };
      });
    }),

  /** Force sync with local JSON files */
  syncLocalExams: adminProcedure
    .input(z.object({ overwrite: z.boolean().default(false) }))
    .mutation(async ({ input }) => {
      const results = await ingestLocalExams(input.overwrite);
      return { success: true, results };
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
        // 1. Delete questions first
        await tx.delete(examQuestions).where(eq(examQuestions.examId, input.examId));
        // 2. Delete materials
        await tx.delete(examMaterials).where(eq(examMaterials.examId, input.examId));
        // 3. Delete exam record
        await tx.delete(exams).where(eq(exams.id, input.examId));
        return { success: true };
      });
    }),

  /** Add material to an exam level */
  addMaterial: adminProcedure
    .input(z.object({
      examId: z.number(),
      title: z.string(),
      url: z.string().url(),
    }))
    .mutation(async ({ input }) => {
      await db.insert(examMaterials).values({
        examId: input.examId,
        title: input.title,
        url: input.url,
      });
      return { success: true };
    }),

  /** Get materials for a specific exam */
  getMaterials: adminProcedure
    .input(z.object({ examId: z.number() }))
    .query(async ({ input }) => {
      return await db.select()
        .from(examMaterials)
        .where(eq(examMaterials.examId, input.examId))
        .orderBy(desc(examMaterials.createdAt));
    }),

  /** Delete a specific material */
  deleteMaterial: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(examMaterials).where(eq(examMaterials.id, input.id));
      return { success: true };
    }),
});
