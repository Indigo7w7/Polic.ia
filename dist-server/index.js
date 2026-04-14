var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/backend/server/index.ts
import dotenv2 from "dotenv";
import express from "express";
import cors from "cors";
import * as trpcExpress from "@trpc/server/adapters/express";

// src/backend/server/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";

// src/database/db/index.ts
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

// src/database/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  achievements: () => achievements,
  adminLogs: () => adminLogs,
  attemptAnswers: () => attemptAnswers,
  contentFsrsMap: () => contentFsrsMap,
  courseMaterials: () => courseMaterials,
  courses: () => courses,
  examAttempts: () => examAttempts,
  examMaterials: () => examMaterials,
  examProgress: () => examProgress,
  examQuestions: () => examQuestions,
  exams: () => exams,
  failedDrills: () => failedDrills,
  globalNotifications: () => globalNotifications,
  interviewMessages: () => interviewMessages,
  interviewSessions: () => interviewSessions,
  learningAreas: () => learningAreas,
  learningContent: () => learningContent,
  learningProgress: () => learningProgress,
  leitnerCards: () => leitnerCards,
  policeScenarios: () => policeScenarios,
  reviewLogs: () => reviewLogs,
  scenarioAttempts: () => scenarioAttempts,
  stripeSubscriptions: () => stripeSubscriptions,
  userAchievements: () => userAchievements,
  users: () => users,
  yapeAudits: () => yapeAudits
});
import { mysqlTable, varchar, text, timestamp, int, json, boolean, mysqlEnum, index, float, bigint } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  uid: varchar("uid", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).unique(),
  photoURL: varchar("photo_url", { length: 512 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  school: mysqlEnum("school", ["EO", "EESTP"]),
  membership: mysqlEnum("membership", ["FREE", "PRO"]).default("FREE").notNull(),
  status: mysqlEnum("status", ["ACTIVE", "BLOCKED"]).default("ACTIVE").notNull(),
  premiumExpiration: timestamp("premium_expiration"),
  lastActive: timestamp("last_active").defaultNow(),
  age: int("age"),
  city: varchar("city", { length: 100 }),
  profileEdited: boolean("profile_edited").default(false).notNull(),
  honorPoints: int("honor_points").default(0).notNull(),
  meritPoints: int("merit_points").default(0).notNull(),
  currentStreak: int("current_streak").default(0).notNull(),
  lastStreakUpdate: timestamp("last_streak_update"),
  flashcardUndoState: json("flashcard_undo_state"),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => [
  index("idx_users_membership").on(table.membership),
  index("idx_users_status").on(table.status),
  index("idx_users_role").on(table.role),
  index("idx_users_last_active").on(table.lastActive)
]);
var learningAreas = mysqlTable("learning_areas", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 50 })
});
var learningContent = mysqlTable("learning_content", {
  id: int("id").primaryKey().autoincrement(),
  areaId: int("area_id").references(() => learningAreas.id),
  topic: varchar("topic", { length: 255 }).notNull().default("GENERAL"),
  // folder/subtopic name
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  questions: json("questions"),
  level: int("level").default(1),
  // auto-calculated from topic order
  orderInTopic: int("order_in_topic").default(0),
  // order within the topic
  schoolType: mysqlEnum("school_type", ["EO", "EESTP", "BOTH"]).default("BOTH")
}, (table) => [
  index("idx_content_area").on(table.areaId),
  index("idx_content_school").on(table.schoolType),
  index("idx_content_topic").on(table.topic)
]);
var exams = mysqlTable("exams", {
  id: int("id").primaryKey().autoincrement(),
  school: mysqlEnum("school", ["EO", "EESTP"]).notNull(),
  level: int("level").notNull(),
  title: varchar("title", { length: 255 }),
  isDemo: boolean("is_demo").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => [
  index("idx_exams_school").on(table.school),
  index("idx_exams_level").on(table.level)
]);
var examQuestions = mysqlTable("exam_questions", {
  id: int("id").primaryKey().autoincrement(),
  examId: int("exam_id").references(() => exams.id),
  areaId: int("area_id").references(() => learningAreas.id),
  question: text("question").notNull(),
  options: json("options").notNull(),
  correctOption: int("correct_option").notNull(),
  difficulty: mysqlEnum("difficulty", ["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  schoolType: mysqlEnum("school_type", ["EO", "EESTP", "BOTH"]).default("BOTH")
}, (table) => [
  index("idx_questions_exam").on(table.examId),
  index("idx_questions_area").on(table.areaId),
  index("idx_questions_difficulty").on(table.difficulty),
  index("idx_questions_school").on(table.schoolType)
]);
var examAttempts = mysqlTable("exam_attempts", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 255 }).references(() => users.uid, { onDelete: "cascade" }),
  score: int("score").notNull(),
  passed: boolean("passed").default(false),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at")
}, (table) => [
  index("idx_attempts_user").on(table.userId),
  index("idx_attempts_started").on(table.startedAt)
]);
var attemptAnswers = mysqlTable("attempt_answers", {
  id: int("id").primaryKey().autoincrement(),
  attemptId: int("attempt_id").references(() => examAttempts.id),
  questionId: int("question_id").references(() => examQuestions.id),
  chosenOption: int("chosen_option").notNull(),
  isCorrect: boolean("is_correct").notNull()
}, (table) => [
  index("idx_answers_attempt").on(table.attemptId),
  index("idx_answers_question").on(table.questionId)
]);
var examProgress = mysqlTable("exam_progress", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 255 }).references(() => users.uid, { onDelete: "cascade" }),
  examLevelId: int("exam_level_id"),
  // Puede ser nulo si es práctica o muerte súbita
  isPracticeMode: boolean("is_practice_mode").default(false),
  isMuerteSubita: boolean("is_muerte_subita").default(false),
  questions: json("questions"),
  // Las preguntas seleccionadas en el estado actual
  answers: json("answers"),
  // Record<string, number> - Respuestas seleccionadas
  flaggedQuestions: json("flagged_questions"),
  // Record<string, boolean> - Preguntas marcadas para revisión
  timeSpentPerQuestion: json("time_spent_per_question"),
  // Record<string, number> - Tiempo ingerido por pregunta
  timeLeft: int("time_left").default(1800),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow()
}, (table) => [
  index("idx_progress_user").on(table.userId)
]);
var leitnerCards = mysqlTable("leitner_cards", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 255 }).references(() => users.uid, { onDelete: "cascade" }),
  questionId: int("question_id").references(() => examQuestions.id),
  learningContentId: int("learning_content_id").references(() => learningContent.id, { onDelete: "cascade" }),
  questionIndex: int("question_index"),
  stability: float("stability").default(0.1).notNull(),
  difficulty: float("difficulty").default(5).notNull(),
  state: mysqlEnum("state", ["new", "learning", "review", "relearning"]).default("new").notNull(),
  reps: int("reps").default(0).notNull(),
  lapses: int("lapses").default(0).notNull(),
  scheduledDays: int("scheduled_days").default(0).notNull(),
  elapsedDays: int("elapsed_days").default(0).notNull(),
  queue: int("queue").default(0).notNull(),
  previousQueue: int("previous_queue"),
  nextReview: timestamp("next_review"),
  lastReview: timestamp("last_review"),
  level: int("level").default(0),
  deckTag: varchar("deck_tag", { length: 255 }),
  mod: bigint("mod", { mode: "number" }).notNull().default(0),
  usn: int("usn").default(0).notNull()
}, (table) => [
  index("idx_leitner_user").on(table.userId),
  index("idx_leitner_question").on(table.questionId),
  index("idx_leitner_review").on(table.nextReview),
  index("idx_leitner_state").on(table.state),
  index("idx_leitner_queue").on(table.queue),
  index("idx_leitner_tag").on(table.deckTag),
  index("idx_leitner_mod").on(table.mod)
]);
var contentFsrsMap = mysqlTable("content_fsrs_map", {
  id: int("id").primaryKey().autoincrement(),
  contentId: int("content_id").references(() => learningContent.id, { onDelete: "cascade" }),
  questionId: int("question_id").references(() => examQuestions.id, { onDelete: "cascade" }),
  questionIndex: int("question_index"),
  deckTag: varchar("deck_tag", { length: 255 })
}, (table) => [
  index("idx_map_content").on(table.contentId),
  index("idx_map_question").on(table.questionId)
]);
var reviewLogs = mysqlTable("review_logs", {
  id: int("id").primaryKey().autoincrement(),
  cardId: int("card_id").references(() => leitnerCards.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).references(() => users.uid, { onDelete: "cascade" }),
  ease: int("ease").notNull(),
  scheduledDays: int("scheduled_days").notNull(),
  elapsedDays: int("elapsed_days").notNull(),
  stabilityBefore: float("stability_before"),
  stabilityAfter: float("stability_after"),
  difficultyBefore: float("difficulty_before"),
  difficultyAfter: float("difficulty_after"),
  stateBefore: mysqlEnum("state_before", ["new", "learning", "review", "relearning"]),
  stateAfter: mysqlEnum("state_after", ["new", "learning", "review", "relearning"]),
  reviewedAt: timestamp("reviewed_at").defaultNow(),
  timeTaken: int("time_taken")
}, (table) => [
  index("idx_revlog_card").on(table.cardId),
  index("idx_revlog_user").on(table.userId),
  index("idx_revlog_date").on(table.reviewedAt)
]);
var stripeSubscriptions = mysqlTable("stripe_subscriptions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).references(() => users.uid, { onDelete: "cascade" }),
  status: varchar("status", { length: 50 }),
  priceId: varchar("price_id", { length: 255 }),
  currentPeriodEnd: timestamp("current_period_end")
}, (table) => [
  index("idx_stripe_user").on(table.userId)
]);
var adminLogs = mysqlTable("admin_logs", {
  id: int("id").primaryKey().autoincrement(),
  adminId: varchar("admin_id", { length: 255 }).references(() => users.uid, { onDelete: "cascade" }),
  action: text("action").notNull(),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => [
  index("idx_logs_admin").on(table.adminId),
  index("idx_logs_created").on(table.createdAt)
]);
var yapeAudits = mysqlTable("yape_audits", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 255 }).references(() => users.uid, { onDelete: "cascade" }),
  voucherUrl: varchar("voucher_url", { length: 512 }).notNull(),
  status: mysqlEnum("status", ["PENDIENTE", "APROBADO", "RECHAZADO"]).default("PENDIENTE").notNull(),
  amount: float("amount"),
  yapeName: varchar("yape_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at")
}, (table) => [
  index("idx_yape_user").on(table.userId),
  index("idx_yape_status").on(table.status)
]);
var globalNotifications = mysqlTable("global_notifications", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: mysqlEnum("type", ["INFO", "WARNING", "URGENT", "SUCCESS", "EVENT"]).default("INFO"),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow()
});
var courses = mysqlTable("courses", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  thumbnailUrl: varchar("thumbnail_url", { length: 512 }),
  level: mysqlEnum("level", ["BASICO", "INTERMEDIO", "AVANZADO"]).default("BASICO"),
  schoolType: mysqlEnum("school_type", ["EO", "EESTP", "BOTH"]).default("BOTH"),
  isPublished: boolean("is_published").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow()
}, (table) => ({
  idxSchool: index("idx_courses_school").on(table.schoolType),
  idxLevel: index("idx_courses_level").on(table.level)
}));
var courseMaterials = mysqlTable("course_materials", {
  id: int("id").primaryKey().autoincrement(),
  courseId: int("course_id").notNull().references(() => courses.id),
  title: varchar("title", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["PDF", "VIDEO", "EXAM", "LINK", "TEXT"]).notNull(),
  contentUrl: varchar("content_url", { length: 512 }),
  order: int("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow()
}, (table) => ({
  idxCourse: index("idx_materials_course").on(table.courseId)
}));
var examMaterials = mysqlTable("exam_materials", {
  id: int("id").primaryKey().autoincrement(),
  examId: int("exam_id").notNull().references(() => exams.id),
  title: varchar("title", { length: 255 }).notNull(),
  url: varchar("url", { length: 512 }).notNull(),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  idxExam: index("idx_exam_materials_exam").on(table.examId)
}));
var failedDrills = mysqlTable("failed_drills", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 255 }).references(() => users.uid, { onDelete: "cascade" }),
  unitId: int("unit_id").references(() => learningContent.id),
  questionIndex: int("question_index").notNull(),
  attempts: int("attempts").default(1),
  lastFailedAt: timestamp("last_failed_at").defaultNow()
}, (table) => ({
  idxUserUnit: index("idx_failed_user_unit").on(table.userId, table.unitId),
  idxLastDate: index("idx_failed_last_date").on(table.lastFailedAt)
}));
var learningProgress = mysqlTable("learning_progress", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 255 }).references(() => users.uid, { onDelete: "cascade" }),
  unitId: int("unit_id").references(() => learningContent.id),
  score: int("score").default(0),
  completedAt: timestamp("completed_at").defaultNow()
}, (table) => ({
  idxUser: index("idx_progress_user").on(table.userId),
  idxUnit: index("idx_progress_unit").on(table.unitId)
}));
var interviewSessions = mysqlTable("interview_sessions", {
  id: int("id").primaryKey().autoincrement(),
  userAId: varchar("user_a_id", { length: 255 }),
  userBId: varchar("user_b_id", { length: 255 }),
  userAName: varchar("user_a_name", { length: 255 }),
  userBName: varchar("user_b_name", { length: 255 }),
  status: mysqlEnum("status", ["waiting", "active", "phase2", "rating", "done"]).default("waiting").notNull(),
  phase: int("phase").default(1).notNull(),
  aQuestionCount: int("a_question_count").default(0).notNull(),
  bQuestionCount: int("b_question_count").default(0).notNull(),
  scoreAtoB: float("score_a_to_b"),
  scoreBtoA: float("score_b_to_a"),
  isPractice: boolean("is_practice").default(false).notNull(),
  currentTurnStatus: mysqlEnum("current_turn_status", ["questioning", "awaiting_solicit", "responding", "awaiting_finish"]).default("questioning").notNull(),
  currentInterviewerId: varchar("current_interviewer_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  idxStatus: index("idx_interview_status").on(table.status),
  idxUserA: index("idx_interview_user_a").on(table.userAId),
  idxUserB: index("idx_interview_user_b").on(table.userBId),
  idxTurn: index("idx_interview_turn").on(table.currentTurnStatus)
}));
var interviewMessages = mysqlTable("interview_messages", {
  id: int("id").primaryKey().autoincrement(),
  sessionId: int("session_id").references(() => interviewSessions.id),
  senderId: varchar("sender_id", { length: 255 }),
  senderName: varchar("sender_name", { length: 255 }),
  message: text("message").notNull(),
  isQuestion: boolean("is_question").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  idxSession: index("idx_interview_msg_session").on(table.sessionId)
}));
var achievements = mysqlTable("achievements", {
  id: int("id").primaryKey().autoincrement(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  pointsReward: int("points_reward").default(0).notNull(),
  category: mysqlEnum("category", ["EXAM", "LEITNER", "STREAK", "SOCIAL", "GENERAL"]).default("GENERAL"),
  createdAt: timestamp("created_at").defaultNow()
});
var userAchievements = mysqlTable("user_achievements", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 255 }).references(() => users.uid, { onDelete: "cascade" }),
  achievementId: int("achievement_Id").references(() => achievements.id),
  unlockedAt: timestamp("unlocked_at").defaultNow()
}, (table) => ({
  idxUserAch: index("idx_user_ach").on(table.userId, table.achievementId)
}));
var policeScenarios = mysqlTable("police_scenarios", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  difficulty: mysqlEnum("difficulty", ["EASY", "MEDIUM", "HARD"]).default("MEDIUM").notNull(),
  category: varchar("category", { length: 150 }).default("General"),
  initialEvent: text("initial_event").notNull(),
  systemPromptEvaluator: text("system_prompt_evaluator").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var scenarioAttempts = mysqlTable("scenario_attempts", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 255 }).references(() => users.uid, { onDelete: "cascade" }),
  scenarioId: int("scenario_id").references(() => policeScenarios.id, { onDelete: "cascade" }),
  score: int("score").default(0),
  isPassed: boolean("is_passed").default(false),
  status: mysqlEnum("status", ["IN_PROGRESS", "COMPLETED"]).default("IN_PROGRESS").notNull(),
  feedback: text("feedback"),
  chatHistory: json("chat_history"),
  createdAt: timestamp("created_at").defaultNow(),
  endedAt: timestamp("ended_at")
}, (table) => [
  index("idx_scenario_user").on(table.userId),
  index("idx_scenario_id").on(table.scenarioId)
]);

// src/database/db/index.ts
import dotenv from "dotenv";
dotenv.config();
var pool = null;
var getPool = () => {
  if (pool) return pool;
  const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
  if (url) {
    console.log(`[DB] Connecting via explicitly provided URL`);
    pool = mysql.createPool({
      uri: url,
      waitForConnections: true,
      connectionLimit: 50,
      maxIdle: 10,
      idleTimeout: 6e4,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });
    return pool;
  }
  const config = {
    host: process.env.MYSQLHOST || process.env.DB_HOST || "127.0.0.1",
    user: process.env.MYSQLUSER || process.env.DB_USER || "root",
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || "",
    database: process.env.MYSQLDATABASE || process.env.DB_NAME || "polic_ia",
    port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT || "3306"),
    waitForConnections: true,
    connectionLimit: 50,
    maxIdle: 10,
    idleTimeout: 6e4,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    family: 4
  };
  console.log(`[DB] Using config for: ${config.host}`);
  pool = mysql.createPool(config);
  return pool;
};
var poolConnection = getPool();
var db = drizzle(poolConnection, { schema: schema_exports, mode: "default" });

// src/backend/server/trpc.ts
import { eq } from "drizzle-orm";

