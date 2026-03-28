import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

const getPool = () => {
  // 1. Prioritize individual Railway variables (most reliable for internal networks)
  if (process.env.MYSQLHOST && process.env.MYSQLPASSWORD) {
    console.log(`[DB] Using production variables: host=${process.env.MYSQLHOST}, user=${process.env.MYSQLUSER || 'root'}`);
    return mysql.createPool({
      host: process.env.MYSQLHOST,
      user: process.env.MYSQLUSER || 'root',
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE || 'railway', // Railway default is often 'railway'
      port: parseInt(process.env.MYSQLPORT || '3306'),
      waitForConnections: true,
      connectionLimit: 10,
    });
  }

  // 2. Fallback to DATABASE_URL if available
  const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
  if (url) {
    try {
      const parsed = new URL(url);
      const config = {
        host: parsed.hostname,
        user: parsed.username,
        password: decodeURIComponent(parsed.password),
        database: parsed.pathname.slice(1),
        port: parseInt(parsed.port || '3306'),
        waitForConnections: true,
        connectionLimit: 10,
      };
      
      console.log(`[DB] Manual URL Parse: host=${config.host}, user=${config.user}, db=${config.database}`);
      return mysql.createPool(config);
    } catch (err) {
      console.error(`[DB] URL Parse Error: ${err instanceof Error ? err.message : String(err)}`);
      // Final fallback to raw string if parsing fails
      return mysql.createPool(url);
    }
  }

  // 3. Local Development Fallback
  console.log(`[DB] Falling back to local/default configuration`);
  return mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'polic_ia',
  });
};

const poolConnection = getPool();

export const db = drizzle(poolConnection, { schema, mode: 'default' });
export * from './schema';
