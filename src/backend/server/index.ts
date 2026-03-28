import express from 'express';
import cors from 'cors';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './routers';
import { createContext } from './trpc';
import dotenv from 'dotenv';
import './firebaseAdmin';

dotenv.config();

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
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
      await pool.execute(`ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS exam_id INT REFERENCES exams(id)`);
    } catch (alterError) {
      console.log('Exam_id column check skipped.');
    }
    
    console.log('Database verification complete.');

    // Auto-ingest initial levels if they exist and are missing from DB
    try {
      const fs = await import('fs');
      const path = await import('path');
      const examsDir = path.join(process.cwd(), 'data', 'exams');
      
      if (fs.existsSync(examsDir)) {
        console.log('[AUTO-INGEST] Scanning for exam files...');
        const files = fs.readdirSync(examsDir).filter(f => f.endsWith('.json'));
        const { db, exams, examQuestions } = await import('../../database/db');
        const { eq, and } = await import('drizzle-orm');

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
    console.error('Database verification FAILED:', error);
  }
}

app.listen(port, async () => {
  await ensureTablesExist();
  console.log(`tRPC server listening at http://localhost:${port}`);
});
