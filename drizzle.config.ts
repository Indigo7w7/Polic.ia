import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.MYSQL_URL || process.env.DATABASE_URL;

export default defineConfig({
  schema: './src/database/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: url ? { url } : {
    host: process.env.MYSQLHOST || process.env.MYSQL_HOST || '127.0.0.1',
    user: process.env.MYSQLUSER || process.env.MYSQL_USER || 'root',
    password: process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'polic_ia',
  },
});