// src/backend/server/firebaseAdmin.ts
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
var serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;
var firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
if (!serviceAccountPath && process.env.NODE_ENV === "production") {
  console.error("CRITICAL: FIREBASE_SERVICE_ACCOUNT is missing in environment variables.");
}
if (!firebaseProjectId && process.env.NODE_ENV === "production") {
  console.error("CRITICAL: FIREBASE_PROJECT_ID is missing in environment variables.");
}
if (!serviceAccountPath || !firebaseProjectId) {
  console.warn("WARNING: Firebase credentials missing. Some features (Auth/Storage) will be disabled.");
}
var serviceAccount;
if (serviceAccountPath && firebaseProjectId) {
  try {
    const cleanPath = serviceAccountPath.trim();
    if (cleanPath.startsWith("{")) {
      serviceAccount = JSON.parse(cleanPath);
      console.log("Firebase Service Account loaded from JSON string.");
    } else {
      const { readFileSync } = await import("fs");
      serviceAccount = JSON.parse(readFileSync(cleanPath, "utf8"));
      console.log(`Firebase Service Account loaded from file: ${cleanPath}`);
    }
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      console.error("FAILURE: Could not parse Firebase Service Account JSON.");
      console.error("ERROR DETAILS:", error.message);
      process.exit(1);
    } else {
      console.warn("WARNING: Could not load Firebase credentials. Auth will be disabled.");
    }
  }
}
var adminAuth = null;
var firebaseAdminAuth = null;
var firestoreDb = null;
var storage = null;
if (serviceAccount) {
  const app2 = initializeApp({
    credential: cert(serviceAccount),
    projectId: firebaseProjectId
  }, "polic-ia-admin");
  adminAuth = getAuth(app2);
  firebaseAdminAuth = adminAuth;
  firestoreDb = getFirestore(app2);
  storage = getStorage(app2);
} else {
  console.warn("RUNNING WITHOUT FIREBASE ADMIN: Auth and DB features will be unavailable.");
}

