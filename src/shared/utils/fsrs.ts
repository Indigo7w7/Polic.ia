/**
 * FSRS (Free Spaced Repetition Scheduler) — Motor de Retención Cognitiva
 * Basado en el modelo DSR (Difficulty, Stability, Retrievability)
 * Compatible con Polic.ia / MySQL
 */

// ── Constantes del modelo FSRS v5 ──────────────────────────────────────────
const FSRS_W = [
  0.4072, 1.1829, 3.1262, 15.4722,
  7.2102, 0.5316, 1.0651, 0.0589,
  1.5330, 0.1544, 1.0071, 1.9395,
  0.1100, 0.2900, 2.2700, 0.2700,
  2.9898,
];

const DECAY = -0.5;
const FACTOR = 19 / 81;
const REQUEST_RETENTION = 0.9;
const MAX_INTERVAL = 36500; // 100 años
const DAY_ROLLOVER_OFFSET = 4; // sesión cambia a las 4 AM, no medianoche

export type Rating = 1 | 2 | 3 | 4; // 1=Again, 2=Hard, 3=Good, 4=Easy
export type CardState = 'new' | 'learning' | 'review' | 'relearning';

export interface FSRSCard {
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: CardState;
}

export interface FSRSResult {
  stability: number;
  difficulty: number;
  scheduledDays: number;
  nextState: CardState;
  retrievability: number;
}

// ── Helpers matemáticos ─────────────────────────────────────────────────────

/** Probabilidad de recuerdo en t días con estabilidad S */
export function retrievability(t: number, s: number): number {
  return Math.pow(1 + FACTOR * (t / s), DECAY);
}

/** Intervalo óptimo para mantener retención al 90% */
function nextInterval(stability: number): number {
  const raw = (stability / FACTOR) * (Math.pow(REQUEST_RETENTION, 1 / DECAY) - 1);
  return Math.min(Math.round(raw), MAX_INTERVAL);
}

/** Fuzzing: ±10% aleatorio para evitar acumulación en la misma fecha */
export function applyFuzz(interval: number): number {
  if (interval < 2) return interval;
  const fuzz = interval < 7 ? 1 : interval < 30 ? Math.round(interval * 0.05) : Math.round(interval * 0.08);
  return interval + Math.floor(Math.random() * (2 * fuzz + 1)) - fuzz;
}

// ── Inicialización para tarjetas nuevas ─────────────────────────────────────

function initStability(rating: Rating): number {
  return Math.max(FSRS_W[rating - 1], 0.1);
}

