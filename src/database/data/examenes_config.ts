import { Question } from '../../shared/types';
import {
  BANCO_EO_DEMO,
  BANCO_EO_PREMIUM,
  BANCO_EO_EXAM2,
  BANCO_EESTP_PREMIUM,
  BANCO_EESTP_EXAM2,
} from './index';

/* ── Tipo de nivel/examen desbloqueable ── */
export interface ExamLevel {
  id: string;
  titulo: string;
  descripcion: string;
  banco: Question[];
  /** Número de preguntas que se seleccionan por simulacro */
  totalPreguntas: number;
  /** true = viene desbloqueado desde el inicio */
  desbloqueadoPorDefecto: boolean;
  /** Es contenido gratuito de demo? */
  esDemo: boolean;
}

/* ── Exámenes Escuela de Oficiales ── */
export const EXAMENES_EO: ExamLevel[] = [
  {
    id: 'eo-demo',
    titulo: 'Demo Oficiales',
    descripcion: '35 preguntas de prueba gratuita',
    banco: BANCO_EO_DEMO,
    totalPreguntas: 35,
    desbloqueadoPorDefecto: true,
    esDemo: true,
  },
  {
    id: 'eo-exam-1',
    titulo: 'Examen EO #1',
    descripcion: '100 preguntas · Simulacro completo',
    banco: BANCO_EO_PREMIUM,
    totalPreguntas: 100,
    desbloqueadoPorDefecto: true,
    esDemo: false,
  },
  {
    id: 'eo-exam-2',
    titulo: 'Examen EO #2',
    descripcion: '100 preguntas · Se desbloquea al aprobar #1',
    banco: BANCO_EO_EXAM2,
    totalPreguntas: 100,
    desbloqueadoPorDefecto: false,
    esDemo: false,
  },
];

/* ── Exámenes Escuela Técnica ── */
export const EXAMENES_EESTP: ExamLevel[] = [
  {
    id: 'eestp-demo',
    titulo: 'Demo Suboficiales',
    descripcion: '5 preguntas de prueba gratuita',
    banco: BANCO_EESTP_PREMIUM,
    totalPreguntas: 5,
    desbloqueadoPorDefecto: true,
    esDemo: true,
  },
  {
    id: 'eestp-exam-1',
    titulo: 'Examen EESTP #1',
    descripcion: '100 preguntas · Simulacro completo',
    banco: BANCO_EESTP_PREMIUM,
    totalPreguntas: 100,
    desbloqueadoPorDefecto: true,
    esDemo: false,
  },
  {
    id: 'eestp-exam-2',
    titulo: 'Examen EESTP #2',
    descripcion: '100 preguntas · Se desbloquea al aprobar #1',
    banco: BANCO_EESTP_EXAM2,
    totalPreguntas: 100,
    desbloqueadoPorDefecto: false,
    esDemo: false,
  },
];

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
  if (exam.desbloqueadoPorDefecto) return true;
  // El anterior debe existir y estar aprobado
  if (examIndex === 0) return true;
  const prevExam = examList[examIndex - 1];
  return !!progress[prevExam.id]?.passed;
}
