import { db, achievements } from './index';
import { eq } from 'drizzle-orm';

const newAchievements = [
  {
    code: 'FIRST_EXAM',
    title: 'Bautizo de Fuego',
    description: 'Completa tu primer simulacro en la plataforma.',
    icon: 'Zap',
    pointsReward: 100,
    category: 'EXAM' as any
  },
  {
    code: 'ELITE_OFFICER',
    title: 'Oficial de Élite',
    description: 'Obtén un puntaje superior al 85% en cualquier examen.',
    icon: 'Star',
    pointsReward: 500,
    category: 'EXAM' as any
  },
  {
    code: 'PERFECT_EXAM',
    title: 'Excelencia Doctrinal',
    description: 'Alcanza el 100% de efectividad en un simulacro oficial.',
    icon: 'Trophy',
    pointsReward: 1000,
    category: 'EXAM' as any
  },
  {
    code: 'STREAK_7',
    title: 'Constancia Policial',
    description: 'Mantén una racha de estudio ininterrumpida por 7 días.',
    icon: 'Shield',
    pointsReward: 300,
    category: 'STREAK' as any
  },
  {
    code: 'SCENARIO_5',
    title: 'Héroe de la Calle',
    description: 'Resuelve con éxito 5 casos operativos en el Simulador 105.',
    icon: 'Zap',
    pointsReward: 400,
    category: 'SOCIAL' as any
  },
  {
    code: 'FLASH_500',
    title: 'Maestro de la Memoria',
    description: 'Realiza 500 repasos con el motor de aprendizaje FSRS.',
    icon: 'Zap',
    pointsReward: 600,
    category: 'LEITNER' as any
  },
  {
    code: 'INTERVIEW_ACE',
    title: 'Persuador Maestro',
    description: 'Supera la Entrevista IA con un puntaje sobresaliente.',
    icon: 'Star',
    pointsReward: 500,
    category: 'SOCIAL' as any
  }
];

async function seed() {
  console.log('Seeding achievements...');
  for (const ach of newAchievements) {
    const [existing] = await db.select().from(achievements).where(eq(achievements.code, ach.code));
    if (!existing) {
      await db.insert(achievements).values(ach);
      console.log(`Inserted: ${ach.code}`);
    } else {
      console.log(`Skipped: ${ach.code} (Already exists)`);
    }
  }
  console.log('Done.');
}

seed().catch(console.error);
