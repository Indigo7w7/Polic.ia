/**
 * levenshtein.ts — Distancia de Levenshtein para Type-in-the-Answer
 * Calcula la similitud porcentual entre dos strings (ignorando mayúsculas, tildes y puntuación).
 */

/** Normaliza texto: minúsculas, sin tildes, sin puntuación extra */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar tildes
    .replace(/[^\w\s]/g, '')          // quitar puntuación
    .trim()
    .replace(/\s+/g, ' ');
}

/** Distancia de Levenshtein clásica entre dos strings */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Similitud porcentual entre dos textos [0-100].
 * 100 = idénticos, 0 = completamente distintos.
 */
export function similarity(input: string, correct: string): number {
  const a = normalize(input);
  const b = normalize(correct);
  if (a === b) return 100;
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  const dist = levenshtein(a, b);
  return Math.round(((maxLen - dist) / maxLen) * 100);
}

/**
 * Evalúa si la respuesta escrita es aceptable.
 * @param threshold Porcentaje mínimo para considerar correcta (default 80%)
 */
export function evaluateAnswer(input: string, correct: string, threshold = 80): {
  isCorrect: boolean;
  score: number;
  ease: 1 | 2 | 3 | 4;
} {
  const score = similarity(input, correct);
  const isCorrect = score >= threshold;

  // Mapeo automático a FSRS ease basado en score
  let ease: 1 | 2 | 3 | 4;
  if (score >= 95) ease = 4;       // Perfecto
  else if (score >= 80) ease = 3;  // Bien
  else if (score >= 60) ease = 2;  // Difícil
  else ease = 1;                   // Olvidé

  return { isCorrect, score, ease };
}

/**
 * Genera el HTML de feedback con las diferencias marcadas en color.
 * Verde = correcto, Rojo = incorrecto, Subrayado = inserción.
 */
export function buildDiffHtml(input: string, correct: string): string {
  const a = normalize(input);
  const b = normalize(correct);

  if (a === b) {
    return `<span class="diff-correct">${correct}</span>`;
  }

  // Marcar caracteres correctos en verde e incorrectos en rojo (basado en score)
  const score = similarity(input, correct);
  const colorClass = score >= 80 ? 'diff-correct' : score >= 60 ? 'diff-partial' : 'diff-wrong';

  return `
    <div class="diff-container">
      <div class="diff-user"><span class="diff-label">Tu respuesta:</span> <span class="${colorClass}">${input || '(vacío)'}</span></div>
      <div class="diff-answer"><span class="diff-label">Respuesta correcta:</span> <span class="diff-correct">${correct}</span></div>
    </div>
  `;
}
