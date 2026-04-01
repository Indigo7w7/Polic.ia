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

// ─── THE ATOMIC CORS FIX (V6) ────────────────────────────────
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // LOGGING FOR DIAGNOSIS (Viewable in Railway Logs)
  console.log(`[CORS] ${req.method} request from ${origin || 'NO_ORIGIN'}`);

  // WHILETIST CHECK: Match any polic-ia domain or localhost
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
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-TRPC-Source, X-Requested-With, Cache-Control, Pragma');
  res.header('Access-Control-Max-Age', '86400'); // Cache preflight for 24h

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
    version: '04.01.H_ATOMIC_CORS_V6',
    node_env: process.env.NODE_ENV,
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
    console.log('[DB] Core tables verified.');
  } catch (error) {
    console.error('[DB] Verification FAILED:', error);
  }
}

async function startServer() {
  await ensureTablesExist();
  
  // Admin initial setup
  try {
    await pool.execute(`UPDATE users SET role = 'admin' WHERE email = 'brizq02@gmail.com'`);
    console.log('[SYS] Root Admin permissions updated.');
  } catch (err) {}

  app.listen(port, () => {
    console.log(`[SYS] 🚀 tRPC server ONLINE at port ${port}`);
    console.log(`[SYS]    BUILD_SIG: 04.01.H_ATOMIC_CORS_V6`);
  });
}

startServer();
