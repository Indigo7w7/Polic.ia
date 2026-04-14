import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { FileText, Clock, Lock, Play, CheckCircle2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { isExamUnlocked } from '../../../database/data/examenes_config';

interface ExamTrackProps {
  examList: any[];
  trackLabel: string;
  trackIcon: React.ReactNode;
  isPremium: boolean;
  examProgress: any;
  startingExam: boolean;
  onStartLevel: (level: any) => void;
}

export const ExamTrack: React.FC<ExamTrackProps> = ({
  examList,
  trackLabel,
  trackIcon,
  isPremium,
  examProgress,
  startingExam,
  onStartLevel
}) => {
  const navigate = useNavigate();

  return (
    <div className="relative w-full rounded-[2.5rem] overflow-hidden border-2 border-slate-800 shadow-2xl pb-16">
      {/* THEMATIC BACKGROUND */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#3a1304] via-[#064e3b] to-[#0f172a] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none" />
      
      {/* Central Ascensor Beam */}
      <div className="absolute top-10 bottom-10 left-1/2 w-1.5 -translate-x-1/2 bg-gradient-to-b from-orange-500/50 via-emerald-500/30 to-blue-500/30 shadow-[0_0_15px_rgba(255,255,255,0.2)] rounded-full z-0" />

      {/* Header */}
      <div className="relative z-20 p-6 flex justify-between items-center bg-black/40 backdrop-blur-md border-b border-white/5 mb-8">
         <p className="text-[11px] font-black uppercase tracking-[0.25em] text-white/90 flex items-center gap-3">
           {trackIcon} {trackLabel}
         </p>
         {!isPremium && (
           <span className="bg-amber-500/20 border border-amber-500/50 text-amber-400 px-3 py-1 rounded-xl text-[9px] font-black uppercase shadow-[0_0_15px_rgba(245,158,11,0.2)]">
             Rango PRO Requerido
           </span>
         )}
      </div>

      <div className="relative z-10 w-full flex flex-col items-center gap-16 px-4">
        {examList.map((level, idx) => {
          const levelId = level.id.toString();
          const unlocked = level.isDemo || (isPremium && isExamUnlocked(examList as any, idx, examProgress));
          const progress = examProgress[levelId];
          const isLocked = !level.isDemo && !isPremium;
          const needsPreviousPass = !level.isDemo && isPremium && !isExamUnlocked(examList as any, idx, examProgress);
          
          const isPassed = progress?.passed;
          const isCurrent = unlocked && !isPassed;

          let ringColor = 'border-slate-800 bg-slate-900';
          let iconColor = 'text-slate-600';
          
          if (isPassed) {
             ringColor = 'border-yellow-400 bg-yellow-500 shadow-[0_0_30px_rgba(250,204,21,0.6)]';
             iconColor = 'text-yellow-950';
          } else if (isCurrent) {
             ringColor = 'border-white bg-[#020617] border-[3px] border-dashed animate-[spin_10s_linear_infinite] shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-110';
             iconColor = 'text-white';
          }

          const nodeOffsetX = idx % 2 === 0 ? '-28%' : '28%';
          const desktopOffsetX = idx % 2 === 0 ? '-35%' : '35%';
          
          return (
            <motion.div
              key={level.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              className="relative flex flex-col items-center w-full max-w-[260px] sm:max-w-[320px]"
              style={{ transform: `translateX(${window.innerWidth < 640 ? nodeOffsetX : desktopOffsetX})` }}
            >
              <button
                onClick={() => {
                  if (isLocked) { navigate('/yape-checkout'); return; }
                  if (needsPreviousPass) { toast.info('Aprueba el examen anterior con nota >= 11 para desbloquear este.'); return; }
                  onStartLevel(level);
                }}
                disabled={startingExam}
                className="group flex flex-col items-center transition-all duration-300"
              >
                <div className="relative">
                   <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-[5px] flex items-center justify-center transition-all duration-300 relative z-20 ${ringColor}`}>
                      <div className={`${isCurrent ? 'animate-[spin_-10s_linear_infinite]' : ''}`}>
                         {isPassed ? <CheckCircle2 className={`w-8 h-8 ${iconColor}`} /> : isLocked || needsPreviousPass ? <Lock className={`w-6 h-6 ${iconColor}`} /> : <Play className={`w-8 h-8 fill-white ml-2 ${iconColor}`} />}
                      </div>
                   </div>
                   
                   <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-800 px-3 py-1 rounded-full whitespace-nowrap z-30 shadow-xl">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Nivel {level.level}</span>
                   </div>
                </div>

                <div className={`mt-6 w-48 sm:w-56 p-4 rounded-2xl border backdrop-blur-xl transition-all duration-500 scale-95 group-hover:scale-100 ${
                   isCurrent ? 'bg-white/10 border-white/30 shadow-2xl' : 'bg-black/40 border-slate-800'
                }`}>
                   <h3 className={`text-xs sm:text-sm font-black text-center mb-2 leading-tight ${isCurrent ? 'text-white' : 'text-slate-400'}`}>
                     {level.title}
                   </h3>
                   <div className="flex justify-center items-center gap-3">
                     <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                       <FileText size={10} /> {level.totalPreguntas || 20} R.
                     </span>
                     <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                       <Clock size={10} /> {(level as any).tiempoLimite || 30}'
                     </span>
                   </div>
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>
      
      {/* End of Line Indicator */}
       <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full border-2 border-slate-800 bg-slate-950 flex items-center justify-center z-10">
         <Star className="w-5 h-5 text-slate-700" />
       </div>
    </div>
  );
};
