import { create } from 'zustand';
import { Question } from '../../shared/types';

interface ExamStore {
  examenActivo: boolean;
  preguntas: Question[];
  respuestasUsuario: Record<string, number>; // { id_pregunta: indice_seleccionado }
  erroresDetectados: Question[];
  tiempoRestante: number; // 30 minutos (Bloque 03.2)

  iniciarExamen: (bancoPreguntas: Question[]) => void;
  registrarRespuesta: (idPregunta: string, indice: number) => void;
  recuperarMision: (answers: Record<string, number>, timeLeft: number) => void;
  finalizarExamen: () => Question[];
  setTiempoRestante: (tiempo: number | ((prev: number) => number)) => void;
}

export const useExamStore = create<ExamStore>((set, get) => ({
  examenActivo: false,
  preguntas: [],
  respuestasUsuario: {},
  erroresDetectados: [],
  tiempoRestante: 1800, // 30 minutos

  iniciarExamen: (bancoPreguntas) => set({
    examenActivo: true,
    preguntas: bancoPreguntas,
    respuestasUsuario: {},
    erroresDetectados: [],
    tiempoRestante: 1800
  }),

  registrarRespuesta: (idPregunta, indice) => set((state) => ({
    respuestasUsuario: { ...state.respuestasUsuario, [idPregunta]: indice }
  })),

  recuperarMision: (answers, timeLeft) => set({
    respuestasUsuario: answers,
    tiempoRestante: timeLeft,
    examenActivo: true
  }),

  setTiempoRestante: (tiempo) => set((state) => ({
    tiempoRestante: typeof tiempo === 'function' ? tiempo(state.tiempoRestante) : tiempo
  })),

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
