import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

const getPool = () => {
  // 1. Prioritize Full URL (Handles Railway internal/external URLs correctly)
  const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
  if (url) {
    try {
      const parsed = new URL(url);
      console.log(`[DB] Database: ${parsed.pathname.slice(1)}, Host: ${parsed.hostname}`);
      return mysql.createPool({
        host: parsed.hostname,
        user: parsed.username,
        password: decodeURIComponent(parsed.password),
        database: parsed.pathname.slice(1) || 'railway',
        port: parseInt(parsed.port || '3306'),
        waitForConnections: true,
        connectionLimit: 10,
        family: 4, // Force IPv4
      } as any);
    } catch (err) {
      console.error(`[DB] URL Parse Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 2. Fallback to Individual Variables (with IPv4 forcing)
  if (process.env.MYSQLHOST && process.env.MYSQLPASSWORD) {
    console.log(`[DB] Using Individual Variables for: ${process.env.MYSQLHOST}`);
    return mysql.createPool({
      host: process.env.MYSQLHOST,
      user: process.env.MYSQLUSER || 'root',
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE || 'railway',
      port: parseInt(process.env.MYSQLPORT || '3306'),
      waitForConnections: true,
      connectionLimit: 10,
      family: 4,
    } as any);
  }

  // 3. Local Fallback
  console.log(`[DB] Falling back to Local/Default`);
  return mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'polic_ia',
    family: 4,
  } as any);
};

export const poolConnection = getPool();

export const db = drizzle(poolConnection, { schema, mode: 'default' });
export * from './schema';