// src/backend/server/trpc.ts
var createContext = async ({ req, res }, io3) => {
  const authHeader = req.headers.authorization;
  const isDev = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
  let userId = null;
  let userEmail = null;
  let userRole = "user";
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      if (token) {
        try {
          if (adminAuth) {
            const decodedToken = await adminAuth.verifyIdToken(token);
            userId = decodedToken.uid;
            userEmail = decodedToken.email?.toLowerCase()?.trim() || null;
          } else if (isDev) {
            try {
              const base64Payload = token.split(".")[1];
              if (base64Payload) {
                const payload = JSON.parse(Buffer.from(base64Payload, "base64").toString());
                if (payload && payload.user_id) {
                  userId = payload.user_id;
                  userEmail = payload.email?.toLowerCase()?.trim() || null;
                  console.log(`[AUTH-DEV] Using Dynamic Local Decode - UID: ${userId}, Email: ${userEmail}`);
                }
              }
            } catch (decodeErr) {
              console.error("[AUTH-DEV] Failed to decode token manually:", decodeErr);
            }
          }
          if (isDev && userId) {
            console.log(`[AUTH-DEBUG] Authenticated - UID: ${userId}, Email: ${userEmail}`);
          }
        } catch (verifyError) {
          if (!isDev) {
            throw verifyError;
          }
          console.warn(`[AUTH-DEV] Token verification failed. Provide a valid Firebase ID Token even in dev. Request will be UNAUTHORIZED.`);
        }
        if (userId) {
          try {
            if (isDev) console.log(`[DB-LOOKUP] Fetching user ${userId} context...`);
            const [user] = await db.select({
              role: users.role,
              email: users.email
            }).from(users).where(eq(users.uid, userId));
            if (user) {
              userRole = user.role;
              if (!userEmail) userEmail = user.email;
              if (isDev) console.log(`[DB-LOOKUP] Success: User found (Role: ${user.role})`);
            } else if (isDev) {
              console.warn(`[DB-LOOKUP] User ${userId} not found in database.`);
            }
          } catch (dbError) {
            if (isDev) console.error("[DB-LOOKUP] Error loading context:", dbError);
          }
        }
      }
    } catch (error) {
      if (isDev) console.error("[AUTH] Critical Context Error:", error);
    }
  }
  return { req, res, userId, userEmail, userRole, io: io3 };
};
var t = initTRPC.context().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // Add additional context in development
        cause: process.env.NODE_ENV === "development" ? error.cause : void 0
      }
    };
  }
});
var router = t.router;
var publicProcedure = t.procedure;
var protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});
var adminProcedure = protectedProcedure.use(async ({ ctx, next, path: path3 }) => {
  if (ctx.userRole !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  try {
    await db.insert(adminLogs).values({
      adminId: ctx.userId,
      action: `AUDIT: [${path3}] called by ${ctx.userEmail || ctx.userId}`
    });
  } catch (logError) {
    console.error("[CRITICAL] Audit log failed:", logError);
  }
  return next({ ctx });
});

// src/backend/server/routers/auth.ts
import { z } from "zod";
import { eq as eq2, sql } from "drizzle-orm";
import { TRPCError as TRPCError2 } from "@trpc/server";

// src/backend/server/utils/constants.ts
var USER_FIELDS = {
  uid: users.uid,
  name: users.name,
  email: users.email,
  photoURL: users.photoURL,
  role: users.role,
  school: users.school,
  membership: users.membership,
  status: users.status,
  premiumExpiration: users.premiumExpiration,
  lastActive: users.lastActive,
  age: users.age,
  city: users.city,
  profileEdited: users.profileEdited,
  honorPoints: users.honorPoints,
  meritPoints: users.meritPoints,
  currentStreak: users.currentStreak,
  lastStreakUpdate: users.lastStreakUpdate,
  createdAt: users.createdAt
};

// src/backend/server/routers/auth.ts
var authRouter = router({
  getPublicStats: publicProcedure.query(async () => {
    const [result] = await db.select({ count: sql`count(*)` }).from(users);
    return {
      totalUsers: result?.count || 0
    };
  }),
  login: protectedProcedure.input(z.object({
    email: z.string().email(),
    name: z.string(),
    photoURL: z.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const uid = ctx.userId;
    let finalName = input.name;
    if (!finalName || finalName === "Postulante") {
      finalName = input.email.split("@")[0];
    }
    const [existingUser] = await db.select(USER_FIELDS).from(users).where(eq2(users.uid, uid));
    if (!existingUser) {
      await db.insert(users).values({
        uid,
        email: input.email.toLowerCase(),
        name: finalName,
        photoURL: input.photoURL || null,
        role: "user",
        membership: "FREE",
        status: "ACTIVE"
      });
    } else {
      await db.update(users).set({
        lastActive: /* @__PURE__ */ new Date(),
        email: input.email.toLowerCase(),
        ...finalName !== "Postulante" && { name: finalName },
        ...input.photoURL && { photoURL: input.photoURL }
      }).where(eq2(users.uid, uid));
    }
    return { success: true };
  }),
  adminLogin: protectedProcedure.input(z.object({ secretToken: z.string() })).mutation(async ({ input, ctx }) => {
    const ADMIN_SECRET = process.env.ADMIN_SECRET_TOKEN;
    if (!ADMIN_SECRET || input.secretToken !== ADMIN_SECRET) {
      throw new TRPCError2({
        code: "UNAUTHORIZED",
        message: "C\xF3digo de mando inv\xE1lido. Intento registrado."
      });
    }
    await db.update(users).set({ role: "admin" }).where(eq2(users.uid, ctx.userId));
    return { success: true };
  }),
  logout: protectedProcedure.mutation(() => {
    return { success: true };
  })
});

// src/backend/server/routers/user.ts
import { z as z2 } from "zod";
import { eq as eq4, sql as sql3, desc, and as and2, gte } from "drizzle-orm";
import { TRPCError as TRPCError3 } from "@trpc/server";

// src/backend/server/utils/logger.ts
var logger = {
  info: (message, meta) => {
    console.log(`[INFO] ${(/* @__PURE__ */ new Date()).toISOString()}: ${message}`, meta || "");
  },
  error: (message, meta) => {
    console.error(`[ERROR] ${(/* @__PURE__ */ new Date()).toISOString()}: ${message}`, meta || "");
  },
  warn: (message, meta) => {
    console.warn(`[WARN] ${(/* @__PURE__ */ new Date()).toISOString()}: ${message}`, meta || "");
  },
  debug: (message, meta) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEBUG] ${(/* @__PURE__ */ new Date()).toISOString()}: ${message}`, meta || "");
    }
  }
};

// src/backend/server/utils/gamification.ts
import { eq as eq3, and, sql as sql2 } from "drizzle-orm";
async function unlockAchievement(userId, code) {
  const [achievement] = await db.select().from(achievements).where(eq3(achievements.code, code));
  if (!achievement) return null;
  const [existing] = await db.select().from(userAchievements).where(and(
    eq3(userAchievements.userId, userId),
    eq3(userAchievements.achievementId, achievement.id)
  ));
  if (existing) return null;
  await db.insert(userAchievements).values({
    userId,
    achievementId: achievement.id
  });
  if (achievement.pointsReward > 0) {
    await db.update(users).set({ meritPoints: sql2`${users.meritPoints} + ${achievement.pointsReward}` }).where(eq3(users.uid, userId));
  }
  return {
    code: achievement.code,
    title: achievement.title,
    description: achievement.description,
    icon: achievement.icon,
    pointsReward: achievement.pointsReward
  };
}

// src/backend/server/routers/user.ts
var getCategoryStatsData = async (uid) => {
  const stats = await db.execute(sql3`
    SELECT 
      la.name as area,
      AVG(aa.is_correct) * 100 as score
    FROM attempt_answers aa
    JOIN exam_attempts ea ON aa.attempt_id = ea.id
    JOIN exam_questions eq ON aa.question_id = eq.id
    JOIN learning_areas la ON eq.area_id = la.id
    WHERE ea.user_id = ${uid} AND ea.started_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY la.id, la.name
  `);
  const rows = Array.isArray(stats) ? stats[0] || stats : stats.rows || [];
  return rows.map((r) => ({
    area: r.area,
    score: Math.round(Number(r.score || 0))
  }));
};
var userRouter = router({
  getProfile: protectedProcedure.input(z2.object({ uid: z2.string() })).query(async ({ ctx, input }) => {
    if (ctx.userId !== input.uid && ctx.userRole !== "admin") {
      throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized access to this profile" });
    }
    let [user] = await db.select(USER_FIELDS).from(users).where(eq4(users.uid, input.uid));
    if (!user) {
      console.log(`[SYNC] User ${input.uid} not found in MySQL. Provisioning new profile...`);
      await db.insert(users).values({
        uid: input.uid,
        email: ctx.userEmail || "unknown@polic.ia",
        name: "Postulante",
        role: "user",
        membership: "FREE",
        status: "ACTIVE",
        lastActive: /* @__PURE__ */ new Date()
      });
      [user] = await db.select(USER_FIELDS).from(users).where(eq4(users.uid, input.uid));
    }
    if (!user) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to provision user profile" });
    if (user.membership === "PRO" && user.premiumExpiration && user.premiumExpiration < /* @__PURE__ */ new Date()) {
      await db.update(users).set({ membership: "FREE", premiumExpiration: null }).where(eq4(users.uid, user.uid));
      user.membership = "FREE";
      user.premiumExpiration = null;
    }
    return {
      ...user,
      role: ctx.userRole,
      // ALWAYS use the context role (it's the source of truth)
      photoURL: user.photoURL,
      honorPoints: user.honorPoints || 0,
      meritPoints: user.meritPoints || 0,
      currentStreak: user.currentStreak || 0
    };
  }),
  claimDailyLeitner: protectedProcedure.input(z2.object({ uid: z2.string() })).mutation(async ({ ctx, input }) => {
    if (ctx.userId !== input.uid) throw new TRPCError3({ code: "FORBIDDEN" });
    const [user] = await db.select(USER_FIELDS).from(users).where(eq4(users.uid, input.uid));
    if (!user) throw new TRPCError3({ code: "NOT_FOUND" });
    const now = /* @__PURE__ */ new Date();
    const lastUpdate = user.lastStreakUpdate ? new Date(user.lastStreakUpdate) : /* @__PURE__ */ new Date(0);
    const getDayOffset = (d) => {
      const estTime = new Date(d.getTime() - 5 * 60 * 60 * 1e3);
      return Math.floor(estTime.getTime() / (1e3 * 60 * 60 * 24));
    };
    const todayOffset = getDayOffset(now);
    const lastUpdateOffset = getDayOffset(lastUpdate);
    const diffDays = todayOffset - lastUpdateOffset;
    if (diffDays === 0) {
      throw new TRPCError3({ code: "BAD_REQUEST", message: "Ya reclamaste tu recompensa diaria hoy" });
    }
    let streak = diffDays === 1 ? user.currentStreak + 1 : 1;
    let pointsToGive = 50;
    if (streak % 5 === 0) {
      pointsToGive += 200;
    }
    await db.update(users).set({
      honorPoints: sql3`${users.honorPoints} + ${pointsToGive}`,
      currentStreak: streak,
      lastStreakUpdate: now
    }).where(eq4(users.uid, input.uid));
    logger.info(`[REWARD] User ${input.uid} claimed daily reward. Points: ${pointsToGive}, Streak: ${streak}`);
    const achievementsUnlocked = [];
    if (streak === 7) {
      const ach = await unlockAchievement(input.uid, "STREAK_7");
      if (ach) achievementsUnlocked.push(ach);
    }
    return { success: true, pointsAwarded: pointsToGive, newStreak: streak, achievementsUnlocked };
  }),
  selectSchool: protectedProcedure.input(z2.object({ uid: z2.string(), school: z2.enum(["EO", "EESTP"]) })).mutation(async ({ ctx, input }) => {
    if (ctx.userId !== input.uid) {
      throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized school selection" });
    }
    const [user] = await db.select(USER_FIELDS).from(users).where(eq4(users.uid, input.uid));
    if (!user) throw new TRPCError3({ code: "NOT_FOUND", message: "User not found" });
    if (user.school) {
      throw new TRPCError3({
        code: "FORBIDDEN",
        message: "La selecci\xF3n de escuela ya ha sido procesada y es irreversible."
      });
    }
    await db.update(users).set({ school: input.school }).where(eq4(users.uid, input.uid));
    const [updatedUser] = await db.select(USER_FIELDS).from(users).where(eq4(users.uid, input.uid));
    return { success: true, school: input.school, user: updatedUser };
  }),
  getStats: protectedProcedure.input(z2.object({ uid: z2.string() })).query(async ({ ctx, input }) => {
    if (ctx.userId !== input.uid && ctx.userRole !== "admin") {
      throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized access to stats" });
    }
    const [user] = await db.select({
      honorPoints: users.honorPoints,
      meritPoints: users.meritPoints
    }).from(users).where(eq4(users.uid, input.uid));
    const stats = await db.select({
      totalAttempts: sql3`count(${examAttempts.id})`,
      averageScore: sql3`avg(${examAttempts.score})`,
      bestScore: sql3`max(${examAttempts.score})`,
      lastExamDate: sql3`max(${examAttempts.startedAt})`,
      passedCount: sql3`sum(case when ${examAttempts.passed} = 1 then 1 else 0 end)`
    }).from(examAttempts).where(eq4(examAttempts.userId, input.uid));
    return {
      ...stats[0] || { totalAttempts: 0, averageScore: 0, bestScore: 0, lastExamDate: null, passedCount: 0 },
      honorPoints: user?.honorPoints || 0,
      meritPoints: user?.meritPoints || 0
    };
  }),
  getRanking: protectedProcedure.input(z2.object({ school: z2.enum(["EO", "EESTP"]).optional() })).query(async ({ input }) => {
    let filters = [
      eq4(users.status, "ACTIVE")
    ];
    if (input.school) {
      filters.push(eq4(users.school, input.school));
    }
    const topScores = await db.select({
      uid: users.uid,
      name: users.name,
      photoURL: users.photoURL,
      school: users.school,
      membership: users.membership,
      meritPoints: users.meritPoints,
      honorPoints: users.honorPoints,
      totalPoints: sql3`${users.honorPoints} + ${users.meritPoints}`,
      bestScore: sql3`(SELECT MAX(score) FROM ${examAttempts} WHERE user_id = ${users.uid})`
    }).from(users).where(and2(...filters)).orderBy(desc(sql3`${users.honorPoints} + ${users.meritPoints}`)).limit(100);
    return topScores;
  }),
  /** Calculates school-wide aggregates for the "Battle Board" */
  getSchoolBattleStats: protectedProcedure.query(async () => {
    const stats = await db.execute(sql3`
        SELECT 
          u.school,
          AVG(ea.score) * 100 as avg_efficacy,
          SUM(u.honor_points) as total_honor,
          COUNT(DISTINCT u.uid) as user_count
        FROM users u
        LEFT JOIN exam_attempts ea ON u.uid = ea.user_id AND ea.started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        WHERE u.school IS NOT NULL AND u.status = 'ACTIVE'
        GROUP BY u.school
      `);
    const rows = Array.isArray(stats) ? stats[0] || stats : stats.rows || [];
    return rows.map((r) => ({
      school: r.school,
      avgEfficacy: Math.round(Number(r.avg_efficacy || 0)),
      totalHonor: Number(r.total_honor || 0),
      userCount: Number(r.user_count || 0)
    }));
  }),
  updateProfile: protectedProcedure.input(z2.object({
    uid: z2.string(),
    name: z2.string().min(1).max(255).optional(),
    photoURL: z2.string().max(512).optional(),
    age: z2.number().int().min(15).max(100).optional(),
    city: z2.string().max(100).optional()
  })).mutation(async ({ ctx, input }) => {
    if (ctx.userId !== input.uid) {
      throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized profile update" });
    }
    const [user] = await db.select(USER_FIELDS).from(users).where(eq4(users.uid, input.uid));
    if (!user) throw new TRPCError3({ code: "NOT_FOUND", message: "User not found" });
    await db.update(users).set({
      ...input.name && { name: input.name },
      ...input.photoURL && { photoURL: input.photoURL },
      ...input.age !== void 0 && { age: input.age },
      ...input.city && { city: input.city },
      profileEdited: true
    }).where(eq4(users.uid, input.uid));
    return { success: true };
  }),
  updateLastSeen: protectedProcedure.input(z2.object({ uid: z2.string() })).mutation(async ({ ctx, input }) => {
    if (ctx.userId !== input.uid) {
      throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized lastSeen update" });
    }
    await db.update(users).set({ lastActive: /* @__PURE__ */ new Date() }).where(eq4(users.uid, input.uid));
    return { success: true };
  }),
  getLastBroadcast: protectedProcedure.query(async () => {
    const activeBroadcasts = await db.select().from(globalNotifications).where(
      and2(
        eq4(globalNotifications.isActive, true),
        globalNotifications.expiresAt ? gte(globalNotifications.expiresAt, /* @__PURE__ */ new Date()) : void 0
      )
    ).orderBy(desc(globalNotifications.createdAt)).limit(1);
    return activeBroadcasts[0] || null;
  }),
  getCategoryStats: protectedProcedure.input(z2.object({ uid: z2.string() })).query(async ({ ctx, input }) => {
    if (ctx.userId !== input.uid && ctx.userRole !== "admin") {
      throw new TRPCError3({ code: "FORBIDDEN" });
    }
    return await getCategoryStatsData(input.uid);
  }),
  getDashboardSummary: protectedProcedure.input(z2.object({ uid: z2.string(), school: z2.enum(["EO", "EESTP"]).optional() })).query(async ({ ctx, input }) => {
    if (ctx.userId !== input.uid && ctx.userRole !== "admin") {
      throw new TRPCError3({ code: "FORBIDDEN" });
    }
    const [userStats, leitnerStatsRaw, categoryStats, rankResults, broadcastResult] = await Promise.all([
      // 1. Core User Stats
      db.select({
        totalAttempts: sql3`count(${examAttempts.id})`,
        averageScore: sql3`avg(${examAttempts.score})`,
        bestScore: sql3`max(${examAttempts.score})`,
        lastExamDate: sql3`max(${examAttempts.startedAt})`,
        passedCount: sql3`sum(case when ${examAttempts.passed} = 1 then 1 else 0 end)`,
        meritPoints: sql3`(SELECT merit_points FROM users WHERE uid = ${input.uid})`,
        honorPoints: sql3`(SELECT honor_points FROM users WHERE uid = ${input.uid})`
      }).from(examAttempts).where(eq4(examAttempts.userId, input.uid)),
      // 2. Leitner Counts
      db.execute(sql3`
          SELECT
            COUNT(CASE WHEN state = 'new' AND queue >= 0 THEN 1 END) as new_count,
            COUNT(CASE WHEN state IN ('learning','relearning') AND queue >= 0 THEN 1 END) as learning_count,
            COUNT(CASE WHEN state = 'review' AND queue >= 0 AND (next_review IS NULL OR next_review <= DATE_ADD(NOW(), INTERVAL 4 HOUR)) THEN 1 END) as review_count,
            COUNT(CASE WHEN queue >= 0 THEN 1 END) as total_count
          FROM leitner_cards
          WHERE user_id = ${input.uid}
        `),
      // 3. Category Stats (Clamp 30 days for performance via helper)
      getCategoryStatsData(input.uid),
      // 4. Ranking (Using meritPoints as ordering fallback)
      db.select({
        uid: users.uid,
        meritPoints: users.meritPoints,
        honorPoints: users.honorPoints
      }).from(users).where(and2(
        eq4(users.membership, "PRO"),
        eq4(users.status, "ACTIVE"),
        input.school ? eq4(users.school, input.school) : void 0
      )).orderBy(desc(users.meritPoints)).limit(500),
      // 5. Latest Broadcast
      db.select().from(globalNotifications).where(and2(
        eq4(globalNotifications.isActive, true),
        globalNotifications.expiresAt ? gte(globalNotifications.expiresAt, /* @__PURE__ */ new Date()) : void 0
      )).orderBy(desc(globalNotifications.createdAt)).limit(1)
    ]);
    const stats = userStats[0] || { totalAttempts: 0, averageScore: 0, bestScore: 0, lastExamDate: null, passedCount: 0, meritPoints: 0, honorPoints: 0 };
    const lRow = leitnerStatsRaw[0][0];
    const leitner = {
      newCount: Number(lRow?.new_count || 0),
      learningCount: Number(lRow?.learning_count || 0),
      reviewCount: Number(lRow?.review_count || 0),
      totalCount: Number(lRow?.total_count || 0),
      count: Number(lRow?.new_count || 0) + Number(lRow?.learning_count || 0) + Number(lRow?.review_count || 0)
    };
    const rankPos = rankResults.findIndex((r) => r.uid === input.uid) + 1 || null;
    return {
      stats,
      leitner,
      categoryStats,
      rankPos,
      lastBroadcast: broadcastResult[0] || null
    };
  })
});

// src/backend/server/routers/exam.ts
import { TRPCError as TRPCError4 } from "@trpc/server";
import { z as z3 } from "zod";
import { eq as eq5, desc as desc2, and as and3, sql as sql4, inArray } from "drizzle-orm";
var examRouter = router({
  /** Fetch questions from DB dynamically (for admin-uploaded exams or custom ones) */
  getQuestionsByFilter: protectedProcedure.input(z3.object({
    school: z3.enum(["EO", "EESTP", "BOTH"]).optional(),
    areaId: z3.number().optional(),
    areaIds: z3.array(z3.number()).optional(),
    difficulty: z3.enum(["EASY", "MEDIUM", "HARD"]).optional(),
    examId: z3.number().optional(),
    limit: z3.number().min(1).max(200).default(100)
  })).query(async ({ input }) => {
    let query = db.select().from(examQuestions);
    const filters = [];
    if (input.school) {
      filters.push(sql4`(${examQuestions.schoolType} = ${input.school} OR ${examQuestions.schoolType} = 'BOTH')`);
    }
    if (input.areaId) {
      filters.push(eq5(examQuestions.areaId, input.areaId));
    }
    if (input.areaIds && input.areaIds.length > 0) {
      filters.push(inArray(examQuestions.areaId, input.areaIds));
    }
    if (input.difficulty) {
      filters.push(eq5(examQuestions.difficulty, input.difficulty));
    }
    if (input.examId) {
      filters.push(eq5(examQuestions.examId, input.examId));
    }
    const whereClause = filters.length > 0 ? and3(...filters) : void 0;
    const questions = await db.select().from(examQuestions).where(whereClause).orderBy(sql4`RAND()`).limit(input.limit);
    return questions;
  }),
  /** Smart Exam Generator: Analyzes radar and builds a personalized challenge */
  generateSmartExam: protectedProcedure.input(z3.object({
    school: z3.enum(["EO", "EESTP"]),
    limit: z3.number().min(10).max(100).default(50),
    requestedDifficulty: z3.enum(["EASY", "MEDIUM", "HARD"]).optional()
  })).mutation(async ({ input, ctx }) => {
    const stats = await db.execute(sql4`
        SELECT 
          la.id,
          la.name as area,
          AVG(aa.is_correct) * 100 as score
        FROM attempt_answers aa
        JOIN exam_attempts ea ON aa.attempt_id = ea.id
        JOIN exam_questions eq ON aa.question_id = eq.id
        JOIN learning_areas la ON eq.area_id = la.id
        WHERE ea.user_id = ${ctx.userId}
        GROUP BY la.id, la.name
      `);
    const rows = Array.isArray(stats) ? stats[0] || stats : stats.rows || [];
    const areaStats = rows.map((r) => ({
      id: Number(r.id),
      score: Math.round(Number(r.score || 0))
    }));
    const overallAvg = areaStats.length > 0 ? areaStats.reduce((acc, s) => acc + s.score, 0) / areaStats.length : 50;
    const canCustomize = overallAvg > 70;
    let finalDifficulty = "MEDIUM";
    if (canCustomize && input.requestedDifficulty) {
      finalDifficulty = input.requestedDifficulty;
    } else {
      if (overallAvg < 45) finalDifficulty = "EASY";
      else if (overallAvg < 75) finalDifficulty = "MEDIUM";
      else finalDifficulty = "HARD";
    }
    const weakAreaIds = areaStats.sort((a, b) => a.score - b.score).slice(0, 3).map((a) => a.id);
    const filters = [
      sql4`(${examQuestions.schoolType} = ${input.school} OR ${examQuestions.schoolType} = 'BOTH')`,
      eq5(examQuestions.difficulty, finalDifficulty)
    ];
    const weakLimit = Math.floor(input.limit * 0.6);
    const restLimit = input.limit - weakLimit;
    let finalQuestions = [];
    if (weakAreaIds.length > 0) {
      const weakQuestions = await db.select().from(examQuestions).where(and3(...filters, inArray(examQuestions.areaId, weakAreaIds))).orderBy(sql4`RAND()`).limit(weakLimit);
      const restQuestions = await db.select().from(examQuestions).where(and3(...filters, sql4`${examQuestions.areaId} NOT IN (${sql4.join(weakAreaIds, sql4`, `)})`)).orderBy(sql4`RAND()`).limit(restLimit);
      finalQuestions = [...weakQuestions, ...restQuestions];
    } else {
      finalQuestions = await db.select().from(examQuestions).where(and3(...filters)).orderBy(sql4`RAND()`).limit(input.limit);
    }
    return {
      questions: finalQuestions.sort(() => Math.random() - 0.5),
      stats: {
        overallAvg,
        canCustomize,
        determinedDifficulty: finalDifficulty,
        targetAreas: weakAreaIds
      }
    };
  }),
  /** Submit exam attempt wrapped in a transaction for atomicity */
  submitAttempt: protectedProcedure.input(z3.object({
    userId: z3.string(),
    score: z3.number(),
    passed: z3.boolean(),
    answers: z3.array(z3.object({
      questionId: z3.number(),
      chosenOption: z3.number(),
      isCorrect: z3.boolean()
    }))
  })).mutation(async ({ ctx, input }) => {
    if (ctx.userId !== input.userId) {
      throw new TRPCError4({ code: "FORBIDDEN", message: "Unauthorized attempt submission" });
    }
    const result = await db.transaction(async (tx) => {
      const [attempt] = await tx.insert(examAttempts).values({
        userId: input.userId,
        score: input.score,
        passed: input.passed,
        endedAt: /* @__PURE__ */ new Date()
      });
      if (input.answers.length > 0) {
        await tx.insert(attemptAnswers).values(
          input.answers.map((ans) => ({
            attemptId: attempt.insertId,
            questionId: ans.questionId,
            chosenOption: ans.chosenOption,
            isCorrect: ans.isCorrect
          }))
        );
        const examQuestionIds = input.answers.map((a) => a.questionId);
        const existingCards = await tx.select().from(leitnerCards).where(and3(
          eq5(leitnerCards.userId, input.userId),
          sql4`${leitnerCards.questionId} IN (${sql4.join(examQuestionIds, sql4`, `)})`
        ));
        const cardMap = new Map(existingCards.map((c) => [c.questionId, c]));
        for (const ans of input.answers) {
          const existingCard = cardMap.get(ans.questionId);
          if (existingCard) {
            if (!ans.isCorrect) {
              const nextReview = new Date(Date.now() + 10 * 6e4);
              await tx.update(leitnerCards).set({
                state: "relearning",
                queue: 3,
                scheduledDays: 0,
                lapses: sql4`${leitnerCards.lapses} + 1`,
                nextReview,
                lastReview: /* @__PURE__ */ new Date()
              }).where(eq5(leitnerCards.id, existingCard.id));
            } else if (existingCard.state === "relearning") {
              const nextReview = new Date(Date.now() + 24 * 60 * 6e4);
              await tx.update(leitnerCards).set({
                state: "review",
                queue: 2,
                scheduledDays: 1,
                reps: sql4`${leitnerCards.reps} + 1`,
                nextReview,
                lastReview: /* @__PURE__ */ new Date()
              }).where(eq5(leitnerCards.id, existingCard.id));
            } else {
              await tx.update(leitnerCards).set({
                reps: sql4`${leitnerCards.reps} + 1`,
                level: sql4`LEAST(${leitnerCards.level} + 1, 5)`,
                lastReview: /* @__PURE__ */ new Date()
              }).where(eq5(leitnerCards.id, existingCard.id));
            }
          } else if (!ans.isCorrect) {
            const nextReview = new Date(Date.now() + 10 * 6e4);
            await tx.insert(leitnerCards).values({
              userId: input.userId,
              questionId: ans.questionId,
              state: "learning",
              queue: 1,
              stability: 0.1,
              difficulty: 5,
              reps: 0,
              lapses: 1,
              scheduledDays: 0,
              elapsedDays: 0,
              level: 1,
              nextReview
            });
          }
        }
      }
      const [stats] = await tx.select({ bestScore: sql4`MAX(${examAttempts.score})` }).from(examAttempts).where(eq5(examAttempts.userId, input.userId));
      const previousBest = stats?.bestScore || 0;
      let meritPointsEarned = 0;
      if (input.passed) meritPointsEarned += 200;
      if (input.score > previousBest && input.score > 0) {
        meritPointsEarned += 500;
      }
      if (meritPointsEarned > 0) {
        await tx.update(users).set({ meritPoints: sql4`${users.meritPoints} + ${meritPointsEarned}` }).where(eq5(users.uid, input.userId));
      }
      return { success: true, attemptId: attempt.insertId, meritPointsEarned, previousBest };
    });
    const achievementsUnlocked = [];
    try {
      const achFirst = await unlockAchievement(input.userId, "FIRST_EXAM");
      if (achFirst) achievementsUnlocked.push(achFirst);
      if (input.score >= 85) {
        const achElite = await unlockAchievement(input.userId, "ELITE_OFFICER");
        if (achElite) achievementsUnlocked.push(achElite);
      }
      if (input.score === 100 && input.answers.length >= 20) {
        const achPerfect = await unlockAchievement(input.userId, "PERFECT_EXAM");
        if (achPerfect) achievementsUnlocked.push(achPerfect);
      }
    } catch (err) {
      console.error("[EXAM_POST_PROCESS_ERROR]", err);
    }
    const [{ meritPoints }] = await db.select({ meritPoints: users.meritPoints }).from(users).where(eq5(users.uid, input.userId));
    return {
      success: true,
      attemptId: result.attemptId,
      meritPointsEarned: result.meritPointsEarned,
      previousBest: result.previousBest,
      newTotalPoints: meritPoints,
      achievementsUnlocked
    };
  }),
  getHistory: protectedProcedure.input(z3.object({
    userId: z3.string(),
    limit: z3.number().min(1).max(100).default(50),
    offset: z3.number().default(0)
  })).query(async ({ ctx, input }) => {
    if (ctx.userId !== input.userId && ctx.userRole !== "admin") {
      throw new TRPCError4({ code: "FORBIDDEN", message: "Unauthorized access to history" });
    }
    return await db.select().from(examAttempts).where(eq5(examAttempts.userId, input.userId)).orderBy(desc2(examAttempts.startedAt)).limit(input.limit).offset(input.offset);
  }),
  /** Get available exam levels for the student dashboard */
  getLevels: protectedProcedure.query(async () => {
    return await db.select().from(exams).orderBy(exams.school, exams.level);
  }),
  /** Get questions the user HAS FAILED before for "Anti-Failure Zone" */
  getFailedQuestions: protectedProcedure.input(z3.object({
    userId: z3.string(),
    limit: z3.number().min(1).max(50).default(30),
    offset: z3.number().default(0)
  })).query(async ({ input }) => {
    return await db.select({
      id: examQuestions.id,
      question: examQuestions.question,
      options: examQuestions.options,
      correctOption: examQuestions.correctOption,
      areaId: examQuestions.areaId,
      difficulty: examQuestions.difficulty,
      schoolType: examQuestions.schoolType
    }).from(attemptAnswers).innerJoin(examQuestions, eq5(attemptAnswers.questionId, examQuestions.id)).innerJoin(examAttempts, eq5(attemptAnswers.attemptId, examAttempts.id)).where(and3(
      eq5(examAttempts.userId, input.userId),
      eq5(attemptAnswers.isCorrect, false)
    )).groupBy(examQuestions.id).limit(input.limit).offset(input.offset);
  })
});

// src/backend/server/routers/learning.ts
import { z as z4 } from "zod";
import { eq as eq6, or, and as and4 } from "drizzle-orm";
var learningRouter = router({
  getAreas: protectedProcedure.query(async () => {
    return await db.select().from(learningAreas);
  }),
  getContentByArea: protectedProcedure.input(z4.object({
    areaId: z4.number(),
    school: z4.enum(["EO", "EESTP", "BOTH"]).optional()
  })).query(async ({ input }) => {
    const areaFilter = eq6(learningContent.areaId, input.areaId);
    if (input.school && input.school !== "BOTH") {
      const schoolFilter = or(
        eq6(learningContent.schoolType, input.school),
        eq6(learningContent.schoolType, "BOTH")
      );
      return await db.select().from(learningContent).where(and4(areaFilter, schoolFilter));
    }
    return await db.select().from(learningContent).where(areaFilter);
  })
});

// src/backend/server/routers/leitner.ts
import { TRPCError as TRPCError5 } from "@trpc/server";
import { z as z5 } from "zod";
import { eq as eq7, and as and5, lte, sql as sql5, or as or2, isNull, gte as gte2 } from "drizzle-orm";

// src/shared/utils/fsrs.ts
var FSRS_W = [
  0.4072,
  1.1829,
  3.1262,
  15.4722,
  7.2102,
  0.5316,
  1.0651,
  0.0589,
  1.533,
  0.1544,
  1.0071,
  1.9395,
  0.11,
  0.29,
  2.27,
  0.27,
  2.9898
];
var DECAY = -0.5;
var FACTOR = 19 / 81;
var REQUEST_RETENTION = 0.9;
var MAX_INTERVAL = 36500;
var DAY_ROLLOVER_OFFSET = 4;
function retrievability(t2, s) {
  return Math.pow(1 + FACTOR * (t2 / s), DECAY);
}
function nextInterval(stability) {
  const raw = stability / FACTOR * (Math.pow(REQUEST_RETENTION, 1 / DECAY) - 1);
  return Math.min(Math.round(raw), MAX_INTERVAL);
}
function applyFuzz(interval) {
  if (interval < 2) return interval;
  const fuzz = interval < 7 ? 1 : interval < 30 ? Math.round(interval * 0.05) : Math.round(interval * 0.08);
  return interval + Math.floor(Math.random() * (2 * fuzz + 1)) - fuzz;
}
function initStability(rating) {
  return Math.max(FSRS_W[rating - 1], 0.1);
}
function initDifficulty(rating) {
  return clamp(FSRS_W[4] - Math.exp(FSRS_W[5] * (rating - 1)) + 1, 1, 10);
}
function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}
function nextDifficulty(d, rating) {
  const delta = FSRS_W[6] * (rating - 3);
  return clamp(d - delta + FSRS_W[7] * (10 - d) * FSRS_W[7], 1, 10);
}
function shortTermStability(s, rating) {
  return s * Math.exp(FSRS_W[11] * (rating - 3 + FSRS_W[12]));
}
function nextRecallStability(d, s, r, rating) {
  const hardPenalty = rating === 2 ? FSRS_W[15] : 1;
  const easyBonus = rating === 4 ? FSRS_W[16] : 1;
  return s * (Math.exp(FSRS_W[8]) * (11 - d) * Math.pow(s, -FSRS_W[9]) * (Math.exp((1 - r) * FSRS_W[10]) - 1) * hardPenalty * easyBonus);
}
function nextForgetStability(d, s, r) {
  return FSRS_W[11] * Math.pow(d, -FSRS_W[12]) * (Math.pow(s + 1, FSRS_W[13]) - 1) * Math.exp((1 - r) * FSRS_W[14]);
}
function scheduleCard(card, rating) {
  const { stability, difficulty, elapsedDays, state, reps } = card;
  let newStability;
  let newDifficulty;
  let nextState;
  let scheduledDays;
  if (state === "new" || reps === 0) {
    newStability = initStability(rating);
    newDifficulty = initDifficulty(rating);
    if (rating === 1) {
      nextState = "learning";
      scheduledDays = 0;
    } else if (rating === 2) {
      nextState = "learning";
      scheduledDays = 1;
    } else if (rating === 3) {
      nextState = "learning";
      scheduledDays = 1;
    } else {
      nextState = "review";
      scheduledDays = applyFuzz(nextInterval(newStability));
    }
  } else if (state === "learning" || state === "relearning") {
    newStability = shortTermStability(stability, rating);
    newDifficulty = nextDifficulty(difficulty, rating);
    if (rating === 1) {
      nextState = state === "relearning" ? "relearning" : "learning";
      scheduledDays = 0;
    } else if (rating === 2) {
      nextState = "learning";
      scheduledDays = 1;
    } else {
      nextState = "review";
      scheduledDays = applyFuzz(Math.max(nextInterval(newStability), 1));
    }
  } else {
    const r = retrievability(elapsedDays, stability);
    newDifficulty = nextDifficulty(difficulty, rating);
    if (rating === 1) {
      newStability = nextForgetStability(difficulty, stability, r);
      nextState = "relearning";
      scheduledDays = 0;
    } else {
      newStability = nextRecallStability(difficulty, stability, r, rating);
      nextState = "review";
      scheduledDays = applyFuzz(nextInterval(newStability));
    }
  }
  const ret = retrievability(scheduledDays, Math.max(newStability, 0.1));
  return {
    stability: Math.max(newStability, 0.1),
    difficulty: clamp(newDifficulty, 1, 10),
    scheduledDays,
    nextState,
    retrievability: ret
  };
}
function previewIntervals(card) {
  return {
    1: scheduleCard(card, 1).scheduledDays,
    2: scheduleCard(card, 2).scheduledDays,
    3: scheduleCard(card, 3).scheduledDays,
    4: scheduleCard(card, 4).scheduledDays
  };
}
function getSessionDate(offsetHours = DAY_ROLLOVER_OFFSET) {
  const now = /* @__PURE__ */ new Date();
  const adjusted = new Date(now.getTime() - offsetHours * 60 * 60 * 1e3);
  adjusted.setHours(0, 0, 0, 0);
  return adjusted;
}
function getTodayCutoff(offsetHours = DAY_ROLLOVER_OFFSET) {
  const sessionDate = getSessionDate(offsetHours);
  const cutoff = new Date(sessionDate);
  cutoff.setDate(cutoff.getDate() + 1);
  cutoff.setHours(offsetHours, 0, 0, 0);
  return cutoff;
}
function formatInterval(days) {
  if (days === 0) return "< 1d";
  if (days < 1) return `${Math.round(days * 24)}h`;
  if (days === 1) return "1 d\xEDa";
  if (days < 30) return `${days} d\xEDas`;
  if (days < 365) return `${Math.round(days / 30)} mes${Math.round(days / 30) > 1 ? "es" : ""}`;
  return `${Math.round(days / 365)} a\xF1o${Math.round(days / 365) > 1 ? "s" : ""}`;
}

// src/backend/server/routers/leitner.ts
var leitnerRouter = router({
  // ── Obtener tarjetas pendientes de la sesión (con Day Rollover) ──────────
  getPending: protectedProcedure.input(z5.object({
    userId: z5.string(),
    limit: z5.number().default(30),
    interleave: z5.boolean().optional().default(false),
    // Mezcla estocástica de disciplinas
    deckTag: z5.string().optional()
  })).query(async ({ ctx, input }) => {
    if (ctx.userId !== input.userId) {
      throw new TRPCError5({ code: "FORBIDDEN" });
    }
    const cutoff = getTodayCutoff();
    const cards = await db.select({
      id: leitnerCards.id,
      state: leitnerCards.state,
      queue: leitnerCards.queue,
      stability: leitnerCards.stability,
      difficulty: leitnerCards.difficulty,
      reps: leitnerCards.reps,
      lapses: leitnerCards.lapses,
      scheduledDays: leitnerCards.scheduledDays,
      elapsedDays: leitnerCards.elapsedDays,
      nextReview: leitnerCards.nextReview,
      lastReview: leitnerCards.lastReview,
      level: leitnerCards.level,
      questionId: leitnerCards.questionId,
      learningContentId: leitnerCards.learningContentId,
      questionIndex: leitnerCards.questionIndex,
      question: sql5`COALESCE(${examQuestions.question}, JSON_UNQUOTE(JSON_EXTRACT(${leitnerCards.learningContentId} IS NOT NULL ? (SELECT questions FROM learning_content WHERE id = ${leitnerCards.learningContentId}) : NULL, CONCAT('$[', ${leitnerCards.questionIndex}, '].title'))))`,
      options: sql5`COALESCE(${examQuestions.options}, JSON_EXTRACT((SELECT questions FROM learning_content WHERE id = ${leitnerCards.learningContentId}), CONCAT('$[', ${leitnerCards.questionIndex}, '].options')))`,
      correctOption: sql5`COALESCE(${examQuestions.correctOption}, CAST(JSON_EXTRACT((SELECT questions FROM learning_content WHERE id = ${leitnerCards.learningContentId}), CONCAT('$[', ${leitnerCards.questionIndex}, '].correctOption')) AS UNSIGNED))`
    }).from(leitnerCards).leftJoin(examQuestions, eq7(leitnerCards.questionId, examQuestions.id)).where(and5(
      eq7(leitnerCards.userId, input.userId),
      // Excluir mazos dinámicos (-3), enterradas (-2), y suspendidas (-1)
      gte2(leitnerCards.queue, 0),
      input.deckTag ? eq7(leitnerCards.deckTag, input.deckTag) : void 0,
      or2(
        // Tarjetas nuevas
        eq7(leitnerCards.state, "new"),
        // Tarjetas en aprendizaje/reaprendizaje (siempre disponibles)
        eq7(leitnerCards.state, "learning"),
        eq7(leitnerCards.state, "relearning"),
        // Tarjetas en repaso: solo si ya vencieron
        and5(
          eq7(leitnerCards.state, "review"),
          or2(
            isNull(leitnerCards.nextReview),
            lte(leitnerCards.nextReview, cutoff)
          )
        )
      )
    )).orderBy(
      sql5`FIELD(${leitnerCards.state}, 'relearning', 'learning', 'review', 'new')`,
      input.interleave ? sql5`RAND()` : leitnerCards.nextReview
    ).limit(input.limit);
    return cards.map((card) => {
      const fsrsCard = {
        stability: card.stability,
        difficulty: card.difficulty,
        elapsedDays: card.elapsedDays,
        scheduledDays: card.scheduledDays,
        reps: card.reps,
        lapses: card.lapses,
        state: card.state
      };
      const previews = previewIntervals(fsrsCard);
      return {
        ...card,
        previewIntervals: {
          1: formatInterval(previews[1]),
          2: formatInterval(previews[2]),
          3: formatInterval(previews[3]),
          4: formatInterval(previews[4])
        }
      };
    });
  }),
  // ── Calificar una tarjeta con FSRS (4 ratings) ───────────────────────────
  reviewCard: protectedProcedure.input(z5.object({
    id: z5.number(),
    ease: z5.union([z5.literal(1), z5.literal(2), z5.literal(3), z5.literal(4)]),
    timeTaken: z5.number().optional()
    // ms
  })).mutation(async ({ ctx, input }) => {
    const [card] = await db.select().from(leitnerCards).where(eq7(leitnerCards.id, input.id));
    if (!card) throw new TRPCError5({ code: "NOT_FOUND" });
    if (card.userId !== ctx.userId) throw new TRPCError5({ code: "FORBIDDEN" });
    const now = /* @__PURE__ */ new Date();
    const lastReviewDate = card.lastReview || card.nextReview;
    const elapsedMs = lastReviewDate ? now.getTime() - new Date(lastReviewDate).getTime() : 0;
    const elapsedDays = Math.max(0, Math.round(elapsedMs / (1e3 * 60 * 60 * 24)));
    const fsrsCard = {
      stability: card.stability,
      difficulty: card.difficulty,
      elapsedDays,
      scheduledDays: card.scheduledDays,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state
    };
    const result = scheduleCard(fsrsCard, input.ease);
    const nextReview = /* @__PURE__ */ new Date();
    if (result.scheduledDays === 0) {
      nextReview.setMinutes(nextReview.getMinutes() + 10);
    } else {
      nextReview.setDate(nextReview.getDate() + result.scheduledDays);
      nextReview.setHours(4, 0, 0, 0);
    }
    const newQueue = result.nextState === "new" ? 0 : result.nextState === "learning" ? 1 : result.nextState === "review" ? 2 : 3;
    const newLapses = input.ease === 1 ? card.lapses + 1 : card.lapses;
    await db.update(leitnerCards).set({
      stability: result.stability,
      difficulty: result.difficulty,
      state: result.nextState,
      reps: card.reps + 1,
      lapses: newLapses,
      scheduledDays: result.scheduledDays,
      elapsedDays,
      queue: newQueue,
      nextReview,
      lastReview: now,
      level: Math.min((card.level || 0) + (input.ease >= 3 ? 1 : 0), 5)
    }).where(eq7(leitnerCards.id, input.id));
    const [log] = await db.insert(reviewLogs).values({
      cardId: card.id,
      userId: ctx.userId,
      ease: input.ease,
      scheduledDays: result.scheduledDays,
      elapsedDays,
      stabilityBefore: card.stability,
      stabilityAfter: result.stability,
      difficultyBefore: card.difficulty,
      difficultyAfter: result.difficulty,
      stateBefore: card.state,
      stateAfter: result.nextState,
      timeTaken: input.timeTaken
    }).$returningId();
    await db.update(users).set({
      flashcardUndoState: {
        cardId: card.id,
        previousState: {
          stability: card.stability,
          difficulty: card.difficulty,
          state: card.state,
          reps: card.reps,
          lapses: card.lapses,
          scheduledDays: card.scheduledDays,
          elapsedDays: card.elapsedDays,
          queue: card.queue,
          nextReview: card.nextReview,
          lastReview: card.lastReview,
          level: card.level
        },
        reviewLogId: log?.id
      }
    }).where(eq7(users.uid, ctx.userId));
    if (input.ease >= 3) {
      await db.update(users).set({ honorPoints: sql5`${users.honorPoints} + 5` }).where(eq7(users.uid, ctx.userId));
    }
    const achievementsUnlocked = [];
    const [stats] = await db.select({ totalReps: sql5`SUM(${leitnerCards.reps})` }).from(leitnerCards).where(eq7(leitnerCards.userId, ctx.userId));
    const reps = Number(stats?.totalReps || 0);
    if (reps >= 50) {
      const ach = await unlockAchievement(ctx.userId, "FLASH_50");
      if (ach) achievementsUnlocked.push(ach);
    }
    if (reps >= 500) {
      const ach = await unlockAchievement(ctx.userId, "FLASH_500");
      if (ach) achievementsUnlocked.push(ach);
    }
    return {
      success: true,
      nextReview,
      scheduledDays: result.scheduledDays,
      nextState: result.nextState,
      retrievability: Math.round(result.retrievability * 100),
      achievementsUnlocked
    };
  }),
  // ── Deshacer última calificación (Undo/Ctrl+Z) ───────────────────────────
  undoLastReview: protectedProcedure.mutation(async ({ ctx }) => {
    const [user] = await db.select({ flashcardUndoState: users.flashcardUndoState }).from(users).where(eq7(users.uid, ctx.userId));
    const entry = user?.flashcardUndoState;
    if (!entry || !entry.cardId) throw new TRPCError5({ code: "NOT_FOUND", message: "No hay evaluaci\xF3n para deshacer." });
    await db.update(leitnerCards).set({
      stability: entry.previousState.stability,
      difficulty: entry.previousState.difficulty,
      state: entry.previousState.state,
      reps: entry.previousState.reps,
      lapses: entry.previousState.lapses,
      scheduledDays: entry.previousState.scheduledDays,
      elapsedDays: entry.previousState.elapsedDays,
      queue: entry.previousState.queue,
      nextReview: entry.previousState.nextReview ? new Date(entry.previousState.nextReview) : null,
      lastReview: entry.previousState.lastReview ? new Date(entry.previousState.lastReview) : null,
      level: entry.previousState.level
    }).where(eq7(leitnerCards.id, entry.cardId));
    if (entry.reviewLogId) {
      await db.delete(reviewLogs).where(eq7(reviewLogs.id, entry.reviewLogId));
    }
    await db.update(users).set({ flashcardUndoState: null }).where(eq7(users.uid, ctx.userId));
    return { success: true };
  }),
  // ── Estadísticas de Sesión ────────────────────────────────────────────────
  getStats: protectedProcedure.input(z5.object({ userId: z5.string() })).query(async ({ ctx, input }) => {
    if (ctx.userId !== input.userId) throw new TRPCError5({ code: "FORBIDDEN" });
    const cutoff = getTodayCutoff();
    const execResult = await db.execute(sql5`
        SELECT
          COUNT(CASE WHEN state = 'new' AND queue >= 0 THEN 1 END) as new_count,
          COUNT(CASE WHEN state IN ('learning','relearning') AND queue >= 0 THEN 1 END) as learning_count,
          COUNT(CASE WHEN state = 'review' AND queue >= 0 AND (next_review IS NULL OR next_review <= ${cutoff}) THEN 1 END) as review_count,
          COUNT(CASE WHEN queue >= 0 THEN 1 END) as total_count
        FROM leitner_cards
        WHERE user_id = ${input.userId}
      `);
    const row = execResult[0][0];
    return {
      newCount: Number(row?.new_count || 0),
      learningCount: Number(row?.learning_count || 0),
      reviewCount: Number(row?.review_count || 0),
      totalCount: Number(row?.total_count || 0),
      count: Number(row?.new_count || 0) + Number(row?.learning_count || 0) + Number(row?.review_count || 0)
    };
  }),
  // ── Telemetría: Retención Real + Carga Proyectada + Distribución ─────────
  getAnalytics: protectedProcedure.input(z5.object({ userId: z5.string() })).query(async ({ ctx, input }) => {
    if (ctx.userId !== input.userId) throw new TRPCError5({ code: "FORBIDDEN" });
    const [analyticsResult, forecastResult, diffResult] = await Promise.all([
      db.execute(sql5`
          SELECT
            DATE(reviewed_at) as day,
            ROUND(COUNT(CASE WHEN ease > 1 THEN 1 END) * 100.0 / COUNT(*), 1) as retention_pct,
            COUNT(*) as total_reviews
          FROM review_logs
          WHERE user_id = ${input.userId}
            AND reviewed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          GROUP BY DATE(reviewed_at)
          ORDER BY day ASC
        `),
      db.execute(sql5`
          SELECT
            DATE(next_review) as due_date,
            COUNT(*) as cards_due
          FROM leitner_cards
          WHERE user_id = ${input.userId}
            AND queue >= 0
            AND next_review BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 DAY)
          GROUP BY DATE(next_review)
          ORDER BY due_date ASC
        `),
      db.execute(sql5`
          SELECT
            CASE
              WHEN difficulty <= 3 THEN 'Fácil'
              WHEN difficulty <= 6 THEN 'Moderada'
              ELSE 'Difícil'
            END as difficulty_band,
            COUNT(*) as count
          FROM leitner_cards
          WHERE user_id = ${input.userId} AND queue >= 0
          GROUP BY difficulty_band
        `)
    ]);
    const retentionRows = analyticsResult[0];
    const forecastRows = forecastResult[0];
    const diffRows = diffResult[0];
    return {
      retention: retentionRows,
      forecast: forecastRows,
      difficulty: diffRows
    };
  }),
  // ── Métodos legacy (compatibilidad hacia atrás) ───────────────────────────
  updateCard: protectedProcedure.input(z5.object({ id: z5.number(), success: z5.boolean() })).mutation(async ({ ctx, input }) => {
    const ease = input.success ? 3 : 1;
    const [card] = await db.select().from(leitnerCards).where(eq7(leitnerCards.id, input.id));
    if (!card) throw new TRPCError5({ code: "NOT_FOUND" });
    if (card.userId !== ctx.userId) throw new TRPCError5({ code: "FORBIDDEN" });
    const fsrsCard = {
      stability: card.stability,
      difficulty: card.difficulty,
      elapsedDays: card.elapsedDays,
      scheduledDays: card.scheduledDays,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state
    };
    const result = scheduleCard(fsrsCard, ease);
    const nextReview = /* @__PURE__ */ new Date();
    nextReview.setDate(nextReview.getDate() + Math.max(result.scheduledDays, 1));
    await db.update(leitnerCards).set({
      stability: result.stability,
      difficulty: result.difficulty,
      state: result.nextState,
      reps: card.reps + 1,
      lapses: ease === 1 ? card.lapses + 1 : card.lapses,
      scheduledDays: result.scheduledDays,
      nextReview,
      queue: result.nextState === "review" ? 2 : 1,
      level: Math.min((card.level || 0) + (input.success ? 1 : 0), 5)
    }).where(eq7(leitnerCards.id, input.id));
    return { success: true, nextLevel: card.level, nextReview };
  }),
  getStatsByArea: protectedProcedure.input(z5.object({ userId: z5.string() })).query(async ({ ctx, input }) => {
    if (ctx.userId !== input.userId) throw new TRPCError5({ code: "FORBIDDEN" });
    const stats = await db.select({
      areaName: sql5`la.name`,
      count: sql5`count(${leitnerCards.id})`
    }).from(leitnerCards).innerJoin(sql5`exam_questions eq`, sql5`eq.id = ${leitnerCards.questionId}`).innerJoin(sql5`learning_areas la`, sql5`la.id = eq.area_id`).where(eq7(leitnerCards.userId, input.userId)).groupBy(sql5`la.name`);
    return stats;
  }),
  // ── Ecosistema: Reentrenamiento sincroniza FSRS por questionId ────────────
  // El Reentrenamiento no conoce el card.id, solo el questionId
  reviewByQuestionId: protectedProcedure.input(z5.object({
    questionId: z5.number(),
    ease: z5.union([z5.literal(1), z5.literal(2), z5.literal(3), z5.literal(4)]),
    timeTaken: z5.number().optional()
  })).mutation(async ({ ctx, input }) => {
    let [card] = await db.select().from(leitnerCards).where(and5(
      eq7(leitnerCards.userId, ctx.userId),
      eq7(leitnerCards.questionId, input.questionId)
    ));
    if (!card) {
      const nextReview2 = /* @__PURE__ */ new Date();
      nextReview2.setMinutes(nextReview2.getMinutes() + 5);
      await db.insert(leitnerCards).values({
        userId: ctx.userId,
        questionId: input.questionId,
        state: "learning",
        queue: 1,
        stability: 0.1,
        difficulty: 5,
        reps: 0,
        lapses: 0,
        scheduledDays: 0,
        elapsedDays: 0,
        level: 1,
        nextReview: nextReview2
      });
      [card] = await db.select().from(leitnerCards).where(and5(
        eq7(leitnerCards.userId, ctx.userId),
        eq7(leitnerCards.questionId, input.questionId)
      ));
    }
    if (!card) return { success: false };
    const now = /* @__PURE__ */ new Date();
    const lastReviewDate = card.lastReview || card.nextReview;
    const elapsedMs = lastReviewDate ? now.getTime() - new Date(lastReviewDate).getTime() : 0;
    const elapsedDays = Math.max(0, Math.round(elapsedMs / (1e3 * 60 * 60 * 24)));
    const fsrsCard = {
      stability: card.stability,
      difficulty: card.difficulty,
      elapsedDays,
      scheduledDays: card.scheduledDays,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state
    };
    const result = scheduleCard(fsrsCard, input.ease);
    const nextReview = /* @__PURE__ */ new Date();
    if (result.scheduledDays === 0) {
      nextReview.setMinutes(nextReview.getMinutes() + 10);
    } else {
      nextReview.setDate(nextReview.getDate() + result.scheduledDays);
    }
    await db.update(leitnerCards).set({
      stability: result.stability,
      difficulty: result.difficulty,
      state: result.nextState,
      reps: card.reps + 1,
      lapses: input.ease === 1 ? card.lapses + 1 : card.lapses,
      scheduledDays: result.scheduledDays,
      elapsedDays,
      queue: result.nextState === "review" ? 2 : result.nextState === "learning" ? 1 : 3,
      nextReview,
      lastReview: now
    }).where(eq7(leitnerCards.id, card.id));
    console.log(`[ECOSYSTEM] Reentrenamiento\u2192FSRS: q#${input.questionId} ease=${input.ease} \u2192 ${result.nextState} (+${result.scheduledDays}d)`);
    return { success: true, scheduledDays: result.scheduledDays, nextState: result.nextState };
  }),
  getCountByLevel: protectedProcedure.input(z5.object({ userId: z5.string(), level: z5.number() })).query(async ({ ctx, input }) => {
    if (ctx.userId !== input.userId) throw new TRPCError5({ code: "FORBIDDEN" });
    const [res] = await db.select({ count: sql5`count(*)` }).from(leitnerCards).where(and5(eq7(leitnerCards.userId, input.userId), eq7(leitnerCards.level, input.level)));
    return res?.count || 0;
  }),
  // ── Ecosistema: Sembrar flashcards desde preguntas específicas (ej. desde Galería) ──
  seedFromQuestions: protectedProcedure.input(z5.object({
    questionIds: z5.array(z5.number()).min(1).max(50)
  })).mutation(async ({ ctx, input }) => {
    let created = 0;
    let skipped = 0;
    for (const questionId of input.questionIds) {
      const [existing] = await db.select({ id: leitnerCards.id }).from(leitnerCards).where(and5(
        eq7(leitnerCards.userId, ctx.userId),
        eq7(leitnerCards.questionId, questionId)
      ));
      if (existing) {
        skipped++;
        continue;
      }
      const nextReview = /* @__PURE__ */ new Date();
      nextReview.setMinutes(nextReview.getMinutes() + 5);
      await db.insert(leitnerCards).values({
        userId: ctx.userId,
        questionId,
        state: "learning",
        queue: 1,
        stability: 0.1,
        difficulty: 5.5,
        // leve dificultad extra por ser contenido nuevo de galería
        reps: 0,
        lapses: 0,
        scheduledDays: 0,
        elapsedDays: 0,
        level: 0,
        nextReview
      });
      created++;
    }
    console.log(`[ECOSYSTEM] Galer\xEDa\u2192FSRS: ${created} tarjetas creadas, ${skipped} ya exist\xEDan para ${ctx.userId}`);
    return { created, skipped };
  }),
  // ── Motor de Búsqueda FULLTEXT ─────────────────────────────────────────
  searchCards: protectedProcedure.input(z5.object({ userId: z5.string(), query: z5.string().min(2) })).query(async ({ ctx, input }) => {
    if (ctx.userId !== input.userId) throw new TRPCError5({ code: "FORBIDDEN" });
    const results = await db.select({
      id: leitnerCards.id,
      state: leitnerCards.state,
      question: examQuestions.question,
      deckTag: leitnerCards.deckTag
    }).from(leitnerCards).leftJoin(examQuestions, eq7(leitnerCards.questionId, examQuestions.id)).where(and5(
      eq7(leitnerCards.userId, input.userId),
      or2(
        sql5`MATCH(${examQuestions.question}) AGAINST (${input.query} IN BOOLEAN MODE)`,
        eq7(leitnerCards.deckTag, input.query)
      )
    )).limit(50);
    return results;
  }),
  // ── Pila de Reversión (Undo / Ctrl+Z) ──
  clearUndo: protectedProcedure.mutation(async ({ ctx }) => {
    await db.update(users).set({ flashcardUndoState: null }).where(eq7(users.uid, ctx.userId));
    return { success: true };
  })
});

