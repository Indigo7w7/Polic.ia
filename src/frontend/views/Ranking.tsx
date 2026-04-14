import React from 'react';
import { trpc } from '../../shared/utils/trpc';
import { 
  ArrowLeft, ChevronDown, Shield, Sword, Trophy, 
  Target, Zap, Users, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { getMilitaryRank } from '../utils/ranks';

export const Ranking: React.FC = () => {
  const navigate = useNavigate();
  const [schoolFilter, setSchoolFilter] = React.useState<'EO' | 'EESTP' | undefined>(undefined);
  
  const rankingQuery = trpc.user.getRanking.useQuery({ school: schoolFilter });
  const battleQuery = trpc.user.getSchoolBattleStats.useQuery(undefined, {
    refetchInterval: 30000 // Actualizar batalla cada 30s
  });

  const topUsers = rankingQuery.data?.slice(0, 3) || [];
  const listUsers = rankingQuery.data?.slice(3) || [];

  const battleStats = battleQuery.data || [];
  const eoStats = battleStats.find(s => s.school === 'EO') || { avgEfficacy: 0, totalHonor: 0, userCount: 0 };
  const eestpStats = battleStats.find(s => s.school === 'EESTP') || { avgEfficacy: 0, totalHonor: 0, userCount: 0 };

  // Calculate victory bar percentage (based on Efficacy as per "Lo Mejor")
  const totalEfficacy = eoStats.avgEfficacy + eestpStats.avgEfficacy;
  const eoPercent = totalEfficacy > 0 ? (eoStats.avgEfficacy / totalEfficacy) * 100 : 50;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans relative overflow-x-hidden">
      
      {/* HERO SECTION */}
      <div 
        className="relative pt-12 pb-24 sm:pb-32 px-4 bg-cover bg-center min-h-[300px] sm:min-h-[400px]"
        style={{ backgroundImage: "url('/portada-pnp.png')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-[#020617]/70 to-[#020617]" />
        
        {/* Nav Header */}
        <div className="max-w-6xl mx-auto flex items-center justify-between relative z-20 mb-8 sm:mb-12">
          <button onClick={() => navigate('/')} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl backdrop-blur-md transition-all border border-white/5">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          
          <div className="flex flex-col items-center">
             <div className="flex items-center gap-2 mb-1">
               <Trophy className="w-4 h-4 text-amber-500 animate-pulse" />
               <span className="text-[10px] text-amber-500 font-black tracking-[0.4em] uppercase">Estatus Estratégico</span>
             </div>
             <h1 className="text-white font-black tracking-tighter text-2xl uppercase">Salón de Honor</h1>
          </div>
          
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-2 backdrop-blur-md">
            <select 
              className="bg-transparent text-white/90 text-[10px] font-black outline-none appearance-none cursor-pointer pr-1 uppercase tracking-widest"
              value={schoolFilter || 'GLOBAL'}
              onChange={(e) => setSchoolFilter(e.target.value === 'GLOBAL' ? undefined : e.target.value as any)}
            >
              <option value="GLOBAL">Fuerza Conjunta</option>
              <option value="EO">Oficiales (EO)</option>
              <option value="EESTP">Técnicos (EESTP)</option>
            </select>
            <ChevronDown className="w-3 h-3 text-amber-500" />
          </div>
        </div>

        {/* COMBAT BAR (EO vs EESTP) */}
        {!schoolFilter && (
          <div className="max-w-4xl mx-auto mb-16 relative z-20 px-4">
             <div className="flex justify-between items-end mb-3">
                <div className="text-left">
                   <div className="flex items-center gap-2">
                     <div className="w-8 h-8 bg-blue-600/20 border border-blue-500/30 rounded-lg flex items-center justify-center">
                        <Shield className="w-4 h-4 text-blue-400" />
                     </div>
                     <span className="text-[11px] font-black text-white uppercase tracking-tighter">Oficiales (EO)</span>
                   </div>
                   <div className="text-xl font-black text-blue-500 mt-1">{eoStats.avgEfficacy}% <span className="text-[9px] text-slate-500 font-bold uppercase">Eficacia</span></div>
                </div>
                <div className="text-center pb-2">
                   <Sword className="w-5 h-5 text-slate-600 rotate-45 mb-1 mx-auto" />
                   <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Batalla Semanal</span>
                </div>
                <div className="text-right">
                   <div className="flex items-center gap-2 justify-end">
                     <span className="text-[11px] font-black text-white uppercase tracking-tighter">Técnicos (EESTP)</span>
                     <div className="w-8 h-8 bg-emerald-600/20 border border-emerald-500/30 rounded-lg flex items-center justify-center">
                        <Target className="w-4 h-4 text-emerald-400" />
                     </div>
                   </div>
                   <div className="text-xl font-black text-emerald-500 mt-1">{eestpStats.avgEfficacy}% <span className="text-[9px] text-slate-500 font-bold uppercase">Eficacia</span></div>
                </div>
             </div>
             
             <div className="h-4 w-full bg-slate-900 rounded-full border border-white/5 overflow-hidden flex shadow-2xl">
                <motion.div 
                  initial={{ width: '50%' }}
                  animate={{ width: `${eoPercent}%` }}
                  className="h-full bg-gradient-to-r from-blue-700 to-blue-500 relative"
                >
                   <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:20px_20px]" />
                </motion.div>
                <div className="w-1 h-full bg-white relative z-10 shadow-[0_0_10px_white]" />
                <motion.div 
                  initial={{ width: '50%' }}
                  animate={{ width: `${100 - eoPercent}%` }}
                  className="h-full bg-gradient-to-l from-emerald-700 to-emerald-500"
                />
             </div>
             
             <div className="grid grid-cols-2 mt-4 text-[9px] font-black uppercase tracking-widest text-slate-500">
                <div className="flex items-center gap-4">
                   <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {eoStats.userCount} Activos</span>
                   <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-500" /> {eoStats.totalHonor} Honor</span>
                </div>
                <div className="flex items-center gap-4 justify-end">
                   <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-500" /> {eestpStats.totalHonor} Honor</span>
                   <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {eestpStats.userCount} Activos</span>
                </div>
             </div>
          </div>
        )}

        {/* Podium */}
        <div className="max-w-4xl mx-auto flex justify-center items-end gap-3 sm:gap-12 relative z-20 h-64 mt-8">
           {rankingQuery.isLoading ? (
             <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin self-center" />
           ) : (
             <>
               {topUsers[1] && <PodiumAvatar user={topUsers[1]} rank={2} />}
               {topUsers[0] && <PodiumAvatar user={topUsers[0]} rank={1} isFirst />}
               {topUsers[2] && <PodiumAvatar user={topUsers[2]} rank={3} />}
             </>
           )}
        </div>
      </div>

      {/* TACTICAL LIST */}
      <div className="max-w-5xl mx-auto bg-[#0a0f1e]/90 backdrop-blur-3xl border border-white/5 rounded-t-[3rem] px-4 sm:px-12 pt-10 pb-32 -mt-10 relative z-30 shadow-[0_-20px_60px_rgba(0,0,0,0.6)] min-h-[50vh]">
        <div className="flex flex-col gap-3">
           {listUsers.map((user, idx) => {
             const rankPos = idx + 4;
             const totalPoints = (user.honorPoints || 0) + (user.meritPoints || 0);
             const milRank = getMilitaryRank(totalPoints, user.school);
             
             return (
               <motion.div 
                 key={user.uid}
                 initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.03 }}
                 className="group flex items-center gap-4 p-4 rounded-3xl bg-white/[0.02] border border-white/[0.03] hover:bg-white/5 transition-all"
               >
                 <span className="text-xs font-black text-slate-600 w-6 text-center">{rankPos}</span>
                 
                 <div className="relative">
                   <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 border border-slate-800 shadow-md">
                     {user.photoURL ? (
                       <img src={user.photoURL} alt={user.name!} className="w-full h-full object-cover" />
                     ) : (
                       <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} className="w-full h-full object-cover bg-slate-900" alt="" />
                     )}
                   </div>
                   <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-lg flex items-center justify-center border-2 border-[#0a0f1e] text-[8px] font-black ${user.school === 'EO' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}`}>
                     {user.school === 'EO' ? 'O' : 'T'}
                   </div>
                 </div>

                 <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                       <h3 className="text-slate-200 font-bold text-sm truncate tracking-wide">{user.name}</h3>
                       {user.membership === 'PRO' && <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{milRank}</p>
                 </div>

                 <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end mb-0.5">
                       <Zap className="w-3.5 h-3.5 text-blue-400" />
                       <span className="text-sm font-black text-white">{totalPoints}</span>
                    </div>
                    <div className="text-[9px] text-slate-500 font-bold tracking-widest uppercase">Puntos Honor</div>
                 </div>
               </motion.div>
             );
           })}

           {listUsers.length === 0 && !rankingQuery.isLoading && (
             <div className="text-center py-20 opacity-40">
                <Target className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                <p className="text-xs font-black uppercase tracking-[0.3em]">Perímetro Limpio</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

// PODIUM AVATAR COMPONENT
const PodiumAvatar = ({ user, rank, isFirst = false }: { user: any, rank: number, isFirst?: boolean }) => {
  const points = (user.honorPoints || 0) + (user.meritPoints || 0);
  const milRank = getMilitaryRank(points, user.school);
  const sizeClass = isFirst ? 'w-24 h-24 sm:w-[110px] sm:h-[110px]' : 'w-20 h-20 sm:w-[88px] sm:h-[88px]';
  const colorClass = user.school === 'EO' ? 'border-blue-500 shadow-blue-500/20' : 'border-emerald-500 shadow-emerald-500/20';

  return (
    <motion.div 
      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: rank * 0.1, type: 'spring' }}
      className={`relative flex flex-col items-center flex-1`}
    >
      <div className="relative mb-4">
        <div className={`rounded-[2rem] border-4 overflow-hidden shadow-2xl transition-transform hover:scale-105 duration-500 ${sizeClass} ${colorClass} bg-slate-950`}>
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} className="w-full h-full object-cover opacity-60" alt="" />
          )}
        </div>
        
        {/* Number Badge */}
        <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 min-w-8 h-8 px-2 rounded-xl flex items-center justify-center font-black text-[10px] shadow-xl border-2 z-30 ${
           rank === 1 ? 'bg-amber-500 border-amber-300 text-amber-950' : 
           rank === 2 ? 'bg-slate-300 border-slate-100 text-slate-900' : 
           'bg-orange-700 border-orange-500 text-orange-100'
        }`}>
          {rank === 1 ? <Trophy className="w-3.5 h-3.5" /> : rank}
        </div>

        {/* School Tag */}
        <div className={`absolute top-0 right-0 p-1.5 rounded-bl-xl border-l border-b border-white/10 z-30 ${user.school === 'EO' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
           <Shield className="w-2.5 h-2.5 text-white" />
        </div>
      </div>

      <div className="text-center max-w-[100px] sm:max-w-[120px]">
        <h4 className={`font-black text-[11px] sm:text-[13px] uppercase tracking-tighter truncate ${rank === 1 ? 'text-white' : 'text-slate-400'}`}>
          {user.name?.split(' ')[0]}
        </h4>
        <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest mt-1 mb-2 leading-none">{milRank}</div>
        <div className="inline-flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-full border border-white/5">
           <Zap className="w-2.5 h-2.5 text-amber-500" />
           <span className="text-[10px] font-black text-white">{points}</span>
        </div>
      </div>
    </motion.div>
  );
};
