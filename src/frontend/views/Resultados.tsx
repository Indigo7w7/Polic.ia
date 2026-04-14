import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Trophy, XCircle, CheckCircle2, ArrowRight, BrainCircuit, Loader2, ShieldAlert, Target } from 'lucide-react';
import { Question } from '../../shared/types';
import { calcularProximoRepaso } from '../../shared/core/leitnerEngine';
import { useUserStore } from '../store/useUserStore';
import { trpc } from '../../shared/utils/trpc';
import { toast } from 'sonner';
import { triggerTacticalVictory } from '../utils/sounds';

interface LocationState {
  answers: Record<string, number>;
  questions: Question[];
  examLevelId?: string;
  flaggedQuestions?: Record<string, boolean>;
  timeSpentPerQuestion?: Record<string, number>;
}

export const Resultados: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { uid, isPremiumActive, registrarExamen } = useUserStore();
  const isPremium = isPremiumActive();
  const submitAttempt = trpc.exam.submitAttempt.useMutation();
  const state = location.state as LocationState;
  const { 
    answers = {}, 
    questions = [], 
    flaggedQuestions = {}, 
    timeSpentPerQuestion = {} 
  } = state || {};
  const hasSaved = useRef(false);
  const [isSaving, setIsSaving] = useState(true);

  useEffect(() => {
    if (!state) {
      navigate('/');
      return;
    }

    const saveResults = async () => {
      if (hasSaved.current || !uid) return;
      hasSaved.current = true;

      try {
        let correctCount = 0;
        const processedAnswers = questions.map((q) => {
          const userAnswer = answers[q.id];
          const isCorrect = userAnswer !== undefined && userAnswer === q.correctOptionIndex;
          if (isCorrect) correctCount++;
          return {
            questionId: Number(q.id),
            chosenOption: userAnswer !== undefined ? userAnswer : -1, // -1 means skipped
            isCorrect,
          };
        });

        const scorePercentage = questions.length > 0 ? (correctCount / questions.length) : 0;

        const response = await submitAttempt.mutateAsync({
          userId: uid,
          score: Math.round(scorePercentage * 100),
          passed: scorePercentage >= 0.55,
          answers: processedAnswers,
        });

        if (response.meritPointsEarned && response.meritPointsEarned > 0) {
          useUserStore.getState().addMeritPoints(response.meritPointsEarned);
          toast.success(`Hazaña Táctica: +${response.meritPointsEarned} Puntos de Mérito (PM)`, { icon: '🏅' });
          triggerTacticalVictory(response.meritPointsEarned > 100 ? 2 : 1);
        }

        if (response.achievementsUnlocked && response.achievementsUnlocked.length > 0) {
          response.achievementsUnlocked.forEach((ach: any) => {
            useUserStore.getState().pushAchievement(ach);
          });
        }

        if (state.examLevelId) {
          registrarExamen(state.examLevelId, scorePercentage);
          if (scorePercentage >= 0.55) {
            toast.success('¡Examen aprobado! Siguiente nivel desbloqueado. 🎉', { duration: 5000 });
          }
        } else {
          toast.success('Resultados guardados en tu expediente.');
        }
      } catch (error) {
        console.error('Error saving results:', error);
        toast.error('Error al guardar los resultados.');
      } finally {
        setIsSaving(false);
      }
    };

    saveResults();
  }, [state, navigate, uid]);

  if (!state) return null;

  const { 
    correctCount, 
    questionsToReview, 
    scorePercentage 
  } = React.useMemo(() => {
    let count = 0;
    const reviewList: Question[] = [];
    
    questions.forEach((q) => {
      const userAnswer = answers[q.id];
      const isCorrect = userAnswer !== undefined && userAnswer === q.correctOptionIndex;
      if (isCorrect) count++;
      if (!isCorrect || flaggedQuestions[q.id]) {
        reviewList.push(q);
      }
    });

    const percentage = questions.length > 0 ? Math.round((count / questions.length) * 100) : 0;
    
    return { 
      correctCount: count, 
      questionsToReview: reviewList, 
      scorePercentage: percentage 
    };
  }, [answers, questions, flaggedQuestions]);

  const [showReview, setShowReview] = useState(false);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-8 font-sans relative overflow-hidden">
      {/* Background patterns */}
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
      
      <div className="max-w-4xl mx-auto space-y-8 pb-12 relative z-10">
        <header>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-8 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-64 h-64 ${scorePercentage >= 55 ? 'bg-emerald-500' : 'bg-red-500'}/[0.05] rounded-full blur-[80px] pointer-events-none`} />
            
            <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
              <div className={`p-5 bg-slate-950 border border-white/5 rounded-3xl ${scorePercentage >= 55 ? 'text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]'}`}>
                {scorePercentage >= 55 ? <Trophy className="w-10 h-10" /> : <ShieldAlert className="w-10 h-10" />}
              </div>
              <div>
                <div className={`text-[10px] font-black uppercase tracking-[0.3em] mb-1 ${scorePercentage >= 55 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {scorePercentage >= 55 ? 'Operación Exitosa_' : 'Misión Fallida_'}
                </div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Reporte de Operaciones</h1>
              </div>
            </div>

            <div className="flex flex-col items-end relative z-10">
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Identificador de Misión</div>
              <div className="text-xs font-black text-slate-300 uppercase tracking-widest font-mono">PNP-MISSION-{(Math.random() * 1000).toFixed(0)}</div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Precisión Académica', value: `${scorePercentage}%`, color: 'text-blue-400', icon: Target },
              { label: 'Sectores Asegurados', value: correctCount, color: 'text-emerald-400', icon: CheckCircle2 },
              { label: 'Bajas Tac/Errores', value: questions.length - correctCount, color: 'text-red-400', icon: XCircle },
            ].map((stat, i) => (
              <Card key={i} className="bg-slate-900/40 border-slate-800 p-6 flex flex-col items-center justify-center relative overflow-hidden group">
                <div className={`absolute top-0 left-0 w-1 h-full ${stat.color.replace('text', 'bg')} opacity-50`} />
                <stat.icon className={`w-5 h-5 ${stat.color} mb-3`} />
                <div className="text-3xl font-black text-white mb-1 font-mono tracking-tighter">{stat.value}</div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{stat.label}</p>
              </Card>
            ))}
          </div>

          <div className="flex justify-center mt-6">
            <Button 
               variant="outline" 
               className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 gap-2 font-black uppercase tracking-widest text-xs h-12"
               onClick={() => setShowReview(!showReview)}
            >
              <BrainCircuit className="w-4 h-4" />
              {showReview ? 'Ocultar Análisis Cognitivo' : 'Ver Análisis Cognitivo (Revisión)'}
            </Button>
          </div>

        {showReview && questionsToReview.length > 0 && (
          <Card className="border-slate-800 bg-slate-900/60 mb-6 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-slate-200">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-blue-400" />
                  Archivo de Revisión Confidencial
                </div>
                <span className="text-xs font-mono text-slate-500 bg-slate-950 px-3 py-1 rounded bg-slate-950/50">
                  {questionsToReview.length} entradas evaluadas
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 mb-6 text-sm">
                 Aquí se listan tus fallos y las preguntas que marcaste manualmente durante el simulacro. Todos tus fallos han sido exportados al simulador de repeticiones (FSRS).
              </p>
              <div className="space-y-6">
                {questionsToReview.map((q, idx) => {
                  const userAnswer = answers[q.id];
                  const isCorrect = userAnswer !== undefined && userAnswer === q.correctOptionIndex;
                  const isFlagged = flaggedQuestions[q.id];
                  const timeSpent = timeSpentPerQuestion[q.id] || 0;

                  return (
                    <div key={idx} className="p-5 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {isFlagged && <span className="bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-amber-500/30">Duda</span>}
                            {!isCorrect && <span className="bg-red-500/20 text-red-400 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-red-500/30">Fallo</span>}
                            {isCorrect && isFlagged && <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-emerald-500/30">Acierto</span>}
                            <span className="text-slate-500 text-[10px] uppercase font-mono">Tiempo: {timeSpent}s</span>
                          </div>
                          <p className="font-semibold text-slate-200 leading-snug">{q.text}</p>
                        </div>
                      </div>

                      {userAnswer === undefined && (
                        <div className="mb-4 p-3 bg-amber-950/20 border border-amber-900/30 rounded-lg text-xs text-amber-400 font-bold flex items-center gap-2">
                          ⚠️ Pregunta en blanco. Nunca retrocedas ante la duda.
                        </div>
                      )}

                      {!isCorrect && userAnswer !== undefined && (
                        <div className="mb-3 flex items-start gap-3 text-sm text-red-400 bg-red-950/20 p-3 rounded-lg border border-red-900/30">
                          <XCircle className="w-5 h-5 shrink-0" />
                          <div>
                            <span className="font-black text-[10px] uppercase tracking-wider block mb-1 opacity-70">Tu Respuesta</span>
                            {q.options[userAnswer]}
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-3 text-sm text-emerald-400 bg-emerald-950/20 p-3 rounded-lg border border-emerald-900/30">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <div>
                          <span className="font-black text-[10px] uppercase tracking-wider block mb-1 opacity-70">Respuesta Oficial</span>
                          {q.options[q.correctOptionIndex]}
                        </div>
                      </div>

                      <div className="mt-4 text-sm text-slate-300 border-t border-slate-800/80 pt-4 bg-slate-900/20 rounded-lg p-3">
                        <span className="font-black text-[10px] uppercase tracking-wider text-cyan-500 mb-1 block">Inteligencia Táctica (Justificación):</span>
                        <div className="leading-relaxed">{q.justification}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {!isPremium && (
          <div className="mb-8 bg-gradient-to-r from-blue-900/20 to-slate-900 border border-blue-500/20 rounded-2xl p-6 text-center">
            <h3 className="text-lg font-bold text-amber-500 mb-2 flex items-center justify-center gap-2">
              <Trophy className="w-5 h-5" /> ¿Quieres asegurar tu ingreso?
            </h3>
            <p className="text-slate-300 text-sm mb-4 max-w-2xl mx-auto leading-relaxed">
              Estás viendo un demo estadístico (5 preguntas). La prueba real policial exige resistencia de **100 preguntas** y detectar anticipadamente tus *puntos de quiebre*. 
              Desbloquea simulacros infinitos, el algoritmo Leitner completo y el modo Muerte Súbita.
            </p>
            <Button variant="outline" className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10" onClick={() => navigate('/yape-checkout')}>
              Activar PRO y Dominar el Examen
            </Button>
          </div>
        )}

        <div className="flex justify-center gap-4">
          <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => navigate('/')}>
            Volver al Inicio
          </Button>
          <Button variant="primary" className="gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold" onClick={() => navigate('/poligono')}>
            Polígono Cognitivo <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
