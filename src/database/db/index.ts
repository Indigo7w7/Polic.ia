import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

const getPool = () => {
  // 1. Prioritize DATABASE_URL (Handles both Public and Internal URLs)
  const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
  if (url) {
    try {
      const parsed = new URL(url);
      console.log(`[DB] Attempting connection via URL mode: ${parsed.hostname}`);
      return mysql.createPool({
        host: parsed.hostname,
        user: parsed.username,
        password: decodeURIComponent(parsed.password),
        database: parsed.pathname.slice(1) || 'railway',
        port: parseInt(parsed.port || '3306'),
        waitForConnections: true,
        connectionLimit: 10,
        family: 4, // CRITICAL: Force IPv4 for Railway compatibility
      } as any);
    } catch (err) {
      console.error(`[DB] URL Parse Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 2. Fallback to individual Railway variables
  if (process.env.MYSQLHOST && process.env.MYSQLPASSWORD) {
    console.log(`[DB] Attempting connection via individual variables: ${process.env.MYSQLHOST}`);
    return mysql.createPool({
      host: process.env.MYSQLHOST,
      user: process.env.MYSQLUSER || 'root',
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE || 'railway',
      port: parseInt(process.env.MYSQLPORT || '3306'),
      waitForConnections: true,
      connectionLimit: 10,
      family: 4, // CRITICAL: Force IPv4
    } as any);
  }

  // 3. Local Development Fallback
  console.log(`[DB] Falling back to local/default configuration`);
  return mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'polic_ia',
    family: 4,
  } as any);
};

const poolConnection = getPool();

export const db = drizzle(poolConnection, { schema, mode: 'default' });
export * from './schema';
