import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  status: 'ACTIVE' | 'BLOCKED';
  examProgress: Record<string, ExamProgress>;
  honorPoints: number;
  meritPoints: number;
  currentStreak: number;
  achievementsQueue: any[];
  setUserData: (data: Partial<UserState>) => void;
  activarPremium: (timestampExpiracion: string) => void;
  isPremiumActive: () => boolean;
  registrarExamen: (examId: string, score: number) => void;
  addHonorPoints: (pts: number) => void;
  addMeritPoints: (pts: number) => void;
  pushAchievement: (achievement: any) => void;
  popAchievement: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
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
      status: 'ACTIVE',
      examProgress: {},
      honorPoints: 0,
      meritPoints: 0,
      currentStreak: 0,
      achievementsQueue: [],

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

      addHonorPoints: (pts: number) => set((state) => ({
        ...state,
        honorPoints: state.honorPoints + pts
      })),

      addMeritPoints: (pts: number) => set((state) => ({
        ...state,
        meritPoints: state.meritPoints + pts
      })),

      pushAchievement: (achievement: any) => set((state) => ({
        ...state,
        meritPoints: state.meritPoints + (achievement.pointsReward || 0),
        achievementsQueue: [...state.achievementsQueue, achievement]
      })),

      popAchievement: () => set((state) => ({
        ...state,
        achievementsQueue: state.achievementsQueue.slice(1)
      })),
    }),
    {
      name: 'policia-pro-v2', // RENAME FOR FORCED RESET
      partialize: (state) => ({ 
        modalidad_postulacion: state.modalidad_postulacion,
        role: state.role,
        estado_financiero: state.estado_financiero,
        fecha_expiracion_premium: state.fecha_expiracion_premium,
        examProgress: state.examProgress,
        honorPoints: state.honorPoints,
        meritPoints: state.meritPoints,
        profileEdited: state.profileEdited,
        currentStreak: state.currentStreak,
      }),
    }
  )
);
