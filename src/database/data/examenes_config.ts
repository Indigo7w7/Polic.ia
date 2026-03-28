import { Question } from '../../shared/types';
import {
  BANCO_EO_DEMO,
  BANCO_EO_PREMIUM,
  BANCO_EESTP_PREMIUM,
} from './index';

/* ── Tipo de nivel/examen desbloqueable ── */
export interface ExamLevel {
  id: number | string;
  school: 'EO' | 'EESTP';
  level: number;
  title: string;
  isDemo: boolean;
  /** Optional for legacy/demo compatibility */
  totalPreguntas?: number;
  banco?: Question[];
}

/** Nota mínima para desbloquear siguiente nivel (55% = 11/20) */
export const NOTA_MINIMA_DESBLOQUEO = 0.55;

/** Verifica si un examen está desbloqueado dado el progreso del usuario */
export function isExamUnlocked(
  examList: ExamLevel[],
  examIndex: number,
  progress: Record<string, { score: number; passed: boolean }>
): boolean {
  const exam = examList[examIndex];
  if (!exam) return false;
  if (exam.isDemo) return true;
  // Level 1 of any school is unlocked by default for now (or for PRO)
  if (exam.level === 1) return true;
  
  // The previous level must be passed
  const prevExam = examList[examIndex - 1];
  if (!prevExam) return true;
  return !!progress[prevExam.id]?.passed;
}
