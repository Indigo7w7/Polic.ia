import { db, learningAreas } from './src/database/db';
import { sql } from 'drizzle-orm';

async function testWrite() {
  try {
    console.log('[TEST] Iniciando inserción de prueba en producción...');
    
    // Insertar un área de prueba
    const [result] = await db.insert(learningAreas).values({
      name: `Área de Prueba ${new Date().toISOString()}`,
      icon: 'shield-check',
    });
    
    console.log(`[TEST] ✅ Inserción exitosa. ID generado: ${result.insertId}`);
    
    // Verificar que se puede leer
    const allAreas = await db.select().from(learningAreas);
    console.log(`[TEST] Verificación de lectura: ${allAreas.length} áreas encontradas.`);
    
    process.exit(0);
  } catch (err) {
    console.error(`[TEST] ❌ Error catastrófico en la prueba:`, err);
    process.exit(1);
  }
}

testWrite();
