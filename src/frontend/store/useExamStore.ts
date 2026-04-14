import { create } from 'zustand';
import { Question } from '../../shared/types';

interface ExamStore {
  examenActivo: boolean;
  preguntas: Question[];
  respuestasUsuario: Record<string, number>; // { id_pregunta: indice_seleccionado }
  preguntasMarcadas: Record<string, boolean>; // { id_pregunta: bool }
  tiempoPorPregunta: Record<string, number>; // { id_pregunta: segundos_invertidos }
  erroresDetectados: Question[];
  tiempoRestante: number; // 30 minutos (Bloque 03.2)
  examLevelId: number | null;
  isPracticeMode: boolean;
  isMuerteSubita: boolean;

  iniciarExamen: (bancoPreguntas: Question[], levelId?: number | null, isPractice?: boolean, isMuerteSubita?: boolean) => void;
  registrarRespuesta: (idPregunta: string, indice: number) => void;
  toggleMarca: (idPregunta: string) => void;
  registrarTiempo: (idPregunta: string, deltaSecs: number) => void;
  recuperarMision: (data: any) => void;
  finalizarExamen: () => Question[];
  setTiempoRestante: (tiempo: number | ((prev: number) => number)) => void;
  limpiarExamen: () => void;
}

export const useExamStore = create<ExamStore>((set, get) => ({
  examenActivo: false,
  preguntas: [],
  respuestasUsuario: {},
  preguntasMarcadas: {},
  tiempoPorPregunta: {},
  erroresDetectados: [],
  tiempoRestante: 1800, // 30 minutos
  examLevelId: null,
  isPracticeMode: false,
  isMuerteSubita: false,

  iniciarExamen: (bancoPreguntas, levelId = null, isPractice = false, isMuerteSubita = false) => set({
    examenActivo: true,
    preguntas: bancoPreguntas,
    respuestasUsuario: {},
    preguntasMarcadas: {},
    tiempoPorPregunta: {},
    erroresDetectados: [],
    tiempoRestante: 1800,
    examLevelId: levelId,
    isPracticeMode: isPractice,
    isMuerteSubita: isMuerteSubita,
  }),

  registrarRespuesta: (idPregunta, indice) => set((state) => ({
    respuestasUsuario: { ...state.respuestasUsuario, [idPregunta]: indice }
  })),

  toggleMarca: (idPregunta) => set((state) => ({
    preguntasMarcadas: { 
      ...state.preguntasMarcadas, 
      [idPregunta]: !state.preguntasMarcadas[idPregunta] 
    }
  })),

  registrarTiempo: (idPregunta, deltaSecs) => set((state) => ({
    tiempoPorPregunta: { 
      ...state.tiempoPorPregunta, 
      [idPregunta]: (state.tiempoPorPregunta[idPregunta] || 0) + deltaSecs 
    }
  })),

  recuperarMision: (data) => set({
    respuestasUsuario: data.answers || {},
    preguntasMarcadas: data.flaggedQuestions || {},
    tiempoPorPregunta: data.timeSpentPerQuestion || {},
    tiempoRestante: data.timeLeft || 1800,
    preguntas: data.questions || [],
    examLevelId: data.examLevelId || null,
    isPracticeMode: data.isPracticeMode || false,
    isMuerteSubita: data.isMuerteSubita || false,
    examenActivo: true
  }),

  setTiempoRestante: (tiempo) => set((state) => ({
    tiempoRestante: typeof tiempo === 'function' ? tiempo(state.tiempoRestante) : tiempo
  })),

  limpiarExamen: () => set({
    examenActivo: false,
    preguntas: [],
    respuestasUsuario: {},
    preguntasMarcadas: {},
    tiempoPorPregunta: {},
    erroresDetectados: [],
    examLevelId: null,
  }),

  finalizarExamen: () => {
    const { preguntas, respuestasUsuario } = get();
    const fallos = preguntas.filter(p => respuestasUsuario[p.id] !== p.correctOptionIndex);
    
    set({ 
      examenActivo: false, 
      erroresDetectados: fallos 
    });

    // Aquí se dispara el Batch Write al Registro_Leitner_Activo (Bloque 3.3)
    return fallos;
  }
}));
