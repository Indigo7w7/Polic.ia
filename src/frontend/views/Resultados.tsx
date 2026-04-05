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
}

export const Resultados: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { uid, isPremiumActive, registrarExamen } = useUserStore();
  const isPremium = isPremiumActive();
  const submitAttempt = trpc.exam.submitAttempt.useMutation();
  const state = location.state as LocationState;
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
        const { answers, questions } = state;
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

  const { answers, questions } = state;
  let correctCount = 0;
  const failedQuestions: Question[] = [];

  questions.forEach((q) => {
    const userAnswer = answers[q.id];
    const isCorrect = userAnswer !== undefined && userAnswer === q.correctOptionIndex;
    if (isCorrect) {
      correctCount++;
    } else {
      failedQuestions.push(q);
    }
  });

  const scorePercentage = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

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
            { label: 'Bajas Tac/Errores', value: failedQuestions.length, color: 'text-red-400', icon: XCircle },
          ].map((stat, i) => (
            <Card key={i} className="bg-slate-900/40 border-slate-800 p-6 flex flex-col items-center justify-center relative overflow-hidden group">
              <div className={`absolute top-0 left-0 w-1 h-full ${stat.color.replace('text', 'bg')} opacity-50`} />
              <stat.icon className={`w-5 h-5 ${stat.color} mb-3`} />
              <div className="text-3xl font-black text-white mb-1 font-mono tracking-tighter">{stat.value}</div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{stat.label}</p>
            </Card>
          ))}
        </div>

        {failedQuestions.length > 0 && (
          <Card className="border-red-900/30 bg-red-950/10 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400">
                <BrainCircuit className="w-5 h-5" />
                Pipeline de Errores Activado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 mb-4">
                Se han enviado {failedQuestions.length} preguntas al Polígono de Tiro Cognitivo (Algoritmo Leitner) para tu próximo repaso.
              </p>
              <div className="space-y-4">
                {failedQuestions.map((q, idx) => (
                  <div key={idx} className="p-4 bg-slate-900 rounded-lg border border-slate-800">
                    <p className="font-medium text-slate-200 mb-2">{q.text}</p>
                    {answers[q.id] === undefined && (
                      <div className="mb-3 p-2 bg-amber-950/20 border border-amber-900/30 rounded text-xs text-amber-400 font-bold flex items-center gap-2">
                        ⚠️ Pregunta omitida (En blanco) - Repasa este tema con urgencia.
                      </div>
                    )}
                    <div className="flex items-start gap-2 text-sm text-emerald-400 bg-emerald-950/30 p-3 rounded border border-emerald-900/50">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-bold block mb-1">Respuesta Correcta:</span>
                        {q.options[q.correctOptionIndex]}
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-slate-400 border-t border-slate-800 pt-3">
                      <span className="font-bold text-slate-300">Justificación: </span>
                      {q.justification}
                    </div>
                  </div>
                ))}
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
