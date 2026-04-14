import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Trophy, LogOut, Star, Zap, BrainCircuit, Target, Medal } from 'lucide-react';

interface ProfileHeaderProps {
  displayName: string;
  photoURL: string | null;
  role: string;
  isPremium: boolean;
  honorPoints: number;
  meritPoints: number;
  meritPointsFromStats: number;
  rankName: string;
  rankStyle: string;
  rankPos: string | number;
  activeUsers: number;
  onLogout: () => void;
  welcomeTitle: string;
  achievements?: string[];
  children?: React.ReactNode;
}

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

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  displayName,
  photoURL,
  role,
  isPremium,
  honorPoints,
  meritPoints,
  meritPointsFromStats,
  rankName,
  rankStyle,
  rankPos,
  activeUsers,
  onLogout,
  welcomeTitle,
  achievements = [],
  children
}) => {
  const navigate = useNavigate();

  return (
    <div className="p-4 sm:p-6 bg-slate-900/40 border border-slate-800 rounded-[2rem] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/[0.03] rounded-full blur-[80px]" />
      
      <div className="relative flex flex-row items-center gap-4">
        {/* Photo column */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="relative">
            <button 
              onClick={() => navigate('/perfil')} 
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-white/10 p-0.5 bg-slate-950 overflow-hidden shadow-xl hover:border-blue-500/50 transition-all cursor-pointer"
            >
              {photoURL ? (
                <img src={photoURL} alt={displayName} className="w-full h-full rounded-[calc(1rem-2px)] object-cover" />
              ) : (
                <div className="w-full h-full rounded-[calc(1rem-2px)] bg-slate-900 flex items-center justify-center text-slate-700">
                  <Shield size={28} />
                </div>
              )}
            </button>
            {isPremium && (
              <button 
                onClick={() => navigate('/ranking')} 
                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl border-2 border-slate-950 flex items-center justify-center shadow hover:scale-110 transition-transform"
              >
                <Trophy className="w-3.5 h-3.5 text-white fill-current" />
              </button>
            )}
          </div>
          {/* Online status */}
          <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-950/50 border border-white/5 rounded-full">
            <span className="flex h-1.5 w-1.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span className="text-[8px] font-black text-emerald-500 font-mono">{activeUsers}</span>
          </div>
        </div>

        {/* Data column */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tighter truncate max-w-[200px] sm:max-w-none">
                {welcomeTitle}
              </h1>
              <button 
                onClick={onLogout} 
                className="p-1.5 text-slate-600 hover:text-red-500 transition-colors shrink-0" 
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className={`px-2 py-0.5 border rounded-lg text-[9px] font-black uppercase tracking-wider relative group ${rankStyle} animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.3)]`}>
                {rankName}
              </div>
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">#{rankPos} Global</span>
              
              {/* Achievement Badges */}
              {achievements.length > 0 && (
                <div className="flex items-center gap-1 ml-auto">
                  {achievements.slice(0, 3).map((code) => {
                    const Icon = AchievementIconMap[code];
                    if (!Icon) return null;
                    return (
                      <div key={code} className="p-1 px-1.5 bg-slate-800/50 border border-white/5 rounded-md text-amber-500">
                        <Icon size={10} />
                      </div>
                    );
                  })}
                  <button 
                    onClick={() => navigate('/medallas')}
                    className="p-1 px-2.5 bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-500 text-[8px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all"
                  >
                    Ver Galería
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Compact stats row */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-950/40 rounded-lg border border-white/5">
              <Trophy size={10} className="text-amber-500" />
              <span className="text-[9px] font-black text-slate-400">{meritPointsFromStats} <span className="text-slate-600">pt</span></span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-950/40 rounded-lg border border-white/5">
              <Star size={10} className="text-emerald-500" />
              <span className="text-[9px] font-black text-slate-400">{honorPoints} <span className="text-slate-600">honor</span></span>
            </div>
            <button 
              onClick={() => navigate('/entrevista')} 
              className="flex items-center gap-1.5 px-2 py-1 bg-cyan-950/30 border border-cyan-500/30 rounded-lg hover:bg-cyan-900/40 transition-all"
            >
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400"></span>
              </span>
              <span className="text-[9px] font-black text-cyan-400 uppercase tracking-wider">Entrevista</span>
            </button>
          </div>

          {/* Slots for progress bars */}
          {children}
        </div>
      </div>
    </div>
  );
};
