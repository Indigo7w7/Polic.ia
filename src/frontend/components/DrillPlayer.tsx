import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, XCircle, ChevronRight, BrainCircuit, 
  RotateCcw, Sparkles, ShieldCheck, ArrowRight, Brain, Zap
} from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { trpc } from '../../shared/utils/trpc';
import { toast } from 'sonner';

interface Question {
  question: string;
  options: string[];
  correctOption: number;
  justification?: string;
}

interface DrillPlayerProps {
  unitId: number;
  areaId?: number;
  title: string;
  questions: Question[];
  isPerfectionMode?: boolean;
  onClose: () => void;
}

export const DrillPlayer: React.FC<DrillPlayerProps> = ({ unitId, areaId, title, questions: initialQuestions, isPerfectionMode, onClose }) => {
  const utils = trpc.useUtils();
  const [isPreparing, setIsPreparing] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showFinished, setShowFinished] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const restartTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mutations
  const recordFailure = trpc.learningReview.recordDrillFailure.useMutation();
  const resolveFailure = trpc.learningReview.resolveFailure.useMutation();
  const completeUnit = trpc.learningProgress.completeUnit.useMutation();
  
  // Dynamic question fetching for perfection mode
  const perfectionQuestions = trpc.learningReview.getPerfectionDrill.useQuery(
    { unitId: unitId > 0 ? unitId : undefined, areaId: unitId <= 0 ? areaId : undefined }, 
    { enabled: isPerfectionMode && (unitId > 0 || !!areaId) }
  );

  const questions = isPerfectionMode ? (perfectionQuestions.data || []) : initialQuestions;

  // Reset state when questions object changes
  React.useEffect(() => {
    setCurrentIndex(0);
    setSelectedIdx(null);
    setScore(0);
    setShowFinished(false);
    setIsFlipped(false);
    
    setIsPreparing(true);
    const timer = setTimeout(() => setIsPreparing(false), 1500);
    return () => clearTimeout(timer);
  }, [questions]);

  const currentQuestion = questions[currentIndex];

  const handleAnswer = async (idx: number) => {
    if (selectedIdx !== null) return;
    setSelectedIdx(idx);
    
    const isCorrect = idx === currentQuestion.correctOption;
    
    if (isCorrect) {
      const newScore = score + 1;
      setScore(newScore);

      if (isPerfectionMode) {
        // BUG-05 FIX: wrap async calls in try/catch
        try {
          await resolveFailure.mutateAsync({ unitId, questionIndex: currentIndex });
          utils.learningReview.getPerfectionStats.invalidate();
        } catch {
          // Non-fatal: progress will sync on next load
        }
      }
    } else {
      if (!isPerfectionMode) {
        try {
          await recordFailure.mutateAsync({ unitId, questionIndex: currentIndex });
          utils.learningReview.getPerfectionStats.invalidate();
        } catch {
          // Non-fatal: failure recording will retry on next session
        }
      }
      if (isPerfectionMode) setIsFlipped(true);
    }
  };

  const nextQuestion = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedIdx(null);
      setIsFlipped(false);
    } else {
      // Check for completion/unlocking (Only if not in perfection mode and score >= 70%)
      const passRate = 0.7;
      const isPassing = score / questions.length >= passRate;
      
      if (!isPerfectionMode && unitId > 0 && isPassing) {
        try {
          const res = await completeUnit.mutateAsync({ 
            unitId, 
            score, 
            totalQuestions: questions.length 
          });
          
          if (res.pointsAdded > 0) {
            toast.success(`+${res.pointsAdded} PUNTOS DE HONOR`, {
              icon: <Zap className="text-yellow-400 w-4 h-4" />,
              description: 'Tu prestigio como oficial ha aumentado.'
            });
          }
          
          utils.learningProgress.getUserProgress.invalidate();
        } catch (err) {
          console.error("Error reporting progress:", err);
        }
      }
      
      setShowFinished(true);
    }
  };

  const restart = () => {
    // BUG-14 FIX: clear any previous timer before setting a new one
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    setIsPreparing(true);
    restartTimerRef.current = setTimeout(() => {
      setCurrentIndex(0);
      setSelectedIdx(null);
      setScore(0);
      setShowFinished(false);
      setIsPreparing(false);
      setIsFlipped(false);
      restartTimerRef.current = null;
    }, 800);
  };

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    };
  }, []);

  if (isPreparing || (isPerfectionMode && perfectionQuestions.isLoading)) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
        <motion.div 
          animate={{ 
            rotate: 360,
            scale: [1, 1.1, 1],
            borderColor: ['#2563eb', '#06b6d4', '#2563eb']
          }} 
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="w-16 h-16 border-t-2 border-r-2 border-blue-500 rounded-full"
        />
        <div className="space-y-1">
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 animate-pulse">
            {isPerfectionMode ? 'Cargando Puntos Débiles' : 'Analizando Materia'}
          </h4>
          <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest leading-loose">
            {isPerfectionMode ? 'Sincronizando Errores Previos...' : 'Cargando Base de Conocimientos...'} <br/>
            Preparando Drill Táctico...
          </p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
        <div className="p-4 bg-emerald-500/10 rounded-full">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h3 className="text-xl font-black text-white uppercase tracking-tighter">¡Área Impecable!</h3>
        <p className="text-slate-500 text-sm max-w-xs">No tienes errores registrados en esta materia. Sigue entrenando para mantener tu nivel.</p>
        <Button onClick={onClose} className="bg-slate-800 text-white mt-4">Volver</Button>
      </div>
    );
  }

  if (showFinished) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-2">
          <ShieldCheck className="w-10 h-10 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">
            {isPerfectionMode ? '¡Perfeccionamiento Completado!' : '¡Entrenamiento Completado!'}
          </h2>
          <p className="text-slate-400 mt-2">Has dominado {score} de {questions.length} conceptos clave.</p>
        </div>
        <div className="w-full max-w-xs bg-slate-950/50 rounded-2xl p-4 border border-slate-800">
          <div className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1 text-left">Precisión de Repaso</div>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-black text-emerald-400">{Math.round((score / questions.length) * 100)}%</span>
            <span className="text-xs text-slate-500 mb-1">{score}/{questions.length} Aciertos</span>
          </div>
        </div>
        <div className="flex gap-4 w-full max-w-md">
          <Button onClick={restart} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold h-12">
            Reiniciar
          </Button>
          <Button onClick={onClose} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold h-12">
            Finalizar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 sm:bg-slate-900/50">
      {/* Progreso */}
      <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 rounded-lg shrink-0">
            <BrainCircuit className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-white line-clamp-1">{title}</h3>
            <div className="text-[9px] sm:text-[10px] text-slate-500 uppercase font-black tracking-widest mt-0.5">
              {isPerfectionMode ? 'Modo Perfeccionamiento' : `Pregunta ${currentIndex + 1} de ${questions.length}`}
            </div>
          </div>
        </div>
        <div className="h-1.5 w-20 sm:w-32 bg-slate-950 rounded-full overflow-hidden shrink-0">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            className="h-full bg-blue-500"
          />
        </div>
      </div>

      {/* Pregunta */}
      <div className="flex-1 p-4 sm:p-8 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6 sm:space-y-8"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg sm:text-2xl font-bold leading-tight sm:leading-relaxed text-white">
                {currentQuestion.question}
              </h2>
              {isPerfectionMode && (
                <button 
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl hover:bg-blue-600/30 transition-all border border-blue-500/30 shrink-0 shadow-lg shadow-blue-500/10"
                  title="Girar Tarjeta"
                >
                  <RotateCcw className={`w-5 h-5 transition-transform duration-500 ${isFlipped ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>

            <div className="space-y-3 sm:space-y-4">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedIdx === idx;
                const isCorrect = idx === currentQuestion.correctOption;
                const showFeedback = selectedIdx !== null || isFlipped;

                let variant = "bg-slate-950/50 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:scale-[1.01]";
                if (showFeedback) {
                  if (isCorrect) variant = "bg-emerald-600/30 border-emerald-500/50 text-emerald-50 scale-[1.02] shadow-[0_0_20px_rgba(16,185,129,0.1)]";
                  else if (isSelected) variant = "bg-red-600/20 border-red-500/50 text-red-50 opacity-90";
                  else variant = "bg-slate-950/20 border-slate-900 text-slate-600 opacity-40";
                }

                return (
                  <button
                    key={idx}
                    disabled={selectedIdx !== null}
                    onClick={() => handleAnswer(idx)}
                    className={`w-full text-left p-4 sm:p-5 rounded-[20px] border-2 transition-all duration-300 flex items-center gap-4 ${variant}`}
                  >
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-xs sm:text-sm font-black shrink-0 shadow-inner ${
                      showFeedback && isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {showFeedback && isCorrect ? <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" /> : String.fromCharCode(65 + idx)}
                    </div>
                    <span className="text-sm sm:text-base font-semibold leading-snug">{option}</span>
                  </button>
                );
              })}
            </div>

            {(selectedIdx !== null || isFlipped) && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="p-5 sm:p-6 bg-blue-600/10 border border-blue-500/20 rounded-[24px] space-y-3 shadow-[0_20px_50px_rgba(37,99,235,0.1)]"
              >
                <div className="flex items-center gap-2 text-blue-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em]">
                  <Sparkles className="w-4 h-4 animate-pulse" /> &gt; Justificación Táctica_
                </div>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed border-l-2 border-blue-500/30 pl-4 py-1 italic font-medium">
                  {currentQuestion.justification || "Análisis técnico: Respuesta confirmada mediante el banco de datos oficial. Memorice este concepto para el simulacro nacional."}
                </p>
              </motion.div>
            )}
            <div className="h-10 invisible" /> {/* Spacer for scroll padding */}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-950/50 backdrop-blur-lg flex justify-between items-center gap-4">
        <button 
          onClick={onClose}
          className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors"
        >
          Abandonar
        </button>
        <Button 
          disabled={selectedIdx === null && !isFlipped}
          onClick={nextQuestion}
          className="flex-1 sm:flex-none px-10 h-14 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-blue-600/20 active:scale-95 transition-all text-sm uppercase tracking-wider"
        >
          {currentIndex === questions.length - 1 ? 'Finalizar Entrenamiento' : 'Continuar_'}
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};
