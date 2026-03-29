import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../store/useUserStore';
import { auth } from '@/src/firebase';
import { Shield, Trophy, Zap, LogOut } from 'lucide-react';
import { trpc } from '../../../shared/utils/trpc';

interface HeaderProps {
  showSchoolSelector?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ showSchoolSelector = true }) => {
  const navigate = useNavigate();
  const { role, isPremiumActive, modalidad_postulacion, photoURL, name } = useUserStore();
  const isPremium = isPremiumActive();
  
  const activeCountQuery = trpc.admin.getActiveCount.useQuery(undefined, {
    refetchInterval: 30000,
    refetchOnWindowFocus: true
  });

  const handleLogout = async () => {
    await auth.signOut();
    useUserStore.getState().setUserData({
      uid: null,
      role: 'user',
      estado_financiero: 'FREE',
      modalidad_postulacion: null,
      fecha_expiracion_premium: null,
    });
    navigate('/login');
  };

  const welcomeTitle = typeof name === 'string' && name !== 'Invitado' 
    ? (modalidad_postulacion === 'EO' ? `¡Adelante, Futuro Cadete ${name.split(' ')[0]}!` : modalidad_postulacion === 'EESTP' ? `¡Vamos con todo, Futuro Alumno PNP ${name.split(' ')[0]}!` : `Bienvenido, ${name.split(' ')[0]}`) 
    : 'Panel de Oficial';

  return (
    <header className="max-w-7xl mx-auto flex items-center justify-between mb-8 border-b-2 border-slate-800/60 pb-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/perfil')} className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 overflow-hidden border-2 border-blue-500/50 hover:scale-105 transition-transform">
          {photoURL ? (
            <img src={photoURL} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-slate-800 flex items-center justify-center">
              <Shield className="w-6 h-6 text-slate-400" />
            </div>
          )}
        </button>
        <div>
          <h1 className="text-xl font-black tracking-tight text-white">POLIC<span className="text-blue-500">.</span>ia</h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{welcomeTitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Real-time Online Counter */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">
            {activeCountQuery.data?.count || 1} Activos
          </span>
        </div>

        {showSchoolSelector && modalidad_postulacion && (
          <button onClick={() => navigate('/seleccionar-escuela')} className="text-[9px] text-slate-500 hover:text-white uppercase tracking-widest font-bold transition-colors">
            Cambiar Escuela
          </button>
        )}
        
        {role !== 'admin' && (
          <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border transition-all duration-500 ${
            isPremium
              ? 'bg-amber-500 text-slate-900 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-pulse'
              : 'bg-slate-800 text-slate-500 border-slate-700'
          }`}>
            {isPremium ? (
              <>
                <Trophy className="w-3.5 h-3.5 fill-current" />
                <span>AGENTE ÉLITE</span>
              </>
            ) : (
              <>
                <Zap className="w-3 h-3 text-slate-500" />
                <span>Rango Base</span>
              </>
            )}
          </div>
        )}
        
        {role === 'admin' && (
          <div className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 bg-red-500/10 text-red-500 border border-red-500/30">
            <Shield className="w-3 h-3" /> ADMIN
          </div>
        )}

        <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-800/50" title="Cerrar Sesión">
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
