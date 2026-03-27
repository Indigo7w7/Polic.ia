import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db, learningAreas, learningContent } from '../../../database/db';
import { eq, or, and } from 'drizzle-orm';

export const learningRouter = router({
  getAreas: protectedProcedure.query(async () => {
    return await db.select().from(learningAreas);
  }),

  getContentByArea: protectedProcedure
    .input(z.object({ 
      areaId: z.number(), 
      school: z.enum(['EO', 'EESTP', 'BOTH']).optional() 
    }))
    .query(async ({ input }) => {
      const areaFilter = eq(learningContent.areaId, input.areaId);
      
      if (input.school && input.school !== 'BOTH') {
        const schoolFilter = or(
          eq(learningContent.schoolType, input.school),
          eq(learningContent.schoolType, 'BOTH')
        );
        return await db.select().from(learningContent).where(and(areaFilter, schoolFilter!));
      }
      
      return await db.select().from(learningContent).where(areaFilter);
    }),
});