// src/backend/server/routers/membership_admin.ts
import { z as z6 } from "zod";
import { eq as eq8, sql as sql6, and as and6, like, or as or3 } from "drizzle-orm";
import { TRPCError as TRPCError6 } from "@trpc/server";
var adminRouter = router({
  // ─── BROADCAST (Alerta Roja) ───
  getActiveBroadcast: publicProcedure.query(async () => {
    const [active] = await db.select().from(globalNotifications).where(
      and6(
        sql6`${globalNotifications.isActive} = 1`,
        sql6`(${globalNotifications.expiresAt} IS NULL OR ${globalNotifications.expiresAt} > NOW())`
      )
    ).orderBy(sql6`${globalNotifications.createdAt} desc`).limit(1);
    return active || null;
  }),
  // ─── STATS ───
  getAdminStats: adminProcedure.query(async () => {
    const [userCounts] = await db.select({
      total: sql6`count(${users.uid})`,
      premium: sql6`sum(case when ${users.membership} = 'PRO' then 1 else 0 end)`,
      free: sql6`sum(case when ${users.membership} = 'FREE' then 1 else 0 end)`,
      activeUsers: sql6`sum(case when ${users.lastActive} >= NOW() - INTERVAL 5 MINUTE then 1 else 0 end)`
    }).from(users);
    const [revenueObj] = await db.select({
      dailyIncome: sql6`sum(case when DATE(${adminLogs.createdAt}) = CURDATE() AND ${adminLogs.action} LIKE '%MANUAL_OVERRIDE: Set % to PRO' then 145 else 0 end)`
    }).from(adminLogs);
    const [questionsStats] = await db.select({
      total: sql6`count(${examQuestions.id})`
    }).from(examQuestions);
    const stats = {
      totalUsers: Number(userCounts?.total) || 0,
      proUsers: Number(userCounts?.premium) || 0,
      freeUsers: Number(userCounts?.free) || 0,
      onlineCount: Number(userCounts?.activeUsers) || 0,
      dailyRevenue: Number(revenueObj?.dailyIncome) || 0,
      totalQuestions: Number(questionsStats?.total) || 0,
      totalContent: 0
    };
    return stats;
  }),
  // ─── DASHBOARD STATS ───
  getDashboardStats: adminProcedure.query(async () => {
    const [counts] = await db.select({
      total: sql6`count(${users.uid})`,
      pro: sql6`sum(case when ${users.membership} = 'PRO' then 1 else 0 end)`,
      free: sql6`sum(case when ${users.membership} = 'FREE' then 1 else 0 end)`,
      active: sql6`sum(case when ${users.status} = 'ACTIVE' then 1 else 0 end)`,
      blocked: sql6`sum(case when ${users.status} = 'BLOCKED' then 1 else 0 end)`,
      online: sql6`sum(case when ${users.lastActive} >= NOW() - INTERVAL 5 MINUTE then 1 else 0 end)`
    }).from(users);
    return {
      totalUsers: Number(counts?.total) || 0,
      proUsers: Number(counts?.pro) || 0,
      freeUsers: Number(counts?.free) || 0,
      activeUsers: Number(counts?.active) || 0,
      blockedUsers: Number(counts?.blocked) || 0,
      onlineNow: Number(counts?.online) || 0
    };
  }),
  // ─── USER MANAGEMENT ───
  getUsers: adminProcedure.input(z6.object({ search: z6.string().optional() })).query(async ({ input }) => {
    const filters = [];
    if (input?.search) {
      filters.push(or3(
        like(users.name, `%${input.search}%`),
        like(users.uid, `%${input.search}%`),
        like(users.email, `%${input.search}%`)
      ));
    }
    const whereClause = filters.length > 0 ? and6(...filters) : void 0;
    return await db.select(USER_FIELDS).from(users).where(whereClause).orderBy(sql6`${users.createdAt} desc`);
  }),
  updateUserMembership: adminProcedure.input(z6.object({
    uid: z6.string(),
    membership: z6.enum(["FREE", "PRO"])
  })).mutation(async ({ input }) => {
    console.log(`[ADMIN] Updating membership for ${input.uid} to ${input.membership}`);
    const expiration = input.membership === "PRO" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3) : null;
    await db.update(users).set({
      membership: input.membership,
      premiumExpiration: expiration
    }).where(eq8(users.uid, input.uid));
    await db.insert(adminLogs).values({
      action: `MANUAL_OVERRIDE: Set ${input.uid} to ${input.membership}`
    });
    return { success: true };
  }),
  updateUserStatus: adminProcedure.input(z6.object({
    targetUid: z6.string(),
    membership: z6.enum(["FREE", "PRO"]).optional(),
    status: z6.enum(["ACTIVE", "BLOCKED"]).optional()
  })).mutation(async ({ input }) => {
    if (input.membership) {
      const expiration = input.membership === "PRO" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3) : null;
      await db.update(users).set({ membership: input.membership, premiumExpiration: expiration }).where(eq8(users.uid, input.targetUid));
    }
    if (input.status) {
      await db.update(users).set({ status: input.status }).where(eq8(users.uid, input.targetUid));
    }
    return { success: true };
  }),
  sendBroadcast: adminProcedure.input(z6.object({
    title: z6.string(),
    message: z6.string(),
    type: z6.enum(["INFO", "WARNING", "EVENT"]).default("WARNING"),
    durationMinutes: z6.number().default(30)
  })).mutation(async ({ input, ctx }) => {
    await db.update(globalNotifications).set({ isActive: false });
    await db.insert(globalNotifications).values({
      title: input.title,
      message: input.message,
      type: input.type,
      isActive: true,
      expiresAt: new Date(Date.now() + input.durationMinutes * 60 * 1e3)
    });
    if (ctx.io) {
      ctx.io.emit("system_broadcast", {
        id: Date.now(),
        title: input.title,
        message: input.message,
        type: input.type
      });
    }
    return { success: true };
  }),
  deleteUser: adminProcedure.input(z6.object({ uid: z6.string() })).mutation(async ({ input }) => {
    console.log(`[ADMIN] DELETING USER: ${input.uid}`);
    await db.delete(users).where(eq8(users.uid, input.uid));
    await db.insert(adminLogs).values({
      action: `DELETE_USER: Removed ${input.uid} from system`
    });
    return { success: true };
  }),
  updateUserSchool: adminProcedure.input(z6.object({
    uid: z6.string(),
    school: z6.enum(["EO", "EESTP"])
  })).mutation(async ({ input }) => {
    await db.update(users).set({ school: input.school }).where(eq8(users.uid, input.uid));
    await db.insert(adminLogs).values({
      action: `Changed school for ${input.uid} to ${input.school}`
    });
    const [updatedUser] = await db.select(USER_FIELDS).from(users).where(eq8(users.uid, input.uid));
    return { success: true, user: updatedUser };
  }),
  getActiveCount: adminProcedure.query(async () => {
    const [result] = await db.select({
      count: sql6`count(${users.uid})`
    }).from(users).where(sql6`${users.lastActive} >= NOW() - INTERVAL 5 MINUTE`);
    return { count: result.count || 0 };
  }),
  toggleAdminRole: adminProcedure.input(z6.object({ uid: z6.string(), isAdmin: z6.boolean() })).mutation(async ({ input }) => {
    await db.update(users).set({ role: input.isAdmin ? "admin" : "user" }).where(eq8(users.uid, input.uid));
    await db.insert(adminLogs).values({
      action: `Set ${input.uid} role to ${input.isAdmin ? "admin" : "user"}`
    });
    return { success: true };
  }),
  // ─── LEARNING CONTENT CRUD ───
  getAreas: adminProcedure.query(async () => {
    return await db.select().from(learningAreas);
  }),
  createArea: adminProcedure.input(z6.object({
    name: z6.string().min(1).max(100),
    icon: z6.string().max(50).optional()
  })).mutation(async ({ input }) => {
    const [result] = await db.insert(learningAreas).values(input);
    await db.insert(adminLogs).values({ action: `Created area: ${input.name}` });
    return { success: true, id: result.insertId };
  }),
  getContent: adminProcedure.input(z6.object({ areaId: z6.number().optional() }).optional()).query(async ({ input }) => {
    if (input?.areaId) {
      return await db.select().from(learningContent).where(eq8(learningContent.areaId, input.areaId));
    }
    return await db.select().from(learningContent);
  }),
  createContent: adminProcedure.input(z6.object({
    areaId: z6.number(),
    title: z6.string().min(1).max(255),
    body: z6.string().min(1),
    level: z6.number().min(1).max(10).default(1),
    schoolType: z6.enum(["EO", "EESTP", "BOTH"]).default("BOTH")
  })).mutation(async ({ input }) => {
    const [result] = await db.insert(learningContent).values(input);
    await db.insert(adminLogs).values({ action: `Created content: ${input.title}` });
    return { success: true, id: result.insertId };
  }),
  updateContent: adminProcedure.input(z6.object({
    id: z6.number(),
    title: z6.string().min(1).max(255).optional(),
    body: z6.string().min(1).optional(),
    level: z6.number().min(1).max(10).optional(),
    schoolType: z6.enum(["EO", "EESTP", "BOTH"]).optional()
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await db.update(learningContent).set(data).where(eq8(learningContent.id, id));
    await db.insert(adminLogs).values({ action: `Updated content #${id}` });
    return { success: true };
  }),
  deleteContent: adminProcedure.input(z6.object({ id: z6.number() })).mutation(async ({ input }) => {
    await db.delete(learningContent).where(eq8(learningContent.id, input.id));
    await db.insert(adminLogs).values({ action: `Deleted content #${input.id}` });
    return { success: true };
  }),
  // ─── EXAM QUESTIONS CRUD ───
  getQuestions: adminProcedure.input(z6.object({
    areaId: z6.number().optional(),
    difficulty: z6.enum(["EASY", "MEDIUM", "HARD"]).optional(),
    schoolType: z6.enum(["EO", "EESTP", "BOTH"]).optional()
  }).optional()).query(async ({ input }) => {
    const filters = [];
    if (input?.areaId) filters.push(eq8(examQuestions.areaId, input.areaId));
    if (input?.difficulty) filters.push(eq8(examQuestions.difficulty, input.difficulty));
    if (input?.schoolType) filters.push(eq8(examQuestions.schoolType, input.schoolType));
    const whereClause = filters.length > 0 ? and6(...filters) : void 0;
    return await db.select().from(examQuestions).where(whereClause).limit(200);
  }),
  createQuestion: adminProcedure.input(z6.object({
    areaId: z6.number(),
    question: z6.string().min(1),
    options: z6.array(z6.string()).min(2).max(6),
    correctOption: z6.number().min(0),
    difficulty: z6.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
    schoolType: z6.enum(["EO", "EESTP", "BOTH"]).default("BOTH")
  })).mutation(async ({ input }) => {
    if (input.correctOption >= input.options.length) {
      throw new TRPCError6({ code: "BAD_REQUEST", message: "correctOption index out of bounds" });
    }
    const [result] = await db.insert(examQuestions).values(input);
    await db.insert(adminLogs).values({ action: `Created question #${result.insertId}` });
    return { success: true, id: result.insertId };
  }),
  updateQuestion: adminProcedure.input(z6.object({
    id: z6.number(),
    question: z6.string().min(1).optional(),
    options: z6.array(z6.string()).min(2).max(6).optional(),
    correctOption: z6.number().min(0).optional(),
    difficulty: z6.enum(["EASY", "MEDIUM", "HARD"]).optional(),
    schoolType: z6.enum(["EO", "EESTP", "BOTH"]).optional()
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await db.update(examQuestions).set(data).where(eq8(examQuestions.id, id));
    await db.insert(adminLogs).values({ action: `Updated question #${id}` });
    return { success: true };
  }),
  deleteQuestion: adminProcedure.input(z6.object({ id: z6.number() })).mutation(async ({ input }) => {
    await db.delete(examQuestions).where(eq8(examQuestions.id, input.id));
    await db.insert(adminLogs).values({ action: `Deleted question #${input.id}` });
    return { success: true };
  }),
  bulkIngestQuestions: adminProcedure.input(z6.array(z6.object({
    areaId: z6.number(),
    question: z6.string(),
    options: z6.array(z6.string()),
    correctOption: z6.number(),
    difficulty: z6.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
    schoolType: z6.enum(["EO", "EESTP", "BOTH"]).default("BOTH")
  }))).mutation(async ({ input }) => {
    if (input.length === 0) return { success: true, count: 0 };
    await db.insert(examQuestions).values(input);
    await db.insert(adminLogs).values({
      action: `Bulk ingested ${input.length} questions`
    });
    return { success: true, count: input.length };
  }),
  // ─── ADMIN LOGS ───
  getLogs: adminProcedure.input(z6.object({ limit: z6.number().min(1).max(100).default(50) }).optional()).query(async ({ input }) => {
    return await db.select().from(adminLogs).orderBy(sql6`${adminLogs.createdAt} desc`).limit(input?.limit || 50);
  })
});

