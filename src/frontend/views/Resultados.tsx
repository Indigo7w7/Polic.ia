import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Trophy, XCircle, CheckCircle2, ArrowRight, BrainCircuit, Loader2 } from 'lucide-react';
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
    <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="text-center mb-8 relative">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-800 border-4 border-slate-700 mb-4 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <Trophy className={`w-10 h-10 ${scorePercentage >= 70 ? 'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]' : 'text-slate-400'}`} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            Resultados del Simulacro
            {isSaving && <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />}
          </h1>
          <p className="text-slate-400">Has completado el examen predictivo.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="text-center bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-4xl font-mono font-bold text-blue-400 mb-1">{scorePercentage}%</div>
              <p className="text-sm text-slate-400 uppercase tracking-wider">Precisión</p>
            </CardContent>
          </Card>
          <Card className="text-center bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-4xl font-mono font-bold text-emerald-400 mb-1">{correctCount}</div>
              <p className="text-sm text-slate-400 uppercase tracking-wider">Correctas</p>
            </CardContent>
          </Card>
          <Card className="text-center bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-4xl font-mono font-bold text-red-400 mb-1">{failedQuestions.length}</div>
              <p className="text-sm text-slate-400 uppercase tracking-wider">Incorrectas</p>
            </CardContent>
          </Card>
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
