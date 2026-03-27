import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bot, X, Lightbulb, Sparkles, ChevronRight, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';

// ─── TIP CATEGORIES ───
type TipCategory = 'RM' | 'RV' | 'CONOCIMIENTOS' | 'ESTRATEGIA' | 'PSICOMETRICO' | 'GENERAL';

interface MascotTip {
  title: string;
  text: string;
  example?: string;
  category: TipCategory;
}

const CATEGORY_LABELS: Record<TipCategory, string> = {
  RM: 'Razonamiento Matemático',
  RV: 'Razonamiento Verbal',
  CONOCIMIENTOS: 'Conocimientos',
  ESTRATEGIA: 'Estrategia',
  PSICOMETRICO: 'Psicométrico',
  GENERAL: 'General',
};

const CATEGORY_COLORS: Record<TipCategory, string> = {
  RM: 'text-blue-400 bg-blue-600/20 border-blue-500/30',
  RV: 'text-purple-400 bg-purple-600/20 border-purple-500/30',
  CONOCIMIENTOS: 'text-emerald-400 bg-emerald-600/20 border-emerald-500/30',
  ESTRATEGIA: 'text-amber-400 bg-amber-600/20 border-amber-500/30',
  PSICOMETRICO: 'text-pink-400 bg-pink-600/20 border-pink-500/30',
  GENERAL: 'text-slate-400 bg-slate-600/20 border-slate-500/30',
};

