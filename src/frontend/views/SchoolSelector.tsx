import React from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../../shared/utils/trpc';
import { useUserStore, type ModalidadPostulacion } from '../store/useUserStore';
import { Shield, GraduationCap, ChevronRight, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

import { auth } from '@/src/firebase';

const schools: { id: ModalidadPostulacion; title: string; subtitle: string; welcome: string; icon: React.ReactNode; gradient: string; border: string; glow: string }[] = [
  {
    id: 'EO',
    title: 'Escuela de Oficiales',
    subtitle: 'EO-PNP · Cadetes',
    welcome: '¡Bienvenido, Futuro Cadete!',
    icon: <Shield className="w-10 h-10" />,
    gradient: 'from-blue-600 to-indigo-700',
    border: 'border-blue-500/30 hover:border-blue-400/60',
    glow: 'shadow-blue-600/20 hover:shadow-blue-500/40',
  },
  {
    id: 'EESTP',
    title: 'Escuela Técnica',
    subtitle: 'EESTP-PNP · Suboficiales',
    welcome: '¡Bienvenido, Futuro Alumno PNP!',
    icon: <GraduationCap className="w-10 h-10" />,
    gradient: 'from-emerald-600 to-teal-700',
    border: 'border-emerald-500/30 hover:border-emerald-400/60',
    glow: 'shadow-emerald-600/20 hover:shadow-emerald-500/40',
  },
];

export const SchoolSelector: React.FC = () => {
  const navigate = useNavigate();
  const { uid, setUserData, name, modalidad_postulacion } = useUserStore();
  const selectSchool = trpc.user.selectSchool.useMutation();

  React.useEffect(() => {
    if (modalidad_postulacion) {
      toast.error('Acción no permitida: Ya has seleccionado una escuela anteriormente.', {
        id: 'school-lock-toast'
      });
      navigate('/');
    }
    
    // Admin Override: Admins don't need a school. Route them to portal.
    const isOwner = auth.currentUser?.email?.toLowerCase().trim() === 'brizq02@gmail.com';
    if (useUserStore.getState().role === 'admin' || isOwner) {
       navigate('/admin-portal', { replace: true });
    }
  }, [modalidad_postulacion, navigate]);

  const handleSelect = async (modalidad: ModalidadPostulacion) => {
    if (!modalidad || modalidad_postulacion) return;
    
    const utils = trpc.useUtils();
    setUserData({ modalidad_postulacion: modalidad });

    if (uid) {
      try {
        await selectSchool.mutateAsync({ uid, school: modalidad as 'EO' | 'EESTP' });
        // MANDATORY: Force cache invalidation to prevent old null value from overwriting the store
        await utils.user.getProfile.invalidate({ uid });
        console.log('[SYNC] Profile cache invalidated after school selection');
      } catch (e: any) {
        console.error('Error saving modalidad:', e);
        if (e.message?.includes('irreversible')) {
          toast.error('Ya has seleccionado una escuela anteriormente.');
          navigate('/');
          return;
        }
      }
    }

    const chosen = schools.find(s => s.id === modalidad)!;
    toast.success(chosen.welcome, { duration: 4000 });
    navigate('/', { replace: true });
  };

  const displayName = name === 'Invitado' ? 'Postulante' : name.split(' ')[0];

  return (
    <div className="min-h-screen bg-[#060d1a] flex items-center justify-center p-4 font-sans text-white relative overflow-hidden">
      {/* Background grid */}
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none" style={{
        backgroundImage: `linear-gradient(#2563eb 1px, transparent 1px), linear-gradient(90deg, #2563eb 1px, transparent 1px)`,
        backgroundSize: '80px 80px'
      }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full space-y-8 relative z-10"
      >
        {/* Header */}
        <div className="text-center space-y-3">
          {modalidad_postulacion && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-black uppercase tracking-widest animate-bounce">
              🔒 Selección de Escuela Bloqueada Permanentemente
            </div>
          )}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-blue-600/30"
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-black tracking-tight drop-shadow-md">
            Hola, <span className="text-blue-400">{displayName}</span>
          </h1>
          <p className="text-slate-300 text-sm max-w-sm mx-auto leading-relaxed">
            Elige tu objetivo estratégico. Adaptaremos el entrenamiento a tu meta, o puedes explorar ambos caminos si aún no decides.
          </p>
          <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl text-left text-xs text-slate-400 space-y-2 max-w-sm mx-auto shadow-inner">
            <p><strong className="text-blue-400">EO (Oficiales):</strong> Exámenes con mayor profundidad teórica y de ciencias. Carrera de 5 años. Jerarquía de mando.</p>
            <p><strong className="text-emerald-400">EESTP (Suboficiales):</strong> Enfoque operativo y técnico policial. Carrera más corta. Primera línea de acción.</p>
          </div>
        </div>

        {/* School Cards */}
        <div className="space-y-4">
          {schools.map((school, i) => (
            <motion.button
              key={school.id}
              initial={{ opacity: 0, x: i === 0 ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.15 }}
              onClick={() => handleSelect(school.id)}
              className={`w-full group relative overflow-hidden bg-gradient-to-r ${school.gradient} p-6 rounded-2xl border ${school.border} shadow-xl ${school.glow} transition-all duration-300 text-left`}
            >
              <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl -translate-y-1/2 translate-x-1/2" />

              <div className="relative z-10 flex items-center gap-5">
                <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm shrink-0">
                  {school.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-black mb-0.5">{school.title}</h2>
                  <p className="text-sm text-white/60 font-medium">{school.subtitle}</p>
                  <p className="text-xs text-white/40 mt-1 italic">{school.welcome}</p>
                </div>
                <ChevronRight className="w-6 h-6 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
              </div>
            </motion.button>
          ))}

        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-slate-500 uppercase tracking-widest flex items-center justify-center gap-2">
          <Shield className="w-3 h-3" /> Configuración Inicial del Sistema Guardián
        </p>
      </motion.div>
    </div>
  );
};