// src/backend/server/routers/admin_exams.ts
import { z as z7 } from "zod";
import { eq as eq10, and as and8, desc as desc3 } from "drizzle-orm";

// src/backend/server/utils/examIngest.ts
import fs from "fs";
import path from "path";
import { eq as eq9, and as and7 } from "drizzle-orm";
async function ingestLocalExams(overwrite = false) {
  const results = [];
  try {
    const examsDir = path.join(process.cwd(), "data", "exams");
    if (!fs.existsSync(examsDir)) {
      console.warn(`[INGEST] Exams directory not found: ${examsDir}`);
      return [];
    }
    const files = fs.readdirSync(examsDir).filter((f) => f.endsWith(".json"));
    console.log(`[INGEST] Found ${files.length} exam files.`);
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(examsDir, file), "utf-8");
        const data = JSON.parse(content);
        const levelMatch = file.match(/(\d+)/);
        const levelNum = data.level || (levelMatch ? parseInt(levelMatch[0], 10) : 1);
        const school = data.school;
        if (!school || !levelNum) {
          results.push({ file, success: false, error: "Missing school or level in JSON/filename" });
          continue;
        }
        const existing = await db.select().from(exams).where(and7(eq9(exams.school, school), eq9(exams.level, levelNum)));
        if (existing.length > 0) {
          if (!overwrite) {
            results.push({ file, success: true, alreadyExists: true });
            continue;
          }
          const examId2 = existing[0].id;
          await db.delete(examQuestions).where(eq9(examQuestions.examId, examId2));
          await db.delete(exams).where(eq9(exams.id, examId2));
          console.log(`[INGEST] Overwriting ${school} Level ${levelNum}...`);
        }
        const [newExam] = await db.insert(exams).values({
          school,
          level: levelNum,
          title: data.title || `Nivel ${levelNum.toString().padStart(2, "0")}`,
          isDemo: levelNum === 1
        });
        const examId = newExam.insertId;
        if (data.questions && data.questions.length > 0) {
          const questionValues = data.questions.map((q) => ({
            examId: Number(examId),
            areaId: q.areaId || 1,
            question: q.question,
            options: q.options,
            correctOption: q.correctOption,
            difficulty: q.difficulty || "MEDIUM",
            schoolType: school
          }));
          await db.insert(examQuestions).values(questionValues);
          results.push({ file, success: true, importedQuestions: data.questions.length });
        } else {
          results.push({ file, success: true, importedQuestions: 0 });
        }
      } catch (err) {
        results.push({ file, success: false, error: err.message });
      }
    }
  } catch (error) {
    console.error("[INGEST] Global failure:", error);
  }
  return results;
}

