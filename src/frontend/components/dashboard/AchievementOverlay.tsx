import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Star, Zap, Shield, X, Medal, BrainCircuit, Target } from 'lucide-react';
import { playEpicSuccess } from '../../utils/sounds';
import confetti from 'canvas-confetti';

interface Achievement {
  code: string;
  title: string;
  description: string;
  icon: string;
  pointsReward: number;
}

interface AchievementOverlayProps {
  unlocked: Achievement | null;
  onClose: () => void;
}

const IconMap: Record<string, React.ReactNode> = {
  Trophy: <Trophy className="w-8 h-8 text-amber-400" />,
  Star: <Star className="w-8 h-8 text-yellow-400" />,
  Zap: <Zap className="w-8 h-8 text-blue-400" />,
  Shield: <Shield className="w-8 h-8 text-emerald-400" />,
  Medal: <Medal className="w-8 h-8 text-amber-500" />,
  BrainCircuit: <BrainCircuit className="w-8 h-8 text-blue-500" />,
  Target: <Target className="w-8 h-8 text-orange-500" />,
};

export const AchievementOverlay: React.FC<AchievementOverlayProps> = ({ unlocked, onClose }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (unlocked) {
      setShow(true);
      playEpicSuccess();
      // Trigger confetti
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      // Auto close after 6 seconds
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onClose, 500);
      }, 6000);

      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    }
  }, [unlocked, onClose]);

  return (
    <AnimatePresence>
      {show && unlocked && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 1.1, opacity: 0, y: -20 }}
            className="relative max-w-sm w-full bg-slate-900 border-2 border-amber-500/50 rounded-[2.5rem] p-8 shadow-[0_0_50px_rgba(245,158,11,0.3)] overflow-hidden"
          >
            {/* Ambient Glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 bg-amber-500/20 rounded-3xl flex items-center justify-center border border-amber-500/30 shadow-lg shadow-amber-500/20 animate-pulse">
                {IconMap[unlocked.icon] || <Trophy className="w-8 h-8 text-amber-400" />}
              </div>

              <div className="space-y-2">
                <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] animate-bounce">
                  ¡LOGRO DESBLOQUEADO!
                </h3>
                <h2 className="text-2xl font-black text-white tracking-tighter uppercase">
                  {unlocked.title}
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed px-4">
                  {unlocked.description}
                </p>
              </div>

              <div className="flex items-center gap-2 px-4 py-2 bg-slate-950/50 border border-white/5 rounded-2xl">
                <Star className="w-4 h-4 text-emerald-500 fill-emerald-500" />
                <span className="text-xs font-black text-emerald-500">+{unlocked.pointsReward} PUNTOS DE MÉRITO</span>
              </div>

              <button
                onClick={() => { setShow(false); setTimeout(onClose, 500); }}
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-amber-500/20"
              >
                CONTINUAR OPERACIÓN
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
