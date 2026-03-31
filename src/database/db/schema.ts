import { mysqlTable, varchar, text, timestamp, int, json, boolean, mysqlEnum, index } from 'drizzle-orm/mysql-core';

// 1. Users table
export const users = mysqlTable('users', {
  uid: varchar('uid', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).unique(),
  photoURL: varchar('photo_url', { length: 512 }),
  role: mysqlEnum('role', ['user', 'admin']).default('user').notNull(),
  school: mysqlEnum('school', ['EO', 'EESTP']),
  membership: mysqlEnum('membership', ['FREE', 'PRO']).default('FREE').notNull(),
  status: mysqlEnum('status', ['ACTIVE', 'BLOCKED']).default('ACTIVE').notNull(),
  premiumExpiration: timestamp('premium_expiration'),
  lastActive: timestamp('last_active').defaultNow(),
  age: int('age'),
  city: varchar('city', { length: 100 }),
  profileEdited: boolean('profile_edited').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_users_membership').on(table.membership),
  index('idx_users_status').on(table.status),
  index('idx_users_role').on(table.role),
  index('idx_users_last_active').on(table.lastActive),
]);

// 2. Learning Areas
export const learningAreas = mysqlTable('learning_areas', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 100 }).notNull(),
  icon: varchar('icon', { length: 50 }),
});

// 3. Learning Content
export const learningContent = mysqlTable('learning_content', {
  id: int('id').primaryKey().autoincrement(),
  areaId: int('area_id').references(() => learningAreas.id),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  level: int('level').default(1),
  schoolType: mysqlEnum('school_type', ['EO', 'EESTP', 'BOTH']).default('BOTH'),
}, (table) => [
  index('idx_content_area').on(table.areaId),
  index('idx_content_school').on(table.schoolType),
]);

// 4. Exams (Levels)
export const exams = mysqlTable('exams', {
  id: int('id').primaryKey().autoincrement(),
  school: mysqlEnum('school', ['EO', 'EESTP']).notNull(),
  level: int('level').notNull(),
  title: varchar('title', { length: 255 }),
  isDemo: boolean('is_demo').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_exams_school').on(table.school),
  index('idx_exams_level').on(table.level),
]);

// 5. Exam Questions
export const examQuestions = mysqlTable('exam_questions', {
  id: int('id').primaryKey().autoincrement(),
  examId: int('exam_id').references(() => exams.id),
  areaId: int('area_id').references(() => learningAreas.id),
  question: text('question').notNull(),
  options: json('options').notNull(),
  correctOption: int('correct_option').notNull(),
  difficulty: mysqlEnum('difficulty', ['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  schoolType: mysqlEnum('school_type', ['EO', 'EESTP', 'BOTH']).default('BOTH'),
}, (table) => [
  index('idx_questions_exam').on(table.examId),
  index('idx_questions_area').on(table.areaId),
  index('idx_questions_difficulty').on(table.difficulty),
  index('idx_questions_school').on(table.schoolType),
]);

// 6. Exam Attempts
export const examAttempts = mysqlTable('exam_attempts', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).references(() => users.uid),
  score: int('score').notNull(),
  passed: boolean('passed').default(false),
  startedAt: timestamp('started_at').defaultNow(),
  endedAt: timestamp('ended_at'),
}, (table) => [
  index('idx_attempts_user').on(table.userId),
  index('idx_attempts_started').on(table.startedAt),
]);

// 7. Attempt Answers
export const attemptAnswers = mysqlTable('attempt_answers', {
  id: int('id').primaryKey().autoincrement(),
  attemptId: int('attempt_id').references(() => examAttempts.id),
  questionId: int('question_id').references(() => examQuestions.id),
  chosenOption: int('chosen_option').notNull(),
  isCorrect: boolean('is_correct').notNull(),
}, (table) => [
  index('idx_answers_attempt').on(table.attemptId),
  index('idx_answers_question').on(table.questionId),
]);

// 8. Leitner Cards
export const leitnerCards = mysqlTable('leitner_cards', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).references(() => users.uid),
  questionId: int('question_id').references(() => examQuestions.id),
  level: int('level').default(0),
  nextReview: timestamp('next_review'),
}, (table) => [
  index('idx_leitner_user').on(table.userId),
  index('idx_leitner_question').on(table.questionId),
  index('idx_leitner_review').on(table.nextReview),
]);

// 9. Stripe Subscriptions
export const stripeSubscriptions = mysqlTable('stripe_subscriptions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).references(() => users.uid),
  status: varchar('status', { length: 50 }),
  priceId: varchar('price_id', { length: 255 }),
  currentPeriodEnd: timestamp('current_period_end'),
}, (table) => [
  index('idx_stripe_user').on(table.userId),
]);

// 10. Admin Logs
export const adminLogs = mysqlTable('admin_logs', {
  id: int('id').primaryKey().autoincrement(),
  adminId: varchar('admin_id', { length: 255 }).references(() => users.uid),
  action: text('action').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_logs_admin').on(table.adminId),
  index('idx_logs_created').on(table.createdAt),
]);

// 11. Yape Audits (Payment verification)
export const yapeAudits = mysqlTable('yape_audits', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).references(() => users.uid),
  voucherUrl: varchar('voucher_url', { length: 512 }).notNull(),
  status: mysqlEnum('status', ['PENDIENTE', 'APROBADO', 'RECHAZADO']).default('PENDIENTE').notNull(),
  amount: int('amount').default(15),
  school: varchar('school', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_yape_user').on(table.userId),
  index('idx_yape_status').on(table.status),
]);

// 12. Courses
export const courses = mysqlTable('courses', {
  id: int('id').primaryKey().autoincrement(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  thumbnailUrl: varchar('thumbnail_url', { length: 512 }),
  level: mysqlEnum('level', ['BASICO', 'INTERMEDIO', 'AVANZADO']).default('BASICO'),
  schoolType: mysqlEnum('school_type', ['EO', 'EESTP', 'BOTH']).default('BOTH'),
  isPublished: boolean('is_published').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => [
  index('idx_courses_school').on(table.schoolType),
  index('idx_courses_level').on(table.level),
]);

// 13. Course Materials
export const courseMaterials = mysqlTable('course_materials', {
  id: int('id').primaryKey().autoincrement(),
  courseId: int('course_id').references(() => courses.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  type: mysqlEnum('type', ['PDF', 'VIDEO', 'EXAM', 'LINK', 'TEXT']).notNull(),
  contentUrl: varchar('content_url', { length: 512 }),
  order: int('order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => [
  index('idx_materials_course').on(table.courseId),
]);

// 14. Global Notifications (Red Alert system)
export const globalNotifications = mysqlTable('global_notifications', {
  id: int('id').primaryKey().autoincrement(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  type: mysqlEnum('type', ['INFO', 'WARNING', 'EVENT']).default('WARNING').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_notifications_active').on(table.isActive),
]);

// 15. Broadcasts (Alerta Roja - separate from globalNotifications for clarity)
export const broadcasts = mysqlTable('broadcasts', {

  id: int('id').primaryKey().autoincrement(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  type: mysqlEnum('type', ['INFO', 'WARNING', 'EVENT']).default('WARNING').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  activeUntil: timestamp('active_until').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_broadcasts_active').on(table.isActive),
  index('idx_broadcasts_until').on(table.activeUntil),
]);

// 16. Exam Materials
export const examMaterials = mysqlTable('exam_materials', {
  id: int('id').primaryKey().autoincrement(),
  examId: int('exam_id').references(() => exams.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  url: varchar('url', { length: 512 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_exam_materials_exam').on(table.examId),
]);
