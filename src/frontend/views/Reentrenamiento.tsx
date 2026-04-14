import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../../shared/utils/trpc';
import { useUserStore } from '../store/useUserStore';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  ChevronLeft, 
  ChevronRight, 
  BrainCircuit, 
  CheckCircle2, 
  ShieldAlert, 
  Target,
  Zap,
  RotateCcw,
  Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playUIClick } from '../utils/sounds';
import { toast } from 'sonner';

export const Reentrenamiento: React.FC = () => {
  const navigate = useNavigate();
  const { uid, isPremiumActive } = useUserStore();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [direction, setDirection] = useState<1 | -1>(1);

  const failedQuestionsQuery = trpc.exam.getFailedQuestions.useQuery(
    { userId: uid || '', limit: 30 },
    { enabled: !!uid, staleTime: 0 }
  );

  const isPremium = isPremiumActive();

  // ── Ecosistema: Conexión Reentrenamiento → FSRS ────────────────────────
  const reviewCardMutation = trpc.leitner.reviewByQuestionId.useMutation();

  useEffect(() => {
    if (!isPremium) {
      toast.error('La Zona Anti-Fallo es exclusiva para usuarios PRO');
      navigate('/yape-checkout');
    }
  }, [isPremium, navigate]);

  const questions = failedQuestionsQuery.data || [];
  const currentQuestion = questions[currentIndex];

  const handleAnswer = async (optionIdx: number) => {
    if (answers[currentQuestion.id] !== undefined) return;
    playUIClick();
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: optionIdx }));

    const isCorrect = optionIdx === currentQuestion.correctOption;

    // ── Ecosistema: Sincronizar con FSRS en background ─────────────────────────
    // ease 3 = Bien (acertó), ease 1 = Olvidé (falló)
    reviewCardMutation.mutate({
      questionId: currentQuestion.id,
      ease: isCorrect ? 3 : 1,
    });
  };

  const next = () => {
    if (currentIndex < questions.length - 1) {
      setDirection(1);
      setCurrentIndex(prev => prev + 1);
    } else {
      toast.success('¡Entrenamiento completado! Has repasado todos tus fallos.');
      navigate('/');
    }
  };

  if (failedQuestionsQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center space-y-4">
          <RotateCcw className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
          <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">Analizando historial de fallos...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
        <Card className="max-w-md w-full bg-slate-900 border-slate-800 text-center py-12">
          <CardContent>
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">¡IMPECABLE!</h2>
            <p className="text-slate-400 mb-8 leading-relaxed">No tienes registros de fallos pendientes. Sigue realizando simulacros para mantener tu nivel al máximo.</p>
            <Button onClick={() => navigate('/')} className="bg-blue-600 hover:bg-blue-500 text-white font-black px-8">Volver al Cuartel</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedIdx = currentQuestion ? answers[currentQuestion.id] : undefined;

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans">
      {/* Header */}
      <header className="p-4 md:p-6 pb-2">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 p-6 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] relative overflow-hidden shadow-2xl backdrop-blur-md">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/[0.03] rounded-full blur-[80px]" />
          
          <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
            <button 
              onClick={() => navigate('/')}
              className="p-3 bg-slate-950 border border-white/5 rounded-2xl text-slate-500 hover:text-white transition-all hover:scale-105"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-1">Zona Anti-Fallo_</div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Reentrenamiento</h1>
            </div>
          </div>

          <div className="flex items-center gap-4 relative z-10">
            <div className="flex flex-col items-end mr-4">
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Progreso en Sector</div>
              <div className="text-xs font-black text-slate-300 uppercase tracking-widest font-mono">{currentIndex + 1} / {questions.length}</div>
            </div>
            <div className="p-4 bg-slate-950 border border-white/5 rounded-2xl text-amber-500">
              <Zap className="w-8 h-8 fill-current animate-pulse" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full p-6 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: direction * 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -20 }}
            className="space-y-6"
          >
            <div className="space-y-4">
               <div className="flex items-center gap-2">
                 <Target className="w-5 h-5 text-red-500" />
                 <span className="text-xs font-black text-red-500 uppercase tracking-widest">OBJETIVO: ELIMINAR EL ERROR</span>
               </div>
               <h2 className="text-xl md:text-2xl font-bold leading-relaxed">{currentQuestion.question}</h2>
            </div>

            <div className="space-y-3">
              {(currentQuestion as any).options.map((option: string, idx: number) => {
                const isCorrect = idx === (currentQuestion as any).correctOption;
                const isSelected = selectedIdx === idx;
                const answered = selectedIdx !== undefined;

                let btnClass = "bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50";
                if (answered) {
                  if (isCorrect) btnClass = "bg-emerald-500/10 border-emerald-500 text-emerald-400";
                  else if (isSelected) btnClass = "bg-red-500/10 border-red-500 text-red-400";
                  else btnClass = "opacity-40 border-slate-800";
                }

                return (
                  <button
                    key={idx}
                    disabled={answered}
                    onClick={() => handleAnswer(idx)}
                    className={`w-full text-left p-5 rounded-2xl border transition-all duration-200 flex items-center gap-4 ${btnClass}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                      answered && isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="text-sm md:text-base font-medium">{option}</span>
                  </button>
                );
              })}
            </div>

            {selectedIdx !== undefined && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 bg-blue-600/5 border border-blue-500/20 rounded-2xl">
                 <div className="flex items-center gap-2 mb-2 text-blue-400">
                    <BrainCircuit className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Análisis Táctico</span>
                 </div>
                 <p className="text-sm text-slate-300 leading-relaxed italic">
                    "Identificar por qué fallaste esta pregunta es la clave para no fallar en el examen oficial."
                 </p>
                 <Button onClick={next} className="w-full mt-6 bg-white text-black font-black hover:bg-slate-200">
                    Siguiente Objetivo <ChevronRight className="w-4 h-4 ml-2" />
                 </Button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Progress Footer */}
      <footer className="p-6 max-w-2xl mx-auto w-full">
         <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-all duration-500"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
         </div>
      </footer>
    </div>
  );
};
