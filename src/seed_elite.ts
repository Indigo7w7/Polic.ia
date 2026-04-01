import { db, learningAreas, learningContent } from '../database/db';

async function seed() {
  console.log("Seeding Elite Content...");
  
  const areas = [
    { name: "CIENCIAS POLICIALES", icon: "Shield" },
    { name: "DERECHOS HUMANOS", icon: "Scale" },
    { name: "CONSTITUCIÓN POLÍTICA", icon: "Book" }
  ];

  for (const area of areas) {
    const [res] = await db.insert(learningAreas).values(area);
    const areaId = res.insertId;

    await db.insert(learningContent).values([
      {
        areaId,
        title: "Capítulo I: Fundamentos",
        body: "El respeto a la ley es la base de la institución policial. Todo oficial debe conocer sus límites y deberes.",
        level: 1,
        schoolType: "BOTH"
      },
      {
        areaId,
        title: "Capítulo II: Operativos Tácticos",
        body: "La planificación es el 90% del éxito en una intervención urbana de alto riesgo.",
        level: 1,
        schoolType: "BOTH"
      }
    ]);
  }

  console.log("Seed complete! Police academy is ready.");
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
