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
import zlib from 'zlib';
import { db, leitnerCards, reviewLogs } from '../../database/db';
import { eq } from 'drizzle-orm';
import { createServer } from 'http';
import { setupSocket } from './socket';
import { logger } from './utils/logger';

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 3001;

// Initialize Socket.IO
const io = setupSocket(httpServer);

// ─── CONFIGURACIÓN CORS ROBUSTA ───
const allowedOrigins = [
  'https://polic-ia-7bf7e.web.app',
  'https://polic-ia-7bf7e.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.includes('web.app') || origin.includes('firebaseapp.com')) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-TRPC-Source', 'X-Requested-With', 'X-TRPC-Batch-Mode'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes(origin) || origin.includes('web.app') || origin.includes('firebaseapp.com'))) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-TRPC-Source, X-Requested-With, X-TRPC-Batch-Mode');
    return res.status(204).end();
  }
  
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 1. Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'online', 
    version: '04.01.H_MEGA_V12_PROD_FIX_CORS_V3',
    timestamp: new Date().toISOString()
  });
});

// 2. tRPC API con mejor manejo de errores para el 500
app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: (opts) => createContext(opts, io),
    onError: ({ path, error }) => {
      console.error(`[tRPC-ERROR] Error en ${path}:`, error);
      logger.error(`[tRPC-ERROR] ${path}`, { message: error.message, stack: error.stack });
    }
  })
);

// 3. Export REST Endpoint
app.get('/api/export/deck', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'Falta userId' });
    const cards = await db.select().from(leitnerCards).where(eq(leitnerCards.userId, userId));
    const logs = await db.select().from(reviewLogs).where(eq(reviewLogs.userId, userId));
    const exportData = { manifest: { version: 1, exportedAt: new Date().toISOString(), cardCount: cards.length, logCount: logs.length }, collection: cards, review_log: logs };
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', 'attachment; filename="policia_deck.pkg"');
    const gzip = zlib.createGzip();
    gzip.pipe(res);
    gzip.write(JSON.stringify(exportData));
    gzip.end();
  } catch (err: any) {
    console.error('Error al exportar:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Static Files & SPA Routing (Optimizado para evitar MIME type errors)
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  // Servir assets con cache y tipos correctos
  app.use('/assets', express.static(path.join(distPath, 'assets'), {
    immutable: true,
    maxAge: '1y',
    fallthrough: false // Si no existe en assets, que no pase al wildcard
  }));
  
  app.use(express.static(distPath));
  
  app.get('*', (req, res) => {
    if (req.path.startsWith('/trpc') || req.path.startsWith('/health') || req.path.startsWith('/api')) {
       return res.status(404).json({ error: 'Route not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

function startServer() {
  httpServer.listen(port, () => {
    logger.info(`[SYS] 🚀 Server ONLINE at port ${port}`);
    logger.info(`[SYS]    BUILD_SIG: 04.01.H_MEGA_V12_PROD_FIX_CORS_V3 (Socket.IO Enabled) `);
  });
}

process.on('uncaughtException', (e) => {
  logger.error('[FATAL] Uncaught Exception:', { message: e.message, stack: e.stack });
});

process.on('unhandledRejection', (reason) => {
  logger.error('[FATAL] Unhandled Rejection:', { reason });
});

startServer();
