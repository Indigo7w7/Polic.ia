import { router } from '../trpc';
import { authRouter } from './auth';
import { userRouter } from './user';
import { examRouter } from './exam';
import { learningRouter } from './learning';
import { leitnerRouter } from './leitner';
import { adminRouter } from './membership_admin';
import { adminExamRouter } from './admin_exams';
import { adminCourseRouter } from './admin_courses';

export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  exam: examRouter,
  learning: learningRouter,
  leitner: leitnerRouter,
  admin: adminRouter,
  adminExams: adminExamRouter,
  adminCourses: adminCourseRouter,
});

export type AppRouter = typeof appRouter;
