import React from 'react';
import { Shield, ShieldCheck, Trophy, Crown, Star, Medal } from 'lucide-react';

interface RankShieldProps {
  rankName: string;
  rankIcon: string;
  rankColor: string;
  size?: number;
  className?: string;
}

export const RankShield: React.FC<RankShieldProps> = ({ rankName, rankIcon, rankColor, size = 24, className = "" }) => {
  const getIcon = () => {
    switch (rankIcon) {
      case 'Shield': return <Shield size={size} />;
      case 'ShieldCheck': return <ShieldCheck size={size} />;
      case 'Star': return <Star size={size} />;
      case 'Trophy': return <Trophy size={size} />;
      case 'Crown': return <Crown size={size} />;
      default: return <Medal size={size} />;
    }
  };

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <div className={`p-2 rounded-xl bg-slate-900 border-2 border-slate-800 shadow-lg ${rankColor} shadow-${rankColor}/10`}>
        {getIcon()}
      </div>
      <span className={`text-[10px] font-black uppercase tracking-widest text-center ${rankColor}`}>
        {rankName}
      </span>
    </div>
  );
};
