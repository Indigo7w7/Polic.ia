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
  adminLogs: () => adminLogs,
  attemptAnswers: () => attemptAnswers,
  broadcasts: () => broadcasts,
  courseMaterials: () => courseMaterials,
  courses: () => courses,
  examAttempts: () => examAttempts,
  examMaterials: () => examMaterials,
  examQuestions: () => examQuestions,
  exams: () => exams,
  globalNotifications: () => globalNotifications,
  learningAreas: () => learningAreas,
  learningContent: () => learningContent,
  leitnerCards: () => leitnerCards,
  stripeSubscriptions: () => stripeSubscriptions,
  users: () => users,
  yapeAudits: () => yapeAudits
});
import { mysqlTable, varchar, text, timestamp, int, json, boolean, mysqlEnum, index } from "drizzle-orm/mysql-core";
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
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  level: int("level").default(1),
  schoolType: mysqlEnum("school_type", ["EO", "EESTP", "BOTH"]).default("BOTH")
}, (table) => [
  index("idx_content_area").on(table.areaId),
  index("idx_content_school").on(table.schoolType)
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
  userId: varchar("user_id", { length: 255 }).references(() => users.uid),
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
var leitnerCards = mysqlTable("leitner_cards", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 255 }).references(() => users.uid),
  questionId: int("question_id").references(() => examQuestions.id),
  level: int("level").default(0),
  nextReview: timestamp("next_review")
}, (table) => [
  index("idx_leitner_user").on(table.userId),
  index("idx_leitner_question").on(table.questionId),
  index("idx_leitner_review").on(table.nextReview)
]);
var stripeSubscriptions = mysqlTable("stripe_subscriptions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).references(() => users.uid),
  status: varchar("status", { length: 50 }),
  priceId: varchar("price_id", { length: 255 }),
  currentPeriodEnd: timestamp("current_period_end")
}, (table) => [
  index("idx_stripe_user").on(table.userId)
]);
var adminLogs = mysqlTable("admin_logs", {
  id: int("id").primaryKey().autoincrement(),
  adminId: varchar("admin_id", { length: 255 }).references(() => users.uid),
  action: text("action").notNull(),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => [
  index("idx_logs_admin").on(table.adminId),
  index("idx_logs_created").on(table.createdAt)
]);
var yapeAudits = mysqlTable("yape_audits", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 255 }).references(() => users.uid),
  voucherUrl: varchar("voucher_url", { length: 512 }).notNull(),
  status: mysqlEnum("status", ["PENDIENTE", "APROBADO", "RECHAZADO"]).default("PENDIENTE").notNull(),
  amount: int("amount").default(15),
  school: varchar("school", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => [
  index("idx_yape_user").on(table.userId),
  index("idx_yape_status").on(table.status)
]);
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
}, (table) => [
  index("idx_courses_school").on(table.schoolType),
  index("idx_courses_level").on(table.level)
]);
var courseMaterials = mysqlTable("course_materials", {
  id: int("id").primaryKey().autoincrement(),
  courseId: int("course_id").references(() => courses.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["PDF", "VIDEO", "EXAM", "LINK", "TEXT"]).notNull(),
  contentUrl: varchar("content_url", { length: 512 }),
  order: int("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow()
}, (table) => [
  index("idx_materials_course").on(table.courseId)
]);
var globalNotifications = mysqlTable("global_notifications", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: mysqlEnum("type", ["INFO", "WARNING", "EVENT"]).default("WARNING").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => [
  index("idx_notifications_active").on(table.isActive)
]);
var broadcasts = mysqlTable("broadcasts", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: mysqlEnum("type", ["INFO", "WARNING", "EVENT"]).default("WARNING").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  activeUntil: timestamp("active_until").notNull(),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => [
  index("idx_broadcasts_active").on(table.isActive),
  index("idx_broadcasts_until").on(table.activeUntil)
]);
var examMaterials = mysqlTable("exam_materials", {
  id: int("id").primaryKey().autoincrement(),
  examId: int("exam_id").references(() => exams.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  url: varchar("url", { length: 512 }).notNull(),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => [
  index("idx_exam_materials_exam").on(table.examId)
]);

// src/database/db/index.ts
import dotenv from "dotenv";
dotenv.config();
var getPool = () => {
  const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
  if (url) {
    console.log(`[DB] Connecting via explicitly provided URL`);
    try {
      return mysql.createPool(url);
    } catch (err) {
      console.error(`[DB] URL Parse Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (process.env.MYSQLHOST && process.env.MYSQLPASSWORD) {
    console.log(`[DB] Using Individual Variables for: ${process.env.MYSQLHOST}`);
    return mysql.createPool({
      host: process.env.MYSQLHOST,
      user: process.env.MYSQLUSER || "root",
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE || "railway",
      port: parseInt(process.env.MYSQLPORT || "3306"),
      waitForConnections: true,
      connectionLimit: 10,
      family: 4
    });
  }
  console.log(`[DB] Falling back to Local/Default`);
  return mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "polic_ia",
    family: 4
  });
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
if (!serviceAccountPath) {
  console.error("CRITICAL: FIREBASE_SERVICE_ACCOUNT is missing in environment variables.");
  process.exit(1);
}
if (!firebaseProjectId) {
  console.error("CRITICAL: FIREBASE_PROJECT_ID is missing in environment variables.");
  process.exit(1);
}
var serviceAccount;
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
  console.error("FAILURE: Could not parse Firebase Service Account JSON.");
  console.error("ERROR DETAILS:", error.message);
  console.error("HINT: Ensure the variable in Railway contains the FULL JSON content starting with { and ending with }");
  process.exit(1);
}
var app = initializeApp({
  credential: cert(serviceAccount),
  projectId: firebaseProjectId
}, "polic-ia-admin");
var adminAuth = getAuth(app);
var db2 = getFirestore(app);
var storage = getStorage(app);

// src/backend/server/trpc.ts
var createContext = async ({ req, res }) => {
  const authHeader = req.headers.authorization;
  let userId = null;
  let userEmail = null;
  let userRole = "user";
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      if (token && token.length > 50) {
        const decodedToken = await adminAuth.verifyIdToken(token);
        userId = decodedToken.uid;
        const email = decodedToken.email?.toLowerCase().trim();
        userEmail = email || null;
        console.log(`[AUTH] Verifying token for: ${email} (UID: ${userId})`);
        if (email === "brizq02@gmail.com") {
          console.log(`[AUTH] Admin override active for ${email}`);
          userRole = "admin";
        }
      } else if (process.env.NODE_ENV !== "production" && token) {
        userId = token;
      }
      if (userId) {
        console.log(`[DB-LOOKUP] Fetching user ${userId} from database...`);
        const [user] = await db.select({
          role: users.role,
          email: users.email
        }).from(users).where(eq(users.uid, userId));
        console.log(`[DB-LOOKUP] Success: User found? ${!!user}`);
        if (user) {
          if (user.email === "brizq02@gmail.com") {
            userRole = "admin";
          } else {
            userRole = user.role;
          }
        }
      }
    } catch (error) {
      console.error("Auth context error:", error);
    }
  }
  return { req, res, userId, userEmail, userRole };
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
var adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.userRole !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// src/backend/server/routers/auth.ts
import { z } from "zod";
import { eq as eq2 } from "drizzle-orm";
var authRouter = router({
  login: protectedProcedure.input(z.object({
    email: z.string().email(),
    name: z.string(),
    photoURL: z.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const uid = ctx.userId;
    const isOwner = input.email === "brizq02@gmail.com";
    let finalName = input.name;
    if (!finalName || finalName === "Postulante") {
      finalName = input.email.split("@")[0];
    }
    const [existingUser] = await db.select().from(users).where(eq2(users.uid, uid));
    if (!existingUser) {
      await db.insert(users).values({
        uid,
        email: input.email,
        name: finalName,
        photoURL: input.photoURL,
        role: isOwner ? "admin" : "user",
        membership: "FREE",
        status: "ACTIVE",
        lastActive: /* @__PURE__ */ new Date()
      });
    } else {
      await db.update(users).set({
        lastActive: /* @__PURE__ */ new Date(),
        email: input.email,
        ...finalName !== "Postulante" && { name: finalName },
        ...input.photoURL && { photoURL: input.photoURL },
        ...isOwner && { role: "admin" }
      }).where(eq2(users.uid, uid));
    }
    return { success: true };
  }),
  logout: protectedProcedure.mutation(() => {
    return { success: true };
  })
});

// src/backend/server/routers/user.ts
import { z as z2 } from "zod";
import { eq as eq3, sql, desc, and, gte } from "drizzle-orm";
import { TRPCError as TRPCError2 } from "@trpc/server";
var userRouter = router({
  getProfile: protectedProcedure.input(z2.object({ uid: z2.string() })).query(async ({ ctx, input }) => {
    if (ctx.userId !== input.uid && ctx.userRole !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: "Unauthorized access to this profile" });
    }
    let [user] = await db.select().from(users).where(eq3(users.uid, input.uid));
    const isPrincipalAdmin = ctx.userEmail === "brizq02@gmail.com";
    if (!user) {
      console.log(`[SYNC] User ${input.uid} not found in MySQL. Provisioning new profile...`);
      await db.insert(users).values({
        uid: input.uid,
        email: ctx.userEmail || "unknown@polic.ia",
        name: isPrincipalAdmin ? "Admin Principal" : "Postulante",
        role: isPrincipalAdmin ? "admin" : "user",
        membership: "FREE",
        status: "ACTIVE",
        lastActive: /* @__PURE__ */ new Date()
      });
      [user] = await db.select().from(users).where(eq3(users.uid, input.uid));
    }
    if (!user) throw new TRPCError2({ code: "INTERNAL_SERVER_ERROR", message: "Failed to provision user profile" });
    if (isPrincipalAdmin && user.role !== "admin") {
      console.log("[SECURITY] Verified Principal Admin detected. Forcing role elevation.");
      await db.update(users).set({ role: "admin", email: "brizq02@gmail.com" }).where(eq3(users.uid, user.uid));
      user.role = "admin";
    }
    if (user.membership === "PRO" && user.premiumExpiration && user.premiumExpiration < /* @__PURE__ */ new Date()) {
      await db.update(users).set({ membership: "FREE", premiumExpiration: null }).where(eq3(users.uid, user.uid));
      user.membership = "FREE";
      user.premiumExpiration = null;
    }
    return {
      ...user,
      role: ctx.userRole,
      // ALWAYS use the context role (it's the source of truth)
      photoURL: user.photoURL
    };
  }),
  selectSchool: protectedProcedure.input(z2.object({ uid: z2.string(), school: z2.enum(["EO", "EESTP"]) })).mutation(async ({ ctx, input }) => {
    if (ctx.userId !== input.uid) {
      throw new TRPCError2({ code: "FORBIDDEN", message: "Unauthorized school selection" });
    }
    const [user] = await db.select().from(users).where(eq3(users.uid, input.uid));
    if (!user) throw new TRPCError2({ code: "NOT_FOUND", message: "User not found" });
    if (user.school) throw new TRPCError2({ code: "FORBIDDEN", message: "School selection is irreversible" });
    await db.update(users).set({ school: input.school }).where(eq3(users.uid, input.uid));
    const [updatedUser] = await db.select().from(users).where(eq3(users.uid, input.uid));
    return { success: true, school: input.school, user: updatedUser };
  }),
  getStats: protectedProcedure.input(z2.object({ uid: z2.string() })).query(async ({ ctx, input }) => {
    if (ctx.userId !== input.uid && ctx.userRole !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: "Unauthorized access to stats" });
    }
    const stats = await db.select({
      totalAttempts: sql`count(${examAttempts.id})`,
      averageScore: sql`avg(${examAttempts.score})`,
      bestScore: sql`max(${examAttempts.score})`,
      lastExamDate: sql`max(${examAttempts.startedAt})`,
      passedCount: sql`sum(case when ${examAttempts.passed} = 1 then 1 else 0 end)`
    }).from(examAttempts).where(eq3(examAttempts.userId, input.uid));
    return stats[0] || { totalAttempts: 0, averageScore: 0, bestScore: 0, lastExamDate: null, passedCount: 0 };
  }),
  getRanking: protectedProcedure.query(async () => {
    const topScores = await db.select({
      uid: users.uid,
      name: users.name,
      photoURL: users.photoURL,
      bestScore: sql`max(${examAttempts.score})`
    }).from(examAttempts).innerJoin(users, eq3(examAttempts.userId, users.uid)).groupBy(users.uid).orderBy(sql`max(${examAttempts.score}) desc`).limit(100);
    return topScores;
  }),
  updateProfile: protectedProcedure.input(z2.object({
    uid: z2.string(),
    name: z2.string().min(1).max(255).optional(),
    photoURL: z2.string().max(512).optional(),
    age: z2.number().int().min(15).max(100).optional(),
    city: z2.string().max(100).optional()
  })).mutation(async ({ ctx, input }) => {
    if (ctx.userId !== input.uid) {
      throw new TRPCError2({ code: "FORBIDDEN", message: "Unauthorized profile update" });
    }
    const [user] = await db.select().from(users).where(eq3(users.uid, input.uid));
    if (!user) throw new TRPCError2({ code: "NOT_FOUND", message: "User not found" });
    if (user.profileEdited && ctx.userRole !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: "El perfil ya ha sido editado previamente (L\xEDmite: 1 vez)" });
    }
    await db.update(users).set({
      ...input.name && { name: input.name },
      ...input.photoURL && { photoURL: input.photoURL },
      ...input.age !== void 0 && { age: input.age },
      ...input.city && { city: input.city },
      profileEdited: true
    }).where(eq3(users.uid, input.uid));
    return { success: true };
  }),
  updateLastSeen: protectedProcedure.input(z2.object({ uid: z2.string() })).mutation(async ({ ctx, input }) => {
    if (ctx.userId !== input.uid) {
      throw new TRPCError2({ code: "FORBIDDEN", message: "Unauthorized lastSeen update" });
    }
    await db.update(users).set({ lastActive: /* @__PURE__ */ new Date() }).where(eq3(users.uid, input.uid));
    return { success: true };
  }),
  getLastBroadcast: protectedProcedure.query(async () => {
    const activeBroadcasts = await db.select().from(globalNotifications).where(
      and(
        eq3(globalNotifications.isActive, true),
        globalNotifications.expiresAt ? gte(globalNotifications.expiresAt, /* @__PURE__ */ new Date()) : void 0
      )
    ).orderBy(desc(globalNotifications.createdAt)).limit(1);
    return activeBroadcasts[0] || null;
  })
});

// src/backend/server/routers/exam.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
import { z as z3 } from "zod";
import { eq as eq4, desc as desc2, and as and2, sql as sql2 } from "drizzle-orm";
var examRouter = router({
  /** Fetch questions from DB dynamically (for admin-uploaded exams) */
  getQuestionsByFilter: protectedProcedure.input(z3.object({
    school: z3.enum(["EO", "EESTP", "BOTH"]).optional(),
    areaId: z3.number().optional(),
    difficulty: z3.enum(["EASY", "MEDIUM", "HARD"]).optional(),
    examId: z3.number().optional(),
    // Specific level filter
    limit: z3.number().min(1).max(200).default(100)
  })).query(async ({ input }) => {
    let query = db.select().from(examQuestions);
    const filters = [];
    if (input.school) {
      filters.push(sql2`(${examQuestions.schoolType} = ${input.school} OR ${examQuestions.schoolType} = 'BOTH')`);
    }
    if (input.areaId) {
      filters.push(eq4(examQuestions.areaId, input.areaId));
    }
    if (input.difficulty) {
      filters.push(eq4(examQuestions.difficulty, input.difficulty));
    }
    if (input.examId) {
      filters.push(eq4(examQuestions.examId, input.examId));
    }
    const whereClause = filters.length > 0 ? and2(...filters) : void 0;
    const questions = await db.select().from(examQuestions).where(whereClause).orderBy(sql2`RAND()`).limit(input.limit);
    return questions;
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
      throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized attempt submission" });
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
        for (const ans of input.answers) {
          const [existingCard] = await tx.select().from(leitnerCards).where(and2(
            eq4(leitnerCards.userId, input.userId),
            eq4(leitnerCards.questionId, ans.questionId)
          ));
          if (existingCard) {
            const nextLevel = ans.isCorrect ? Math.min(existingCard.level + 1, 5) : 1;
            const hoursToWait = [0, 24, 48, 168, 336, 720][nextLevel];
            const nextReview = /* @__PURE__ */ new Date();
            nextReview.setHours(nextReview.getHours() + hoursToWait);
            await tx.update(leitnerCards).set({ level: nextLevel, nextReview }).where(eq4(leitnerCards.id, existingCard.id));
          } else if (!ans.isCorrect) {
            const nextReview = /* @__PURE__ */ new Date();
            nextReview.setHours(nextReview.getHours() + 24);
            await tx.insert(leitnerCards).values({
              userId: input.userId,
              questionId: ans.questionId,
              level: 1,
              nextReview
            });
          }
        }
      }
      return { success: true, attemptId: attempt.insertId };
    });
    return result;
  }),
  getHistory: protectedProcedure.input(z3.object({ userId: z3.string() })).query(async ({ ctx, input }) => {
    if (ctx.userId !== input.userId && ctx.userRole !== "admin") {
      throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized access to history" });
    }
    return await db.select().from(examAttempts).where(eq4(examAttempts.userId, input.userId)).orderBy(desc2(examAttempts.startedAt));
  }),
  /** Get available exam levels for the student dashboard */
  getLevels: protectedProcedure.query(async () => {
    return await db.select().from(exams).orderBy(exams.school, exams.level);
  })
});

// src/backend/server/routers/learning.ts
import { z as z4 } from "zod";
import { eq as eq5, or, and as and3 } from "drizzle-orm";
var learningRouter = router({
  getAreas: protectedProcedure.query(async () => {
    return await db.select().from(learningAreas);
  }),
  getContentByArea: protectedProcedure.input(z4.object({
    areaId: z4.number(),
    school: z4.enum(["EO", "EESTP", "BOTH"]).optional()
  })).query(async ({ input }) => {
    const areaFilter = eq5(learningContent.areaId, input.areaId);
    if (input.school && input.school !== "BOTH") {
      const schoolFilter = or(
        eq5(learningContent.schoolType, input.school),
        eq5(learningContent.schoolType, "BOTH")
      );
      return await db.select().from(learningContent).where(and3(areaFilter, schoolFilter));
    }
    return await db.select().from(learningContent).where(areaFilter);
  })
});

// src/backend/server/routers/leitner.ts
import { TRPCError as TRPCError4 } from "@trpc/server";
import { z as z5 } from "zod";
import { eq as eq6, and as and4, lte, or as or2, sql as sql3 } from "drizzle-orm";
var leitnerRouter = router({
  getPending: protectedProcedure.input(z5.object({ userId: z5.string() })).query(async ({ ctx, input }) => {
    if (ctx.userId !== input.userId) {
      throw new TRPCError4({ code: "FORBIDDEN", message: "Unauthorized access to cards" });
    }
    const now = /* @__PURE__ */ new Date();
    return await db.select({
      id: leitnerCards.id,
      level: leitnerCards.level,
      nextReview: leitnerCards.nextReview,
      question: examQuestions.question,
      options: examQuestions.options,
      correctOption: examQuestions.correctOption
    }).from(leitnerCards).innerJoin(examQuestions, eq6(leitnerCards.questionId, examQuestions.id)).where(and4(
      eq6(leitnerCards.userId, input.userId),
      or2(lte(leitnerCards.nextReview, now), eq6(leitnerCards.level, 0))
    ));
  }),
  updateCard: protectedProcedure.input(z5.object({
    id: z5.number(),
    success: z5.boolean()
  })).mutation(async ({ ctx, input }) => {
    const [card] = await db.select().from(leitnerCards).where(eq6(leitnerCards.id, input.id));
    if (!card) throw new TRPCError4({ code: "NOT_FOUND", message: "Card not found" });
    if (card.userId !== ctx.userId) {
      throw new TRPCError4({ code: "FORBIDDEN", message: "You do not own this card" });
    }
    const nextLevel = input.success ? Math.min(card.level + 1, 5) : 1;
    const hoursToWait = [0, 24, 48, 168, 336, 720][nextLevel];
    const nextReview = /* @__PURE__ */ new Date();
    nextReview.setHours(nextReview.getHours() + hoursToWait);
    await db.update(leitnerCards).set({ level: nextLevel, nextReview }).where(eq6(leitnerCards.id, input.id));
    return { success: true, nextLevel, nextReview };
  }),
  getStats: protectedProcedure.input(z5.object({ userId: z5.string() })).query(async ({ ctx, input }) => {
    if (ctx.userId !== input.userId) {
      throw new TRPCError4({ code: "FORBIDDEN", message: "Unauthorized access to stats" });
    }
    const now = /* @__PURE__ */ new Date();
    const stats = await db.select({
      count: sql3`count(${leitnerCards.id})`
    }).from(leitnerCards).where(and4(
      eq6(leitnerCards.userId, input.userId),
      or2(lte(leitnerCards.nextReview, now), eq6(leitnerCards.level, 0))
    ));
    return stats[0] || { count: 0 };
  }),
  getStatsByArea: protectedProcedure.input(z5.object({ userId: z5.string() })).query(async ({ ctx, input }) => {
    if (ctx.userId !== input.userId) {
      throw new TRPCError4({ code: "FORBIDDEN", message: "Unauthorized access to stats" });
    }
    const stats = await db.select({
      areaName: sql3`la.name`,
      count: sql3`count(${leitnerCards.id})`
    }).from(leitnerCards).innerJoin(sql3`exam_questions eq`, sql3`eq.id = ${leitnerCards.questionId}`).innerJoin(sql3`learning_areas la`, sql3`la.id = eq.area_id`).where(eq6(leitnerCards.userId, input.userId)).groupBy(sql3`la.name`);
    return stats;
  }),
  getCountByLevel: protectedProcedure.input(z5.object({ userId: z5.string(), level: z5.number() })).query(async ({ ctx, input }) => {
    if (ctx.userId !== input.userId) {
      throw new TRPCError4({ code: "FORBIDDEN", message: "Unauthorized access to stats" });
    }
    const stats = await db.select({
      count: sql3`count(${leitnerCards.id})`
    }).from(leitnerCards).where(and4(
      eq6(leitnerCards.userId, input.userId),
      eq6(leitnerCards.level, input.level)
    ));
    return stats[0]?.count || 0;
  })
});

// src/backend/server/routers/membership_admin.ts
import { z as z6 } from "zod";
import { eq as eq7, sql as sql4, and as and5, like, or as or3 } from "drizzle-orm";
import { TRPCError as TRPCError5 } from "@trpc/server";
var adminRouter = router({
  // ─── BROADCAST (Alerta Roja) ───
  getActiveBroadcast: publicProcedure.query(async () => {
    const [active] = await db.select().from(globalNotifications).where(
      and5(
        sql4`${globalNotifications.isActive} = 1`,
        sql4`(${globalNotifications.expiresAt} IS NULL OR ${globalNotifications.expiresAt} > NOW())`
      )
    ).orderBy(sql4`${globalNotifications.createdAt} desc`).limit(1);
    return active || null;
  }),
  // ─── STATS ───
  getAdminStats: adminProcedure.query(async () => {
    const [userCounts] = await db.select({
      total: sql4`count(${users.uid})`,
      premium: sql4`sum(case when ${users.membership} = 'PRO' then 1 else 0 end)`,
      free: sql4`sum(case when ${users.membership} = 'FREE' then 1 else 0 end)`,
      activeUsers: sql4`sum(case when ${users.lastActive} >= NOW() - INTERVAL 5 MINUTE then 1 else 0 end)`
    }).from(users);
    const [revenueObj] = await db.select({
      dailyIncome: sql4`sum(case when DATE(${adminLogs.createdAt}) = CURDATE() AND ${adminLogs.action} LIKE '%MANUAL_OVERRIDE: Set % to PRO' then 145 else 0 end)`
    }).from(adminLogs);
    const [questionsStats] = await db.select({
      total: sql4`count(${examQuestions.id})`
    }).from(examQuestions);
    return {
      totalUsers: Number(userCounts.total) || 0,
      proUsers: Number(userCounts.premium) || 0,
      freeUsers: Number(userCounts.free) || 0,
      onlineCount: Number(userCounts.activeUsers) || 0,
      dailyRevenue: Number(revenueObj.dailyIncome) || 0,
      totalQuestions: Number(questionsStats.total) || 0,
      totalContent: 0
    };
  }),
  // ─── DASHBOARD STATS ───
  getDashboardStats: adminProcedure.query(async () => {
    const [counts] = await db.select({
      total: sql4`count(${users.uid})`,
      pro: sql4`sum(case when ${users.membership} = 'PRO' then 1 else 0 end)`,
      free: sql4`sum(case when ${users.membership} = 'FREE' then 1 else 0 end)`,
      active: sql4`sum(case when ${users.status} = 'ACTIVE' then 1 else 0 end)`,
      blocked: sql4`sum(case when ${users.status} = 'BLOCKED' then 1 else 0 end)`,
      online: sql4`sum(case when ${users.lastActive} >= NOW() - INTERVAL 5 MINUTE then 1 else 0 end)`
    }).from(users);
    return {
      totalUsers: Number(counts.total) || 0,
      proUsers: Number(counts.pro) || 0,
      freeUsers: Number(counts.free) || 0,
      activeUsers: Number(counts.active) || 0,
      blockedUsers: Number(counts.blocked) || 0,
      onlineNow: Number(counts.online) || 0
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
    const whereClause = filters.length > 0 ? and5(...filters) : void 0;
    return await db.select().from(users).where(whereClause).orderBy(sql4`${users.createdAt} desc`);
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
    }).where(eq7(users.uid, input.uid));
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
      await db.update(users).set({ membership: input.membership, premiumExpiration: expiration }).where(eq7(users.uid, input.targetUid));
    }
    if (input.status) {
      await db.update(users).set({ status: input.status }).where(eq7(users.uid, input.targetUid));
    }
    return { success: true };
  }),
  sendBroadcast: adminProcedure.input(z6.object({
    title: z6.string(),
    message: z6.string(),
    type: z6.enum(["INFO", "WARNING", "EVENT"]).default("WARNING"),
    durationHours: z6.number().default(24)
  })).mutation(async ({ input }) => {
    await db.update(globalNotifications).set({ isActive: false });
    await db.insert(globalNotifications).values({
      title: input.title,
      message: input.message,
      type: input.type,
      isActive: true,
      expiresAt: new Date(Date.now() + input.durationHours * 60 * 60 * 1e3)
    });
    return { success: true };
  }),
  deleteUser: adminProcedure.input(z6.object({ uid: z6.string() })).mutation(async ({ input }) => {
    console.log(`[ADMIN] DELETING USER: ${input.uid}`);
    await db.delete(users).where(eq7(users.uid, input.uid));
    await db.insert(adminLogs).values({
      action: `DELETE_USER: Removed ${input.uid} from system`
    });
    return { success: true };
  }),
  updateUserSchool: adminProcedure.input(z6.object({
    uid: z6.string(),
    school: z6.enum(["EO", "EESTP"])
  })).mutation(async ({ input }) => {
    await db.update(users).set({ school: input.school }).where(eq7(users.uid, input.uid));
    await db.insert(adminLogs).values({
      action: `Changed school for ${input.uid} to ${input.school}`
    });
    const [updatedUser] = await db.select().from(users).where(eq7(users.uid, input.uid));
    return { success: true, user: updatedUser };
  }),
  getActiveCount: adminProcedure.query(async () => {
    const [result] = await db.select({
      count: sql4`count(${users.uid})`
    }).from(users).where(sql4`${users.lastActive} >= NOW() - INTERVAL 5 MINUTE`);
    return { count: result.count || 0 };
  }),
  toggleAdminRole: adminProcedure.input(z6.object({ uid: z6.string(), isAdmin: z6.boolean() })).mutation(async ({ input }) => {
    await db.update(users).set({ role: input.isAdmin ? "admin" : "user" }).where(eq7(users.uid, input.uid));
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
      return await db.select().from(learningContent).where(eq7(learningContent.areaId, input.areaId));
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
    await db.update(learningContent).set(data).where(eq7(learningContent.id, id));
    await db.insert(adminLogs).values({ action: `Updated content #${id}` });
    return { success: true };
  }),
  deleteContent: adminProcedure.input(z6.object({ id: z6.number() })).mutation(async ({ input }) => {
    await db.delete(learningContent).where(eq7(learningContent.id, input.id));
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
    if (input?.areaId) filters.push(eq7(examQuestions.areaId, input.areaId));
    if (input?.difficulty) filters.push(eq7(examQuestions.difficulty, input.difficulty));
    if (input?.schoolType) filters.push(eq7(examQuestions.schoolType, input.schoolType));
    const whereClause = filters.length > 0 ? and5(...filters) : void 0;
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
      throw new TRPCError5({ code: "BAD_REQUEST", message: "correctOption index out of bounds" });
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
    await db.update(examQuestions).set(data).where(eq7(examQuestions.id, id));
    await db.insert(adminLogs).values({ action: `Updated question #${id}` });
    return { success: true };
  }),
  deleteQuestion: adminProcedure.input(z6.object({ id: z6.number() })).mutation(async ({ input }) => {
    await db.delete(examQuestions).where(eq7(examQuestions.id, input.id));
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
    return await db.select().from(adminLogs).orderBy(sql4`${adminLogs.createdAt} desc`).limit(input?.limit || 50);
  })
});

// src/backend/server/routers/admin_exams.ts
import { z as z7 } from "zod";
import { eq as eq8, desc as desc3 } from "drizzle-orm";
var adminExamRouter = router({
  /** Upload a new exam level */
  uploadExam: adminProcedure.input(z7.object({
    school: z7.enum(["EO", "EESTP"]),
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
    const [lastExam] = await db.select().from(exams).where(eq8(exams.school, input.school)).orderBy(desc3(exams.level)).limit(1);
    const nextLevel = (lastExam?.level || 0) + 1;
    const finalTitle = input.title || `Nivel ${nextLevel.toString().padStart(2, "0")}`;
    return await db.transaction(async (tx) => {
      const [newExam] = await tx.insert(exams).values({
        school: input.school,
        level: nextLevel,
        title: finalTitle,
        isDemo: input.isDemo
      });
      const examId = newExam.insertId;
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
            // Align with question table convention
          }))
        );
      }
      return { success: true, level: nextLevel, examId };
    });
  }),
  /** Get all exams for management */
  getExams: adminProcedure.query(async () => {
    return await db.select().from(exams).orderBy(desc3(exams.createdAt));
  }),
  /** Delete an exam and its questions */
  deleteExam: adminProcedure.input(z7.object({ examId: z7.number() })).mutation(async ({ input }) => {
    return await db.transaction(async (tx) => {
      await tx.delete(examQuestions).where(eq8(examQuestions.examId, input.examId));
      await tx.delete(examMaterials).where(eq8(examMaterials.examId, input.examId));
      await tx.delete(exams).where(eq8(exams.id, input.examId));
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
    return await db.select().from(examMaterials).where(eq8(examMaterials.examId, input.examId)).orderBy(desc3(examMaterials.createdAt));
  }),
  /** Delete a specific material */
  deleteMaterial: adminProcedure.input(z7.object({ id: z7.number() })).mutation(async ({ input }) => {
    await db.delete(examMaterials).where(eq8(examMaterials.id, input.id));
    return { success: true };
  })
});

// src/backend/server/routers/admin_courses.ts
import { z as z8 } from "zod";
import { eq as eq9, desc as desc4 } from "drizzle-orm";
var adminCourseRouter = router({
  /* -------------------------------------------------------------------------- */
  /*                            COURSE MANAGEMENT                               */
  /* -------------------------------------------------------------------------- */
  /** Get all courses */
  getCourses: protectedProcedure.query(async () => {
    return await db.select().from(courses).orderBy(desc4(courses.createdAt));
  }),
  /** Create a new course */
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
  /** Update an existing course */
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
    await db.update(courses).set(input.data).where(eq9(courses.id, input.courseId));
    return { success: true };
  }),
  /** Delete a course (will cascade delete materials if DB is set up that way, otherwise manual delete needed) */
  deleteCourse: adminProcedure.input(z8.object({ courseId: z8.number() })).mutation(async ({ input }) => {
    await db.transaction(async (tx) => {
      await tx.delete(courseMaterials).where(eq9(courseMaterials.courseId, input.courseId));
      await tx.delete(courses).where(eq9(courses.id, input.courseId));
    });
    return { success: true };
  }),
  /* -------------------------------------------------------------------------- */
  /*                          MATERIAL MANAGEMENT                               */
  /* -------------------------------------------------------------------------- */
  /** Get materials for a specific course */
  getCourseMaterials: protectedProcedure.input(z8.object({ courseId: z8.number() })).query(async ({ input }) => {
    return await db.select().from(courseMaterials).where(eq9(courseMaterials.courseId, input.courseId)).orderBy(courseMaterials.order);
  }),
  /** Add a new material to a course */
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
  /** Delete a material */
  deleteCourseMaterial: adminProcedure.input(z8.object({ materialId: z8.number() })).mutation(async ({ input }) => {
    await db.delete(courseMaterials).where(eq9(courseMaterials.id, input.materialId));
    return { success: true };
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
  adminCourses: adminCourseRouter
});

// src/backend/server/index.ts
import fs from "fs";
import path from "path";
import { eq as eq10, and as and7 } from "drizzle-orm";
dotenv2.config();
var app2 = express();
var port = process.env.PORT || 3001;
app2.use(cors({
  origin: true,
  // Dynamically allow the origin of the request
  credentials: true
}));
process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught Exception:", err);
  setTimeout(() => process.exit(1), 500);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("[FATAL] Unhandled Rejection at:", promise, "reason:", reason);
});
app2.use((req, _res, next) => {
  console.log(`[REQ] ${req.method} ${req.path} from ${req.headers.origin || "no-origin"} (IP: ${req.ip})`);
  next();
});
app2.use(express.json());
app2.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext
  })
);
app2.get("/health", (req, res) => {
  res.send("Server is running and healthy!");
});
var distPath = path.join(process.cwd(), "dist");
if (fs.existsSync(distPath)) {
  console.log(`[SYS] \u2705 Serving frontend from ${distPath}`);
  app2.use(express.static(distPath));
  app2.get("*", (req, res) => {
    if (req.path.startsWith("/trpc") || req.path.startsWith("/health")) return;
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("[SYS] index.html not found in dist/. Run npm run build first.");
    }
  });
} else {
  console.warn("[SYS] \u26A0\uFE0F  dist/ not found \u2014 frontend NOT being served. Run npm run build on Railway.");
  app2.get("/", (_req, res) => {
    res.send("POLIC.ia API OK \u2014 Frontend not bundled. Run npm run build.");
  });
}
async function ensureTablesExist() {
  try {
    console.log("Ensuring database tables exist...");
    await poolConnection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        uid VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        photo_url VARCHAR(512),
        role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
        school ENUM('EO', 'EESTP'),
        membership ENUM('FREE', 'PRO') NOT NULL DEFAULT 'FREE',
        premium_expiration TIMESTAMP NULL,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        profile_edited BOOLEAN NOT NULL DEFAULT FALSE,
        age INT,
        city VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    try {
      await poolConnection.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_edited BOOLEAN NOT NULL DEFAULT FALSE`);
    } catch (alterError) {
      console.log("Profile_edited column check skipped.");
    }
    await poolConnection.execute(`
      CREATE TABLE IF NOT EXISTS exam_questions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        exam_id INT,
        area_id INT DEFAULT 1,
        question TEXT NOT NULL,
        options JSON NOT NULL,
        correct_option INT NOT NULL,
        explanation TEXT,
        difficulty ENUM('EASY', 'MEDIUM', 'HARD') DEFAULT 'MEDIUM',
        school_type ENUM('EO', 'EESTP', 'BOTH') DEFAULT 'BOTH',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await poolConnection.execute(`
      CREATE TABLE IF NOT EXISTS exam_attempts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(255) NOT NULL,
        score FLOAT NOT NULL,
        passed BOOLEAN NOT NULL,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP NULL
      )
    `);
    await poolConnection.execute(`
      CREATE TABLE IF NOT EXISTS attempt_answers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        attempt_id INT NOT NULL,
        question_id INT NOT NULL,
        chosen_option INT NOT NULL,
        is_correct BOOLEAN NOT NULL
      )
    `);
    await poolConnection.execute(`
      CREATE TABLE IF NOT EXISTS leitner_cards (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(255) NOT NULL,
        question_id INT NOT NULL,
        level INT DEFAULT 1,
        next_review TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_reviewed TIMESTAMP NULL,
        UNIQUE KEY user_question (user_id, question_id)
      )
    `);
    await poolConnection.execute(`
      CREATE TABLE IF NOT EXISTS exams (
        id INT PRIMARY KEY AUTO_INCREMENT,
        school ENUM('EO', 'EESTP') NOT NULL,
        level INT NOT NULL,
        title VARCHAR(255),
        is_demo BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    try {
      await poolConnection.execute(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE`);
    } catch (alterError) {
      console.log("Is_demo column check skipped.");
    }
    try {
      await poolConnection.execute(`ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS exam_id INT`);
    } catch (alterError) {
      console.log("Exam_id column check skipped.");
    }
    await poolConnection.execute(`
      CREATE TABLE IF NOT EXISTS courses (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        thumbnail_url VARCHAR(512),
        level ENUM('BASICO', 'INTERMEDIO', 'AVANZADO') DEFAULT 'BASICO',
        school_type ENUM('EO', 'EESTP', 'BOTH') DEFAULT 'BOTH',
        is_published BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await poolConnection.execute(`
      CREATE TABLE IF NOT EXISTS course_materials (
        id INT PRIMARY KEY AUTO_INCREMENT,
        course_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        type ENUM('PDF', 'VIDEO', 'EXAM', 'LINK', 'TEXT') NOT NULL,
        content_url VARCHAR(512),
        \`order\` INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      )
    `);
    await poolConnection.execute(`
      CREATE TABLE IF NOT EXISTS global_notifications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('INFO', 'WARNING', 'EVENT') DEFAULT 'INFO',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        expires_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await poolConnection.execute(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        action TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    const alterColumns = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS membership ENUM('FREE','PRO') NOT NULL DEFAULT 'FREE'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_edited BOOLEAN NOT NULL DEFAULT FALSE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_expiration TIMESTAMP NULL`
    ];
    for (const stmt of alterColumns) {
      try {
        await poolConnection.execute(stmt);
      } catch (_) {
      }
    }
    console.log("Database verification complete.");
    try {
      const examsDir = path.join(process.cwd(), "data", "exams");
      if (fs.existsSync(examsDir)) {
        console.log("[AUTO-INGEST] Scanning for exam files...");
        const files = fs.readdirSync(examsDir).filter((f) => f.endsWith(".json"));
        for (const file of files) {
          const content = fs.readFileSync(path.join(examsDir, file), "utf-8");
          const data = JSON.parse(content);
          const levelNum = file.includes("01") ? 1 : 2;
          const existing = await db.select().from(exams).where(and7(eq10(exams.school, data.school), eq10(exams.level, levelNum)));
          if (existing.length === 0) {
            console.log(`[AUTO-INGEST] Importing ${data.school} Level ${levelNum}...`);
            const [newExam] = await db.insert(exams).values({
              school: data.school,
              level: levelNum,
              title: data.title || `Nivel ${levelNum}`,
              isDemo: levelNum === 1
            });
            const examId = newExam.insertId;
            if (data.questions && data.questions.length > 0) {
              const questionValues = data.questions.map((q) => ({
                examId: Number(examId),
                areaId: 1,
                // Fallback to general area
                question: q.question,
                options: q.options,
                correctOption: q.correctOption,
                difficulty: "MEDIUM",
                schoolType: data.school
              }));
              await db.insert(examQuestions).values(questionValues);
              console.log(`[AUTO-INGEST] Successfully imported ${data.questions.length} questions for ${data.school} L${levelNum}.`);
            }
          }
        }
      }
    } catch (ingestError) {
      console.error("[AUTO-INGEST] Failed:", ingestError);
    }
  } catch (error) {
    console.log("Database verification FAILED:", error);
  }
}
async function startServer() {
  try {
    await poolConnection.execute("SELECT 1");
    console.log("[DB] \u2705 DB_CONNECTED_SUCCESSFULLY \u2014 Connection pool is live.");
  } catch (dbErr) {
    console.error("[DB] \u274C CRITICAL: DB connection FAILED on startup:", dbErr.message);
    console.error("[DB] Check MYSQL_URL / DATABASE_URL env vars in Railway dashboard.");
  }
  await ensureTablesExist();
  try {
    console.log("[SECURITY] Enforcing admin role for brizq02@gmail.com...");
    await poolConnection.execute(`UPDATE users SET role = 'admin' WHERE email = 'brizq02@gmail.com'`);
    console.log("[SECURITY] \u2705 Admin override applied.");
  } catch (err) {
    console.error("[SECURITY] \u26A0\uFE0F  Admin override skipped:", err.message);
  }
  app2.listen(port, () => {
    console.log(`[SYS] \u{1F680} tRPC server ONLINE at http://localhost:${port}`);
    console.log(`[SYS]    PROD mode: ${process.env.NODE_ENV || "development"}`);
    console.log(`[SYS]    dist/ present: ${fs.existsSync(distPath)}`);
  });
}
startServer().catch((err) => {
  console.error("[SYS] \u274C FATAL: startServer failed:", err);
  process.exit(1);
});
