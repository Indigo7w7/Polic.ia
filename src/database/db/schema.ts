import { mysqlTable, varchar, text, timestamp, int, json, boolean, mysqlEnum, index, float, bigint } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

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
  honorPoints: int('honor_points').default(0).notNull(),
  meritPoints: int('merit_points').default(0).notNull(),
  currentStreak: int('current_streak').default(0).notNull(),
  lastStreakUpdate: timestamp('last_streak_update'),
  flashcardUndoState: json('flashcard_undo_state'),
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
  topic: varchar('topic', { length: 255 }).notNull().default('GENERAL'), // folder/subtopic name
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  questions: json('questions'),
  level: int('level').default(1),                                         // auto-calculated from topic order
  orderInTopic: int('order_in_topic').default(0),                         // order within the topic
  schoolType: mysqlEnum('school_type', ['EO', 'EESTP', 'BOTH']).default('BOTH'),
}, (table) => [
  index('idx_content_area').on(table.areaId),
  index('idx_content_school').on(table.schoolType),
  index('idx_content_topic').on(table.topic),
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
  userId: varchar('user_id', { length: 255 }).references(() => users.uid, { onDelete: 'cascade' }),
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

// 7.5. Mid-Exam Progress (Simulador V2)
export const examProgress = mysqlTable('exam_progress', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).references(() => users.uid, { onDelete: 'cascade' }),
  examLevelId: int('exam_level_id'), // Puede ser nulo si es práctica o muerte súbita
  isPracticeMode: boolean('is_practice_mode').default(false),
  isMuerteSubita: boolean('is_muerte_subita').default(false),
  questions: json('questions'), // Las preguntas seleccionadas en el estado actual
  answers: json('answers'), // Record<string, number> - Respuestas seleccionadas
  flaggedQuestions: json('flagged_questions'), // Record<string, boolean> - Preguntas marcadas para revisión
  timeSpentPerQuestion: json('time_spent_per_question'), // Record<string, number> - Tiempo ingerido por pregunta
  timeLeft: int('time_left').default(1800),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => [
  index('idx_progress_user').on(table.userId),
]);

// 8. Leitner / FSRS Cards
export const leitnerCards = mysqlTable('leitner_cards', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).references(() => users.uid, { onDelete: 'cascade' }),
  questionId: int('question_id').references(() => examQuestions.id),
  learningContentId: int('learning_content_id').references(() => learningContent.id, { onDelete: 'cascade' }),
  questionIndex: int('question_index'),
  stability: float('stability').default(0.1).notNull(),
  difficulty: float('difficulty').default(5.0).notNull(),
  state: mysqlEnum('state', ['new', 'learning', 'review', 'relearning']).default('new').notNull(),
  reps: int('reps').default(0).notNull(),
  lapses: int('lapses').default(0).notNull(),
  scheduledDays: int('scheduled_days').default(0).notNull(),
  elapsedDays: int('elapsed_days').default(0).notNull(),
  queue: int('queue').default(0).notNull(),
  previousQueue: int('previous_queue'),
  nextReview: timestamp('next_review'),
  lastReview: timestamp('last_review'),
  level: int('level').default(0),
  deckTag: varchar('deck_tag', { length: 255 }),
  mod: bigint('mod', { mode: 'number' }).notNull().default(0),
  usn: int('usn').default(0).notNull(),
}, (table) => [
  index('idx_leitner_user').on(table.userId),
  index('idx_leitner_question').on(table.questionId),
  index('idx_leitner_review').on(table.nextReview),
  index('idx_leitner_state').on(table.state),
  index('idx_leitner_queue').on(table.queue),
  index('idx_leitner_tag').on(table.deckTag),
  index('idx_leitner_mod').on(table.mod),
]);

// 8c. Content FSRS Map
export const contentFsrsMap = mysqlTable('content_fsrs_map', {
  id: int('id').primaryKey().autoincrement(),
  contentId: int('content_id').references(() => learningContent.id, { onDelete: 'cascade' }),
  questionId: int('question_id').references(() => examQuestions.id, { onDelete: 'cascade' }),
  questionIndex: int('question_index'),
  deckTag: varchar('deck_tag', { length: 255 }),
}, (table) => [
  index('idx_map_content').on(table.contentId),
  index('idx_map_question').on(table.questionId),
]);

