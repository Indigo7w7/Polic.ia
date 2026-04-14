import React from 'react';
import { motion } from 'motion/react';

export const MetricProgress: React.FC<any> = ({ label, value, max = 100, unit = '', icon: Icon, colorClass }) => {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-1.5 text-slate-500 uppercase font-black text-[8px] tracking-[0.2em]">
          <Icon className={`w-2.5 h-2.5 ${colorClass}`} />
          {label}
        </div>
        <span className="text-[9px] font-bold text-slate-400 font-mono">{value}{unit}</span>
      </div>
      <div className="h-1 bg-slate-950 rounded-full overflow-hidden border border-white/5">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={`h-full ${colorClass.replace('text', 'bg')} shadow-[0_0_8px_rgba(59,130,246,0.1)]`}
        />
      </div>
    </div>
  );
};
