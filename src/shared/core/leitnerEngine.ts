/**
 * Bloque 04: Algoritmo Leitner
 * Este archivo procesa la repetición espaciada para asegurar que el usuario domine la doctrina legal.
 */

const INTERVALOS_DIAS: Record<number, number> = {
  1: 1,  // Nivel 1: Repasar mañana
  2: 3,  // Nivel 2: Repasar en 3 días
  3: 7,  // Nivel 3: Repasar en 7 días
  4: 15, // Nivel 4: Repasar en 15 días
  5: 30  // Nivel 5: Dominado
};

export const calcularProximoRepaso = (nivelActual: number, fueExitoso: boolean) => {
  const ahora = new Date();
  
  // Si falla, regresa al Nivel 1 (Reinicio cognitivo)
  if (!fueExitoso) {
    const proximoRepaso = new Date();
    proximoRepaso.setDate(ahora.getDate() + INTERVALOS_DIAS[1]);
    return {
      nuevoNivel: 1,
      proximoRepaso
    };
  }

  // Si acierta, sube de nivel (Máximo 5)
  const nuevoNivel = Math.min(nivelActual + 1, 5);
  const proximoRepaso = new Date();
  proximoRepaso.setDate(ahora.getDate() + INTERVALOS_DIAS[nuevoNivel]);
  return {
    nuevoNivel,
    proximoRepaso
  };
};
