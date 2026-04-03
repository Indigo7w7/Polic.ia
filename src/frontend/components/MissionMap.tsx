import React from 'react';
import { motion } from 'motion/react';
import { Lock, Medal, Target, Star } from 'lucide-react';

interface Unit {
  id: number;
  title: string;
  level: number | null;
  score?: number;
  questions?: unknown[];
}

interface MissionMapProps {
  units: Unit[];
  completedUnits: Set<number>;
  onSelectUnit: (unit: Unit) => void;
  areaName: string;
  isPremium?: boolean; // BUG-02 partial fix: receive premium status
}

// BUG-09 FIX: removed the dead `getStatus` function that was defined but never called.
// The status logic now lives inline where it's used, cleanly.

export const MissionMap: React.FC<MissionMapProps> = ({
  units,
  completedUnits,
  onSelectUnit,
  areaName,
  isPremium = false,
}) => {
  // Sort units by level, then by id as tiebreaker
  const sortedUnits = [...units].sort(
    (a, b) => (a.level || 0) - (b.level || 0) || a.id - b.id
  );

  if (sortedUnits.length === 0) {
    return (
      <div className="text-center py-20 text-slate-600 text-sm font-mono uppercase tracking-widest">
        Sin misiones disponibles en este sector.
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-md mx-auto py-12 px-4 pb-32">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-full bg-blue-500/5 blur-[120px] pointer-events-none" />

      {/* Area Title Badge */}
      <div className="flex flex-col items-center mb-16 relative">
        <div className="px-6 py-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-blue-400">{areaName}</h2>
        </div>
        <div className="w-px h-10 bg-gradient-to-b from-blue-500 to-transparent mt-2" />
      </div>

      <div className="relative space-y-20">
        {sortedUnits.map((unit, idx) => {
          const prevUnit = idx > 0 ? sortedUnits[idx - 1] : null;
          const isUnlocked = idx === 0 || (prevUnit !== null && completedUnits.has(prevUnit.id));
          const isCompleted = completedUnits.has(unit.id);

          // BUG-02 partial fix: premium lock on levels > 1
          const isPremiumLocked = !isPremium && (unit.level || 1) > 1;
          const isLocked = isPremiumLocked || (!isCompleted && !isUnlocked);

          const status: 'PASSED' | 'CURRENT' | 'LOCKED' =
            isCompleted ? 'PASSED' : isLocked ? 'LOCKED' : 'CURRENT';

          // Zigzag offset
          const justify = idx % 2 === 0 ? 'justify-start' : 'justify-end';

          const hasDrill = Array.isArray(unit.questions) && unit.questions.length > 0;

          return (
            <div key={unit.id} className={`relative flex ${justify} w-full`}>
              {/* Connecting Line */}
              {idx < sortedUnits.length - 1 && (
                <div className="absolute top-16 h-24 w-1 bg-slate-800 left-1/2 -translate-x-1/2 z-0 overflow-hidden rounded-full">
                  {isCompleted && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: '100%' }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="w-full bg-gradient-to-b from-blue-500 to-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                    />
                  )}
                </div>
              )}

              <motion.button
                whileHover={status !== 'LOCKED' ? { scale: 1.05 } : {}}
                whileTap={status !== 'LOCKED' ? { scale: 0.95 } : {}}
                disabled={status === 'LOCKED'}
                onClick={() => {
                  if (isPremiumLocked) {
                    // Navigate to upgrade — handled by parent via onSelectUnit with a sentinel
                    return;
                  }
                  onSelectUnit(unit);
                }}
                className="relative z-10 group focus:outline-none"
                aria-label={`Misión: ${unit.title} — Estado: ${status}`}
              >
                <div className="flex flex-col items-center gap-3">
                  {/* Node Bubble */}
                  <div
                    className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-[32px] border-4 flex items-center justify-center shadow-2xl transition-all duration-300 ${
                      status === 'PASSED'
                        ? 'bg-gradient-to-br from-yellow-400 to-amber-600 border-yellow-200'
                        : status === 'CURRENT'
                        ? 'bg-blue-600 border-blue-400 shadow-[0_0_30px_rgba(37,99,235,0.4)]'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    {status === 'PASSED' && <Medal className="w-10 h-10 text-yellow-950" />}
                    {status === 'CURRENT' && (
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 1.8 }}
                      >
                        <Target className="w-10 h-10 text-white" />
                      </motion.div>
                    )}
                    {status === 'LOCKED' && <Lock className="w-8 h-8 text-slate-700" />}

                    {/* Level Badge */}
                    <div
                      className={`absolute -top-3 -right-3 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase border-2 ${
                        status === 'PASSED'
                          ? 'bg-yellow-900 border-yellow-500 text-yellow-400'
                          : status === 'CURRENT'
                          ? 'bg-blue-900 border-blue-500 text-blue-400'
                          : 'bg-slate-950 border-slate-700 text-slate-600'
                      }`}
                    >
                      Nv.{unit.level || idx + 1}
                    </div>

                    {/* Drill indicator */}
                    {hasDrill && status === 'CURRENT' && (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-blue-600 rounded-full text-[8px] font-black text-white tracking-widest whitespace-nowrap">
                        DRILL
                      </div>
                    )}
                  </div>

                  {/* Title Label — BUG-10 FIX: show full title, not sliced */}
                  <div className="text-center max-w-[130px]">
                    <h4
                      className={`text-[10px] font-bold uppercase tracking-tight leading-tight line-clamp-2 ${
                        status === 'LOCKED' ? 'text-slate-700' : 'text-slate-200'
                      }`}
                    >
                      {unit.title}
                    </h4>
                    {isPremiumLocked && (
                      <span className="text-[8px] text-amber-500 font-black uppercase tracking-widest">PRO</span>
                    )}
                  </div>
                </div>
              </motion.button>
            </div>
          );
        })}
      </div>

      <div className="mt-20 text-center">
        <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.3em]">
          Fin del Perímetro de Entrenamiento
        </p>
      </div>
    </div>
  );
};
