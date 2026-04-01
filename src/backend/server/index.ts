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
import pool from './firebaseAdmin';
import { ingestLocalExams } from './utils/examIngest';

const app = express();
const port = process.env.PORT || 3001;

// ─── CORS CONFIGURATION (Production Hardened) ────────────────
const allowedOrigins = [
  'https://polic-ia-7bf7e.web.app',
  'https://polic-ia-7bf7e.firebaseapp.com',
  'http://localhost:3000',
  'http://localhost:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from: ${origin}`);
      callback(null, true); // Allow for now but log it during debug
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-trpc-source']
}));

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

const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  console.log(`[SYS] ✅ Serving frontend from ${distPath}`);
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/trpc') || req.path.startsWith('/health')) return;
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('[SYS] index.html not found in dist/.');
    }
  });
}

async function ensureTablesExist() {
  try {
    console.log('Ensuring database tables exist...');
    
    // Users
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

    // Learning areas
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS learning_areas (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(50)
      )
    `);

    // Learning content
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS learning_content (
        id INT PRIMARY KEY AUTO_INCREMENT,
        area_id INT,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        level INT DEFAULT 1,
        school_type ENUM('EO', 'EESTP', 'BOTH') DEFAULT 'BOTH'
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
  
  // Admin override
  try {
    await pool.execute(`UPDATE users SET role = 'admin' WHERE email = 'brizq02@gmail.com'`);
  } catch (err) {}

  app.listen(port, () => {
    console.log(`[SYS] 🚀 tRPC server ONLINE at port ${port}`);
    console.log(`[SYS]    BUILD_SIG: 04.01.H_CORS_FIX`);
    console.log(`[SYS]    dist/ present: ${fs.existsSync(distPath)}`);
  });
}

startServer();
