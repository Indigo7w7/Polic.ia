import { db } from '../src/database/db';
import { users } from '../src/database/db/schema';
import { sql } from 'drizzle-orm';

async function resetUsers() {
  console.log('⏳ Resetting all users to FREE...');
  try {
    await db.update(users).set({
      membership: 'FREE',
      premiumExpiration: null
    });
    console.log('✅ All users are now FREE.');
  } catch (err) {
    console.error('❌ Error resetting users:', err);
  }
}

resetUsers();
