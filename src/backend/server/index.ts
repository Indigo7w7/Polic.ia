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
import poolConnection from './firebaseAdmin';

const app = express();
const port = process.env.PORT || 3001;

// ─── CONFIGURACIÓN CORS OFICIAL Y SEGURA ───
app.use(cors({
  origin: [
    'https://polic-ia-7bf7e.web.app',
    'https://polic-ia-7bf7e.firebaseapp.com',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-TRPC-Source', 
    'X-Requested-With', 
    'Cache-Control', 
    'Pragma', 
    'Expires'
  ]
}));

app.use(express.json());

// 1. Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'online', 
    version: '04.01.H_STABLE_V11',
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

// 3. Static Files & SPA Routing
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/trpc') || req.path.startsWith('/health')) {
       return res.status(404).json({ error: 'Route not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

function startServer() {
  poolConnection.query('SELECT 1').catch(() => null);

  app.listen(port, () => {
    console.log(`[SYS] 🚀 Server ONLINE at port ${port}`);
    console.log(`[SYS]    BUILD_SIG: 04.01.H_OFFICIAL_CORS_V10`);
  });
}

// Global Exception Shields
process.on('uncaughtException', (e) => console.error('[FATAL] Uncaught:', e));
process.on('unhandledRejection', (r) => console.error('[FATAL] Unhandled:', r));

startServer();