function initDifficulty(rating: Rating): number {
  return clamp(FSRS_W[4] - Math.exp(FSRS_W[5] * (rating - 1)) + 1, 1, 10);
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

// ── Actualización para tarjetas en repaso ───────────────────────────────────

function nextDifficulty(d: number, rating: Rating): number {
  const delta = FSRS_W[6] * (rating - 3);
  return clamp(d - delta + FSRS_W[7] * (10 - d) * FSRS_W[7], 1, 10);
}

function shortTermStability(s: number, rating: Rating): number {
  return s * Math.exp(FSRS_W[11] * (rating - 3 + FSRS_W[12]));
}

function nextRecallStability(d: number, s: number, r: number, rating: Rating): number {
  const hardPenalty = rating === 2 ? FSRS_W[15] : 1;
  const easyBonus = rating === 4 ? FSRS_W[16] : 1;
  return s * (
    Math.exp(FSRS_W[8]) *
    (11 - d) *
    Math.pow(s, -FSRS_W[9]) *
    (Math.exp((1 - r) * FSRS_W[10]) - 1) *
    hardPenalty *
    easyBonus
  );
}

function nextForgetStability(d: number, s: number, r: number): number {
  return (
    FSRS_W[11] *
    Math.pow(d, -FSRS_W[12]) *
    (Math.pow(s + 1, FSRS_W[13]) - 1) *
    Math.exp((1 - r) * FSRS_W[14])
  );
}

// ── Función principal del scheduler ─────────────────────────────────────────

export function scheduleCard(card: FSRSCard, rating: Rating): FSRSResult {
  const { stability, difficulty, elapsedDays, state, reps } = card;

  let newStability: number;
  let newDifficulty: number;
  let nextState: CardState;
  let scheduledDays: number;

  if (state === 'new' || reps === 0) {
    // --- Primera vez que se ve la tarjeta ---
    newStability = initStability(rating);
    newDifficulty = initDifficulty(rating);

    if (rating === 1) {
      nextState = 'learning';
      scheduledDays = 0; // Repasar hoy mismo
    } else if (rating === 2) {
      nextState = 'learning';
      scheduledDays = 1;
    } else if (rating === 3) {
      nextState = 'learning';
      scheduledDays = 1;
    } else {
      nextState = 'review';
      scheduledDays = applyFuzz(nextInterval(newStability));
    }

  } else if (state === 'learning' || state === 'relearning') {
    // --- Tarjeta en fase de aprendizaje ---
    newStability = shortTermStability(stability, rating);
    newDifficulty = nextDifficulty(difficulty, rating);

    if (rating === 1) {
      nextState = state === 'relearning' ? 'relearning' : 'learning';
      scheduledDays = 0;
    } else if (rating === 2) {
      nextState = 'learning';
      scheduledDays = 1;
    } else {
      nextState = 'review';
      scheduledDays = applyFuzz(Math.max(nextInterval(newStability), 1));
    }

  } else {
    // --- Tarjeta en repaso regular ---
    const r = retrievability(elapsedDays, stability);
    newDifficulty = nextDifficulty(difficulty, rating);

    if (rating === 1) {
      // Olvido — reaprendizaje
      newStability = nextForgetStability(difficulty, stability, r);
      nextState = 'relearning';
      scheduledDays = 0;
    } else {
      newStability = nextRecallStability(difficulty, stability, r, rating);
      nextState = 'review';
      scheduledDays = applyFuzz(nextInterval(newStability));
    }
  }

  const ret = retrievability(scheduledDays, Math.max(newStability, 0.1));

  return {
    stability: Math.max(newStability, 0.1),
    difficulty: clamp(newDifficulty, 1, 10),
    scheduledDays,
    nextState,
    retrievability: ret,
  };
}

// ── Estimación de intervalos (para mostrar en botones antes de clicar) ──────

export function previewIntervals(card: FSRSCard): Record<Rating, number> {
  return {
    1: scheduleCard(card, 1).scheduledDays,
    2: scheduleCard(card, 2).scheduledDays,
    3: scheduleCard(card, 3).scheduledDays,
    4: scheduleCard(card, 4).scheduledDays,
  };
}

// ── Day Rollover: fecha lógica de sesión (con offset configurable) ───────────

/**
 * Devuelve la fecha "lógica" de la sesión de estudio.
 * Si son las 2:00 AM y el offset es 4, el día "lógico" sigue siendo el día anterior.
 */
export function getSessionDate(offsetHours = DAY_ROLLOVER_OFFSET): Date {
  const now = new Date();
  const adjusted = new Date(now.getTime() - offsetHours * 60 * 60 * 1000);
  adjusted.setHours(0, 0, 0, 0);
  return adjusted;
}

/**
 * Devuelve el umbral de "next_review" para la sesión actual.
 * Una tarjeta se considera "debida hoy" si su nextReview < cutoff.
 */
export function getTodayCutoff(offsetHours = DAY_ROLLOVER_OFFSET): Date {
  const sessionDate = getSessionDate(offsetHours);
  // El cutoff es el inicio del día SIGUIENTE al día lógico + el offset
  const cutoff = new Date(sessionDate);
  cutoff.setDate(cutoff.getDate() + 1);
  cutoff.setHours(offsetHours, 0, 0, 0);
  return cutoff;
}

/** Formatea un número de días de forma legible (para los botones) */
export function formatInterval(days: number): string {
  if (days === 0) return '< 1d';
  if (days < 1) return `${Math.round(days * 24)}h`;
  if (days === 1) return '1 día';
  if (days < 30) return `${days} días`;
  if (days < 365) return `${Math.round(days / 30)} mes${Math.round(days / 30) > 1 ? 'es' : ''}`;
  return `${Math.round(days / 365)} año${Math.round(days / 365) > 1 ? 's' : ''}`;
}