// src/backend/server/routers/admin_exams.ts
var adminExamRouter = router({
  /** Upload a new exam level */
  uploadExam: adminProcedure.input(z7.object({
    school: z7.enum(["EO", "EESTP"]),
    level: z7.number().optional(),
    title: z7.string().optional(),
    isDemo: z7.boolean().optional().default(false),
    questions: z7.array(z7.object({
      question: z7.string(),
      options: z7.array(z7.string()),
      correctOption: z7.number(),
      areaId: z7.number().optional().default(1),
      difficulty: z7.enum(["EASY", "MEDIUM", "HARD"]).optional().default("MEDIUM")
    }))
  })).mutation(async ({ input }) => {
    let finalLevel = input.level;
    if (!finalLevel) {
      const [lastExam] = await db.select().from(exams).where(eq10(exams.school, input.school)).orderBy(desc3(exams.level)).limit(1);
      finalLevel = (lastExam?.level || 0) + 1;
    }
    const finalTitle = input.title || `Nivel ${finalLevel.toString().padStart(2, "0")}`;
    return await db.transaction(async (tx) => {
      let [existing] = await tx.select().from(exams).where(and8(eq10(exams.school, input.school), eq10(exams.level, finalLevel)));
      if (existing) {
        await tx.delete(examQuestions).where(eq10(examQuestions.examId, existing.id));
        await tx.update(exams).set({ title: finalTitle, isDemo: input.isDemo }).where(eq10(exams.id, existing.id));
      } else {
        const [newExam] = await tx.insert(exams).values({
          school: input.school,
          level: finalLevel,
          title: finalTitle,
          isDemo: input.isDemo
        });
        existing = { id: newExam.insertId };
      }
      const examId = existing.id;
      if (input.questions.length > 0) {
        await tx.insert(examQuestions).values(
          input.questions.map((q) => ({
            examId,
            areaId: q.areaId,
            question: q.question,
            options: q.options,
            correctOption: q.correctOption,
            difficulty: q.difficulty,
            schoolType: input.school
          }))
        );
      }
      return { success: true, level: finalLevel, examId };
    });
  }),
  /** Force sync with local JSON files */
  syncLocalExams: adminProcedure.input(z7.object({ overwrite: z7.boolean().default(false) })).mutation(async ({ input }) => {
    const results = await ingestLocalExams(input.overwrite);
    return { success: true, results };
  }),
  /** Get all exams for management */
  getExams: adminProcedure.query(async () => {
    return await db.select().from(exams).orderBy(desc3(exams.createdAt));
  }),
  /** Delete an exam and its questions */
  deleteExam: adminProcedure.input(z7.object({ examId: z7.number() })).mutation(async ({ input }) => {
    return await db.transaction(async (tx) => {
      await tx.delete(examQuestions).where(eq10(examQuestions.examId, input.examId));
      await tx.delete(examMaterials).where(eq10(examMaterials.examId, input.examId));
      await tx.delete(exams).where(eq10(exams.id, input.examId));
      return { success: true };
    });
  }),
  /** Add material to an exam level */
  addMaterial: adminProcedure.input(z7.object({
    examId: z7.number(),
    title: z7.string(),
    url: z7.string().url()
  })).mutation(async ({ input }) => {
    await db.insert(examMaterials).values({
      examId: input.examId,
      title: input.title,
      url: input.url
    });
    return { success: true };
  }),
  /** Get materials for a specific exam */
  getMaterials: adminProcedure.input(z7.object({ examId: z7.number() })).query(async ({ input }) => {
    return await db.select().from(examMaterials).where(eq10(examMaterials.examId, input.examId)).orderBy(desc3(examMaterials.createdAt));
  }),
  /** Delete a specific material */
  deleteMaterial: adminProcedure.input(z7.object({ id: z7.number() })).mutation(async ({ input }) => {
    await db.delete(examMaterials).where(eq10(examMaterials.id, input.id));
    return { success: true };
  })
});

