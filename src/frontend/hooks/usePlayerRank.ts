import { useUserStore } from '../store/useUserStore';
import { Shield, ShieldCheck, Trophy, Crown, Star } from 'lucide-react';

export const RANK_THRESHOLDS = [
  { name: 'Postulante Recluta', icon: 'Shield', minPoints: 0, color: 'text-slate-400' },
  { name: 'Suboficial de Tercera', icon: 'ShieldCheck', minPoints: 500, color: 'text-blue-400' },
  { name: 'Suboficial de Segunda', icon: 'ShieldCheck', minPoints: 1500, color: 'text-cyan-400' },
  { name: 'Suboficial de Primera', icon: 'ShieldCheck', minPoints: 3000, color: 'text-emerald-400' },
  { name: 'Oficial Cadete', icon: 'Star', minPoints: 5000, color: 'text-indigo-400' },
  { name: 'Oficial Subalterno', icon: 'Trophy', minPoints: 8000, color: 'text-amber-400' },
  { name: 'Oficial Superior', icon: 'Trophy', minPoints: 12000, color: 'text-orange-400' },
  { name: 'General de División', icon: 'Crown', minPoints: 20000, color: 'text-red-500' }
];

export const usePlayerRank = () => {
  const { honorPoints, meritPoints } = useUserStore();
  const totalPoints = (honorPoints || 0) + (meritPoints || 0);

  let currentRank = RANK_THRESHOLDS[0];
  let nextRankPoints = null;
  let currentRankIndex = 0;

  for (let i = 0; i < RANK_THRESHOLDS.length; i++) {
    if (totalPoints >= RANK_THRESHOLDS[i].minPoints) {
      currentRank = RANK_THRESHOLDS[i];
      currentRankIndex = i;
    } else {
      nextRankPoints = RANK_THRESHOLDS[i].minPoints;
      break;
    }
  }

  const progressToNext = nextRankPoints 
    ? ((totalPoints - currentRank.minPoints) / (nextRankPoints - currentRank.minPoints)) * 100 
    : 100;

  return {
    rankName: currentRank.name,
    rankIcon: currentRank.icon,
    rankColor: currentRank.color,
    totalPoints,
    nextRankPoints,
    progressToNext,
    isMaxRank: !nextRankPoints
  };
};
