import { db, poolConnection } from './index';
import { sql } from 'drizzle-orm';

async function audit() {
  console.log('--- DB AUDIT ---');
  try {
    const dbs = await db.execute(sql.raw('SHOW DATABASES'));
    console.log('Databases:', JSON.stringify(dbs));
    
    // Check current connection info
    const currentDb = await db.execute(sql.raw('SELECT DATABASE() as db'));
    console.log('Current DB:', (currentDb as any)[0].db);

    const tables = await db.execute(sql.raw('SHOW TABLES'));
    console.log('Tables in current DB:', JSON.stringify(tables));
  } catch (e) {
    console.error('Audit Error:', e);
  } finally {
    await poolConnection.end();
  }
}

audit();
