import { router, adminProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db, courses, courseMaterials, learningAreas, learningContent } from '../../../database/db';
import { eq, desc } from 'drizzle-orm';

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

  getLearningAreas: adminProcedure.query(async () => {
    return await db.select().from(learningAreas);
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
      await db.delete(learningContent).where(eq(learningContent.areaId, input.id));
      await db.delete(learningAreas).where(eq(learningAreas.id, input.id));
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
        level: z.number().default(1),
        schoolType: z.enum(['EO', 'EESTP', 'BOTH']).default('BOTH')
      }))
    }))
    .mutation(async ({ input }) => {
      return await db.transaction(async (tx) => {
        // Find or create area
        let [area] = await tx.select().from(learningAreas).where(eq(learningAreas.name, input.areaName));
        let areaId = area?.id;

        if (!areaId) {
          const [res] = await tx.insert(learningAreas).values({ name: input.areaName });
          areaId = res.insertId;
        }

        // Insert units
        for (const item of input.content) {
          await tx.insert(learningContent).values({
            areaId: areaId,
            title: item.title,
            body: item.body,
            level: item.level,
            schoolType: item.schoolType
          });
        }

        return { success: true, areaId, unitsAdded: input.content.length };
      });
    }),
});
