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
  premiumExpiration: timestamp('premium_expiration'),
  lastSeen: timestamp('last_seen').defaultNow(),
  age: int('age'),
  city: varchar('city', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_users_membership').on(table.membership),
  index('idx_users_role').on(table.role),
  index('idx_users_last_seen').on(table.lastSeen),
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

// 4. Exam Questions
export const examQuestions = mysqlTable('exam_questions', {
  id: int('id').primaryKey().autoincrement(),
  areaId: int('area_id').references(() => learningAreas.id),
  question: text('question').notNull(),
  options: json('options').notNull(),
  correctOption: int('correct_option').notNull(),
  difficulty: mysqlEnum('difficulty', ['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  schoolType: mysqlEnum('school_type', ['EO', 'EESTP', 'BOTH']).default('BOTH'),
}, (table) => [
  index('idx_questions_area').on(table.areaId),
  index('idx_questions_difficulty').on(table.difficulty),
  index('idx_questions_school').on(table.schoolType),
]);

// 5. Exam Attempts
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

// 6. Attempt Answers
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

// 7. Leitner Cards
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

// 8. Stripe Subscriptions
export const stripeSubscriptions = mysqlTable('stripe_subscriptions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).references(() => users.uid),
  status: varchar('status', { length: 50 }),
  priceId: varchar('price_id', { length: 255 }),
  currentPeriodEnd: timestamp('current_period_end'),
}, (table) => [
  index('idx_stripe_user').on(table.userId),
]);

// 9. Admin Logs
export const adminLogs = mysqlTable('admin_logs', {
  id: int('id').primaryKey().autoincrement(),
  adminId: varchar('admin_id', { length: 255 }).references(() => users.uid),
  action: text('action').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_logs_admin').on(table.adminId),
  index('idx_logs_created').on(table.createdAt),
]);

// 10. Yape Audits (Payment verification)
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
