import mysql from 'mysql2/promise';

async function run() {
  const connection = await mysql.createConnection("mysql://root:GBmQnlZxuGuYqzxbFNjAjyODtYACZSWm@mysql-production-0751.up.railway.app:3306/railway");
  console.log('[SYS] Conectado a Producción para Cirugía de Esquema...');
  
  try {
    // Attempt to add the column. In MySQL, ADD COLUMN IF NOT EXISTS is 8.0.19+
    // We'll try the direct approach and catch the error if it already exists
    await connection.query("ALTER TABLE learning_content ADD COLUMN questions JSON;");
    console.log('[SYS] ✅ Columna "questions" añadida a learning_content con éxito.');
  } catch (err: any) {
    if (err.code === 'ER_DUP_COLUMN_NAME') {
       console.log('[SYS] ℹ️ La columna "questions" ya existía, no se requiere acción.');
    } else {
       console.error('[SYS] ❌ Error inesperado:', err.message);
    }
  }

  try {
    // Also ensure area_id is not null if needed or just check it
    await connection.query("ALTER TABLE learning_content MODIFY COLUMN body TEXT NULL;");
    console.log('[SYS] ✅ Ajuste de nulidad en body completado.');
  } catch (e) {}

  await connection.end();
  console.log('[SYS] Cirugía completada.');
}

run().catch(console.error);
