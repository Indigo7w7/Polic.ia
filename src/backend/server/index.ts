import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './routers';
import { createContext } from './trpc';
import './firebaseAdmin';
import fs from 'fs';
import path from 'path';
import pool from './firebaseAdmin';
import { ingestLocalExams } from './utils/examIngest';

const app = express();
const port = process.env.PORT || 3001;

// ─── MANUAL CORS & PREFLIGHT HANDLING (ULTRA-ROBUST) ──────────
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://polic-ia-7bf7e.web.app',
    'https://polic-ia-7bf7e.firebaseapp.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ];

  if (origin && (allowedOrigins.includes(origin) || origin.endsWith('.web.app'))) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // For non-browser requests
    res.header('Access-Control-Allow-Origin', '*');
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-TRPC-Source, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(204).send();
  }
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
  res.json({ 
    status: 'online', 
    version: '04.01.H_MANUAL_CORS_V5',
    timestamp: new Date().toISOString()
  });
});

const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  console.log(`[SYS] ✅ Serving frontend from ${distPath}`);
  app.use(express.static(distPath));
}

async function ensureTablesExist() {
  try {
    console.log('Ensuring database tables exist...');
    
    // Core tables
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        uid VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        photo_url VARCHAR(512),
        role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
        school ENUM('EO', 'EESTP'),
        membership ENUM('FREE', 'PRO') NOT NULL DEFAULT 'FREE',
        status ENUM('ACTIVE', 'BLOCKED') NOT NULL DEFAULT 'ACTIVE',
        premium_expiration TIMESTAMP NULL,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        age INT,
        city VARCHAR(100),
        profile_edited BOOLEAN NOT NULL DEFAULT FALSE,
        honor_points INT DEFAULT 0 NOT NULL,
        merit_points INT DEFAULT 0 NOT NULL,
        current_streak INT DEFAULT 0 NOT NULL,
        last_streak_update TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Exams
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

    // Exam Questions
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS exam_questions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        exam_id INT,
        area_id INT,
        question TEXT NOT NULL,
        options JSON NOT NULL,
        correct_option INT NOT NULL,
        explanation TEXT,
        difficulty ENUM('EASY', 'MEDIUM', 'HARD') DEFAULT 'MEDIUM',
        school_type ENUM('EO', 'EESTP', 'BOTH') DEFAULT 'BOTH',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database verification complete.');
    
  } catch (error) {
    console.error('Database verification FAILED:', error);
  }
}

async function startServer() {
  await ensureTablesExist();
  
  // Admin initial setup
  try {
    await pool.execute(`UPDATE users SET role = 'admin' WHERE email = 'brizq02@gmail.com'`);
  } catch (err) {}

  app.listen(port, () => {
    console.log(`[SYS] 🚀 tRPC server ONLINE at port ${port}`);
    console.log(`[SYS]    BUILD_SIG: 04.01.H_MANUAL_CORS_V5`);
  });
}

startServer();
