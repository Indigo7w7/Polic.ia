import React from 'react';
import { trpc } from '../../shared/utils/trpc';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Medal, Star, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const Ranking: React.FC = () => {
  const navigate = useNavigate();
  const rankingQuery = trpc.user.getRanking.useQuery();
  const ranking = rankingQuery.data || [];

  return (
    <div className="min-h-screen bg-[#060d1a] p-4 md:p-8 text-white font-sans">
      <header className="max-w-4xl mx-auto flex items-center gap-4 mb-8">
        <Button variant="outline" size="icon" onClick={() => navigate('/')} className="shrink-0 bg-slate-900 border-slate-700">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Button>
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Ranking Nacional de Postulantes
          </h1>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mt-1">
            Los mejores prospectos para la PNP 2025
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto">
        <Card className="bg-slate-900/50 border-slate-800 shadow-2xl">
          <CardHeader className="border-b border-slate-800 pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
              Tabla de Honor
            </CardTitle>
          </CardHeader>
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
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-950/50">
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Puesto</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Postulante</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Puntaje Máx.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {ranking.map((user, idx) => (
                      <tr key={user.uid} className="hover:bg-blue-600/5 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {idx === 0 ? <Medal className="w-6 h-6 text-yellow-500" /> :
                           idx === 1 ? <Medal className="w-6 h-6 text-slate-300" /> :
                           idx === 2 ? <Medal className="w-6 h-6 text-amber-600" /> :
                           <span className="text-slate-500 font-mono font-bold pl-2">#{(idx + 1).toString().padStart(2, '0')}</span>}
                        </td>
                        <td className="px-6 py-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 border-2 border-slate-700 group-hover:border-blue-500/50 transition-colors">
                            {user.photoURL ? (
                              <img src={user.photoURL} alt={user.name!} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-600">
                                <User className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-100 group-hover:text-white transition-colors">
                              {user.name || 'Anónimo'}
                            </div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                              Aspirante Activo
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-xl font-black text-blue-400 group-hover:text-blue-300 transition-colors font-mono">
                            {user.bestScore.toFixed(1)}
                          </div>
                        </td>
                      </tr>
                    ))}
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
