import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

let pool: mysql.Pool | null = null;

const getPool = () => {
  if (pool) return pool;

  const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
  if (url) {
    console.log(`[DB] Connecting via explicitly provided URL`);
    pool = mysql.createPool({
      uri: url,
      waitForConnections: true,
      connectionLimit: 50,
      maxIdle: 10,
      idleTimeout: 60000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
    return pool;
  }

  // Fallback to Individual Variables
  const config = {
    host: process.env.MYSQLHOST || process.env.DB_HOST || '127.0.0.1',
    user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'polic_ia',
    port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306'),
    waitForConnections: true,
    connectionLimit: 50,
    maxIdle: 10,
    idleTimeout: 60000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    family: 4,
  };

  console.log(`[DB] Using config for: ${config.host}`);
  pool = mysql.createPool(config as any);
  return pool;
};

export const poolConnection = getPool();
export const db = drizzle(poolConnection, { schema, mode: 'default' });
export * from './schema';
