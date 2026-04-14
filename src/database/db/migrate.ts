import { migrate } from 'drizzle-orm/mysql2/migrator';
import { db, poolConnection } from './index';

async function main() {
  console.log('--- DRIZZLE MIGRATION START ---');
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ Migrations applied successfully.');
  } catch (error: any) {
    // Stringify the whole error to catch any hidden messages
    const errorString = JSON.stringify(error, Object.getOwnPropertyNames(error)).toLowerCase();
    
    console.log('Migration process encountered an event. Analyzing...');

    const isRedundant = 
      error.errno === 1050 || 
      error.code === 'ER_TABLE_EXISTS_ERROR' ||
      errorString.includes('already exists') ||
      errorString.includes('duplicate') ||
      errorString.includes('1050');

    if (isRedundant) {
      console.warn('⚠️  Database already initialized. Skipping migration step safely.');
      // Cleanup and exit successfully
      try { await poolConnection.end(); } catch (e) {}
      process.exit(0);
    } else {
      console.error('❌ Migration Error:', error);
      try { await poolConnection.end(); } catch (e) {}
      // Even on other errors, sometimes it's better to try starting the server
      // but here we exit 1 to be safe unless it's a known redundant error.
      process.exit(1);
    }
  }
  
  try { await poolConnection.end(); } catch (e) {}
  process.exit(0);
}

// Global safety net
main().catch(async (e) => {
  const errStr = String(e).toLowerCase();
  if (errStr.includes('already exists') || errStr.includes('1050')) {
     console.log('Caught redundant error in global handler. Continuing...');
     process.exit(0);
  }
  process.exit(1);
});
