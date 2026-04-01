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

const app = express();
const port = process.env.PORT || 3001;

// ─── THE ULTIMATE NUCLEAR CORS (V9 - NO BLOCKING) ───
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  
  // Minimal logging to avoid overhead during health checks
  if (!req.path.includes('health')) {
    console.log(`[SYS] ${req.method} ${req.path} | Origin: ${origin}`);
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-TRPC-Source, X-Requested-With, Cache-Control, Pragma, Expires');
  res.setHeader('Access-Control-Max-Age', '1728000');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(express.json());

// 1. Health check (Highest Priority)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'online', 
    version: '04.01.H_ULTIMATE_V9',
    timestamp: new Date().toISOString()
  });
});

// 2. tRPC API
app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// 3. Static Files & SPA Routing (Lowest Priority)
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  console.log(`[SYS] ✅ Hosting assets from: ${distPath}`);
  app.use(express.static(distPath));
  
  // Catch-all for SPA
  app.get('*', (req, res) => {
    // Safety check to avoid infinite loops on API routes
    if (req.path.startsWith('/trpc') || req.path.startsWith('/health')) {
       return res.status(404).json({ error: 'Route not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

function startServer() {
  // DB init in background - never let DB connectivity block the API
  poolConnection.query('SELECT 1')
    .then(() => console.log('[DB] Connection verified.'))
    .catch(err => console.warn('[DB] Warning: Connection delayed or failed, retrying in background...', err.message));

  app.listen(port, () => {
    console.log(`[SYS] 🚀 Server ONLINE at port ${port}`);
    console.log(`[SYS]    Uptime: ${new Date().toISOString()}`);
    console.log(`[SYS]    BUILD_SIG: 04.01.H_ULTIMATE_V9`);
  });
}

// Global Exception Shields
process.on('uncaughtException', (e) => console.error('[FATAL] Uncaught:', e));
process.on('unhandledRejection', (r) => console.error('[FATAL] Unhandled:', r));

startServer();
