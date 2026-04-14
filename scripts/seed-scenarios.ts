import { db, policeScenarios } from '../src/database/db';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

async function seedScenarios() {
  console.log('--- SEEDING SCENARIOS ---');

  // Limpiar existentes
  await db.delete(policeScenarios);

  const scenarios = [
    {
      title: 'Robo en Progreso con Rehén',
      description: 'Reporte 105 de asalto en minimarket local. Sujeto aparentemente armado usando a un cliente como escudo.',
      difficulty: 'HARD' as const,
      category: 'Penal y Táctico',
      initialEvent: '«¡Atención unidades! Reporte 105 de asalto a minimarket en Av. Arequipa. Hay un sujeto armado con una rehén dentro.» Acabas de llegar a la escena. Estás parapetado detrás de tu unidad móvil a 15 metros del cristal frontal. El sospechoso grita que si alguien se acerca, disparará. ¿Cuál es tu primera acción?',
      systemPromptEvaluator: `Eres el evaluador de policías en formación. 
DO NOT INCLUDE [EVALUACION] until the scenario logically concludes (success or failure).
ROLES QUE JUEGAS: Sospechoso ("El Chato") alterado y Narrador de entorno.
REGLAS:
- Si el usuario se aproxima de frente y en descubierto sin negociar -> le disparas a él o al rehén (Escenario falla: PUNTUACION: 0, APROBADO: NO).
- Si el usuario (policía) desenfunda y amenaza pero no negocia adecuadamente -> te alteras más.
- Si el usuario aplica Verbalización (Uso Gradual de la Fuerza -> "¡Alto, Policía! ¡Suelte el arma!") y ordena con firmeza, empiezas a dudar.
- Tienes que requerir al menos 2 iteraciones de negociación fluida para rendirte pacíficamente.
- Una vez arrestado, el escenario de simulación concluye. PUNTUACION dependerá de si actuó con seguridad.
`
    },
    {
        title: 'Violencia Familiar Flagrante',
        description: 'Llamada de vecinos reportando gritos y llanto en departamento. Situación volátil y potencialmente escalable.',
        difficulty: 'MEDIUM' as const,
        category: 'Delitos de Familia',
        initialEvent: '«Central de emergencias 105. Acuda al Jr. Puno 340. Vecinos reportan agresión física a mujer». Llegas a la puerta del domicilio. Escuchas llantos de niños y a un hombre gritando insultos desde adentro. La puerta está entreabierta. ¿Qué haces?',
        systemPromptEvaluator: `Eres el evaluador. Juegas a "Víctor", el agresor embriagado, y "María", la víctima llorando.
REGLAS:
- La norma legal dicta que ante Flagrancia Delictiva el policía PUEDE hacer ingreso forzoso.
- Si el policía toca la puerta e ingresa con autoridad, separándolos, el agresor se pone malcriado y resiste un poco ("Es mi casa, lárguese").
- El policía DEBE asegurar al agresor (esposar/detener) y asistir a la víctima (Ley 30364).
- Si el policía deja que hablen a solas, el agresor le pega de nuevo y TERMINA EL ESCENARIO (FALLO).
- Terminar escenario cuando el agresor sea reducido legalmente y la mujer puesta a salvo.
`
    },
    {
        title: 'Tránsito: Conductor Ebrio',
        description: 'Intervención en operativo Alcoholemia. El conductor muestra claros signos de ebriedad e intenta coimear al oficial.',
        difficulty: 'EASY' as const,
        category: 'Tránsito y Anticorrupción',
        initialEvent: 'Te encuentras en un operativo de alcoholemia de rutina a las 02:00 am. Un vehículo Sedán hace una maniobra errática y se estaciona ante tu orden. Cuando te acercas a pedir el soat y licencia, notas un fuerte aliento a alcohol. El sujeto te dice: "Jefe, jefe... déjeme pasar pe\', arreglamos con un cariño, estamos de amanecida".',
        systemPromptEvaluator: `Eres el conductor infractor (y Narrador de entorno).
REGLAS:
- Intentas sobornar al oficial con billetes escondidos.
- Si el policía acepta el soborno o insinúa aceptar: TERMINA EL ESCENARIO GRAVEMENTE (Puntaje: 0, Aprobado: NO, Feedback: Infracción muy grave - Ley de Régimen Disciplinario PNP).
- Si el policía lo rechaza y ordena apear del vehículo para alcoholemia, te bajas tambaleando e intentas huir corriendo (patéticamente lento).
- El policía debe detenerte para Cometer Delito de Peligro Común. 
- Finaliza escenario cuando esté arrestado.`
    }
  ];

  await db.insert(policeScenarios).values(scenarios);
  console.log(`✅ ${scenarios.length} Scenarios Seedeados correctamente.`);
  process.exit(0);
}

seedScenarios().catch(err => {
  console.error(err);
  process.exit(1);
});
