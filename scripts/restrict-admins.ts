import { db, users } from '../src/database/db';
import { eq, ne, and } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

async function restrictAdmins() {
  const targetAdmin = 'brizq02@gmail.com'; 
  
  console.log('--- ADMIN RESTRICTION PROCESS ---');
  console.log(`Target unique admin: ${targetAdmin}`);

  // 1. Demote everyone who is NOT the target email but currently has 'admin' role
  console.log('Demoting all other admins...');
  const demoteResult = await db.update(users)
    .set({ role: 'user' })
    .where(
      and(
        eq(users.role, 'admin'),
        ne(users.email, targetAdmin)
      )
    );
  console.log(`Demote result processed.`);

  // 2. Ensure the target user is an admin
  console.log(`Ensuring ${targetAdmin} is admin...`);
  const promoteResult = await db.update(users)
    .set({ role: 'admin' })
    .where(eq(users.email, targetAdmin));
  
  console.log(`Promote result processed.`);
  
  // 3. Verify
  const currentAdmins = await db.select({ email: users.email }).from(users).where(eq(users.role, 'admin'));
  console.log('Current admins in DB:', currentAdmins.map(a => a.email));

  if (currentAdmins.length === 1 && currentAdmins[0].email === targetAdmin) {
    console.log('SUCCESS: Admin access successfully restricted.');
  } else if (currentAdmins.length === 0) {
    console.log('WARNING: No admin found in DB. Make sure the user brizq02@gmail.com has logged in at least once.');
  } else {
    console.log('ERROR: More than one admin still exists or target admin mismatch.');
  }

  process.exit(0);
}

restrictAdmins().catch(err => {
  console.error('CRITICAL ERROR:', err);
  process.exit(1);
});