// src/backend/server/routers/admin_courses.ts
import { z as z8 } from "zod";
import { eq as eq11, desc as desc4, and as and9 } from "drizzle-orm";
import { TRPCError as TRPCError7 } from "@trpc/server";
var adminCourseRouter = router({
  /* -------------------------------------------------------------------------- */
  /*                            COURSE MANAGEMENT                               */
  /* -------------------------------------------------------------------------- */
  getCourses: protectedProcedure.query(async () => {
    return await db.select().from(courses).orderBy(desc4(courses.createdAt));
  }),
  createCourse: adminProcedure.input(z8.object({
    title: z8.string().min(1).max(255),
    description: z8.string().optional(),
    thumbnailUrl: z8.string().optional(),
    level: z8.enum(["BASICO", "INTERMEDIO", "AVANZADO"]).default("BASICO"),
    schoolType: z8.enum(["EO", "EESTP", "BOTH"]).default("BOTH"),
    isPublished: z8.boolean().default(false)
  })).mutation(async ({ input }) => {
    const [newCourse] = await db.insert(courses).values({
      title: input.title,
      description: input.description,
      thumbnailUrl: input.thumbnailUrl,
      level: input.level,
      schoolType: input.schoolType,
      isPublished: input.isPublished
    });
    return { success: true, courseId: newCourse.insertId };
  }),
  updateCourse: adminProcedure.input(z8.object({
    courseId: z8.number(),
    data: z8.object({
      title: z8.string().min(1).max(255).optional(),
      description: z8.string().optional(),
      thumbnailUrl: z8.string().optional(),
      level: z8.enum(["BASICO", "INTERMEDIO", "AVANZADO"]).optional(),
      schoolType: z8.enum(["EO", "EESTP", "BOTH"]).optional(),
      isPublished: z8.boolean().optional()
    })
  })).mutation(async ({ input }) => {
    await db.update(courses).set(input.data).where(eq11(courses.id, input.courseId));
    return { success: true };
  }),
  deleteCourse: adminProcedure.input(z8.object({ courseId: z8.number() })).mutation(async ({ input }) => {
    await db.transaction(async (tx) => {
      await tx.delete(courseMaterials).where(eq11(courseMaterials.courseId, input.courseId));
      await tx.delete(courses).where(eq11(courses.id, input.courseId));
    });
    return { success: true };
  }),
  /* -------------------------------------------------------------------------- */
  /*                          MATERIAL MANAGEMENT                               */
  /* -------------------------------------------------------------------------- */
  getCourseMaterials: protectedProcedure.input(z8.object({ courseId: z8.number() })).query(async ({ input }) => {
    return await db.select().from(courseMaterials).where(eq11(courseMaterials.courseId, input.courseId)).orderBy(courseMaterials.order);
  }),
  addMaterialToCourse: adminProcedure.input(z8.object({
    courseId: z8.number(),
    title: z8.string().min(1).max(255),
    type: z8.enum(["PDF", "VIDEO", "EXAM", "LINK", "TEXT"]),
    contentUrl: z8.string().optional(),
    order: z8.number().default(0)
  })).mutation(async ({ input }) => {
    const [newMaterial] = await db.insert(courseMaterials).values({
      courseId: input.courseId,
      title: input.title,
      type: input.type,
      contentUrl: input.contentUrl,
      order: input.order
    });
    return { success: true, materialId: newMaterial.insertId };
  }),
  deleteCourseMaterial: adminProcedure.input(z8.object({ materialId: z8.number() })).mutation(async ({ input }) => {
    await db.delete(courseMaterials).where(eq11(courseMaterials.id, input.materialId));
    return { success: true };
  }),
  /* -------------------------------------------------------------------------- */
  /*                     SYLLABUS (EAGLE EYE EXPLORER) MGMT                    */
  /* -------------------------------------------------------------------------- */
  getLearningAreas: adminProcedure.input(z8.object({}).optional()).query(async () => {
    try {
      return await db.select().from(learningAreas);
    } catch (error) {
      throw new TRPCError7({
        code: "INTERNAL_SERVER_ERROR",
        message: `Error al obtener \xE1reas: ${error instanceof Error ? error.message : "Error desconocido"}`
      });
    }
  }),
  createLearningArea: adminProcedure.input(z8.object({ name: z8.string(), icon: z8.string().optional() })).mutation(async ({ input }) => {
    const [res] = await db.insert(learningAreas).values({
      name: input.name.trim().toUpperCase(),
      icon: input.icon
    });
    return { id: res.insertId };
  }),
  deleteLearningArea: adminProcedure.input(z8.object({ id: z8.number() })).mutation(async ({ input }) => {
    await db.transaction(async (tx) => {
      await tx.delete(learningContent).where(eq11(learningContent.areaId, input.id));
      await tx.delete(learningAreas).where(eq11(learningAreas.id, input.id));
    });
    return { success: true };
  }),
  /** Wipe every area and content row — used for "start fresh" */
  clearAllLearningContent: adminProcedure.mutation(async () => {
    await db.transaction(async (tx) => {
      await tx.delete(learningContent);
      await tx.delete(learningAreas);
    });
    return { success: true };
  }),
  getLearningContent: adminProcedure.input(z8.object({ areaId: z8.number() })).query(async ({ input }) => {
    return await db.select().from(learningContent).where(eq11(learningContent.areaId, input.areaId)).orderBy(learningContent.level, learningContent.orderInTopic);
  }),
  deleteLearningContent: adminProcedure.input(z8.object({ id: z8.number() })).mutation(async ({ input }) => {
    await db.delete(learningContent).where(eq11(learningContent.id, input.id));
    return { success: true };
  }),
  /** Rename a topic (folder) across all its units in an area */
  renameTopic: adminProcedure.input(z8.object({
    areaId: z8.number(),
    oldName: z8.string(),
    newName: z8.string().min(1)
  })).mutation(async ({ input }) => {
    const normalized = input.newName.trim().toUpperCase();
    await db.update(learningContent).set({ topic: normalized }).where(
      and9(
        eq11(learningContent.areaId, input.areaId),
        eq11(learningContent.topic, input.oldName.trim().toUpperCase())
      )
    );
    return { success: true };
  }),
  /** Delete an entire topic (folder) and all its units */
  deleteTopic: adminProcedure.input(z8.object({ areaId: z8.number(), topicName: z8.string() })).mutation(async ({ input }) => {
    await db.delete(learningContent).where(
      and9(
        eq11(learningContent.areaId, input.areaId),
        eq11(learningContent.topic, input.topicName.trim().toUpperCase())
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
  uploadTacticalSyllabus: adminProcedure.input(z8.object({
    areaName: z8.string().min(1),
    autoFlashcards: z8.boolean().optional().default(false),
    topics: z8.array(z8.object({
      name: z8.string().min(1),
      schoolType: z8.enum(["EO", "EESTP", "BOTH"]).optional(),
      units: z8.array(z8.object({
        title: z8.string().min(1),
        body: z8.string(),
        questions: z8.array(z8.any()).optional().default([]),
        schoolType: z8.enum(["EO", "EESTP", "BOTH"]).optional()
      })).min(1, "Cada tema debe tener al menos 1 unidad")
    })).min(1, "Debes tener al menos 1 tema")
  })).mutation(async ({ input }) => {
    console.log("[DEBUG-TACTICAL] Received Syllabus Payload:", JSON.stringify(input).substring(0, 500));
    const normalizedAreaName = input.areaName.trim().toUpperCase();
    return await db.transaction(async (tx) => {
      let [area] = await tx.select().from(learningAreas).where(eq11(learningAreas.name, normalizedAreaName));
      let areaId = area?.id;
      if (!areaId) {
        const [res] = await tx.insert(learningAreas).values({ name: normalizedAreaName });
        areaId = res.insertId;
      }
      const activeUsers = input.autoFlashcards ? await tx.select({ uid: users.uid }).from(users).where(eq11(users.status, "ACTIVE")) : [];
      let created = 0;
      let updated = 0;
      for (let topicIdx = 0; topicIdx < input.topics.length; topicIdx++) {
        const topic = input.topics[topicIdx];
        const normalizedTopicName = topic.name.trim().toUpperCase();
        const autoLevel = topicIdx + 1;
        for (let unitIdx = 0; unitIdx < topic.units.length; unitIdx++) {
          const unit = topic.units[unitIdx];
          const normalizedTitle = unit.title.trim().toUpperCase();
          const effectiveSchoolType = unit.schoolType ?? topic.schoolType ?? "BOTH";
          const [existing] = await tx.select().from(learningContent).where(
            and9(
              eq11(learningContent.areaId, areaId),
              eq11(learningContent.title, normalizedTitle)
            )
          ).limit(1);
          if (existing) {
            await tx.update(learningContent).set({
              topic: normalizedTopicName,
              body: unit.body,
              questions: unit.questions,
              level: autoLevel,
              orderInTopic: unitIdx,
              schoolType: effectiveSchoolType
            }).where(eq11(learningContent.id, existing.id));
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
              schoolType: effectiveSchoolType
            });
            const contentId = res.insertId;
            if (unit.questions && unit.questions.length > 0) {
              const deckTag = `galeria:${normalizedAreaName.toLowerCase()}:${normalizedTopicName.toLowerCase()}`;
              const mapInsertions = [];
              for (let i = 0; i < unit.questions.length; i++) {
                mapInsertions.push({
                  contentId,
                  questionId: null,
                  // No es de simulacro
                  questionIndex: i,
                  deckTag
                });
              }
              if (mapInsertions.length > 0) {
                await tx.insert(contentFsrsMap).values(mapInsertions);
              }
              if (input.autoFlashcards && activeUsers.length > 0) {
                const cardInsertions = [];
                for (let i = 0; i < unit.questions.length; i++) {
                  for (const user of activeUsers) {
                    cardInsertions.push({
                      userId: user.uid,
                      learningContentId: contentId,
                      questionIndex: i,
                      deckTag,
                      state: "new",
                      stability: 0.1,
                      difficulty: 5,
                      reps: 0,
                      lapses: 0,
                      scheduledDays: 0,
                      elapsedDays: 0,
                      queue: 0,
                      mod: Date.now()
                    });
                  }
                }
                const chunkSize = 5e3;
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
  enrollFlashcardsFromUnit: adminProcedure.input(z8.object({ unitId: z8.number() })).mutation(async ({ input }) => {
    const [unit] = await db.select().from(learningContent).where(eq11(learningContent.id, input.unitId));
    if (!unit) throw new TRPCError7({ code: "NOT_FOUND", message: "Unidad no encontrada" });
    const activeUsers = await db.select({ uid: users.uid }).from(users).where(eq11(users.status, "ACTIVE"));
    const mapEntries = await db.select().from(contentFsrsMap).where(eq11(contentFsrsMap.contentId, input.unitId));
    if (mapEntries.length === 0) {
      return { success: false, message: "La unidad no tiene preguntas mapeadas o no existen." };
    }
    let created = 0;
    await db.transaction(async (tx) => {
      const existingCards = await tx.select().from(leitnerCards).where(eq11(leitnerCards.learningContentId, input.unitId));
      const existingSet = new Set(
        existingCards.map((c) => `${c.userId}-${c.questionIndex}`)
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
              state: "new",
              stability: 0.1,
              difficulty: 5,
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
      const chunkSize = 5e3;
      for (let c = 0; c < cardInsertions.length; c += chunkSize) {
        await tx.insert(leitnerCards).values(cardInsertions.slice(c, c + chunkSize));
      }
    });
    return { success: true, created };
  }),
  /** Export area content grouped by topic for the Eagle Eye Explorer editor */
  getAreaJSON: adminProcedure.input(z8.object({ areaId: z8.number() })).query(async ({ input }) => {
    const [area] = await db.select().from(learningAreas).where(eq11(learningAreas.id, input.areaId));
    if (!area) throw new TRPCError7({ code: "NOT_FOUND", message: "\xC1rea no encontrada" });
    const content = await db.select().from(learningContent).where(eq11(learningContent.areaId, input.areaId)).orderBy(learningContent.level, learningContent.orderInTopic);
    const topicsMap = /* @__PURE__ */ new Map();
    for (const unit of content) {
      const t2 = unit.topic ?? "GENERAL";
      if (!topicsMap.has(t2)) topicsMap.set(t2, []);
      topicsMap.get(t2).push(unit);
    }
    return {
      areaName: area.name,
      topics: Array.from(topicsMap.entries()).map(([name, units]) => ({
        name,
        units: units.map((u) => ({
          title: u.title,
          body: u.body,
          questions: u.questions,
          schoolType: u.schoolType
        }))
      }))
    };
  })
});

// src/backend/server/routers/ai.ts
import { z as z9 } from "zod";
import { TRPCError as TRPCError8 } from "@trpc/server";
import { eq as eq12, sql as sql8 } from "drizzle-orm";

// src/backend/utils/aiClient.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
var genAI = null;
var getAIClient = () => {
  if (genAI) return genAI;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.error("[AI] GEMINI_API_KEY is missing from environment variables.");
    return null;
  }
  genAI = new GoogleGenerativeAI(apiKey);
  return genAI;
};
var AI_MODELS = {
  FLASH: "gemini-1.5-flash",
  PRO: "gemini-1.5-pro"
};

// src/backend/server/routers/ai.ts
var SYSTEM_PROMPT = `
Eres un General de la Polic\xEDa Nacional del Per\xFA (PNP), veterano y jefe de la junta selectiva. 
Tu misi\xF3n es entrevistar a un postulante para su ingreso. 
Personalidad: Riguroso, honorable, patriota y observador. No toleras la falta de disciplina ni la falta de \xE9tica.
Instrucciones:
1. Haz una pregunta dif\xEDcil a la vez sobre \xE9tica, vocaci\xF3n, doctrina policial o situaciones de crisis.
2. Eval\xFAa la respuesta del usuario. Si es excelente, felic\xEDtalo secamente. Si es mediocre, exh\xEDgelo m\xE1s. 
3. L\xEDmite: M\xE1ximo 10 preguntas. 
4. Condici\xF3n cr\xEDtica: Si detectas falta de patriotismo, deshonestidad o cobard\xEDa en 3 respuestas, termina la entrevista de inmediato con un veredicto de 'BAJA DESHONROSA'.
5. Diagn\xF3stico Final: Al terminar las 10 preguntas (o antes por falta grave), da un diagn\xF3stico que "preocupe al presidente" (si es malo) o que "devuelva la fe en la instituci\xF3n" (si es excelente). Usa un lenguaje militar formal peruano.
6. Mant\xE9n el historial de la conversaci\xF3n para dar seguimiento.
`;
var aiRouter = router({
  chat: protectedProcedure.input(z9.object({
    history: z9.array(z9.object({
      role: z9.enum(["user", "model"]),
      parts: z9.array(z9.object({ text: z9.string() }))
    })),
    message: z9.string()
  })).mutation(async ({ input, ctx }) => {
    const genAI2 = getAIClient();
    if (!genAI2) {
      throw new TRPCError8({
        code: "INTERNAL_SERVER_ERROR",
        message: "Entorno IA no configurado: Falta la llave de mando."
      });
    }
    const [user] = await db.select(USER_FIELDS).from(users).where(eq12(users.uid, ctx.userId));
    if (!user) {
      logger.error(`[AI-CHAT] Profile not found: ${ctx.userId}`);
      throw new TRPCError8({ code: "NOT_FOUND", message: "No se encontr\xF3 tu perfil t\xE1ctico." });
    }
    if (user.membership !== "PRO") {
      logger.warn(`[AI-CHAT] Blocked non-PRO user attempt: ${user.email}`);
      throw new TRPCError8({ code: "FORBIDDEN", message: "El simulador de entrevista personal requiere rango PRO." });
    }
    try {
      const model = genAI2.getGenerativeModel({ model: AI_MODELS.FLASH });
      const chatSession = model.startChat({
        history: input.history,
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.7
        }
      });
      let actualMessage = input.message;
      if (input.history.length === 0) {
        actualMessage = `${SYSTEM_PROMPT}

[INICIO DE ENTREVISTA]
Postulante: ${input.message}`;
      }
      const result = await chatSession.sendMessage(actualMessage);
      const response = result.response.text();
      if (response.toLowerCase().includes("felicitaciones") || response.toLowerCase().includes("buena respuesta")) {
        await db.update(users).set({ honorPoints: sql8`${users.honorPoints} + 10` }).where(eq12(users.uid, ctx.userId));
      }
      return { response };
    } catch (error) {
      logger.error("[AI-CHAT-CRITICAL]", {
        uid: ctx.userId,
        errorMessage: error.message
      });
      throw new TRPCError8({
        code: "INTERNAL_SERVER_ERROR",
        message: `Fuerzas de la naturaleza interfirieron: ${error.message || "Error Desconocido"}`
      });
    }
  })
});

// src/backend/server/routers/interview.ts
import { z as z10 } from "zod";
import { eq as eq13, and as and10, sql as sql9 } from "drizzle-orm";
var interviewRouter = router({
  // ── 1. FIND OR CREATE SESSION ──────────────────────────────────────
  findOrCreate: protectedProcedure.input(z10.object({ userId: z10.string(), userName: z10.string() })).mutation(async ({ input, ctx }) => {
    const [existing] = await db.select().from(interviewSessions).where(
      and10(
        sql9`(${interviewSessions.userAId} = ${input.userId} OR ${interviewSessions.userBId} = ${input.userId})`,
        sql9`${interviewSessions.status} != 'done'`,
        sql9`${interviewSessions.isPractice} = false`
      )
    ).limit(1);
    if (existing) {
      return { session: existing, role: existing.userAId === input.userId ? "A" : "B" };
    }
    const [available] = await db.select().from(interviewSessions).where(
      and10(
        eq13(interviewSessions.status, "waiting"),
        sql9`${interviewSessions.userBId} IS NULL`,
        sql9`${interviewSessions.userAId} != ${input.userId}`,
        sql9`${interviewSessions.isPractice} = false`
      )
    ).orderBy(sql9`${interviewSessions.createdAt} ASC`).limit(1);
    if (available) {
      const coinFlip = Math.random() > 0.5;
      const interviewerId = coinFlip ? available.userAId : input.userId;
      await db.update(interviewSessions).set({
        userBId: input.userId,
        userBName: input.userName,
        status: "active",
        currentTurnStatus: "questioning",
        currentInterviewerId: interviewerId
      }).where(eq13(interviewSessions.id, available.id));
      const [updated] = await db.select().from(interviewSessions).where(eq13(interviewSessions.id, available.id));
      if (ctx.io) {
        ctx.io.to(`session_${available.id}`).emit("session_update", { type: "match_found", session: updated });
      }
      return { session: updated, role: "B" };
    }
    const insertResult = await db.insert(interviewSessions).values({
      userAId: input.userId,
      userAName: input.userName,
      status: "waiting",
      currentTurnStatus: "questioning",
      isPractice: false
    });
    const insertId = insertResult[0]?.insertId;
    const [newSession] = await db.select().from(interviewSessions).where(eq13(interviewSessions.id, insertId));
    return { session: newSession, role: "A" };
  }),
  // ── 2. POLL SESSION STATE ──────────────────────────────────────────
  getSession: protectedProcedure.input(z10.object({ sessionId: z10.number() })).query(async ({ input }) => {
    const [session] = await db.select().from(interviewSessions).where(eq13(interviewSessions.id, input.sessionId));
    return session || null;
  }),
  // ── 3. POLL MESSAGES ──────────────────────────────────────────────
  getMessages: protectedProcedure.input(z10.object({ sessionId: z10.number(), since: z10.number().optional() })).query(async ({ input }) => {
    const msgs = await db.select().from(interviewMessages).where(
      input.since && input.since > 0 ? and10(eq13(interviewMessages.sessionId, input.sessionId), sql9`${interviewMessages.id} > ${input.since}`) : eq13(interviewMessages.sessionId, input.sessionId)
    ).orderBy(sql9`${interviewMessages.id} ASC`).limit(200);
    return msgs;
  }),
  // ── 4. SEND MESSAGE (Automatic Turn Progression) ──────────────────
  sendMessage: protectedProcedure.input(z10.object({
    sessionId: z10.number(),
    userId: z10.string(),
    userName: z10.string(),
    message: z10.string().min(1).max(2e3)
  })).mutation(async ({ input, ctx }) => {
    const [session] = await db.select().from(interviewSessions).where(eq13(interviewSessions.id, input.sessionId));
    if (!session) throw new Error("Sesi\xF3n no encontrada");
    if (session.status === "rating" || session.status === "done") throw new Error("La sesi\xF3n ya termin\xF3");
    const isInterviewer = session.currentInterviewerId === input.userId;
    const isInterviewee = !isInterviewer && (session.userAId === input.userId || session.userBId === input.userId);
    if (session.currentTurnStatus === "questioning" && !isInterviewer)
      throw new Error("No es tu turno de preguntar todav\xEDa.");
    if (session.currentTurnStatus === "responding" && !isInterviewee)
      throw new Error("No es tu turno de responder todav\xEDa.");
    await db.insert(interviewMessages).values({
      sessionId: input.sessionId,
      senderId: input.userId,
      senderName: input.userName,
      message: input.message,
      isQuestion: session.currentTurnStatus === "questioning"
    });
    const isUserA = session.userAId === input.userId;
    const newACount = isUserA ? session.aQuestionCount + 1 : session.aQuestionCount;
    const newBCount = !isUserA ? session.bQuestionCount + 1 : session.bQuestionCount;
    const totalMessagesInPhase = newACount + newBCount;
    let nextTurnStatus = session.currentTurnStatus;
    let nextPhase = session.phase;
    let nextStatus = session.status;
    let nextInterviewerId = session.currentInterviewerId;
    let resetA = newACount;
    let resetB = newBCount;
    nextTurnStatus = session.currentTurnStatus === "questioning" ? "responding" : "questioning";
    if (totalMessagesInPhase >= 20) {
      if (session.phase === 1) {
        nextPhase = 2;
        nextInterviewerId = session.userAId === session.currentInterviewerId ? session.userBId : session.userAId;
        nextTurnStatus = "questioning";
        resetA = 0;
        resetB = 0;
        await db.insert(interviewMessages).values({
          sessionId: input.sessionId,
          senderId: "SYSTEM",
          senderName: "SISTEMA",
          message: "FASE 1 COMPLETADA. Intercambio de roles \u2014 \xA1Ahora te toca evaluar a tu compa\xF1ero!",
          isQuestion: false
        });
      } else {
        nextStatus = "rating";
      }
    }
    await db.update(interviewSessions).set({
      currentTurnStatus: nextTurnStatus,
      aQuestionCount: resetA,
      bQuestionCount: resetB,
      phase: nextPhase,
      status: nextStatus,
      currentInterviewerId: nextInterviewerId,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq13(interviewSessions.id, input.sessionId));
    const [finalSession] = await db.select().from(interviewSessions).where(eq13(interviewSessions.id, input.sessionId));
    if (ctx.io) {
      ctx.io.to(`session_${input.sessionId}`).emit("session_update", { type: "new_message", session: finalSession });
    }
    return { success: true };
  }),
  // ── 7. SUBMIT FINAL SCORE ──────────────────────────────────────────
  submitScore: protectedProcedure.input(z10.object({ sessionId: z10.number(), userId: z10.string(), score: z10.number().min(0).max(20) })).mutation(async ({ input, ctx }) => {
    const [session] = await db.select().from(interviewSessions).where(eq13(interviewSessions.id, input.sessionId));
    if (!session) throw new Error("Sesi\xF3n no encontrada");
    if (session.userAId === input.userId) {
      await db.update(interviewSessions).set({ scoreAtoB: input.score }).where(eq13(interviewSessions.id, input.sessionId));
    } else {
      await db.update(interviewSessions).set({ scoreBtoA: input.score }).where(eq13(interviewSessions.id, input.sessionId));
    }
    const [updated] = await db.select().from(interviewSessions).where(eq13(interviewSessions.id, input.sessionId));
    if (updated.scoreAtoB !== null && updated.scoreBtoA !== null) {
      await db.update(interviewSessions).set({ status: "done" }).where(eq13(interviewSessions.id, input.sessionId));
    }
    const [finalSession] = await db.select().from(interviewSessions).where(eq13(interviewSessions.id, input.sessionId));
    const achievementsUnlocked = [];
    if (finalSession.status === "done") {
      const scoreForA = finalSession.scoreBtoA || 0;
      const scoreForB = finalSession.scoreAtoB || 0;
      if (scoreForA >= 18) {
        const ach = await unlockAchievement(finalSession.userAId, "INTERVIEW_ACE");
        if (ach) achievementsUnlocked.push(ach);
      }
      if (scoreForB >= 18) {
        const ach = await unlockAchievement(finalSession.userBId, "INTERVIEW_ACE");
        if (ach) achievementsUnlocked.push(ach);
      }
    }
    if (ctx.io) {
      ctx.io.to(`session_${input.sessionId}`).emit("session_update", {
        type: "score_submitted",
        session: finalSession,
        achievementsUnlocked
      });
    }
    return { ok: true, achievementsUnlocked };
  }),
  // ── 8. START PRACTICE SESSION ──────────────────────────────────────
  startPractice: protectedProcedure.input(z10.object({ userId: z10.string(), userName: z10.string() })).mutation(async ({ input }) => {
    const insertResult = await db.insert(interviewSessions).values({
      userAId: input.userId,
      userAName: input.userName,
      userBId: "PRACTICE_BOT",
      userBName: "Evaluador POLIC.ia",
      status: "active",
      isPractice: true,
      phase: 1,
      currentTurnStatus: "questioning",
      currentInterviewerId: input.userId
      // user starts as interviewer
    });
    const insertId = insertResult[0]?.insertId;
    const [session] = await db.select().from(interviewSessions).where(eq13(interviewSessions.id, insertId));
    await db.insert(interviewMessages).values({
      sessionId: insertId,
      senderId: "PRACTICE_BOT",
      senderName: "Evaluador POLIC.ia",
      message: "\xA1Bienvenido a la pr\xE1ctica! Eres el Entrevistador. Formula tu primera pregunta acad\xE9mica y env\xEDala. Los turnos se alternan autom\xE1ticamente. Esta sesi\xF3n no afecta tu puntaje real.",
      isQuestion: false
    });
    return { session, role: "A" };
  }),
  // ── 9. CANCEL / LEAVE SESSION ──────────────────────────────────────
  cancelSession: protectedProcedure.input(z10.object({ sessionId: z10.number() })).mutation(async ({ input, ctx }) => {
    await db.update(interviewSessions).set({ status: "done" }).where(eq13(interviewSessions.id, input.sessionId));
    if (ctx.io) {
      ctx.io.to(`session_${input.sessionId}`).emit("session_update", { type: "session_cancelled" });
    }
    return { ok: true };
  })
});

// src/backend/server/routers/learning_review.ts
import { z as z11 } from "zod";
import { eq as eq14, and as and11, sql as sql10 } from "drizzle-orm";
var learningReviewRouter = router({
  /** Record a failure in a specific drill question */
  recordDrillFailure: protectedProcedure.input(z11.object({
    unitId: z11.number(),
    questionIndex: z11.number()
  })).mutation(async ({ input, ctx }) => {
    const userId = ctx.userId;
    const existing = await db.select().from(failedDrills).where(
      and11(
        eq14(failedDrills.userId, userId),
        eq14(failedDrills.unitId, input.unitId),
        eq14(failedDrills.questionIndex, input.questionIndex)
      )
    ).limit(1);
    if (existing.length > 0) {
      await db.update(failedDrills).set({
        attempts: sql10`${failedDrills.attempts} + 1`,
        lastFailedAt: /* @__PURE__ */ new Date()
      }).where(eq14(failedDrills.id, existing[0].id));
    } else {
      await db.insert(failedDrills).values({
        userId,
        unitId: input.unitId,
        questionIndex: input.questionIndex
      });
    }
    return { success: true };
  }),
  /** Get stats of failed questions for the current user */
  getPerfectionStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;
    const results = await db.select({
      unitId: failedDrills.unitId,
      count: sql10`count(*)`
    }).from(failedDrills).where(eq14(failedDrills.userId, userId)).groupBy(failedDrills.unitId);
    return results;
  }),
  /** Get the questions for a perfection session of a specific unit or entire area */
  getPerfectionDrill: protectedProcedure.input(z11.object({
    unitId: z11.number().optional(),
    areaId: z11.number().optional()
  })).query(async ({ input, ctx }) => {
    const userId = ctx.userId;
    let units = [];
    if (input.unitId) {
      units = await db.select().from(learningContent).where(eq14(learningContent.id, input.unitId)).limit(1);
    } else if (input.areaId) {
      units = await db.select().from(learningContent).where(eq14(learningContent.areaId, input.areaId));
    }
    if (units.length === 0) return [];
    const failed = await db.select({
      unitId: failedDrills.unitId,
      index: failedDrills.questionIndex
    }).from(failedDrills).where(eq14(failedDrills.userId, userId));
    const failedMap = /* @__PURE__ */ new Map();
    failed.forEach((f) => {
      if (!f.unitId) return;
      if (!failedMap.has(f.unitId)) failedMap.set(f.unitId, /* @__PURE__ */ new Set());
      failedMap.get(f.unitId)?.add(f.index);
    });
    const allQuestions = [];
    units.forEach((u) => {
      if (!u.questions) return;
      const indices = failedMap.get(u.id);
      if (indices) {
        const qList = u.questions.filter((_, idx) => indices.has(idx));
        allQuestions.push(...qList);
      }
    });
    return allQuestions;
  }),
  /** Remove a failure after the user gets it right in perfection mode (Reset) */
  resolveFailure: protectedProcedure.input(z11.object({
    unitId: z11.number(),
    questionIndex: z11.number()
  })).mutation(async ({ input, ctx }) => {
    await db.delete(failedDrills).where(
      and11(
        eq14(failedDrills.userId, ctx.userId),
        eq14(failedDrills.unitId, input.unitId),
        eq14(failedDrills.questionIndex, input.questionIndex)
      )
    );
    return { success: true };
  })
});

// src/backend/server/routers/learning_progress.ts
import { z as z12 } from "zod";
import { eq as eq15, and as and12, desc as desc5 } from "drizzle-orm";
var learningProgressRouter = router({
  /** Mark a unit as completed with a specific score and award honor points (0-20) */
  completeUnit: protectedProcedure.input(z12.object({
    unitId: z12.number(),
    score: z12.number(),
    totalQuestions: z12.number()
  })).mutation(async ({ input, ctx }) => {
    const userId = ctx.userId;
    if (input.totalQuestions <= 0) {
      return { success: false, pointsAdded: 0, totalUnitPoints: 0 };
    }
    const awardedPoints = Math.round(input.score / input.totalQuestions * 20);
    return await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(learningProgress).where(
        and12(
          eq15(learningProgress.userId, userId),
          eq15(learningProgress.unitId, input.unitId)
        )
      ).limit(1);
      const currentBestPoints = existing ? Math.round((existing.score || 0) / input.totalQuestions * 20) : 0;
      const pointsDifference = Math.max(0, awardedPoints - currentBestPoints);
      if (existing) {
        if (input.score > (existing.score || 0)) {
          await tx.update(learningProgress).set({ score: input.score, completedAt: /* @__PURE__ */ new Date() }).where(eq15(learningProgress.id, existing.id));
        }
      } else {
        await tx.insert(learningProgress).values({
          userId,
          unitId: input.unitId,
          score: input.score
        });
      }
      if (pointsDifference > 0) {
        const [user] = await tx.select().from(users).where(eq15(users.uid, userId));
        if (user) {
          await tx.update(users).set({
            honorPoints: (user.honorPoints || 0) + pointsDifference,
            lastActive: /* @__PURE__ */ new Date()
          }).where(eq15(users.uid, userId));
        }
      }
      const mapEntries = await tx.select().from(contentFsrsMap).where(eq15(contentFsrsMap.contentId, input.unitId));
      if (mapEntries.length > 0) {
        const existingCards = await tx.select().from(leitnerCards).where(
          and12(
            eq15(leitnerCards.userId, userId),
            eq15(leitnerCards.learningContentId, input.unitId)
          )
        );
        const existingSet = new Set(existingCards.map((c) => c.questionIndex));
        const newCards = [];
        for (const map of mapEntries) {
          if (map.questionIndex !== null && !existingSet.has(map.questionIndex)) {
            newCards.push({
              userId,
              learningContentId: input.unitId,
              questionIndex: map.questionIndex,
              deckTag: map.deckTag,
              state: "new",
              stability: 0.1,
              difficulty: 5,
              reps: 0,
              lapses: 0,
              scheduledDays: 0,
              elapsedDays: 0,
              queue: 0,
              mod: Date.now()
            });
          }
        }
        if (newCards.length > 0) {
          await tx.insert(leitnerCards).values(newCards);
        }
      }
      return {
        success: true,
        pointsAdded: pointsDifference,
        totalUnitPoints: awardedPoints
      };
    });
  }),
  /** Get all completed units for the current user */
  getUserProgress: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;
    const progress = await db.select().from(learningProgress).where(eq15(learningProgress.userId, userId)).orderBy(desc5(learningProgress.completedAt));
    return progress;
  }),
  /** Get the global leaderboard (Top students by Honor Points) */
  getLeaderboard: protectedProcedure.query(async () => {
    const topUsers = await db.select({
      uid: users.uid,
      name: users.name,
      photoURL: users.photoURL,
      honorPoints: users.honorPoints,
      meritPoints: users.meritPoints
      // BUG-11 FIX: renamed from misleading 'rank' alias
    }).from(users).where(eq15(users.status, "ACTIVE")).orderBy(desc5(users.honorPoints)).limit(100);
    return topUsers;
  })
});

// src/backend/server/routers/exams_progress.ts
import { z as z13 } from "zod";
import { eq as eq16 } from "drizzle-orm";
var examProgressRouter = router({
  saveProgress: protectedProcedure.input(z13.object({
    examLevelId: z13.number().nullable(),
    isPracticeMode: z13.boolean(),
    isMuerteSubita: z13.boolean(),
    questions: z13.any().optional(),
    // Puede enviarse solo la primera vez para no saturar payload
    answers: z13.record(z13.string(), z13.number()),
    flaggedQuestions: z13.record(z13.string(), z13.boolean()),
    timeSpentPerQuestion: z13.record(z13.string(), z13.number()),
    timeLeft: z13.number()
  })).mutation(async ({ ctx, input }) => {
    const [existing] = await db.select().from(examProgress).where(eq16(examProgress.userId, ctx.userId));
    if (existing) {
      await db.update(examProgress).set({
        examLevelId: input.examLevelId,
        isPracticeMode: input.isPracticeMode,
        isMuerteSubita: input.isMuerteSubita,
        // Solo actualizamos questions si las envían (evitar sobreescribir con undef)
        ...input.questions ? { questions: input.questions } : {},
        answers: input.answers,
        flaggedQuestions: input.flaggedQuestions,
        timeSpentPerQuestion: input.timeSpentPerQuestion,
        timeLeft: input.timeLeft
      }).where(eq16(examProgress.id, existing.id));
    } else {
      await db.insert(examProgress).values({
        userId: ctx.userId,
        examLevelId: input.examLevelId,
        isPracticeMode: input.isPracticeMode,
        isMuerteSubita: input.isMuerteSubita,
        questions: input.questions || [],
        answers: input.answers,
        flaggedQuestions: input.flaggedQuestions,
        timeSpentPerQuestion: input.timeSpentPerQuestion,
        timeLeft: input.timeLeft
      });
    }
    return { success: true };
  }),
  loadProgress: protectedProcedure.query(async ({ ctx }) => {
    const [progress] = await db.select().from(examProgress).where(eq16(examProgress.userId, ctx.userId));
    if (!progress) return null;
    return progress;
  }),
  deleteProgress: protectedProcedure.mutation(async ({ ctx }) => {
    await db.delete(examProgress).where(eq16(examProgress.userId, ctx.userId));
    return { success: true };
  })
});

// src/backend/server/routers/gamification.ts
import { z as z14 } from "zod";
import { eq as eq17, and as and14, sql as sql11 } from "drizzle-orm";
var gamificationRouter = router({
  /** Fetch all achievements with current user's unlocked status */
  getAchievements: protectedProcedure.query(async ({ ctx }) => {
    const allAchievements = await db.select().from(achievements);
    const unlockedOnes = await db.select({
      achievementId: userAchievements.achievementId,
      unlockedAt: userAchievements.unlockedAt
    }).from(userAchievements).where(eq17(userAchievements.userId, ctx.userId));
    const unlockedIds = new Set(unlockedOnes.map((u) => u.achievementId));
    return allAchievements.map((a) => ({
      ...a,
      isUnlocked: unlockedIds.has(a.id),
      unlockedAt: unlockedOnes.find((u) => u.achievementId === a.id)?.unlockedAt || null
    }));
  }),
  /** Specific procedure to trigger an achievement check (usually internal, but exposed for client-side events if needed) */
  checkAndUnlock: protectedProcedure.input(z14.object({
    code: z14.string()
  })).mutation(async ({ ctx, input }) => {
    const [achievement] = await db.select().from(achievements).where(eq17(achievements.code, input.code));
    if (!achievement) return { success: false, message: "Achievement not found" };
    const [existing] = await db.select().from(userAchievements).where(and14(
      eq17(userAchievements.userId, ctx.userId),
      eq17(userAchievements.achievementId, achievement.id)
    ));
    if (existing) return { success: false, alreadyUnlocked: true };
    await db.insert(userAchievements).values({
      userId: ctx.userId,
      achievementId: achievement.id
    });
    if (achievement.pointsReward && achievement.pointsReward > 0) {
      await db.update(users).set({ meritPoints: sql11`${users.meritPoints} + ${achievement.pointsReward}` }).where(eq17(users.uid, ctx.userId));
    }
    return { success: true, achievement };
  })
});

// src/backend/server/routers/scenarios.ts
import { TRPCError as TRPCError9 } from "@trpc/server";
import { z as z15 } from "zod";
import { eq as eq18, and as and15, desc as desc6, sql as sql12 } from "drizzle-orm";
var scenariosRouter = router({
  // ── Listar Sesiones y Escenarios ──────────
  list: protectedProcedure.query(async ({ ctx }) => {
    const scenarios = await db.select().from(policeScenarios).orderBy(desc6(policeScenarios.createdAt));
    const attempts = await db.select().from(scenarioAttempts).where(eq18(scenarioAttempts.userId, ctx.userId)).orderBy(desc6(scenarioAttempts.createdAt));
    return { scenarios, attempts };
  }),
  // ── Empezar o Retomar un Escenario ──────────
  startOrResume: protectedProcedure.input(z15.object({ scenarioId: z15.number() })).mutation(async ({ ctx, input }) => {
    const [scenario] = await db.select().from(policeScenarios).where(eq18(policeScenarios.id, input.scenarioId));
    if (!scenario) throw new TRPCError9({ code: "NOT_FOUND", message: "Escenario no existe." });
    const [existing] = await db.select().from(scenarioAttempts).where(and15(eq18(scenarioAttempts.userId, ctx.userId), eq18(scenarioAttempts.scenarioId, scenario.id), eq18(scenarioAttempts.status, "IN_PROGRESS")));
    if (existing) {
      return { attemptId: existing.id, initialEvent: scenario.initialEvent, existingHistory: existing.chatHistory };
    }
    const [{ insertId }] = await db.insert(scenarioAttempts).values({
      userId: ctx.userId,
      scenarioId: scenario.id,
      status: "IN_PROGRESS",
      chatHistory: []
    });
    return { attemptId: insertId, initialEvent: scenario.initialEvent, existingHistory: [] };
  }),
  // ── Interactuar con el Escenario (Rol IA) ──────────
  interact: protectedProcedure.input(z15.object({
    attemptId: z15.number(),
    message: z15.string(),
    history: z15.array(z15.object({
      role: z15.enum(["user", "model"]),
      parts: z15.array(z15.object({ text: z15.string() }))
    }))
  })).mutation(async ({ ctx, input }) => {
    const genAI2 = getAIClient();
    if (!genAI2) throw new TRPCError9({ code: "INTERNAL_SERVER_ERROR", message: "Entorno IA no configurado." });
    const [attempt] = await db.select().from(scenarioAttempts).where(eq18(scenarioAttempts.id, input.attemptId));
    if (!attempt) throw new TRPCError9({ code: "NOT_FOUND", message: "Intento no encontrado." });
    if (attempt.userId !== ctx.userId) throw new TRPCError9({ code: "FORBIDDEN" });
    if (attempt.status === "COMPLETED") throw new TRPCError9({ code: "BAD_REQUEST", message: "El caso ya est\xE1 cerrado." });
    const [scenario] = await db.select().from(policeScenarios).where(eq18(policeScenarios.id, attempt.scenarioId));
    const SYSTEM_PROMPT2 = `
Eres un Simulador de Entorno Policial inmersivo para la plataforma Polic.ia.
Vas a evaluar y jugar un rol din\xE1mico (infractor, v\xEDctima o narrador) en el siguiente escenario: 
TITULO: ${scenario.title}
SITUACI\xD3N BASE: ${scenario.initialEvent}
INSTRUCCIONES DOCTRINALES DE EVALUACION: ${scenario.systemPromptEvaluator}

REGLAS DE ACTUACI\xD3N:
1. NUNCA rompas el personaje. Eres las personas del entorno. Reacciona a las \xF3rdenes del jugador.
2. Si el jugador hace algo ilegal, fatal, o si la situaci\xF3n se resuelve con \xE9xito tras varios mensajes, DA POR TERMINADO EL ESCENARIO.
3. SI decides terminar el escenario, DEBES OBLIGATORIAMENTE a\xF1adir al final de tu \xDALTIMO MENSAJE una etiqueta de evaluaci\xF3n exacta con este formato (no cambies may\xFAsculas ni corchetes):
[EVALUACION]
PUNTUACION: (n\xFAmero de 0 a 100)
APROBADO: (SI o NO)
FEEDBACK: (Escribe tu retroalimentaci\xF3n oficial, citando leyes policiales).
[FIN]
      `;
    try {
      const model = genAI2.getGenerativeModel({ model: AI_MODELS.FLASH });
      const chatSession = model.startChat({
        history: input.history,
        // Frontend provee historial FSRS/Gemini estándar formatiado
        generationConfig: { maxOutputTokens: 800, temperature: 0.7 }
      });
      let actualMessage = input.message;
      if (input.history.length === 0) {
        actualMessage = `[INSTRUCCIONES DE SISTEMA: ${SYSTEM_PROMPT2}]

Acci\xF3n del Polic\xEDa: ${input.message}`;
      } else {
        actualMessage = `Acci\xF3n del Polic\xEDa: ${input.message}`;
      }
      const result = await chatSession.sendMessage(actualMessage);
      const responseText = result.response.text();
      let scenarioEnded = false;
      let finalScore = 0;
      let isPassed = false;
      let finalFeedback = "";
      let cleanedResponse = responseText;
      if (responseText.includes("[EVALUACION]")) {
        scenarioEnded = true;
        const scoreMatch = responseText.match(/PUNTUACION:\s*(\d+)/i);
        const passedMatch = responseText.match(/APROBADO:\s*(SI|NO)/i);
        const feedbackMatch = responseText.match(/FEEDBACK:\s*(.*?)(\n\[FIN\]|$)/is);
        if (scoreMatch) finalScore = parseInt(scoreMatch[1], 10);
        if (passedMatch) isPassed = passedMatch[1].toUpperCase() === "SI";
        if (feedbackMatch) finalFeedback = feedbackMatch[1].trim();
        cleanedResponse = responseText.split("[EVALUACION]")[0].trim();
      }
      const updatedHistory = [
        ...input.history,
        { role: "user", parts: [{ text: input.message }] },
        { role: "model", parts: [{ text: responseText }] }
      ];
      if (scenarioEnded) {
        await db.update(scenarioAttempts).set({
          status: "COMPLETED",
          score: finalScore,
          isPassed,
          feedback: finalFeedback,
          chatHistory: updatedHistory,
          endedAt: /* @__PURE__ */ new Date()
        }).where(eq18(scenarioAttempts.id, attempt.id));
        if (isPassed && finalScore >= 60) {
          await db.update(users).set({
            honorPoints: sql12`${users.honorPoints} + 50`,
            meritPoints: sql12`${users.meritPoints} + ${finalScore}`
          }).where(eq18(users.uid, ctx.userId));
        }
        const achievementsUnlocked = [];
        const [{ count }] = await db.select({ count: sql12`count(*)` }).from(scenarioAttempts).where(and15(eq18(scenarioAttempts.userId, ctx.userId), eq18(scenarioAttempts.status, "COMPLETED")));
        if (Number(count) >= 5) {
          const ach = await unlockAchievement(ctx.userId, "SCENARIO_5");
          if (ach) achievementsUnlocked.push(ach);
        }
        return {
          response: cleanedResponse,
          isEnded: scenarioEnded,
          score: finalScore,
          passed: isPassed,
          feedback: finalFeedback,
          achievementsUnlocked
        };
        await db.update(scenarioAttempts).set({
          chatHistory: updatedHistory
        }).where(eq18(scenarioAttempts.id, attempt.id));
        return {
          response: cleanedResponse,
          isEnded: scenarioEnded,
          score: finalScore,
          passed: isPassed,
          feedback: finalFeedback
        };
      }
    } catch (error) {
      logger.error("[SCENARIO_INTERACT_ERROR]", { attemptId: input.attemptId, error: error.message });
      throw new TRPCError9({ code: "INTERNAL_SERVER_ERROR", message: `Fallo del sistema AI: ${error.message}` });
    }
  })
});

// src/backend/server/routers/index.ts
var appRouter = router({
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
  scenarios: scenariosRouter
});

// src/backend/server/index.ts
import fs2 from "fs";
import path2 from "path";
import zlib from "zlib";
import { eq as eq19 } from "drizzle-orm";
import { createServer } from "http";

// src/backend/server/socket.ts
import { Server as SocketServer } from "socket.io";
var io;
function setupSocket(server) {
  if (io) return io;
  io = new SocketServer(server, {
    cors: {
      origin: [
        "https://polic-ia-7bf7e.web.app",
        "https://polic-ia-7bf7e.firebaseapp.com",
        "http://localhost:5173",
        "http://localhost:3000"
      ],
      methods: ["GET", "POST"]
    }
  });
  io.on("connection", (socket) => {
    console.log(`[WS] New client connected: ${socket.id}`);
    socket.on("join_session", (sessionId) => {
      socket.join(`session_${sessionId}`);
      console.log(`[WS] Client ${socket.id} joined session: ${sessionId}`);
    });
    socket.on("new_message", (payload) => {
      socket.to(`session_${payload.sessionId}`).emit("session_update", payload.message);
      console.log(`[WS] Message in session ${payload.sessionId}`);
    });
    socket.on("disconnect", () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
  });
  return io;
}

// src/backend/server/index.ts
dotenv2.config();
var app = express();
var httpServer = createServer(app);
var port = process.env.PORT || 3001;
var io2 = setupSocket(httpServer);
var allowedOrigins = [
  "https://polic-ia-7bf7e.web.app",
  "https://polic-ia-7bf7e.firebaseapp.com",
  "http://localhost:5173",
  "http://localhost:3000"
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.includes("web.app") || origin.includes("firebaseapp.com")) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-TRPC-Source", "X-Requested-With", "X-TRPC-Batch-Mode"],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes(origin) || origin.includes("web.app") || origin.includes("firebaseapp.com"))) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  }
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-TRPC-Source, X-Requested-With, X-TRPC-Batch-Mode");
    return res.status(204).end();
  }
  next();
});
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.get("/health", (req, res) => {
  res.json({
    status: "online",
    version: "04.01.H_MEGA_V12_PROD_FIX_CORS_V3",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: (opts) => createContext(opts, io2),
    onError: ({ path: path3, error }) => {
      console.error(`[tRPC-ERROR] Error en ${path3}:`, error);
      logger.error(`[tRPC-ERROR] ${path3}`, { message: error.message, stack: error.stack });
    }
  })
);
app.get("/api/export/deck", async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "Falta userId" });
    const cards = await db.select().from(leitnerCards).where(eq19(leitnerCards.userId, userId));
    const logs = await db.select().from(reviewLogs).where(eq19(reviewLogs.userId, userId));
    const exportData = { manifest: { version: 1, exportedAt: (/* @__PURE__ */ new Date()).toISOString(), cardCount: cards.length, logCount: logs.length }, collection: cards, review_log: logs };
    res.setHeader("Content-Type", "application/gzip");
    res.setHeader("Content-Disposition", 'attachment; filename="policia_deck.pkg"');
    const gzip = zlib.createGzip();
    gzip.pipe(res);
    gzip.write(JSON.stringify(exportData));
    gzip.end();
  } catch (err) {
    console.error("Error al exportar:", err);
    res.status(500).json({ error: err.message });
  }
});
var distPath = path2.join(process.cwd(), "dist");
if (fs2.existsSync(distPath)) {
  app.use("/assets", express.static(path2.join(distPath, "assets"), {
    immutable: true,
    maxAge: "1y",
    fallthrough: false
    // Si no existe en assets, que no pase al wildcard
  }));
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/trpc") || req.path.startsWith("/health") || req.path.startsWith("/api")) {
      return res.status(404).json({ error: "Route not found" });
    }
    res.sendFile(path2.join(distPath, "index.html"));
  });
}
function startServer() {
  httpServer.listen(port, () => {
    logger.info(`[SYS] \u{1F680} Server ONLINE at port ${port}`);
    logger.info(`[SYS]    BUILD_SIG: 04.01.H_MEGA_V12_PROD_FIX_CORS_V3 (Socket.IO Enabled) `);
  });
}
process.on("uncaughtException", (e) => {
  logger.error("[FATAL] Uncaught Exception:", { message: e.message, stack: e.stack });
});
process.on("unhandledRejection", (reason) => {
  logger.error("[FATAL] Unhandled Rejection:", { reason });
});
startServer();
