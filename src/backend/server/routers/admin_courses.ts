import { router, adminProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db, courses, courseMaterials, learningAreas, learningContent, contentFsrsMap, users, leitnerCards } from '../../../database/db';
import { eq, desc, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const adminCourseRouter = router({
  /* -------------------------------------------------------------------------- */
  /*                            COURSE MANAGEMENT                               */
  /* -------------------------------------------------------------------------- */

  getCourses: protectedProcedure
    .query(async () => {
      return await db.select().from(courses).orderBy(desc(courses.createdAt));
    }),

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
      await db.update(courses).set(input.data).where(eq(courses.id, input.courseId));
      return { success: true };
    }),

  deleteCourse: adminProcedure
    .input(z.object({ courseId: z.number() }))
    .mutation(async ({ input }) => {
      await db.transaction(async (tx) => {
        await tx.delete(courseMaterials).where(eq(courseMaterials.courseId, input.courseId));
        await tx.delete(courses).where(eq(courses.id, input.courseId));
      });
      return { success: true };
    }),

  /* -------------------------------------------------------------------------- */
  /*                          MATERIAL MANAGEMENT                               */
  /* -------------------------------------------------------------------------- */

  getCourseMaterials: protectedProcedure
    .input(z.object({ courseId: z.number() }))
    .query(async ({ input }) => {
      return await db.select()
        .from(courseMaterials)
        .where(eq(courseMaterials.courseId, input.courseId))
        .orderBy(courseMaterials.order);
    }),

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

  deleteCourseMaterial: adminProcedure
    .input(z.object({ materialId: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(courseMaterials).where(eq(courseMaterials.id, input.materialId));
      return { success: true };
    }),

  /* -------------------------------------------------------------------------- */
  /*                     SYLLABUS (EAGLE EYE EXPLORER) MGMT                    */
  /* -------------------------------------------------------------------------- */

  getLearningAreas: adminProcedure
    .input(z.object({}).optional())
    .query(async () => {
      try {
        return await db.select().from(learningAreas);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Error al obtener áreas: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        });
      }
    }),

  createLearningArea: adminProcedure
    .input(z.object({ name: z.string(), icon: z.string().optional() }))
    .mutation(async ({ input }) => {
      const [res] = await db.insert(learningAreas).values({
        name: input.name.trim().toUpperCase(),
        icon: input.icon,
      });
      return { id: res.insertId };
    }),

  deleteLearningArea: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.transaction(async (tx) => {
        await tx.delete(learningContent).where(eq(learningContent.areaId, input.id));
        await tx.delete(learningAreas).where(eq(learningAreas.id, input.id));
      });
      return { success: true };
    }),

  /** Wipe every area and content row — used for "start fresh" */
  clearAllLearningContent: adminProcedure
    .mutation(async () => {
      await db.transaction(async (tx) => {
        await tx.delete(learningContent);
        await tx.delete(learningAreas);
      });
      return { success: true };
    }),

  getLearningContent: adminProcedure
    .input(z.object({ areaId: z.number() }))
    .query(async ({ input }) => {
      return await db.select()
        .from(learningContent)
        .where(eq(learningContent.areaId, input.areaId))
        .orderBy(learningContent.level, learningContent.orderInTopic);
    }),

  deleteLearningContent: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(learningContent).where(eq(learningContent.id, input.id));
      return { success: true };
    }),

  /** Rename a topic (folder) across all its units in an area */
  renameTopic: adminProcedure
    .input(z.object({
      areaId: z.number(),
      oldName: z.string(),
      newName: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const normalized = input.newName.trim().toUpperCase();
      await db.update(learningContent)
        .set({ topic: normalized })
        .where(
          and(
            eq(learningContent.areaId, input.areaId),
            eq(learningContent.topic, input.oldName.trim().toUpperCase()),
          )
        );
      return { success: true };
    }),

  /** Delete an entire topic (folder) and all its units */
  deleteTopic: adminProcedure
    .input(z.object({ areaId: z.number(), topicName: z.string() }))
    .mutation(async ({ input }) => {
      await db.delete(learningContent)
        .where(
          and(
            eq(learningContent.areaId, input.areaId),
            eq(learningContent.topic, input.topicName.trim().toUpperCase()),
          )
        );
      return { success: true };
    }),

  /**
   * Eagle Eye Explorer — Upload hierarchical JSON
   *
   * NEW FORMAT:
   * {
   *   "areaName": "COMUNICACIÓN",
   *   "topics": [
   *     {
   *       "name": "GRAMÁTICA",                     ← Folder / subtopic
   *       "schoolType": "BOTH",                    ← Optional, applies to whole topic
   *       "units": [                               ← Files / lessons
   *         { "title": "...", "body": "...", "questions": [...], "schoolType": "BOTH" }
   *       ]
   *     }
   *   ]
   * }
   *
   * Level is AUTO-CALCULATED: topicIndex + 1 (Folder order = difficulty level)
   * orderInTopic is auto-set by unit position within the topic.
   */
  uploadTacticalSyllabus: adminProcedure
    .input(z.object({
      areaName: z.string().min(1),
      autoFlashcards: z.boolean().optional().default(false),
      topics: z.array(z.object({
        name: z.string().min(1),
        schoolType: z.enum(['EO', 'EESTP', 'BOTH']).optional(),
        units: z.array(z.object({
          title: z.string().min(1),
          body: z.string(),
          questions: z.array(z.any()).optional().default([]),
          schoolType: z.enum(['EO', 'EESTP', 'BOTH']).optional(),
        })).min(1, 'Cada tema debe tener al menos 1 unidad'),
      })).min(1, 'Debes tener al menos 1 tema'),
    }))
    .mutation(async ({ input }) => {
      console.log('[DEBUG-TACTICAL] Received Syllabus Payload:', JSON.stringify(input).substring(0, 500));
      const normalizedAreaName = input.areaName.trim().toUpperCase();

      return await db.transaction(async (tx) => {
        // Find or create area
        let [area] = await tx.select()
          .from(learningAreas)
          .where(eq(learningAreas.name, normalizedAreaName));

        let areaId = area?.id;
        if (!areaId) {
          const [res] = await tx.insert(learningAreas).values({ name: normalizedAreaName });
          areaId = res.insertId;
        }

        const activeUsers = input.autoFlashcards 
          ? await tx.select({ uid: users.uid }).from(users).where(eq(users.status, 'ACTIVE'))
          : [];

        let created = 0;
        let updated = 0;

        // Process each topic (folder)
        for (let topicIdx = 0; topicIdx < input.topics.length; topicIdx++) {
          const topic = input.topics[topicIdx];
          const normalizedTopicName = topic.name.trim().toUpperCase();

          // Level = topic position (1-indexed) — AUTO-CALCULATED
          const autoLevel = topicIdx + 1;

          // Process each unit (file) within the topic
          for (let unitIdx = 0; unitIdx < topic.units.length; unitIdx++) {
            const unit = topic.units[unitIdx];
            const normalizedTitle = unit.title.trim().toUpperCase();
            const effectiveSchoolType = unit.schoolType ?? topic.schoolType ?? 'BOTH';

            const [existing] = await tx.select()
              .from(learningContent)
              .where(
                and(
                  eq(learningContent.areaId, areaId),
                  eq(learningContent.title, normalizedTitle),
                )
              )
              .limit(1);

            if (existing) {
              await tx.update(learningContent)
                .set({
                  topic: normalizedTopicName,
                  body: unit.body,
                  questions: unit.questions,
                  level: autoLevel,
                  orderInTopic: unitIdx,
                  schoolType: effectiveSchoolType,
                })
                .where(eq(learningContent.id, existing.id));
              updated++;
            } else {
              const [res] = await tx.insert(learningContent).values({
                areaId,
                topic: normalizedTopicName,
                title: normalizedTitle,
                body: unit.body,
                questions: unit.questions,
                level: autoLevel,
                orderInTopic: unitIdx,
                schoolType: effectiveSchoolType,
              });
              const contentId = res.insertId;
              
              // ── ECOSISTEMA V2: Mapeo de Flashcards ────────────────────────
              if (unit.questions && (unit.questions as any[]).length > 0) {
                const deckTag = `galeria:${normalizedAreaName.toLowerCase()}:${normalizedTopicName.toLowerCase()}`;
                
                const mapInsertions = [];
                for (let i = 0; i < (unit.questions as any[]).length; i++) {
                  mapInsertions.push({
                    contentId,
                    questionId: null, // No es de simulacro
                    questionIndex: i,
                    deckTag,
                  });
                }
                if (mapInsertions.length > 0) {
                  await tx.insert(contentFsrsMap).values(mapInsertions);
                }

                if (input.autoFlashcards && activeUsers.length > 0) {
                  const cardInsertions = [];
                  for (let i = 0; i < (unit.questions as any[]).length; i++) {
                    for (const user of activeUsers) {
                      cardInsertions.push({
                        userId: user.uid,
                        learningContentId: contentId,
                        questionIndex: i,
                        deckTag,
                        state: 'new' as const,
                        stability: 0.1,
                        difficulty: 5.0,
                        reps: 0,
                        lapses: 0,
                        scheduledDays: 0,
                        elapsedDays: 0,
                        queue: 0,
                        mod: Date.now()
                      });
                    }
                  }
                  
                  // Bulk insert in chunks of 5000 to prevent packet too large errors
                  const chunkSize = 5000;
                  for (let c = 0; c < cardInsertions.length; c += chunkSize) {
                    await tx.insert(leitnerCards).values(cardInsertions.slice(c, c + chunkSize));
                  }
                }
              }
              created++;
            }
          }
        }

        return { success: true, areaId, created, updated };
      });
    }),

  /** Permitir que el admin asigne flashcards manualmente de una unidad */
  enrollFlashcardsFromUnit: adminProcedure
    .input(z.object({ unitId: z.number() }))
    .mutation(async ({ input }) => {
      const [unit] = await db.select().from(learningContent).where(eq(learningContent.id, input.unitId));
      if (!unit) throw new TRPCError({ code: 'NOT_FOUND', message: 'Unidad no encontrada' });
      
      const activeUsers = await db.select({ uid: users.uid }).from(users).where(eq(users.status, 'ACTIVE'));
      const mapEntries = await db.select().from(contentFsrsMap).where(eq(contentFsrsMap.contentId, input.unitId));
      
      if (mapEntries.length === 0) {
        return { success: false, message: 'La unidad no tiene preguntas mapeadas o no existen.' };
      }

      let created = 0;
      await db.transaction(async (tx) => {
        // Obtenemos flashcards existentes para esta unidad de una vez
        const existingCards = await tx.select()
          .from(leitnerCards)
          .where(eq(leitnerCards.learningContentId, input.unitId));
          
        const existingSet = new Set(
          existingCards.map(c => `${c.userId}-${c.questionIndex}`)
        );

        const cardInsertions = [];
        for (const user of activeUsers) {
          for (const map of mapEntries) {
            if (map.questionIndex === null) continue;
            const key = `${user.uid}-${map.questionIndex}`;
            if (!existingSet.has(key)) {
              cardInsertions.push({
                userId: user.uid,
                learningContentId: input.unitId,
                questionIndex: map.questionIndex,
                deckTag: map.deckTag,
                state: 'new' as const,
                stability: 0.1,
                difficulty: 5.0,
                reps: 0,
                lapses: 0,
                scheduledDays: 0,
                elapsedDays: 0,
                queue: 0,
                mod: Date.now()
              });
              created++;
            }
          }
        }
        
        const chunkSize = 5000;
        for (let c = 0; c < cardInsertions.length; c += chunkSize) {
          await tx.insert(leitnerCards).values(cardInsertions.slice(c, c + chunkSize));
        }
      });
      return { success: true, created };
    }),

  /** Export area content grouped by topic for the Eagle Eye Explorer editor */
  getAreaJSON: adminProcedure
    .input(z.object({ areaId: z.number() }))
    .query(async ({ input }) => {
      const [area] = await db.select()
        .from(learningAreas)
        .where(eq(learningAreas.id, input.areaId));

      if (!area) throw new TRPCError({ code: 'NOT_FOUND', message: 'Área no encontrada' });

      const content = await db.select()
        .from(learningContent)
        .where(eq(learningContent.areaId, input.areaId))
        .orderBy(learningContent.level, learningContent.orderInTopic);

      // Group by topic
      const topicsMap = new Map<string, typeof content>();
      for (const unit of content) {
        const t = unit.topic ?? 'GENERAL';
        if (!topicsMap.has(t)) topicsMap.set(t, []);
        topicsMap.get(t)!.push(unit);
      }

      return {
        areaName: area.name,
        topics: Array.from(topicsMap.entries()).map(([name, units]) => ({
          name,
          units: units.map(u => ({
            title: u.title,
            body: u.body,
            questions: u.questions,
            schoolType: u.schoolType,
          })),
        })),
      };
    }),
});
