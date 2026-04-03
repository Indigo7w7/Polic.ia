import { db, learningAreas, learningContent } from './src/database/db';
import { eq } from 'drizzle-orm';

async function testContent() {
  console.log('[TEST] Iniciando ciclo de escritura de contenido en producción...');
  try {
    // 1. Crear Área
    const [areaRes] = await db.insert(learningAreas).values({
      name: `Área Test ${Date.now()}`,
      icon: 'zap'
    });
    const areaId = areaRes.insertId;
    console.log(`[TEST] ✅ Área creada con ID: ${areaId}`);

    // 2. Crear Contenido
    const [contentRes] = await db.insert(learningContent).values({
      areaId: areaId,
      title: 'Unidad de Prueba de Producción',
      body: 'Este es el contenido de prueba insertado vía script de seguridad.',
      level: 1,
      schoolType: 'BOTH'
    });
    console.log(`[TEST] ✅ Contenido creado con ID: ${contentRes.insertId}`);

    // 3. Verificación final
    const verified = await db.select().from(learningContent).where(eq(learningContent.areaId, areaId));
    console.log(`[TEST] Finalizado. Retorno de lectura: ${verified.length} registros.`);
    
    process.exit(0);
  } catch (err) {
    console.error('[TEST] ❌ Fallo en el ciclo de escritura:', err);
    process.exit(1);
  }
}

testContent();
