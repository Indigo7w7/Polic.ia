import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ChevronRight } from 'lucide-react';

interface ActivityFeedProps {
  fsrsStats: {
    count: number;
    newCount: number;
    learningCount: number;
    reviewCount: number;
  };
  examCount: number;
  leitnerCount: number;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ fsrsStats, examCount, leitnerCount }) => {
  const navigate = useNavigate();
  const pendingCount = (fsrsStats.newCount || 0) + (fsrsStats.learningCount || 0) + (fsrsStats.reviewCount || 0);

  return (
    <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-[2rem]">
      <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 mb-4 flex items-center gap-2">
        <Zap className="w-3 h-3 text-amber-400" /> ACTIVIDAD HOY
      </p>
      
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Flashcards pending */}
        <button
          onClick={() => navigate('/poligono')}
          className="flex flex-col items-center justify-center p-4 sm:p-5 bg-slate-950/40 border border-slate-800 rounded-[1.5rem] sm:rounded-2xl hover:border-blue-700 transition-all group"
        >
          <span className="text-xl sm:text-2xl font-black text-blue-400">{pendingCount}</span>
          <span className="text-[7.5px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1.5 group-hover:text-blue-600 transition-colors">Repasos</span>
          <span className="text-[7px] text-slate-700 uppercase font-bold">Pendientes</span>
        </button>
        
        {/* Exams performed */}
        <button
          onClick={() => navigate('/simulador')}
          className="flex flex-col items-center justify-center p-4 sm:p-5 bg-slate-950/40 border border-slate-800 rounded-[1.5rem] sm:rounded-2xl hover:border-emerald-700 transition-all group"
        >
          <span className="text-xl sm:text-2xl font-black text-emerald-400">{examCount}</span>
          <span className="text-[7.5px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1.5 group-hover:text-emerald-600 transition-colors">Evaluación</span>
          <span className="text-[7px] text-slate-700 uppercase font-bold">Realizadas</span>
        </button>
        
        {/* FSRS Retention */}
        <button
          onClick={() => navigate('/poligono')}
          className="flex flex-col items-center justify-center p-4 sm:p-5 bg-slate-950/40 border border-slate-800 rounded-[1.5rem] sm:rounded-2xl hover:border-purple-700 transition-all group"
        >
          <span className="text-xl sm:text-2xl font-black text-purple-400">{leitnerCount}</span>
          <span className="text-[7.5px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1.5 group-hover:text-purple-600 transition-colors">Memoria</span>
          <span className="text-[7px] text-slate-700 uppercase font-bold">Guardadas</span>
        </button>
      </div>
      
      {/* Urgency Alert */}
      {fsrsStats.count > 0 && (
        <button
          onClick={() => navigate('/poligono')}
          className="w-full mt-3 flex items-center justify-between p-3 bg-blue-950/20 border border-blue-800/30 rounded-xl hover:bg-blue-950/40 transition-all"
        >
          <span className="text-[9px] font-black text-blue-400 uppercase">
            ⚡ {fsrsStats.count} tarjetas listas para repasar
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-blue-500" />
        </button>
      )}
    </div>
  );
};
