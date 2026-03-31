import confetti from 'canvas-confetti';

// Sistema centralizado de micro-interacciones tácticas.

/**
 * Lanza un efecto de victoria con optimización agresiva para dispositivos de gama baja.
 * @param severity Intensidad de la victoria (1 = Normal, 2 = Rank UP / Épica)
 */
export const triggerTacticalVictory = (severity: 1 | 2 = 1) => {
  // Verificamos "reduce motion" nativo de CSS para accesibilidad y perf
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const count = severity === 2 ? 150 : 60;
  const spread = severity === 2 ? 90 : 60;
  
  // Confetti ligero enfocado en el centro-arriba
  confetti({
    particleCount: count,
    spread: spread,
    origin: { y: 0.3 },
    colors: ['#3b82f6', '#10b981', '#f59e0b'], // Blue, Emerald, Amber
    disableForReducedMotion: true,
  });

  // TODO: Si deseas agregar un SFX, se reproducirá aquí usando la API de Web Audio.
  // playSound('/sfx/tactical-success.mp3'); 
};

/**
 * Sonido estático suave para UI (click, avance, retroceso)
 */
export const playUIClick = () => {
  // Ejemplo: oscilador sutil (10ms) para simular un click de interfaz sin cargar MP3s
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (e) {
    // Silencio si falla AudioContext o el navegador restringe
  }
};
