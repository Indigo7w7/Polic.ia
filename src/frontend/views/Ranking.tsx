import React from 'react';
import { trpc } from '../../shared/utils/trpc';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Medal, Star, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useUserStore } from '../store/useUserStore';
import { RANK_THRESHOLDS } from '../hooks/usePlayerRank';

export const Ranking: React.FC = () => {
  const navigate = useNavigate();
  const { uid } = useUserStore();
  const [schoolFilter, setSchoolFilter] = React.useState<'EO' | 'EESTP' | undefined>(undefined);
  const rankingQuery = trpc.user.getRanking.useQuery({ school: schoolFilter });
  const ranking = rankingQuery.data || [];

  const getRankTitle = (points: number) => {
    let currentRank = RANK_THRESHOLDS[0];
    for (const r of RANK_THRESHOLDS) {
      if (points >= r.minPoints) currentRank = r;
      else break;
    }
    return { title: currentRank.name, color: currentRank.color };
  };

  return (
    <div className="min-h-screen bg-[#060d1a] p-4 md:p-8 text-white font-sans">
      <header className="max-w-4xl mx-auto flex items-center gap-4 mb-8">
        <Button variant="outline" size="icon" onClick={() => navigate('/')} className="shrink-0 bg-slate-900 border-slate-700">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Button>
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Ranking de Élite (Rango y Honor)
          </h1>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mt-1">
            Basado en Puntos de Mérito (Simulacros) y Honor (Leitner)
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto space-y-6">
        <div className="flex gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit">
          <button 
            onClick={() => setSchoolFilter(undefined)}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!schoolFilter ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            General
          </button>
          <button 
            onClick={() => setSchoolFilter('EO')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${schoolFilter === 'EO' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Oficiales (EO)
          </button>
          <button 
            onClick={() => setSchoolFilter('EESTP')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${schoolFilter === 'EESTP' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Técnica (EESTP)
          </button>
        </div>

        <Card className="bg-slate-900/50 border-slate-800 shadow-2xl overflow-hidden">
          <CardContent className="p-0">
            {rankingQuery.isLoading ? (
              <div className="p-20 text-center animate-pulse text-slate-600 uppercase font-black tracking-widest">
                Cargando Escalafón...
              </div>
            ) : ranking.length === 0 ? (
              <div className="p-20 text-center text-slate-500 italic">
                Aún no hay resultados registrados. ¡Sé el primero!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-950/50 border-b border-slate-800">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Posición</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Postulante</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Escuela</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">PM (Mérito)</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">PH (Honor)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {ranking.map((user, idx) => {
                      const isMe = user.uid === uid;
                      const rank = getRankTitle((user.meritPoints || 0) + (user.honorPoints || 0));
                      return (
                      <tr key={user.uid} className={`${isMe ? 'bg-blue-600/20 ring-1 ring-inset ring-blue-500/50' : 'hover:bg-blue-600/5'} transition-colors group`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {idx === 0 ? <Medal className="w-6 h-6 text-yellow-500 drop-shadow-md animate-bounce" /> :
                           idx === 1 ? <Medal className="w-6 h-6 text-slate-300 drop-shadow-md" /> :
                           idx === 2 ? <Medal className="w-6 h-6 text-amber-600 drop-shadow-md" /> :
                           <span className={`text-slate-500 font-mono font-bold pl-2 ${isMe ? 'text-blue-400' : ''}`}>#{(idx + 1).toString().padStart(2, '0')}</span>}
                        </td>
                        <td className="px-6 py-4 flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl overflow-hidden bg-slate-800 border-2 ${isMe ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'border-slate-700'}`}>
                            {user.photoURL ? (
                              <img src={user.photoURL} alt={user.name!} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-600">
                                <User className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className={`font-bold transition-colors flex items-center gap-2 ${isMe ? 'text-blue-400' : 'text-slate-100 group-hover:text-white'}`}>
                              {user.name || 'Anónimo'}
                              {isMe && <span className="bg-blue-500 text-[8px] px-1 rounded text-white font-black uppercase">Tú</span>}
                            </div>
                            <div className={`text-[10px] uppercase tracking-wider font-bold ${rank.color}`}>
                              {rank.title}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-slate-800/50 rounded text-xs font-bold text-slate-400 border border-slate-700 uppercase">
                            {user.school || 'Indefinida'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-base font-black text-blue-400 font-mono">
                            {user.meritPoints} <span className="text-[10px] text-blue-400/50 uppercase">PM</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-base font-black text-emerald-400 font-mono">
                            {user.honorPoints} <span className="text-[10px] text-emerald-400/50 uppercase">PH</span>
                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};
