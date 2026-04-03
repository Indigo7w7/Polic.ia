import React from 'react';
import { trpc } from '../../shared/utils/trpc';
import { 
  Trophy, Medal, Shield, Star, 
  ChevronRight, ArrowLeft, Zap, Range
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

const getRankDetails = (points: number) => {
  if (points >= 5000) return { title: 'General de Policía', color: 'text-yellow-400', badge: <Star className="w-4 h-4" /> };
  if (points >= 2500) return { title: 'Comisario Maestro', color: 'text-purple-400', badge: <Shield className="w-4 h-4" /> };
  if (points >= 1000) return { title: 'Oficial de Élite', color: 'text-blue-400', badge: <Medal className="w-4 h-4" /> };
  if (points >= 500) return { title: 'Suboficial Superior', color: 'text-emerald-400', badge: <Zap className="w-4 h-4" /> };
  return { title: 'Recluta en Formación', color: 'text-slate-400', badge: <ChevronRight className="w-4 h-4" /> };
};

export const Leaderboard: React.FC = () => {
  const navigate = useNavigate();
  const leaderboardQuery = trpc.learningProgress.getLeaderboard.useQuery();

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      {/* Header */}
      <div className="relative h-64 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/40 to-slate-950 z-10" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
        
        <div className="relative z-20 max-w-5xl mx-auto px-6 pt-12 flex flex-col items-center text-center">
          <button 
            onClick={() => navigate(-1)}
            className="absolute left-6 top-12 p-2 bg-slate-900/50 rounded-full border border-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-4 bg-yellow-500/20 rounded-full border border-yellow-500/30 mb-4"
          >
            <Trophy className="w-12 h-12 text-yellow-500" />
          </motion.div>
          
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">Salón del Honor</h1>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-bold mt-2">Ranking Global de Oficiales Investigadores</p>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 -mt-12 relative z-30">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-[32px] overflow-hidden shadow-2xl">
          {/* Top 3 Podio Visual */}
          <div className="p-8 border-b border-slate-800 grid grid-cols-3 gap-2 items-end pb-12">
            {leaderboardQuery.data?.slice(0, 3).map((user, idx) => {
              const order = [1, 0, 2]; // For layout: 2nd, 1st, 3rd
              const currentUser = leaderboardQuery.data?.[order[idx]];
              if (!currentUser) return null;
              
              const isFirst = order[idx] === 0;
              const rank = getRankDetails(currentUser.honorPoints || 0);

              return (
                <motion.div 
                  key={currentUser.uid}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: order[idx] * 0.1 }}
                  className={`flex flex-col items-center space-y-3 ${isFirst ? 'scale-110 mb-4' : ''}`}
                >
                  <div className="relative">
                    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 overflow-hidden shadow-2xl ${
                      isFirst ? 'border-yellow-500' : order[idx] === 1 ? 'border-slate-300' : 'border-amber-700'
                    }`}>
                      <img 
                        src={currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.name}`} 
                        alt={currentUser.name || 'User'} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center font-black border-2 ${
                      isFirst ? 'bg-yellow-500 border-yellow-700 text-yellow-950' : 'bg-slate-800 border-slate-700 text-white'
                    }`}>
                      {order[idx] + 1}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-tighter truncate w-20">{currentUser.name || 'Desconocido'}</p>
                    <p className="text-xs font-black text-blue-400">{currentUser.honorPoints} <span className="text-[8px] text-slate-500 uppercase">Honor</span></p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Listado Completo */}
          <div className="divide-y divide-slate-800/50">
            {leaderboardQuery.isLoading ? (
               <div className="p-20 text-center animate-pulse text-slate-500 uppercase font-black text-[10px] tracking-[0.3em]">
                 Sincronizando Base de Datos...
               </div>
            ) : leaderboardQuery.data?.slice(3).map((user, idx) => {
              const rank = getRankDetails(user.honorPoints || 0);
              return (
                <motion.div 
                  key={user.uid}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-black text-slate-600 w-4">{idx + 4}</span>
                    <div className="relative">
                      <img 
                        src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} 
                        alt="" 
                        className="w-10 h-10 rounded-xl border border-slate-700"
                      />
                      <div className="absolute -top-1 -right-1 bg-slate-900 rounded-full p-0.5 border border-slate-800">
                        {rank.badge}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tighter">{user.name}</h4>
                      <p className={`text-[9px] font-black uppercase tracking-widest ${rank.color}`}>{rank.title}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-white italic">{user.honorPoints}</p>
                    <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Puntos de Honor</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <p className="text-center text-[9px] text-slate-500 uppercase font-black tracking-[0.2em] mt-12 mb-8">
          Actualizado en tiempo real según el Banco de Datos Central
        </p>
      </main>
    </div>
  );
};
