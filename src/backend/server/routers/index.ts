import { router } from '../trpc';
import { authRouter } from './auth';
import { userRouter } from './user';
import { examRouter } from './exam';
import { learningRouter } from './learning';
import { leitnerRouter } from './leitner';
import { adminRouter } from './membership_admin';
import { adminExamRouter } from './admin_exams';
import { adminCourseRouter } from './admin_courses';
import { aiRouter } from './ai';
import { interviewRouter } from './interview';

import { learningReviewRouter } from './learning_review';
import { learningProgressRouter } from './learning_progress';
import { examProgressRouter } from './exams_progress';
import { gamificationRouter } from './gamification';
import { scenariosRouter } from './scenarios';

export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  exam: examRouter,
  learning: learningRouter,
  leitner: leitnerRouter,
  admin: adminRouter,
  adminExams: adminExamRouter,
  adminCourses: adminCourseRouter,
  ai: aiRouter,
  interview: interviewRouter,
  learningReview: learningReviewRouter,
  learningProgress: learningProgressRouter,
  examProgress: examProgressRouter,
  gamification: gamificationRouter,
  scenarios: scenariosRouter,
});

export type AppRouter = typeof appRouter;
