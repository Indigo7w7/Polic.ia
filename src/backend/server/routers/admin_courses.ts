import { router, adminProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db, courses, courseMaterials, learningAreas, learningContent } from '../../../database/db';
import { eq, desc, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const adminCourseRouter = router({
  /* -------------------------------------------------------------------------- */
  /*                            COURSE MANAGEMENT                               */
  /* -------------------------------------------------------------------------- */

  /** Get all courses */
  getCourses: protectedProcedure
    .query(async () => {
      return await db.select().from(courses).orderBy(desc(courses.createdAt));
    }),

  /** Create a new course */
  createCourse: adminProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      thumbnailUrl: z.string().optional(),
      level: z.enum(['BASICO', 'INTERMEDIO', 'AVANZADO']).default('BASICO'),
      schoolType: z.enum(['EO', 'EESTP', 'BOTH']).default('BOTH'),
      isPublished: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const [newCourse] = await db.insert(courses).values({
        title: input.title,
        description: input.description,
        thumbnailUrl: input.thumbnailUrl,
        level: input.level,
        schoolType: input.schoolType,
        isPublished: input.isPublished,
      });
      return { success: true, courseId: newCourse.insertId };
    }),

  /** Update an existing course */
  updateCourse: adminProcedure
    .input(z.object({
      courseId: z.number(),
      data: z.object({
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        level: z.enum(['BASICO', 'INTERMEDIO', 'AVANZADO']).optional(),
        schoolType: z.enum(['EO', 'EESTP', 'BOTH']).optional(),
        isPublished: z.boolean().optional(),
      })
    }))
    .mutation(async ({ input }) => {
      await db.update(courses)
        .set(input.data)
        .where(eq(courses.id, input.courseId));
      return { success: true };
    }),

  /** Delete a course (will cascade delete materials if DB is set up that way, otherwise manual delete needed) */
  deleteCourse: adminProcedure
    .input(z.object({ courseId: z.number() }))
    .mutation(async ({ input }) => {
      await db.transaction(async (tx) => {
        // Delete materials first to prevent orphans
        await tx.delete(courseMaterials).where(eq(courseMaterials.courseId, input.courseId));
        await tx.delete(courses).where(eq(courses.id, input.courseId));
      });
      return { success: true };
    }),

  /* -------------------------------------------------------------------------- */
  /*                          MATERIAL MANAGEMENT                               */
  /* -------------------------------------------------------------------------- */

  /** Get materials for a specific course */
  getCourseMaterials: protectedProcedure
    .input(z.object({ courseId: z.number() }))
    .query(async ({ input }) => {
      return await db.select()
        .from(courseMaterials)
        .where(eq(courseMaterials.courseId, input.courseId))
        .orderBy(courseMaterials.order);
    }),

  /** Add a new material to a course */
  addMaterialToCourse: adminProcedure
    .input(z.object({
      courseId: z.number(),
      title: z.string().min(1).max(255),
      type: z.enum(['PDF', 'VIDEO', 'EXAM', 'LINK', 'TEXT']),
      contentUrl: z.string().optional(),
      order: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      const [newMaterial] = await db.insert(courseMaterials).values({
        courseId: input.courseId,
        title: input.title,
        type: input.type,
        contentUrl: input.contentUrl,
        order: input.order,
      });
      return { success: true, materialId: newMaterial.insertId };
    }),

  /** Delete a material */
  deleteCourseMaterial: adminProcedure
    .input(z.object({ materialId: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(courseMaterials).where(eq(courseMaterials.id, input.materialId));
      return { success: true };
    }),

  /* -------------------------------------------------------------------------- */
  /*                          SYLLABUS (LEARNING) MGMT                          */
  /* -------------------------------------------------------------------------- */

  getLearningAreas: adminProcedure
    .input(z.object({}).optional())
    .query(async () => {
      try {
        return await db.select().from(learningAreas);
      } catch (error) {
        console.error('[DATABASE_ERROR] Error en getLearningAreas:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Error al obtener áreas de aprendizaje: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        });
      }
    }),

  createLearningArea: adminProcedure
    .input(z.object({ name: z.string(), icon: z.string().optional() }))
    .mutation(async ({ input }) => {
      const [res] = await db.insert(learningAreas).values({ name: input.name, icon: input.icon });
      return { id: res.insertId };
    }),

  deleteLearningArea: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      // BUG-12 FIX: wrap in transaction — if area delete fails, content is NOT orphaned
      await db.transaction(async (tx) => {
        await tx.delete(learningContent).where(eq(learningContent.areaId, input.id));
        await tx.delete(learningAreas).where(eq(learningAreas.id, input.id));
      });
      return { success: true };
    }),

  getLearningContent: adminProcedure
    .input(z.object({ areaId: z.number() }))
    .query(async ({ input }) => {
      return await db.select().from(learningContent).where(eq(learningContent.areaId, input.areaId));
    }),

  deleteLearningContent: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(learningContent).where(eq(learningContent.id, input.id));
      return { success: true };
    }),

  uploadLearningJSON: adminProcedure
    .input(z.object({
      areaName: z.string(),
      content: z.array(z.object({
        title: z.string(),
        body: z.string(),
        questions: z.array(z.any()).optional(),
        level: z.number().default(1),
        schoolType: z.enum(['EO', 'EESTP', 'BOTH']).default('BOTH')
      }))
    }))
    .mutation(async ({ input }) => {
      const normalizedAreaName = input.areaName.trim().toUpperCase();

      return await db.transaction(async (tx) => {
        // Find or create area
        let [area] = await tx.select().from(learningAreas).where(eq(learningAreas.name, normalizedAreaName));
        let areaId = area?.id;

        if (!areaId) {
          const [res] = await tx.insert(learningAreas).values({ name: normalizedAreaName });
          areaId = res.insertId;
        }

        let updated = 0;
        let created = 0;

        // Insert units with UPSERT logic (manual check for better compatibility)
        for (const item of input.content) {
          const normalizedTitle = item.title.trim().toUpperCase();

          const [existingUnit] = await tx.select()
            .from(learningContent)
            .where(and(eq(learningContent.areaId, areaId), eq(learningContent.title, normalizedTitle)))
            .limit(1);

          if (existingUnit) {
            // Update existing
            await tx.update(learningContent)
              .set({
                body: item.body,
                questions: item.questions,
                level: item.level || 1,
                schoolType: item.schoolType || 'BOTH'
              })
              .where(eq(learningContent.id, existingUnit.id));
            updated++;
          } else {
            // Insert new
            await tx.insert(learningContent).values({
              areaId: areaId,
              title: normalizedTitle,
              body: item.body,
              questions: item.questions,
              level: item.level || 1,
              schoolType: item.schoolType || 'BOTH'
            });
            created++;
          }
        }

        return { success: true, areaId, created, updated };
      });
    }),

  /** Get the entire area content as a single JSON object for easy editing */
  getAreaJSON: adminProcedure
    .input(z.object({ areaId: z.number() }))
    .query(async ({ input }) => {
      const [area] = await db.select().from(learningAreas).where(eq(learningAreas.id, input.areaId));
      if (!area) throw new TRPCError({ code: 'NOT_FOUND', message: 'Area not found' });

      const content = await db.select()
        .from(learningContent)
        .where(eq(learningContent.areaId, input.areaId))
        .orderBy(learningContent.level);

      return {
        areaName: area.name,
        content: content.map(item => ({
          title: item.title,
          body: item.body,
          questions: item.questions,
          level: item.level,
          schoolType: item.schoolType
        }))
      };
    }),
});
