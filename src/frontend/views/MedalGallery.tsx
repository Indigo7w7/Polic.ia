import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ArrowLeft, Trophy, Star, Zap, Shield, 
  Lock, CheckCircle2, Medal, Info, Target, BrainCircuit
} from 'lucide-react';
import { trpc } from '../../shared/utils/trpc';
import { useUserStore } from '../store/useUserStore';

const AchievementIconMap: Record<string, any> = {
  'FIRST_EXAM': Zap,
  'FLASH_50': Medal,
  'FLASH_500': Star,
  'ELITE_OFFICER': Target,
  'PERFECT_EXAM': Trophy,
  'STREAK_7': Shield,
  'SCENARIO_5': BrainCircuit,
  'INTERVIEW_ACE': Star,
};

const CategoryStyles: Record<string, string> = {
  'EXAM': 'from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-400',
  'LEITNER': 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400',
  'SOCIAL': 'from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400',
  'STREAK': 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
  'GENERAL': 'from-slate-500/20 to-slate-700/10 border-slate-500/30 text-slate-400',
};

export const MedalGallery: React.FC = () => {
  const navigate = useNavigate();
  const { uid } = useUserStore();
  
  const { data: achievements, isLoading } = trpc.gamification.getAchievements.useQuery(undefined, {
    enabled: !!uid,
    staleTime: 30000,
  });

  const unlockedCount = achievements?.filter(a => a.isUnlocked).length || 0;
  const totalCount = achievements?.length || 0;
  const progress = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;
  const totalPoints = achievements?.filter(a => a.isUnlocked).reduce((acc, curr) => acc + (curr.pointsReward || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-8 font-sans relative overflow-hidden">
      {/* Background patterns */}
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(30,58,138,0.15),transparent_70%)] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 pb-12 relative z-10">
        <header className="flex flex-col lg:flex-row items-center justify-between gap-6 p-8 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/[0.05] rounded-full blur-[80px] pointer-events-none" />
          
          <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
            <button
              onClick={() => navigate('/')}
              className="p-4 bg-slate-950 border border-white/5 rounded-3xl text-slate-500 hover:text-white transition-all hover:scale-105"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <div className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] mb-1">
                Servicio de Inteligencia_
              </div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Sala de Condecoraciones</h1>
            </div>
          </div>

          <div className="flex gap-4 items-center">
            <div className="flex flex-col items-end bg-slate-950/50 border border-white/5 p-4 rounded-3xl min-w-[140px]">
               <div className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Puntos de Hito</div>
               <div className="text-xl font-black text-amber-500 font-mono">+{totalPoints} PM</div>
            </div>
            
            <div className="flex flex-col items-end bg-slate-950/50 border border-white/5 p-4 rounded-3xl min-w-[200px]">
               <div className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Progresión de Carrera</div>
               <div className="flex items-center gap-3 w-full">
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                     <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                     />
                  </div>
                  <span className="text-xs font-black text-white font-mono">{Math.round(progress)}%</span>
               </div>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-56 bg-slate-900/40 border border-slate-800 rounded-[2rem]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {achievements?.map((achievement, idx) => {
              const Icon = AchievementIconMap[achievement.code] || Trophy;
              const style = CategoryStyles[achievement.category] || CategoryStyles['GENERAL'];
              
              return (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`group relative p-7 bg-slate-900/40 border border-slate-800 rounded-[2.2rem] overflow-hidden transition-all duration-500 ${
                    achievement.isUnlocked 
                      ? 'hover:border-amber-500/50 hover:bg-slate-900/60 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]' 
                      : 'opacity-50 grayscale contrast-[0.8]'
                  }`}
                >
                  {/* Category Badge */}
                  <div className={`absolute top-5 right-5 px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest bg-gradient-to-br ${style}`}>
                    {achievement.category}
                  </div>

                  <div className="flex flex-col items-center text-center space-y-5 pt-4">
                    <div className="relative">
                        {achievement.isUnlocked && (
                            <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                                className="absolute -inset-4 bg-amber-500/10 rounded-full blur-xl scale-150"
                            />
                        )}
                        <div className={`w-20 h-20 rounded-[1.8rem] flex items-center justify-center border-2 transition-all duration-700 group-hover:rotate-6 group-hover:scale-110 relative z-10 ${
                        achievement.isUnlocked 
                            ? 'bg-gradient-to-br from-amber-400/20 to-amber-600/10 border-amber-500/30 text-amber-500 shadow-[0_10px_20px_rgba(245,158,11,0.15)]' 
                            : 'bg-slate-800/50 border-slate-700 text-slate-600'
                        }`}>
                        {achievement.isUnlocked ? <Icon className="w-10 h-10" /> : <Lock className="w-9 h-9" />}
                        </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-lg font-black text-white tracking-tighter uppercase leading-none group-hover:text-amber-400 transition-colors">
                        {achievement.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 leading-snug font-medium px-1">
                        {achievement.description}
                      </p>
                    </div>

                    {achievement.isUnlocked ? (
                      <div className="flex flex-col items-center gap-2">
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">Misión Cumplida</span>
                          </div>
                          <span className="text-[10px] text-slate-600 font-mono">{new Date(achievement.unlockedAt!).toLocaleDateString()}</span>
                      </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/50 border border-white/5 rounded-full">
                          <Info className="w-3 h-3 text-slate-500" />
                          <span className="text-[9px] font-black text-slate-500 uppercase">Sin Clasificar</span>
                        </div>
                    )}
                  </div>

                  {/* Points display footer */}
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-800 overflow-hidden">
                     {achievement.isUnlocked && (
                         <div className="h-full bg-amber-500 w-full opacity-30 shadow-[0_0_10px_rgba(245,158,11,1)]" />
                     )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {totalCount === 0 && !isLoading && (
          <div className="py-24 text-center space-y-6 bg-slate-900/20 border border-dashed border-slate-800 rounded-[3rem]">
            <div className="w-24 h-24 bg-slate-900 border border-slate-800 rounded-[2rem] flex items-center justify-center mx-auto text-slate-700">
              <Medal className="w-12 h-12" />
            </div>
            <div className="space-y-1">
                <p className="text-white text-lg font-black uppercase tracking-tight">Registro de Honor Vacío</p>
                <p className="text-slate-500 text-sm font-medium">Aún no hay condecoraciones registradas para tu rango.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