const MASCOT_TIPS: MascotTip[] = [
  // ─── RAZONAMIENTO MATEMÁTICO (RM) ───
  { 
    category: 'RM', 
    title: 'Campanadas (Regla N-1)', 
    text: 'En los problemas de relojes y campanadas, el error más común es usar el número de campanadas directamente en una regla de tres. Sin embargo, lo que realmente consume tiempo no es el golpe de la campana en sí, sino el espacio de tiempo entre un golpe y otro. Por lo tanto, siempre debes trabajar con el número de intervalos, que se calcula restando 1 al total de campanadas (N-1). Si te dan el tiempo total, divídelo entre los intervalos para hallar la duración de cada uno.', 
    example: 'Si un reloj toca 6 campanadas en 15 segundos, significa que hay 5 intervalos de 3 segundos cada uno. Si te preguntan cuánto tardará en tocar 10 campanadas, debes calcular el tiempo para 9 intervalos: 9 x 3s = 27 segundos.' 
  },
  { 
    category: 'RM', 
    title: 'Edades (La Constante K)', 
    text: 'En los problemas de edades que involucran a dos o más personas en diferentes tiempos (pasado, presente, futuro), existe una propiedad aritmética fundamental que nunca falla: la diferencia de edades entre dos personas es una constante universal a lo largo del tiempo. Además, en los cuadros de edades, la suma en aspa de los valores de las celdas siempre debe ser igual. No intentes resolver todo con una sola variable "x" si puedes usar estas relaciones de igualdad para descartar opciones o simplificar la ecuación considerablemente.', 
    example: 'Si hoy Juan tiene 30 años y Pedro tiene 20, la diferencia es 10. Dentro de 50 años, sus edades serán 80 y 70, y la diferencia seguirá siendo 10. Si en un cuadro ves Juan(Pasad)=25, Juan(Pres)=30 y Pedro(Pasad)=15, entonces Pedro(Pres) debe ser 20 porque 25+20 = 30+15.' 
  },
  { 
    category: 'RM', 
    title: 'Método del Rombo (Falsa Suposición)', 
    text: 'Este método es extremadamente potente para problemas donde hay dos incógnitas con valores unitarios diferentes (ejemplo: billetes de 10 y 20, o animales de 2 y 4 patas) y te dan el total de elementos y la recaudación total. En la parte superior del rombo coloca el valor unitario mayor, abajo el menor, a la izquierda el total de elementos y a la derecha el total recaudado. La fórmula (Izquierda x Superior - Derecha) / (Superior - Inferior) te dará SIEMPRE la cantidad de elementos correspondientes al valor que pusiste abajo.', 
    example: 'En un corral hay 20 animales entre pollos y conejos, sumando 50 patas. Colocamos 4 arriba (conejos), 2 abajo (pollos), 20 a la izquierda y 50 a la derecha. Aplicamos: (20 x 4 - 50) / (4 - 2) = 30 / 2 = 15 pollos. Por descarte, hay 5 conejos.' 
  },

  // ─── RAZONAMIENTO VERBAL (RV) ───
  { 
    category: 'RV', 
    title: 'Comprensión Lectora: Inferencias', 
    text: 'Una inferencia es una conclusión lógica que se desprende de la información del texto pero que NO está escrita de forma explícita. Para validar una inferencia, esta debe ser necesariamente verdadera basándose solo en las premisas dadas. Ten mucho cuidado con las "afirmaciones literales" que aparecen en las opciones; aunque sean verdaderas según el texto, si están escritas exactamente igual a como aparece en el párrafo, NO son inferencias, son simplemente transcripciones o paráfrasis.', 
    example: 'Texto: "Todos los mamíferos de esta zona están en peligro por la sequía". Pregunta por inferencia: A) La sequía afecta a los animales. (Falsa, es muy general). B) Los murciélagos de la zona están en riesgo. (Correcta, porque el murciélago es mamífero).' 
  },
  { 
    category: 'RV', 
    title: 'Analogías: El Método RON', 
    text: 'Para resolver analogías de nivel profesional, aplica el método RON (Relación, Orden y Naturaleza). Primero, establece la Relación creando una oración breve con el par base. Segundo, verifica que el Orden de los términos en las opciones sea idéntico al original. Tercero, si dos opciones cumplen la relación y el orden, analiza la Naturaleza (el campo semántico o la jerarquía de las palabras). No te lances a marcar la primera que parezca sinónimo sin analizar estos tres pasos.', 
    example: 'PERRO : JAURÍA (Elemento : Conjunto). Si tienes OVEJA : REBAÑO y SOLDADO : EJÉRCITO, ambas cumplen. Pero si el texto original habla de animales (naturaleza biológica), la respuesta más precisa es OVEJA : REBAÑO.' 
  },

  // ─── ESTRATEGIA Y GENERAL ───
  { 
    category: 'ESTRATEGIA', 
    title: 'Gestión de Tiempo por Bloques', 
    text: 'El examen de admisión es una carrera contra el reloj, no una prueba de inteligencia pura. Debes dividir tus 3 horas en tres bloques estratégicos. El Bloque 1 (60 min) es para asegurar todas las preguntas que sabes al 100%. Si una pregunta te toma más de 60 segundos, márcala y huye al Bloque 2. El Bloque 2 (60 min) es para las preguntas que requieren un poco de cálculo o memoria. El Bloque 3 (final) es para las "imposibles" o para marcar por descarte. Nunca permitas que una sola pregunta difícil te robe el tiempo de diez preguntas fáciles que vienen después.', 
    example: 'Si te quedas 5 minutos intentando resolver un problema de física complejo, habrás perdido la oportunidad de responder 3 preguntas de cívica o historia que solo requerían 10 segundos de lectura cada una.' 
  },
  { 
    category: 'CONOCIMIENTOS', 
    title: 'Pachacútec y el Tahuantinsuyo', 
    text: 'El Inca Pachacútec es la figura más recurrente en los exámenes de historia del Perú. Él transformó el curacazgo del Cusco en un imperio (Tawantinsuyu). Sus obras fundamentales incluyen: la división en 4 suyos (Chinchaysuyo, Collasuyo, Antisuyo y Contisuyo), la implantación del sistema de Mitimaes, la oficialización del Quechua y la reconstrucción del Coricancha. Si la pregunta menciona "organizador del imperio" o "vencedor de los Chancas", la respuesta es casi siempre Pachacútec.', 
    example: 'Pregunta: ¿Quién estableció el sistema de correos mediante los Chasquis y la contabilidad con Quipus a gran escala? Respuesta: Pachacútec, el gran estructurador del Estado Inca.' 
  },
  { 
    category: 'PSICOMETRICO', 
    title: 'Series de Figuras y Matrices', 
    text: 'En los tests psicométricos de razonamiento abstracto, las figuras suelen seguir tres leyes fundamentales: Rotación (el elemento gira 45°, 90° o 180°), Adición (se van agregando líneas, puntos o sombreados) y Alternancia (un patrón que cambia entre dos estados, como blanco-negro-blanco). Siempre analiza cada detalle por separado: mira solo el sentido de las manecillas, luego solo el color del fondo, y finalmente la cantidad de lados. No intentes ver toda la figura compleja de un solo golpe de vista.', 
    example: 'Si un punto se mueve en sentido horario por las esquinas de un cuadrado, su siguiente posición es predecible. Si además el cuadrado cambia de color cada dos pasos, ya tienes el patrón combinado.' 
  }
];