// 8b. Review Logs
export const reviewLogs = mysqlTable('review_logs', {
  id: int('id').primaryKey().autoincrement(),
  cardId: int('card_id').references(() => leitnerCards.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 255 }).references(() => users.uid, { onDelete: 'cascade' }),
  ease: int('ease').notNull(),
  scheduledDays: int('scheduled_days').notNull(),
  elapsedDays: int('elapsed_days').notNull(),
  stabilityBefore: float('stability_before'),
  stabilityAfter: float('stability_after'),
  difficultyBefore: float('difficulty_before'),
  difficultyAfter: float('difficulty_after'),
  stateBefore: mysqlEnum('state_before', ['new', 'learning', 'review', 'relearning']),
  stateAfter: mysqlEnum('state_after', ['new', 'learning', 'review', 'relearning']),
  reviewedAt: timestamp('reviewed_at').defaultNow(),
  timeTaken: int('time_taken'),
}, (table) => [
  index('idx_revlog_card').on(table.cardId),
  index('idx_revlog_user').on(table.userId),
  index('idx_revlog_date').on(table.reviewedAt),
]);

// 9. Stripe Subscriptions
export const stripeSubscriptions = mysqlTable('stripe_subscriptions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).references(() => users.uid, { onDelete: 'cascade' }),
  status: varchar('status', { length: 50 }),
  priceId: varchar('price_id', { length: 255 }),
  currentPeriodEnd: timestamp('current_period_end'),
}, (table) => [
  index('idx_stripe_user').on(table.userId),
]);

// 10. Admin Logs
export const adminLogs = mysqlTable('admin_logs', {
  id: int('id').primaryKey().autoincrement(),
  adminId: varchar('admin_id', { length: 255 }).references(() => users.uid, { onDelete: 'cascade' }),
  action: text('action').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_logs_admin').on(table.adminId),
  index('idx_logs_created').on(table.createdAt),
]);

// 11. Yape Audits
export const yapeAudits = mysqlTable('yape_audits', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).references(() => users.uid, { onDelete: 'cascade' }),
  voucherUrl: varchar('voucher_url', { length: 512 }).notNull(),
  status: mysqlEnum('status', ['PENDIENTE', 'APROBADO', 'RECHAZADO']).default('PENDIENTE').notNull(),
  amount: float('amount'),
  yapeName: varchar('yape_name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  processedAt: timestamp('processed_at'),
}, (table) => [
  index('idx_yape_user').on(table.userId),
  index('idx_yape_status').on(table.status),
]);

// 12. Global Notifications / Broadcasts
export const globalNotifications = mysqlTable('global_notifications', {
  id: int('id').primaryKey().autoincrement(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  type: mysqlEnum('type', ['INFO', 'WARNING', 'URGENT', 'SUCCESS', 'EVENT']).default('INFO'),
  isActive: boolean('is_active').default(true),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
});


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
}, (table) => ({
  idxSchool: index('idx_courses_school').on(table.schoolType),
  idxLevel: index('idx_courses_level').on(table.level),
}));

export const courseMaterials = mysqlTable('course_materials', {
  id: int('id').primaryKey().autoincrement(),
  courseId: int('course_id').notNull().references(() => courses.id),
  title: varchar('title', { length: 255 }).notNull(),
  type: mysqlEnum('type', ['PDF', 'VIDEO', 'EXAM', 'LINK', 'TEXT']).notNull(),
  contentUrl: varchar('content_url', { length: 512 }),
  order: int('order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  idxCourse: index('idx_materials_course').on(table.courseId),
}));

export const examMaterials = mysqlTable('exam_materials', {
  id: int('id').primaryKey().autoincrement(),
  examId: int('exam_id').notNull().references(() => exams.id),
  title: varchar('title', { length: 255 }).notNull(),
  url: varchar('url', { length: 512 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  idxExam: index('idx_exam_materials_exam').on(table.examId),
}));

export const failedDrills = mysqlTable('failed_drills', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).references(() => users.uid, { onDelete: 'cascade' }),
  unitId: int('unit_id').references(() => learningContent.id),
  questionIndex: int('question_index').notNull(),
  attempts: int('attempts').default(1),
  lastFailedAt: timestamp('last_failed_at').defaultNow(),
}, (table) => ({
  idxUserUnit: index('idx_failed_user_unit').on(table.userId, table.unitId),
  idxLastDate: index('idx_failed_last_date').on(table.lastFailedAt),
}));

