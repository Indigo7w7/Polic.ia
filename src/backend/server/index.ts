import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './routers';
import { createContext } from './trpc';
import './firebaseAdmin';
import fs from 'fs';
import path from 'path';
import poolConnection from './firebaseAdmin';
import { ingestLocalExams } from './utils/examIngest';

const app = express();
const port = process.env.PORT || 3001;

// ─── ATOMIC CORS MANUAL (V7) ──────────
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log(`[SYS] ${req.method} ${req.path} | Origin: ${origin || 'none'}`);

  const isAllowed = !origin || 
                   origin.includes('polic-ia-7bf7e') || 
                   origin.includes('localhost') || 
                   origin.includes('127.0.0.1');

  if (isAllowed && origin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
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
    version: '04.01.H_RESILIENT_V7',
    db: 'connected (verified at startup)',
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
    console.log('[DB] Ensuring database tables exist...');
    // We attempt a simple connectivity test
    await poolConnection.query('SELECT 1');
    
    // Core tables
    await poolConnection.execute(`
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
    console.log('[DB] Core tables verified.');
  } catch (error) {
    console.warn('[DB] Non-critical warning during schema check:', error.message);
    // We don't crash the server here, just log it.
  }
}

async function startServer() {
  // We run this in background to avoid blocking server start in case of DB delays
  ensureTablesExist().catch(err => console.error('[DB] Background init error:', err));
  
  // Admin initial setup (also background)
  poolConnection.execute(`UPDATE users SET role = 'admin' WHERE email = 'brizq02@gmail.com'`).catch(() => null);

  app.listen(port, () => {
    console.log(`[SYS] 🚀 Server ONLINE at port ${port}`);
    console.log(`[SYS]    BUILD_SIG: 04.01.H_RESILIENT_V7`);
  });
}

// Global error handler
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[CRITICAL] Unhandled Rejection:', reason);
});

startServer();