// ─── FISHER-YATES SHUFFLE ───
function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const MascotAdvisor: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasNotification, setHasNotification] = useState(true);
  const location = useLocation();

  const shuffledQueueRef = useRef<MascotTip[]>(fisherYatesShuffle(MASCOT_TIPS));
  const [queueIndex, setQueueIndex] = useState(0);

  const isHidden = location.pathname === '/login' || location.pathname === '/simulador' || location.pathname === '/yape-checkout';

  // Auto-rotate every 5 minutes and show automatically
  useEffect(() => {
    if (isHidden) return;
    const interval = setInterval(() => {
      goToNextTip();
      setHasNotification(true);
      // Auto-open when a new tip arrives to grab attention
      setIsVisible(true);
    }, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [isHidden]);

  const goToNextTip = useCallback(() => {
    setQueueIndex(prev => {
      const queue = shuffledQueueRef.current;
      const nextIdx = prev + 1;
      if (nextIdx >= queue.length) {
        shuffledQueueRef.current = fisherYatesShuffle(MASCOT_TIPS);
        return 0;
      }
      return nextIdx;
    });
  }, []);

  const mascotRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (isVisible && mascotRef.current && !mascotRef.current.contains(e.target as Node)) {
        setIsVisible(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isVisible]);

  const handleToggle = () => {
    if (!isVisible) {
      setHasNotification(false);
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const currentTip = shuffledQueueRef.current[queueIndex] || MASCOT_TIPS[0];

  if (isHidden) return null;

  return (
    <div ref={mascotRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9, x: 20 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, y: 20, scale: 0.9, x: 20 }}
            className="mb-4 w-[350px] md:w-[450px] bg-slate-900/95 backdrop-blur-xl border border-blue-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl p-6 pointer-events-auto relative flex flex-col overflow-hidden group"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 opacity-50" />
            
            <button 
              onClick={() => setIsVisible(false)} 
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors bg-slate-800/50 p-1 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Tip content - FOCUSED ON TEXT AND EXAMPLE */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/70">
                  Consejo Maestro
                </span>
              </div>

              <div className="space-y-4">
                <p className="text-sm md:text-base text-slate-200 leading-relaxed font-medium">
                  {currentTip.text}
                </p>
                
                {currentTip.example && (
                  <div className="bg-emerald-500/5 border-l-4 border-emerald-500/50 p-4 rounded-r-2xl">
                    <p className="text-[11px] font-black uppercase tracking-wider text-emerald-400 mb-2">
                      Ejemplo Práctico:
                    </p>
                    <p className="text-xs md:text-sm text-emerald-300/90 leading-relaxed italic font-semibold">
                      {currentTip.example}
                    </p>
                  </div>
                )}
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="relative pointer-events-auto">
        {hasNotification && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3 z-10">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
          </span>
        )}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleToggle}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg relative overflow-hidden group transition-all border-2 ${
            isVisible 
              ? 'bg-blue-600 border-blue-400'
              : 'bg-slate-900 border-blue-500/50 hover:border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.3)]'
          }`}
        >
          {isVisible ? (
            <Bot className="w-7 h-7 text-white" />
          ) : (
            <Bot className="w-7 h-7 text-blue-400 group-hover:text-blue-300 transition-colors" />
          )}
          {!isVisible && (
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 to-transparent" />
          )}
        </motion.button>
      </div>
    </div>
  );
};
