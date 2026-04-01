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
  RotateCcw
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

  useEffect(() => {
    if (!isPremium) {
      toast.error('La Zona Anti-Fallo es exclusiva para usuarios PRO');
      navigate('/yape-checkout');
    }
  }, [isPremium, navigate]);

  const questions = failedQuestionsQuery.data || [];
  const currentQuestion = questions[currentIndex];

  const handleAnswer = (optionIdx: number) => {
    if (answers[currentQuestion.id] !== undefined) return; // Prevent re-answering
    playUIClick();
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: optionIdx }));
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
      <header className="p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-blue-400">Zona Anti-Fallo</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Corrigiendo sector {currentIndex + 1} de {questions.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
           <Zap className="w-3 h-3 text-amber-400 fill-current" />
           <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">ENTRENAMIENTO PRO</span>
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
