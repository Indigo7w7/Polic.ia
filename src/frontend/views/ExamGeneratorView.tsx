import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../../shared/utils/trpc';
import { useExamStore } from '../store/useExamStore';
import { useUserStore } from '../store/useUserStore';
import { 
  Zap, Shield, Target, BrainCircuit, ChevronRight, 
  Settings2, Sparkles, AlertCircle, CheckCircle2, Sliders 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { AptitudeRadar } from '../components/dashboard/AptitudeRadar';
import { toast } from 'sonner';

export default function ExamGeneratorView() {
  const navigate = useNavigate();
  const { uid, modalidad_postulacion } = useUserStore();
  const iniciarExamen = useExamStore(s => s.iniciarExamen);

  // Stats for the "canCustomize" logic
  const dashboardQuery = trpc.user.getDashboardSummary.useQuery(
    { uid: uid || '', school: modalidad_postulacion || undefined },
    { enabled: !!uid }
  );
  const areasQuery = trpc.learning.getAreas.useQuery();
  
  const generateSmartMutation = trpc.exam.generateSmartExam.useMutation();
  const utils = trpc.useUtils();

  const [isSmartMode, setIsSmartMode] = useState(true);
  const [limit, setLimit] = useState(50);
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [selectedAreas, setSelectedAreas] = useState<number[]>([]);
  const [isLoadingManual, setIsLoadingManual] = useState(false);

  // Radar logic
  const categoryStats = dashboardQuery.data?.categoryStats || [];
  const overallAvg = categoryStats.length > 0 
    ? categoryStats.reduce((acc, s) => acc + s.score, 0) / categoryStats.length 
    : 0;

  const canCustomizeDifficulty = overallAvg >= 70;
  const weakestArea = categoryStats.sort((a,b) => a.score - b.score)[0]?.area || null;

  useEffect(() => {
    if (!canCustomizeDifficulty && !isSmartMode) {
      // If they switch to manual but aren't high level, set difficulty to Medium by default
      setDifficulty('MEDIUM');
    }
  }, [canCustomizeDifficulty]);

  const handleStart = async () => {
    try {
      let questions = [];
      if (isSmartMode) {
        const res = await generateSmartMutation.mutateAsync({
          school: modalidad_postulacion as 'EO' | 'EESTP',
          limit,
          requestedDifficulty: canCustomizeDifficulty ? difficulty : undefined
        });
        questions = res.questions;
      } else {
        if (selectedAreas.length === 0) {
          toast.error("Seleccione al menos un área táctica.");
          return;
        }
        setIsLoadingManual(true);
        questions = await utils.exam.getQuestionsByFilter.fetch({
          school: modalidad_postulacion as 'EO' | 'EESTP',
          areaIds: selectedAreas,
          difficulty,
          limit
        });
        setIsLoadingManual(false);
      }

      if (questions.length < 5) {
        toast.error("No hay suficientes preguntas para esta configuración.");
        return;
      }

      iniciarExamen(questions as any, null, true, false);
      navigate('/simulador', { state: { isPracticeMode: true } });
    } catch (e: any) {
      toast.error("Error al generar misión: " + e.message);
    }
  };

  const toggleArea = (id: number) => {
    setSelectedAreas(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-8 lg:p-12 animate-fade-in">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Táctico */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-400 font-black text-xs uppercase tracking-[0.3em]">
              <Sparkles className="w-4 h-4" /> Inteligencia Predictiva Activa
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase italic">
              Generador de <span className="text-blue-500">Misiones</span>
            </h1>
            <p className="text-slate-400 text-sm max-w-xl">
              Configure su simulacro personalizado o deje que la IA analice su Radar de Aptitud para crear el desafío perfecto.
            </p>
          </div>
          
          <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800">
            <button 
              onClick={() => setIsSmartMode(true)}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 ${isSmartMode ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <BrainCircuit className="w-4 h-4" /> Smart IA
            </button>
            <button 
              onClick={() => setIsSmartMode(false)}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 ${!isSmartMode ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Settings2 className="w-4 h-4" /> Manual
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna de Configuración */}
          <div className="lg:col-span-2 space-y-6">
            
            <Card className="bg-slate-900/40 border-slate-800 rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-8 space-y-8">
                
                {/* Dificultad */}
                <div className="space-y-4">
                   <div className="flex justify-between items-center">
                     <label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                       <Shield className="w-4 h-4 text-blue-400" /> Nivel de Amenaza
                     </label>
                     {!canCustomizeDifficulty && (
                       <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full uppercase flex items-center gap-1">
                         <AlertCircle className="w-3 h-3" /> Bloqueado (Requiere {'>'}70% Radar)
                       </span>
                     )}
                   </div>
                   
                   <div className="grid grid-cols-3 gap-3">
                     {(['EASY', 'MEDIUM', 'HARD'] as const).map(d => (
                       <button
                         key={d}
                         disabled={!canCustomizeDifficulty && isSmartMode}
                         onClick={() => setDifficulty(d)}
                         className={`py-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${
                           difficulty === d 
                             ? 'bg-blue-600/10 border-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.15)]' 
                             : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed'
                         }`}
                       >
                         <span className="text-[10px] font-black uppercase">{d === 'EASY' ? 'Recluta' : d === 'MEDIUM' ? 'Oficial' : 'Élite'}</span>
                         <span className="text-[8px] opacity-60">{d === 'EASY' ? 'Fácil' : d === 'MEDIUM' ? 'Normal' : 'Difícil'}</span>
                       </button>
                     ))}
                   </div>
                </div>

                {/* Cantidad de Preguntas Slider */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-purple-400" /> Volumen de Fuego
                    </label>
                    <span className="text-2xl font-black text-white">{limit} <span className="text-xs text-slate-500">PREGUNTAS</span></span>
                  </div>
                  <input 
                    type="range" min="10" max="100" step="5" value={limit}
                    onChange={(e) => setLimit(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[9px] font-black text-slate-600 uppercase tracking-widest">
                    <span>10 Preg.</span>
                    <span>Simulacro completo (100)</span>
                  </div>
                </div>

                {/* Selección de Áreas (Sólo Manual) */}
                <AnimatePresence mode="wait">
                  {!isSmartMode && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: 'auto' }} 
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 pt-4 border-t border-white/5"
                    >
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400">Objetivos Específicos</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {areasQuery.data?.map(area => (
                          <button
                            key={area.id}
                            onClick={() => toggleArea(area.id)}
                            className={`p-3 rounded-xl border text-[10px] font-bold text-center transition-all ${
                              selectedAreas.includes(area.id)
                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                                : 'bg-slate-950/30 border-slate-800 text-slate-500 hover:border-slate-700'
                            }`}
                          >
                            {area.name}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </CardContent>
            </Card>

            <Button 
              onClick={handleStart}
              disabled={generateSmartMutation.isPending || isLoadingManual}
              className="w-full h-20 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-[2rem] text-xl font-black uppercase tracking-widest shadow-2xl flex items-center justify-center gap-4 group transition-all hover:scale-[1.02]"
            >
              {generateSmartMutation.isPending || isLoadingManual ? 'Sincronizando...' : (
                <>
                  Iniciar Despliegue Táctico
                  <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                </>
              )}
            </Button>
          </div>

          {/* Columna de Inteligencia (Radar) */}
          <div className="space-y-6">
             <div className="sticky top-8">
               <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-4 px-2">Análisis Perimetral</h2>
               <div className="space-y-4">
                  <AptitudeRadar categoryStats={categoryStats} weakestArea={weakestArea} />
                  
                  <Card className="bg-blue-600/5 border-blue-500/20 rounded-3xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-white uppercase tracking-tight">Modo Relentless</h4>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          La IA priorizará automáticamente un 60% de preguntas de tus áreas con menor eficacia para cerrar brechas de conocimiento.
                        </p>
                      </div>
                    </div>
                  </Card>

                  {canCustomizeDifficulty && (
                    <Card className="bg-emerald-600/5 border-emerald-500/20 rounded-3xl p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-white uppercase tracking-tight">Acceso Veterano</h4>
                          <p className="text-[10px] text-slate-400 leading-relaxed">
                            Tu puntaje general es sobresaliente. Has desbloqueado el control manual del nivel de amenaza.
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}
               </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
