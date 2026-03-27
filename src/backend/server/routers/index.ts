import { router } from '../trpc';
import { authRouter } from './auth';
import { userRouter } from './user';
import { examRouter } from './exam';
import { learningRouter } from './learning';
import { leitnerRouter } from './leitner';
import { membershipRouter, adminRouter } from './membership_admin';

export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  exam: examRouter,
  learning: learningRouter,
  leitner: leitnerRouter,
  membership: membershipRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
