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

// ─── NUCLEAR CORS BYPASS (V8) ───
// This middleware is AGGRESSIVE and handles CORS before any other logic.
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  
  // LOGGING (Visible in Railway logs)
  console.log(`[CORS_V8] ${req.method} ${req.path} from ${origin}`);

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-TRPC-Source, X-Requested-With, Cache-Control, Pragma, Expires');
  res.setHeader('Access-Control-Max-Age', '1728000'); // 20 days

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
    version: '04.01.H_NUCLEAR_V8',
    timestamp: new Date().toISOString()
  });
});

const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/trpc') || req.path.startsWith('/health')) return;
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

async function startServer() {
  // DB init in background
  poolConnection.query('SELECT 1').then(() => {
    console.log('[DB] Connection verified.');
  }).catch(err => console.error('[DB] Connection error:', err));

  app.listen(port, '0.0.0.0', () => {
    console.log(`[SYS] 🚀 Server ONLINE at port ${port}`);
    console.log(`[SYS]    BUILD_SIG: 04.01.H_NUCLEAR_V8`);
  });
}

startServer();
