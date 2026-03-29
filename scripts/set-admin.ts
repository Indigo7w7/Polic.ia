import { db, users } from '../src/database/db';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

async function setAdmin() {
  const email = 'brizq02@gmail.com';
  console.log(`Setting admin role for ${email}...`);
  
  const result = await db.update(users)
    .set({ role: 'admin' })
    .where(eq(users.email, email));
    
  console.log('Update result:', result);
  process.exit(0);
}

setAdmin().catch(err => {
  console.error(err);
  process.exit(1);
});
