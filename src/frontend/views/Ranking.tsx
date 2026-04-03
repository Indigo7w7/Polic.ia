import React from 'react';
import { trpc } from '../../shared/utils/trpc';
import { 
  Trophy, Medal, Shield, Star, 
  ChevronRight, ArrowLeft, Zap, User
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

const getRankDetails = (honor: number, merit: number) => {
  const total = (honor || 0) + (merit || 0);
  if (total >= 5000) return { title: 'General de Policía', color: 'text-yellow-400', badge: <Star className="w-4 h-4" /> };
  if (total >= 2500) return { title: 'Comisario Maestro', color: 'text-purple-400', badge: <Shield className="w-4 h-4" /> };
  if (total >= 1000) return { title: 'Oficial de Élite', color: 'text-blue-400', badge: <Medal className="w-4 h-4" /> };
  if (total >= 500) return { title: 'Suboficial Superior', color: 'text-emerald-400', badge: <Zap className="w-4 h-4" /> };
  return { title: 'Recluta en Formación', color: 'text-slate-400', badge: <ChevronRight className="w-4 h-4" /> };
};

export const Ranking: React.FC = () => {
  const navigate = useNavigate();
  const [schoolFilter, setSchoolFilter] = React.useState<'EO' | 'EESTP' | undefined>(undefined);
  const rankingQuery = trpc.user.getRanking.useQuery({ school: schoolFilter });

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20 font-sans">
      {/* Header Premium */}
      <div className="relative h-72 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/60 to-slate-950 z-10" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30" />
        
        {/* Animated Background Pulse */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] animate-pulse" />

        <div className="relative z-20 max-w-5xl mx-auto px-6 pt-12 flex flex-col items-center text-center">
          <button 
            onClick={() => navigate('/')}
            className="absolute left-6 top-12 p-3 bg-slate-900/80 rounded-2xl border border-slate-700 text-slate-400 hover:text-white transition-all hover:scale-110 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            className="p-5 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-3xl shadow-[0_0_40px_rgba(245,158,11,0.3)] mb-6"
          >
            <Trophy className="w-14 h-14 text-yellow-950" />
          </motion.div>
          
          <h1 className="text-4xl font-black uppercase tracking-tighter italic bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Salón del Honor</h1>
          <p className="text-blue-400 text-[10px] uppercase tracking-[0.4em] font-black mt-3">Escalafón General de Oficiales Investigadores</p>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 -mt-16 relative z-30">
        {/* Filtros Tácticos */}
        <div className="flex gap-2 p-1.5 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl mb-6 w-fit mx-auto">
          {[
            { id: undefined, label: 'GENERAL', color: 'bg-blue-600' },
            { id: 'EO', label: 'OFICIALES', color: 'bg-cyan-600' },
            { id: 'EESTP', label: 'TÉCNICA', color: 'bg-emerald-600' }
          ].map((f) => (
            <button 
              key={f.label}
              onClick={() => setSchoolFilter(f.id as any)}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                schoolFilter === f.id 
                  ? `${f.color} text-white shadow-lg shadow-blue-900/20 scale-105` 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800/50 rounded-[40px] overflow-hidden shadow-2xl">
          {/* Podio de Honor (Top 3) */}
          <div className="p-10 border-b border-slate-800/50 grid grid-cols-3 gap-4 items-end pb-14 bg-gradient-to-b from-blue-900/10 to-transparent">
            {rankingQuery.data?.slice(0, 3).map((user, idx) => {
              const order = [1, 0, 2]; // 2nd, 1st, 3rd position
              const currentUser = rankingQuery.data?.[order[idx]];
              if (!currentUser) return <div key={idx} />;
              
              const isFirst = order[idx] === 0;
              const points = (currentUser.honorPoints || 0) + (currentUser.meritPoints || 0);

              return (
                <motion.div 
                  key={currentUser.uid}
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: order[idx] * 0.15 }}
                  className={`flex flex-col items-center space-y-4 ${isFirst ? 'scale-125 mb-6' : ''}`}
                >
                  <div className="relative">
                    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-[24px] border-4 rotate-3 overflow-hidden shadow-2xl transition-transform hover:rotate-0 ${
                      isFirst ? 'border-yellow-500 bg-yellow-500/10' : order[idx] === 1 ? 'border-slate-300 bg-slate-300/10' : 'border-amber-700 bg-amber-700/10'
                    }`}>
                      <img 
                        src={currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.name}`} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className={`absolute -bottom-3 -right-3 w-10 h-10 rounded-2xl flex items-center justify-center font-black border-4 rotate-12 ${
                      isFirst ? 'bg-yellow-500 border-yellow-800 text-yellow-950 text-base' : 'bg-slate-800 border-slate-900 text-white text-sm'
                    }`}>
                      {order[idx] + 1}
                    </div>
                  </div>
                  <div className="text-center px-2">
                    <p className="text-[10px] font-black uppercase tracking-tighter truncate w-24 text-white">
                      {currentUser.name?.split(' ')[0] || 'Oficial'}
                    </p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <p className="text-xs font-black text-blue-400">{points}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Listado de Escalafón */}
          <div className="divide-y divide-slate-800/30">
            {rankingQuery.isLoading ? (
               <div className="p-20 text-center space-y-4">
                 <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                 <p className="text-slate-500 uppercase font-black text-[10px] tracking-[0.3em]">Sincronizando Base de Datos...</p>
               </div>
            ) : rankingQuery.data?.slice(3).map((user, idx) => {
              const rank = getRankDetails(user.honorPoints || 0, user.meritPoints || 0);
              const totalPoints = (user.honorPoints || 0) + (user.meritPoints || 0);
              
              return (
                <motion.div 
                  key={user.uid}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className="p-5 flex items-center justify-between hover:bg-blue-600/5 transition-all group border-l-4 border-transparent hover:border-blue-500"
                >
                  <div className="flex items-center gap-5">
                    <span className="text-sm font-black text-slate-700 w-6 italic">#{(idx + 4).toString().padStart(2, '0')}</span>
                    <div className="relative group-hover:scale-110 transition-transform">
                      <img 
                        src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} 
                        alt="" 
                        className="w-12 h-12 rounded-2xl border-2 border-slate-800 bg-slate-900"
                      />
                      <div className="absolute -top-2 -right-2 bg-slate-950 rounded-xl p-1 border border-slate-800 shadow-xl">
                        {rank.badge}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-200 group-hover:text-white transition-colors uppercase tracking-tight">{user.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg bg-white/5 ${rank.color}`}>
                          {rank.title}
                        </span>
                        <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{user.school || 'POSTULANTE'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-xl font-black text-white italic">{totalPoints}</span>
                      <Shield className="w-4 h-4 text-blue-500 fill-blue-500/20" />
                    </div>
                    <p className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter">Mérito Consolidado</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-4">
           <div className="p-4 bg-blue-900/10 border border-blue-900/20 rounded-2xl text-center max-w-sm">
             <p className="text-[10px] text-blue-400 font-bold leading-relaxed">
               "El honor no se compra, se gana con cada simulacro, con cada lección y con cada acierto bajo presión."
             </p>
           </div>
           <p className="text-[9px] text-slate-600 uppercase font-black tracking-[0.3em]">Polic.ia Security Verified</p>
        </div>
      </main>
    </div>
  );
};
