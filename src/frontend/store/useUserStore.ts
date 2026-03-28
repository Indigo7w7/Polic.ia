import { create } from 'zustand';

export type ModalidadPostulacion = 'EO' | 'EESTP' | null;
export type EstadoFinanciero = 'FREE' | 'PRO';

export interface ExamProgress {
  score: number;       // 0-1 (porcentaje)
  passed: boolean;     // score >= 0.55
  completedAt: string; // ISO date
}

export interface UserState {
  uid: string | null;
  modalidad_postulacion: ModalidadPostulacion;
  estado_financiero: EstadoFinanciero;
  fecha_expiracion_premium: string | null;
  acceso_unificado: boolean;
  name: string;
  photoURL: string | null;
  age: number | null;
  city: string | null;
  profileEdited: boolean;
  role: 'user' | 'admin';
  examProgress: Record<string, ExamProgress>;
  setUserData: (data: Partial<UserState>) => void;
  activarPremium: (timestampExpiracion: string) => void;
  isPremiumActive: () => boolean;
  registrarExamen: (examId: string, score: number) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  uid: null,
  modalidad_postulacion: null,
  estado_financiero: 'FREE',
  fecha_expiracion_premium: null,
  acceso_unificado: false,
  name: 'Invitado',
  photoURL: null,
  age: null,
  city: null,
  profileEdited: false,
  role: 'user',
  examProgress: {},

  setUserData: (data) => set((state) => ({ ...state, ...data })),

  activarPremium: (timestampExpiracion: string) => set((state) => ({
    ...state,
    estado_financiero: 'PRO',
    fecha_expiracion_premium: timestampExpiracion,
  })),

  isPremiumActive: () => {
    const { estado_financiero, fecha_expiracion_premium } = get();
    
    if (estado_financiero !== 'PRO') return false;
    if (!fecha_expiracion_premium) return false;
    return new Date(fecha_expiracion_premium) > new Date();
  },

  registrarExamen: (examId: string, score: number) => set((state) => ({
    ...state,
    examProgress: {
      ...state.examProgress,
      [examId]: {
        score,
        passed: score >= 0.55,
        completedAt: new Date().toISOString(),
      },
    },
  })),
}));
