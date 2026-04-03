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
    'Expires',
    'trpc-batch-link',
    'X-TRPC-Batch-Mode'
  ],
  optionsSuccessStatus: 200, // For legacy browsers and better preflight handling
  preflightContinue: false
}));

app.use(express.json());

// 1. Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'online', 
    version: '04.01.H_MEGA_V12_PROD_FIX',
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

async function ensureTables() {
  console.log('[SYS] 🛠 Verificando integridad de tablas críticas...');
  try {
    // 1. Áreas de Aprendizaje
    await poolConnection.query(`
      CREATE TABLE IF NOT EXISTS learning_areas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(50)
      ) ENGINE=InnoDB;
    `);

    // 2. Exámenes / Niveles
    await poolConnection.query(`
      CREATE TABLE IF NOT EXISTS exams (
        id INT AUTO_INCREMENT PRIMARY KEY,
        school ENUM('EO', 'EESTP') NOT NULL,
        level INT NOT NULL,
        title VARCHAR(255),
        is_demo BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // 3. Cursos
    await poolConnection.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        thumbnail_url VARCHAR(512),
        level ENUM('BASICO', 'INTERMEDIO', 'AVANZADO') DEFAULT 'BASICO',
        school_type ENUM('EO', 'EESTP', 'BOTH') DEFAULT 'BOTH',
        is_published BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // 4. Materiales de Examen
    await poolConnection.query(`
      CREATE TABLE IF NOT EXISTS exam_materials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        exam_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        url VARCHAR(512) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // 5. Materiales de Curso
    await poolConnection.query(`
      CREATE TABLE IF NOT EXISTS course_materials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        type ENUM('PDF', 'VIDEO', 'EXAM', 'LINK', 'TEXT') NOT NULL,
        content_url VARCHAR(512),
        \`order\` INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // 6. Contenido de Aprendizaje (Drills)
    await poolConnection.query(`
      CREATE TABLE IF NOT EXISTS learning_content (
        id INT AUTO_INCREMENT PRIMARY KEY,
        area_id INT,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        questions JSON,
        level INT DEFAULT 1,
        school_type ENUM('EO', 'EESTP', 'BOTH') DEFAULT 'BOTH',
        FOREIGN KEY (area_id) REFERENCES learning_areas(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 7. Fallos de Drills (Para Modo Perfeccionamiento)
    await poolConnection.query(`
      CREATE TABLE IF NOT EXISTS failed_drills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255),
        unit_id INT,
        question_index INT NOT NULL,
        attempts INT DEFAULT 1,
        last_failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_failed_user_unit (user_id, unit_id),
        INDEX idx_failed_last_date (last_failed_at),
        FOREIGN KEY (unit_id) REFERENCES learning_content(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 8. Progreso de Aprendizaje (Para desbloqueo por mérito)
    await poolConnection.query(`
      CREATE TABLE IF NOT EXISTS learning_progress (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255),
        unit_id INT,
        score INT DEFAULT 0,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_progress_user (user_id),
        INDEX idx_progress_unit (unit_id),
        FOREIGN KEY (unit_id) REFERENCES learning_content(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    try {
      await poolConnection.query("SELECT questions FROM learning_content LIMIT 1");
    } catch (e) {
      console.log('[SYS] 🔧 Sincronizando columna questions en learning_content...');
      await poolConnection.query("ALTER TABLE learning_content ADD COLUMN questions JSON;");
    }
    
    console.log('[SYS] ✅ Infraestructura Crítica Sincronizada (Drills Ready).');
  } catch (err) {
    console.error('[SYS] ❌ Error crítico al crear tablas:', err);
  }
}

function startServer() {
  ensureTables();
  poolConnection.query('SELECT 1').catch(() => null);

  app.listen(port, () => {
    console.log(`[SYS] 🚀 Server ONLINE at port ${port}`);
    console.log(`[SYS]    BUILD_SIG: 04.01.H_MEGA_V12_PROD_FIX`);
  });
}

// Global Exception Shields
process.on('uncaughtException', (e) => console.error('[FATAL] Uncaught:', e));
process.on('unhandledRejection', (r) => console.error('[FATAL] Unhandled:', r));

startServer();
