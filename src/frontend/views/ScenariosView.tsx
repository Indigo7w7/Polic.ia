import React from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../../shared/utils/trpc';

export default function ScenariosView() {
  const navigate = useNavigate();
  const { data, isLoading } = trpc.scenarios.list.useQuery();
  const startMutation = trpc.scenarios.startOrResume.useMutation();

  const handleStart = async (scenarioId: number) => {
    try {
      const res = await startMutation.mutateAsync({ scenarioId });
      navigate(`/dashboard/scenarios/${scenarioId}/play/${res.attemptId}`, {
         state: { initialEvent: res.initialEvent, history: res.existingHistory }
      });
    } catch (e) {
      console.error(e);
      alert('Error al desplegar operativo.');
    }
  };

  if (isLoading) return <div className="p-8 text-white text-center">Cargando Central de Emergencias...</div>;

  const scenarios = data?.scenarios || [];
  const attempts = data?.attempts || [];

  return (
    <div className="p-6 md:p-12 text-white max-w-6xl mx-auto space-y-8 animate-fade-in">
      <header className="mb-10 text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300">
          Simulador de Intervenciones
        </h1>
        <p className="mt-4 text-slate-400 text-lg md:text-xl">
          Central 105: Casos prácticos evaluados por Inteligencia Artificial bajo el manual de Derechos Humanos y Doctrina Policial.
        </p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scenarios.map((s) => {
          const attempt = attempts.find((a: any) => a.scenarioId === s.id);
          const isCompleted = attempt?.status === 'COMPLETED';
          const isPassed = attempt?.isPassed;

          const cardClass = isPassed ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20';
          const textClass = isPassed ? 'text-green-400' : 'text-red-400';

          return (
            <div key={s.id} className="relative p-[1px] rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] group overflow-hidden">
              <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors pointer-events-none" />
              <div className="h-full bg-slate-900 rounded-2xl p-6 flex flex-col relative z-10 backdrop-blur-sm">
                
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-bold tracking-wider text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full uppercase">
                    {s.category}
                  </span>
                  {s.difficulty === 'HARD' && <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-full">CRÍTICO</span>}
                  {s.difficulty === 'MEDIUM' && <span className="text-xs font-bold text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-full">MEDIO</span>}
                  {s.difficulty === 'EASY' && <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded-full">RUTINA</span>}
                </div>

                <h2 className="text-xl font-bold mb-2 text-white">{s.title}</h2>
                <p className="text-sm text-slate-400 mb-6 flex-grow">{s.description}</p>
                
                {isCompleted ? (
                   <div className={"p-4 rounded-xl flex items-center justify-between " + cardClass}>
                     <div>
                       <p className="text-xs text-slate-400">Puntaje Oficial</p>
                       <p className={"text-2xl font-bold " + textClass}>{attempt.score}/100</p>
                     </div>
                     <button
                        onClick={() => handleStart(s.id)}
                        disabled={startMutation.isPending}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors border border-slate-700"
                     >
                       Reintentar
                     </button>
                   </div>
                ) : (
                  <button
                    onClick={() => handleStart(s.id)}
                    disabled={startMutation.isPending}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    {attempt ? 'Retomar Patrullaje' : 'Atender Incidencia'}
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {scenarios.length === 0 && (
        <div className="text-center py-20 text-slate-500">
           No hay novedades en la central. Su turno está tranquilo, Oficial.
        </div>
      )}
    </div>
  );
}
