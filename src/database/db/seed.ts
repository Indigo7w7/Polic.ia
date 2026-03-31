import { db, learningAreas, learningContent } from './index';

async function seed() {
  console.log('🌱 Seeding database...');

  // 1. Seed Learning Areas (Folders)
  console.log('Inserting areas...');
  const areas = [
    { id: 1, name: 'MATEMÁTICAS', icon: 'Calculator' },
    { id: 2, name: 'COMUNICACIÓN', icon: 'MessageCircle' },
    { id: 3, name: 'CIENCIAS SOCIALES', icon: 'Globe' },
    { id: 4, name: 'CIENCIA, TECNOLOGÍA Y AMBIENTE', icon: 'FlaskConical' },
    { id: 5, name: 'PERSONA, FAMILIA Y RRHH', icon: 'Users' },
    { id: 6, name: 'RAZONAMIENTO MATEMÁTICO', icon: 'Variable' },
    { id: 7, name: 'RAZONAMIENTO VERBAL', icon: 'Languages' },
  ];

  for (const area of areas) {
    try {
      await db.insert(learningAreas).values(area).onDuplicateKeyUpdate({ set: { name: area.name, icon: area.icon } });
      console.log(`✅ Area: ${area.name}`);
    } catch (err) {
      console.error(`❌ Area failed: ${area.name}`, err);
      throw err;
    }
  }

  // 2. Seed Learning Content (Topics inside folders)
  console.log('Inserting content...');
  const content = [
    // MATEMÁTICAS (1)
    { areaId: 1, title: 'Operaciones algebraicas', body: 'Estudio de potencias, raíces, polinomios y productos notables.', level: 1, schoolType: 'BOTH' },
    { areaId: 1, title: 'Suma de ángulos en el triángulo', body: 'Propiedades fundamentales de los triángulos y ángulos interiores.', level: 1, schoolType: 'BOTH' },
    { areaId: 1, title: 'Teorema de Pitágoras', body: 'Relación entre los lados de un triángulo rectángulo (c² = a² + b²).', level: 1, schoolType: 'BOTH' },
    { areaId: 1, title: 'Funciones trigonométricas', body: 'Seno, coseno, tangente y sus aplicaciones tácticas.', level: 1, schoolType: 'BOTH' },
    
    // COMUNICACIÓN (2)
    { areaId: 2, title: 'Reglas ortográficas', body: 'Uso correcto de grafías, acentuación y puntuación.', level: 1, schoolType: 'BOTH' },
    { areaId: 2, title: 'La oración gramatical', body: 'Análisis sintáctico: Sujeto, predicado y modificadores.', level: 1, schoolType: 'BOTH' },
    { areaId: 2, title: 'La narración. Estructura. Elementos', body: 'Introducción, nudo, desenlace; personajes, tiempo y espacio.', level: 1, schoolType: 'BOTH' },
    { areaId: 2, title: 'Literatura peruana', body: 'Obras y autores representativos desde el costumbrismo al vanguardismo.', level: 1, schoolType: 'BOTH' },

    // CIENCIAS SOCIALES (3)
    { areaId: 3, title: 'Proceso de hominización', body: 'Evolución humana desde los primates hasta el hombre moderno.', level: 1, schoolType: 'BOTH' },
    { areaId: 3, title: 'Tahuantinsuyo; evolución; organización', body: 'Economía, política y sociedad del imperio de los Incas.', level: 1, schoolType: 'BOTH' },
    { areaId: 3, title: 'Parques, santuarios y reservas nacionales', body: 'Áreas naturales protegidas del Perú y su biodiversidad.', level: 1, schoolType: 'BOTH' },
    { areaId: 3, title: 'Ecosistemas, tecnología y desarrollo sostenido', body: 'Intercambio de energía y conservación ambiental eficiente.', level: 1, schoolType: 'BOTH' },
    { areaId: 3, title: 'Redes viales. Características e importancia', body: 'Carreteras, puertos y su rol en el desarrollo nacional.', level: 1, schoolType: 'BOTH' },
    
    // CIENCIA, TECNOLOGÍA Y AMBIENTE (4)
    { areaId: 4, title: 'Materia y energía. Propiedades', body: 'Estados de la materia y transformaciones físicas/químicas.', level: 1, schoolType: 'BOTH' },
    { areaId: 4, title: 'El sistema solar. Planeta Tierra', body: 'Estructura terrestre, movimientos y astros vecinos.', level: 1, schoolType: 'BOTH' },
    { areaId: 4, title: 'Tabla periódica de los elementos', body: 'Clasificación de elementos químicos y símbolos básicos.', level: 1, schoolType: 'BOTH' },
    { areaId: 4, title: 'Los vegetales y la fotosíntesis', body: 'Metabolismo vegetal y su importancia para el ecosistema.', level: 1, schoolType: 'BOTH' },
    { areaId: 4, title: 'Fenómenos naturales y cambio climático', body: 'Prevención de desastres y concienciación ambiental.', level: 1, schoolType: 'BOTH' },

    // PERSONA, FAMILIA Y RRHH (5)
    { areaId: 5, title: 'Cultura de Paz. Diálogo y negociación', body: 'Ética policial y resolución pacífica de conflictos.', level: 1, schoolType: 'BOTH' },
    { areaId: 5, title: 'Derechos Humanos', body: 'Derecho a la vida, libertad y protección constitucional.', level: 1, schoolType: 'BOTH' },
    { areaId: 5, title: 'Identidad personal y nacional. Normas', body: 'Construcción de la identidad y respeto ciudadano.', level: 1, schoolType: 'BOTH' },
    { areaId: 5, title: 'Autoestima y autocuidado', body: 'Salud mental y resiliencia en la función policial.', level: 1, schoolType: 'BOTH' },
    { areaId: 5, title: 'Funciones de la familia. Violencia', body: 'Marco legal de protección a la familia y prevención.', level: 1, schoolType: 'BOTH' },

    // RAZONAMIENTO MATEMÁTICO (6)
    { areaId: 6, title: 'Sucesiones', body: 'Patrones numéricos y leyes de formación aritmética.', level: 1, schoolType: 'BOTH' },
    { areaId: 6, title: 'Razonamiento lógico', body: 'Inferencias, verdad y mentira, y silogismos básicos.', level: 1, schoolType: 'BOTH' },
    { areaId: 6, title: 'Planteo de ecuaciones', body: 'Conversión verbal a simbología algebraica.', level: 1, schoolType: 'BOTH' },
    { areaId: 6, title: 'Fracciones', body: 'Operaciones con racionales aplicadas a problemas.', level: 1, schoolType: 'BOTH' },
    { areaId: 6, title: 'Tanto por ciento', body: 'Cálculos de porcentajes y aplicaciones comerciales.', level: 1, schoolType: 'BOTH' },

    // RAZONAMIENTO VERBAL (7)
    { areaId: 7, title: 'Sinónimos', body: 'Identificación de palabras con significado afín.', level: 1, schoolType: 'BOTH' },
    { areaId: 7, title: 'Antónimos', body: 'Identificación de palabras con significado opuesto.', level: 1, schoolType: 'BOTH' },
    { areaId: 7, title: 'Comprensión de lectura', body: 'Extracción de ideas principales y mensajes implícitos.', level: 1, schoolType: 'BOTH' },
    { areaId: 7, title: 'Conectores lógicos', body: 'Uso de conjunciones y preposiciones para dar coherencia.', level: 1, schoolType: 'BOTH' },
    { areaId: 7, title: 'Plan de redacción', body: 'Ordenamiento lógico de enunciados para formar un texto.', level: 1, schoolType: 'BOTH' },
  ];

  for (const item of content) {
    try {
      await db.insert(learningContent).values(item as any);
      console.log(`✅ Content: ${item.title}`);
    } catch (err) {
      console.error(`❌ Content failed: ${item.title}`);
    }
  }

  console.log('✅ Seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed globally:');
  console.dir(err, { depth: null });
  process.exit(1);
});
