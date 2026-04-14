import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone } from 'lucide-react';

interface BroadcastAlertProps {
  data: {
    message: string;
    id: any;
  } | null;
  visible: boolean;
}

export const BroadcastAlert: React.FC<BroadcastAlertProps> = ({ data, visible }) => {
  return (
    <AnimatePresence>
      {data && visible && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }} 
          animate={{ height: 'auto', opacity: 1 }} 
          exit={{ height: 0, opacity: 0 }} 
          className="overflow-hidden"
        >
          <div className="flex items-center gap-3 p-4 bg-red-950/20 border border-red-500/30 rounded-2xl mb-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
            <div className="relative z-10 w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5 text-red-500 animate-bounce" />
            </div>
            <div className="relative z-10 flex-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Mensaje del Mando Central</span>
              <p className="text-sm font-bold text-red-100 italic">"{data.message}"</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
