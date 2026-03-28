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
        age INT,
        city VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Database verification complete.');
  } catch (error) {
    console.error('Database verification FAILED:', error);
  }
}

app.listen(port, async () => {
  await ensureTablesExist();
  console.log(`tRPC server listening at http://localhost:${port}`);
});
