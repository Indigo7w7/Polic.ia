import { db, users } from './src/database/db';
import { sql } from 'drizzle-orm';

async function check() {
  try {
    const allUsers = await db.select().from(users);
    console.log(`[DB_CHECK] Total users: ${allUsers.length}`);
    allUsers.forEach(u => {
      console.log(` - ${u.uid} | ${u.email} | ${u.role}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(`[DB_CHECK] Error:`, err);
    process.exit(1);
  }
}

check();
