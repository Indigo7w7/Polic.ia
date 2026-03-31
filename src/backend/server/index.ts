import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './routers';
import { createContext } from './trpc';
import './firebaseAdmin';
import fs from 'fs';
import path from 'path';
import { db, exams, examQuestions } from '../../database/db';
import { eq, and } from 'drizzle-orm';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
  origin: '*', // Allow all origins
  credentials: true
}));

// Global Request Logger for diagnostics
app.use((req, _res, next) => {
  console.log(`[REQ] ${req.method} ${req.path} from ${req.headers.origin || 'no-origin'} (IP: ${req.ip})`);
  next();
});
app.use(express.json());

app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.get('/health', (req, res) => {
  res.send('Server is running and healthy!');
});

// Serve static frontend files from 'dist' folder (added AFTER /trpc so API routes win)
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  console.log(`[SYS] ✅ Serving frontend from ${distPath}`);
  app.use(express.static(distPath));

  // SPA fallback: any route that isn't /trpc serves index.html
  app.get('*', (req, res) => {
    if (req.path.startsWith('/trpc') || req.path.startsWith('/health')) return;
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('[SYS] index.html not found in dist/. Run npm run build first.');
    }
  });
} else {
  console.warn('[SYS] ⚠️  dist/ not found — frontend NOT being served. Run npm run build on Railway.');
  app.get('/', (_req, res) => {
    res.send('POLIC.ia API OK — Frontend not bundled. Run npm run build.');
  });
}

import pool from './firebaseAdmin';

async function ensureTablesExist() {
  try {
    console.log('Ensuring database tables exist...');
    await pool.execute(`
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

    // Ensure profile_edited column exists in case the table was created previously
    try {
      await pool.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_edited BOOLEAN NOT NULL DEFAULT FALSE`);
    } catch (alterError) {
      console.log('Profile_edited column check skipped.');
    }

    // Exam Questions table
    await pool.execute(`
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

    // Exam Attempts table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS exam_attempts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(255) NOT NULL,
        score FLOAT NOT NULL,
        passed BOOLEAN NOT NULL,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP NULL
      )
    `);

    // Attempt Answers
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS attempt_answers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        attempt_id INT NOT NULL,
        question_id INT NOT NULL,
        chosen_option INT NOT NULL,
        is_correct BOOLEAN NOT NULL
      )
    `);

    // Leitner Cards
    await pool.execute(`
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

    // New: Exams table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS exams (
        id INT PRIMARY KEY AUTO_INCREMENT,
        school ENUM('EO', 'EESTP') NOT NULL,
        level INT NOT NULL,
        title VARCHAR(255),
        is_demo BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure is_demo exists in case the table was created previously
    try {
      await pool.execute(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE`);
    } catch (alterError) {
      console.log('Is_demo column check skipped.');
    }

    // Ensure exam_id exists in exam_questions
    try {
      await pool.execute(`ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS exam_id INT`);
    } catch (alterError) {
      console.log('Exam_id column check skipped.');
    }

    // Courses table
    await pool.execute(`
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

    // Course Materials table
    await pool.execute(`
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
    
    // Global Notifications table
    await pool.execute(`
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

    // Admin Logs table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        action TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // TAREA 1 (SQL): ALTER_TABLE_users_ADD_COLUMN_IF_NOT_EXISTS...
    try {
      await pool.execute(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS membership VARCHAR(50) DEFAULT 'FREE',
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE',
        ADD COLUMN IF NOT EXISTS last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      `);
    } catch (e) {
      console.log('Migración SQL: Skip/Error silencioso.');
    }
    
    console.log('Database verification complete.');

    // Auto-ingest initial levels if they exist and are missing from DB
    try {
      const examsDir = path.join(process.cwd(), 'data', 'exams');
      
      if (fs.existsSync(examsDir)) {
        console.log('[AUTO-INGEST] Scanning for exam files...');
        const files = fs.readdirSync(examsDir).filter(f => f.endsWith('.json'));

        for (const file of files) {
          const content = fs.readFileSync(path.join(examsDir, file), 'utf-8');
          const data = JSON.parse(content);
          const levelNum = file.includes('01') ? 1 : 2;

          const existing = await db.select().from(exams).where(and(eq(exams.school, data.school), eq(exams.level, levelNum)));
          if (existing.length === 0) {
            console.log(`[AUTO-INGEST] Importing ${data.school} Level ${levelNum}...`);
            const [newExam] = await db.insert(exams).values({
              school: data.school,
              level: levelNum,
              title: data.title || `Nivel ${levelNum}`,
              isDemo: levelNum === 1
            });
            const examId = newExam.insertId;

            // Ingest questions
            if (data.questions && data.questions.length > 0) {
              const questionValues = data.questions.map((q: any) => ({
                examId: Number(examId),
                areaId: 1, // Fallback to general area
                question: q.question,
                options: q.options,
                correctOption: q.correctOption,
                difficulty: 'MEDIUM',
                schoolType: data.school
              }));
              await db.insert(examQuestions).values(questionValues);
              console.log(`[AUTO-INGEST] Successfully imported ${data.questions.length} questions for ${data.school} L${levelNum}.`);
            }
          }
        }
      }
    } catch (ingestError) {
      console.error('[AUTO-INGEST] Failed:', ingestError);
    }
  } catch (error) {
    console.log('Database verification FAILED:', error);
  }
}

// ── STARTUP: DB must be ready BEFORE server accepts connections ──────────
async function startServer() {
  try {
    // 1. Validate DB connectivity
    await pool.execute('SELECT 1');
    console.log('[DB] ✅ DB_CONNECTED_SUCCESSFULLY — Connection pool is live.');
  } catch (dbErr: any) {
    console.error('[DB] ❌ CRITICAL: DB connection FAILED on startup:', dbErr.message);
    console.error('[DB] Check MYSQL_URL / DATABASE_URL env vars in Railway dashboard.');
    // Do not exit — server can still serve /health for Railway health checks
  }

  // 2. Ensure schema & tables
  await ensureTablesExist();

  // 3. Admin override
  try {
    console.log('[SECURITY] Enforcing admin role for brizq02@gmail.com...');
    await pool.execute(`UPDATE users SET role = 'admin' WHERE email = 'brizq02@gmail.com'`);
    console.log('[SECURITY] ✅ Admin override applied.');
  } catch (err: any) {
    console.error('[SECURITY] ⚠️  Admin override skipped:', err.message);
  }

  // 4. Start listening — only now
  app.listen(port, () => {
    console.log(`[SYS] 🚀 tRPC server ONLINE at http://localhost:${port}`);
    console.log(`[SYS]    PROD mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[SYS]    dist/ present: ${fs.existsSync(distPath)}`);
  });
}

startServer().catch(err => {
  console.error('[SYS] ❌ FATAL: startServer failed:', err);
  process.exit(1);
});
