import { db, achievements } from '../src/database/db';
import dotenv from 'dotenv';
dotenv.config();

const INITIAL_ACHIEVEMENTS = [
  {
    code: 'FIRST_EXAM',
    title: 'Bautismo de Fuego',
    description: 'Has completado tu primer simulacro de examen.',
    icon: 'Zap',
    pointsReward: 100,
    category: 'EXAM' as const,
  },
  {
    code: 'FLASH_50',
    title: 'Centinela',
    description: 'Has repasado 50 tarjetas en el Polígono.',
    icon: 'Shield',
    pointsReward: 200,
    category: 'LEITNER' as const,
  },
  {
    code: 'ELITE_OFFICER',
    title: 'Oficial de Élite',
    description: 'Has obtenido una nota perfecta (20/20) en un simulacro.',
    icon: 'Star',
    pointsReward: 500,
    category: 'EXAM' as const,
  }
];

async function seed() {
  console.log('Seeding achievements...');
  for (const ach of INITIAL_ACHIEVEMENTS) {
    try {
      await db.insert(achievements).values(ach).onDuplicateKeyUpdate({ set: ach });
      console.log(`- Achievement seeded: ${ach.code}`);
    } catch (e) {
      console.error(`ERROR SEVERO: Falló la ingesta de ${ach.code}. Deteniendo proceso.`, e);
      process.exit(1);
    }
  }
  console.log('Ingesta completada correctamente.');
  process.exit(0);
}

seed();
