import mysql from 'mysql2/promise';

async function run() {
  const connection = await mysql.createConnection("mysql://root:GBmQnlZxuGuYqzxbFNjAjyODtYACZSWm@mysql-production-0751.up.railway.app:3306/railway");
  console.log('[SYS] 🚀 Conectado para CIRUGÍA DE CASCADA en Producción...');
  
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
    console.log(`[SYS] Procesando tabla: ${table.name}...`);
    try {
      // 1. Drop existing FK
      try {
        await connection.query(`ALTER TABLE ${table.name} DROP FOREIGN KEY ${table.fk};`);
        console.log(`      [-] FK antigua eliminada.`);
      } catch (e) {
        console.log(`      [!] FK no encontrada o ya eliminada, saltando.`);
      }

      // 2. Add CASCADE FK
      await connection.query(`
        ALTER TABLE ${table.name} 
        ADD CONSTRAINT ${table.fk} 
        FOREIGN KEY (${table.col}) 
        REFERENCES users(uid) 
        ON DELETE CASCADE;
      `);
      console.log(`      [+] ✅ FK CASCADA añadida con éxito.`);
    } catch (err: any) {
      console.error(`      [❌] ERROR en ${table.name}:`, err.message);
    }
  }

  await connection.end();
  console.log('[SYS] 🏁 Cirugía completada con éxito.');
}

run().catch(console.error);