export const learningProgress = mysqlTable('learning_progress', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).references(() => users.uid, { onDelete: 'cascade' }),
  unitId: int('unit_id').references(() => learningContent.id),
  score: int('score').default(0),
  completedAt: timestamp('completed_at').defaultNow(),
}, (table) => ({
  idxUser: index('idx_progress_user').on(table.userId),
  idxUnit: index('idx_progress_unit').on(table.unitId),
}));

export const interviewSessions = mysqlTable('interview_sessions', {
  id: int('id').primaryKey().autoincrement(),
  userAId: varchar('user_a_id', { length: 255 }),
  userBId: varchar('user_b_id', { length: 255 }),
  userAName: varchar('user_a_name', { length: 255 }),
  userBName: varchar('user_b_name', { length: 255 }),
  status: mysqlEnum('status', ['waiting', 'active', 'phase2', 'rating', 'done']).default('waiting').notNull(),
  phase: int('phase').default(1).notNull(),
  aQuestionCount: int('a_question_count').default(0).notNull(),
  bQuestionCount: int('b_question_count').default(0).notNull(),
  scoreAtoB: float('score_a_to_b'),
  scoreBtoA: float('score_b_to_a'),
  isPractice: boolean('is_practice').default(false).notNull(),
  currentTurnStatus: mysqlEnum('current_turn_status', ['questioning', 'awaiting_solicit', 'responding', 'awaiting_finish']).default('questioning').notNull(),
  currentInterviewerId: varchar('current_interviewer_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  idxStatus: index('idx_interview_status').on(table.status),
  idxUserA: index('idx_interview_user_a').on(table.userAId),
  idxUserB: index('idx_interview_user_b').on(table.userBId),
  idxTurn: index('idx_interview_turn').on(table.currentTurnStatus),
}));

export const interviewMessages = mysqlTable('interview_messages', {
  id: int('id').primaryKey().autoincrement(),
  sessionId: int('session_id').references(() => interviewSessions.id),
  senderId: varchar('sender_id', { length: 255 }),
  senderName: varchar('sender_name', { length: 255 }),
  message: text('message').notNull(),
  isQuestion: boolean('is_question').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  idxSession: index('idx_interview_msg_session').on(table.sessionId),
}));

// Gamification tables
export const achievements = mysqlTable('achievements', {
  id: int('id').primaryKey().autoincrement(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 50 }),
  pointsReward: int('points_reward').default(0).notNull(),
  category: mysqlEnum('category', ['EXAM', 'LEITNER', 'STREAK', 'SOCIAL', 'GENERAL']).default('GENERAL'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const userAchievements = mysqlTable('user_achievements', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).references(() => users.uid, { onDelete: 'cascade' }),
  achievementId: int('achievement_Id').references(() => achievements.id),
  unlockedAt: timestamp('unlocked_at').defaultNow(),
}, (table) => ({
  idxUserAch: index('idx_user_ach').on(table.userId, table.achievementId),
}));

// --- Scenarios (Roleplay/Simulator) ---
export const policeScenarios = mysqlTable('police_scenarios', {
  id: int('id').primaryKey().autoincrement(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  difficulty: mysqlEnum('difficulty', ['EASY', 'MEDIUM', 'HARD']).default('MEDIUM').notNull(),
  category: varchar('category', { length: 150 }).default('General'),
  initialEvent: text('initial_event').notNull(),
  systemPromptEvaluator: text('system_prompt_evaluator').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const scenarioAttempts = mysqlTable('scenario_attempts', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).references(() => users.uid, { onDelete: 'cascade' }),
  scenarioId: int('scenario_id').references(() => policeScenarios.id, { onDelete: 'cascade' }),
  score: int('score').default(0),
  isPassed: boolean('is_passed').default(false),
  status: mysqlEnum('status', ['IN_PROGRESS', 'COMPLETED']).default('IN_PROGRESS').notNull(),
  feedback: text('feedback'),
  chatHistory: json('chat_history'),
  createdAt: timestamp('created_at').defaultNow(),
  endedAt: timestamp('ended_at'),
}, (table) => [
  index('idx_scenario_user').on(table.userId),
  index('idx_scenario_id').on(table.scenarioId),
]);
