const mysql = require('mysql2/promise');

async function run() {
  const url = process.env.DATABASE_URL || process.env.MYSQL_URL;
  const pool = url ? mysql.createPool(url) : mysql.createPool({
    host: 'mysql-production-0751.up.railway.app',
    user: 'root',
    password: 'GBmQnlZxuGuYqzxbFNjAjyODtYACZSWm',
    database: 'railway',
    port: 3306
  });
  console.log('--- DB PATCH START ---');

  try {
    console.log('Checking "topic" column...');
    await pool.query("ALTER TABLE learning_content ADD COLUMN topic VARCHAR(255) NOT NULL DEFAULT 'GENERAL'");
    console.log('✅ "topic" added.');
  } catch (err) {
    if (err.message.includes('Duplicate column name')) {
      console.log('Column "topic" already exists.');
    } else {
      console.error('❌ Topic error:', err.message);
    }
  }

  try {
    console.log('Checking "order_in_topic" column...');
    await pool.query("ALTER TABLE learning_content ADD COLUMN order_in_topic INT DEFAULT 0");
    console.log('✅ "order_in_topic" added.');
  } catch (err) {
     if (err.message.includes('Duplicate column name')) {
      console.log('Column "order_in_topic" already exists.');
    } else {
      console.error('❌ Order error:', err.message);
    }
  }

  // ─── CASCADE DELETE SURGERY ───
  const tablesToFix = [
    { name: 'exam_attempts', fk: 'exam_attempts_user_id_users_uid_fk', col: 'user_id' },
    { name: 'leitner_cards', fk: 'leitner_cards_user_id_users_uid_fk', col: 'user_id' },
    { name: 'stripe_subscriptions', fk: 'stripe_subscriptions_user_id_users_uid_fk', col: 'user_id' },
    { name: 'admin_logs', fk: 'admin_logs_admin_id_users_uid_fk', col: 'admin_id' },
    { name: 'yape_audits', fk: 'yape_audits_user_id_users_uid_fk', col: 'user_id' },
    { name: 'failed_drills', fk: 'failed_drills_user_id_users_uid_fk', col: 'user_id' },
    { name: 'learning_progress', fk: 'learning_progress_user_id_users_uid_fk', col: 'user_id' }
  ];

  for (const table of tablesToFix) {
    console.log(`[SYS] Patching table: ${table.name}...`);
    try {
      // 1. Drop existing FK
      try {
        await pool.query(`ALTER TABLE ${table.name} DROP FOREIGN KEY ${table.fk};`);
        console.log(`      [-] FK vieja eliminada.`);
      } catch (e) {
        console.log(`      [!] FK no encontrada o ya eliminada.`);
      }

      // 2. Add CASCADE FK
      await pool.query(`
        ALTER TABLE ${table.name} 
        ADD CONSTRAINT ${table.fk} 
        FOREIGN KEY (${table.col}) 
        REFERENCES users(uid) 
        ON DELETE CASCADE;
      `);
      console.log(`      [+] ✅ CASCADA habilitada.`);
    } catch (err) {
      console.error(`      [❌] ERROR:`, err.message);
    }
  }

  console.log('--- DB PATCH FINISHED ---');
  process.exit(0);
}

run();
