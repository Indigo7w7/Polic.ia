/**
 * Bloque 08: Definiciones TypeScript/Prop-types para el JSON
 */

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  justification: string; // Explicación para la Flashcard
  area: string; // Ej. 'Aptitud Académica', 'Conocimientos'
}

export interface Exam {
  id: string;
  title: string;
  questions: Question[];
  durationMinutes: number;
  modalidad: 'EO' | 'EESTP';
}

export interface Flashcard {
  id: string;
  uid: string;
  questionId: string;
  box: number; // 0 a 4 (1, 3, 7, 15, 30 días)
  nextReview: string; // ISO Date
  createdAt: string; // ISO Date
  updatedAt: string; // ISO Date
}

export interface ExamResult {
  id: string;
  uid: string;
  examId: string;
  score: number;
  failedQuestions: string[]; // IDs de preguntas falladas (Pipeline de Errores)
  completedAt: string; // ISO Date
}

export interface QuestionDocument {
  enunciado_base: string;
  matriz_alternativas: string[];
  vector_solucion: number;
  fundamentacion_doctrinal: string;
  categoria_disciplina: string;
  tipo_examen?: string;
}

export interface ExamDocument {
  uid: string;
  fecha: any; // Firestore Timestamp
  puntaje_total: number;
  preguntas_correctas: number;
  preguntas_totales: number;
  tipo_examen: string;
}

export interface LeitnerDocument {
  uid: string;
  pregunta_id: string;
  pregunta_texto: string;
  respuesta_correcta: string;
  nivel_retencion: number;
  proximo_repaso: any; // Firestore Timestamp
  area?: string;
}
