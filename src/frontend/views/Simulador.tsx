import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../store/useExamStore';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TimerRing } from '../components/ui/TimerRing';
import { ChevronRight, ChevronLeft, Send, ShieldAlert, Grid3X3, Skull } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';

export const Simulador: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMuerteSubita = location.state?.isMuerteSubita || false;
  const examLevelId = location.state?.examLevelId || null;
  const {
    examenActivo,
    preguntas,
    respuestasUsuario,
    tiempoRestante,
    registrarRespuesta,
    finalizarExamen,
    setTiempoRestante,
  } = useExamStore();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);

  const TOTAL_TIME = 1800;

  const handleTimeUp = useCallback(() => {
    finalizarExamen();
    navigate('/resultados', {
      state: { answers: useExamStore.getState().respuestasUsuario, questions: preguntas, examLevelId },
    });
  }, [finalizarExamen, navigate, preguntas]);

  useEffect(() => {
    if (!examenActivo) return;
    const timer = setInterval(() => {
      setTiempoRestante((prev) => {
        if (prev <= 1) { clearInterval(timer); handleTimeUp(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [examenActivo, setTiempoRestante, handleTimeUp]);

  const goTo = (idx: number) => {
    setDirection(idx > currentQuestionIndex ? 1 : -1);
    setCurrentQuestionIndex(idx);
    setShowMap(false);
  };

  const handleFinish = () => {
    if (Object.keys(respuestasUsuario).length < preguntas.length) {
      setShowExitModal(true);
    } else {
      finalizarExamen();
      navigate('/resultados', { state: { answers: respuestasUsuario, questions: preguntas, examLevelId } });
    }
  };

  const confirmExit = () => {
    finalizarExamen();
    navigate('/');
  };

  const answeredCount = Object.keys(respuestasUsuario).length;
  const isLowTime = tiempoRestante < 300;
  const isDanger = tiempoRestante < 120;

  if (preguntas.length === 0) {
    return (
      <div className="min-h-screen bg-[#060d1a] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center py-12 border-slate-800 bg-slate-900">
          <CardContent>
            <ShieldAlert className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2 text-white">Cargando Batería de Preguntas</h2>
            <p className="text-slate-400 mb-6">Preparando el entorno de simulación táctica...</p>
            <Button onClick={() => navigate('/')}>Volver al Centro de Mando</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = preguntas[currentQuestionIndex];
  const selectedAnswerIndex = respuestasUsuario[currentQuestion.id];

  return (
    <div
      className="min-h-screen text-[#f8fafc] flex flex-col font-sans"
      style={{ background: isDanger ? '#0f0505' : '#060d1a' }}
    >
      <ConfirmModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onConfirm={confirmExit}
        title="Examen Incompleto"
        message={`Tienes ${preguntas.length - answeredCount} preguntas sin responder. Si finalizas, se calificarán como incorrectas.`}
      />

      {/* Question map overlay */}
      <AnimatePresence>
        {showMap && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowMap(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">
                Mapa de Preguntas — {answeredCount}/{preguntas.length} respondidas
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {preguntas.map((q, idx) => {
                  const answered = respuestasUsuario[q.id] !== undefined;
                  const isCurrent = idx === currentQuestionIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => goTo(idx)}
                      className={`aspect-square rounded-lg text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                          : answered
                          ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-600/40'
                          : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-600/30 rounded inline-block" />Respondida</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-slate-800 rounded inline-block" />Pendiente</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header
        className="sticky top-0 z-40 border-b border-slate-800/80 p-3 backdrop-blur-md"
        style={{ background: isDanger ? 'rgba(20,5,5,0.9)' : 'rgba(6,13,26,0.9)' }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowExitModal(true)} className="text-slate-500 hover:text-white transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Progress bar */}
            <div className="hidden sm:block">
              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1">
                Pregunta {currentQuestionIndex + 1} de {preguntas.length}
              </div>
              <div className="w-40 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / preguntas.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Center: Timer ring */}
          <TimerRing secondsTotal={TOTAL_TIME} secondsLeft={tiempoRestante} size={72} />

          {/* Map button */}
          <button
            onClick={() => setShowMap(true)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-all"
          >
            <Grid3X3 className="w-4 h-4" />
            <span className="hidden sm:inline">{answeredCount}/{preguntas.length}</span>
          </button>
        </div>

        {/* Danger bar */}
        {isDanger && (
          <div className="mt-2 h-0.5 bg-red-600 animate-pulse" />
        )}
      </header>

      {/* Question */}
      <main className="flex-1 max-w-3xl mx-auto w-full p-4 md:p-8 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-500/20">
                  {currentQuestion.area || 'General'}
                </span>
                {isLowTime && !isDanger && (
                  <span className="px-3 py-1 bg-amber-500/10 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-500/20 animate-pulse">
                    ⚠ Tiempo limitado
                  </span>
                )}
                {isDanger && (
                  <span className="px-3 py-1 bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-red-500/20 animate-pulse">
                    🚨 ¡Tiempo crítico!
                  </span>
                )}
                {isMuerteSubita && (
                  <span className="px-3 py-1 bg-red-900/50 text-red-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-red-500/30 flex items-center gap-1">
                    <Skull className="w-3 h-3" /> MUERTE SÚBITA
                  </span>
                )}
              </div>
              <h2 className="text-xl md:text-2xl font-bold leading-relaxed text-white">
                {currentQuestion.text}
              </h2>
            </div>

            <div className="space-y-3">
              {currentQuestion.options.map((opcion, idx) => (
                <motion.button
                  key={idx}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    registrarRespuesta(currentQuestion.id, idx);
                    if (isMuerteSubita && currentQuestion.correctOptionIndex !== idx) {
                      finalizarExamen();
                      navigate('/resultados', { state: { answers: { ...respuestasUsuario, [currentQuestion.id]: idx }, questions: preguntas } });
                    }
                  }}
                  className={`w-full text-left p-5 rounded-2xl border transition-all duration-200 flex items-center gap-4 min-h-[64px] ${
                    selectedAnswerIndex === idx
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-600 hover:bg-slate-800/60'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0 transition-colors ${
                    selectedAnswerIndex === idx ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className="text-sm md:text-base font-medium leading-snug">{opcion}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer navigation */}
      <footer className="border-t border-slate-800/80 p-4" style={{ background: isDanger ? 'rgba(20,5,5,0.95)' : 'rgba(6,13,26,0.95)' }}>
        <div className="max-w-3xl mx-auto flex gap-3">
          <Button
            variant="secondary"
            className="h-14 flex-1 gap-2"
            onClick={() => goTo(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Anterior</span>
          </Button>

          {currentQuestionIndex === preguntas.length - 1 ? (
            <Button
              variant="primary"
              className="h-14 flex-1 gap-2 bg-emerald-600 hover:bg-emerald-500 font-black"
              onClick={handleFinish}
            >
              <Send className="w-5 h-5" />
              Finalizar Examen
            </Button>
          ) : (
            <Button
              variant="primary"
              className="h-14 flex-1 gap-2 font-bold"
              onClick={() => goTo(Math.min(preguntas.length - 1, currentQuestionIndex + 1))}
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ChevronRight className="w-5 h-5" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
};
