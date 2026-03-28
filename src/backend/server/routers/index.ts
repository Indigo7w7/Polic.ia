import { router } from '../trpc';
import { authRouter } from './auth';
import { userRouter } from './user';
import { examRouter } from './exam';
import { learningRouter } from './learning';
import { leitnerRouter } from './leitner';
import { membershipRouter, adminRouter } from './membership_admin';
import { adminExamRouter } from './admin_exams';

export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  exam: examRouter,
  learning: learningRouter,
  leitner: leitnerRouter,
  membership: membershipRouter,
  admin: adminRouter,
  adminExams: adminExamRouter,
});

export type AppRouter = typeof appRouter;
