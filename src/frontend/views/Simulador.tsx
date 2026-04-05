import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../store/useExamStore';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TimerRing } from '../components/ui/TimerRing';
import { ChevronRight, ChevronLeft, Send, ShieldAlert, Grid3X3, Skull, BrainCircuit, CheckCircle2 } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { playUIClick } from '../utils/sounds';

export const Simulador: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMuerteSubita = location.state?.isMuerteSubita || false;
  const isPracticeMode = location.state?.isPracticeMode || false;
  const examLevelId = location.state?.examLevelId || null;
  const {
    examenActivo,
    preguntas,
    respuestasUsuario,
    tiempoRestante,
    registrarRespuesta,
    recuperarMision,
    finalizarExamen,
    setTiempoRestante,
  } = useExamStore();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [showImmediateFeedback, setShowImmediateFeedback] = useState(false);

  // Reset feedback state when question changes
  useEffect(() => {
    setShowImmediateFeedback(false);
  }, [currentQuestionIndex]);

  const TOTAL_TIME = 1800;

  const handleTimeUp = useCallback(() => {
    finalizarExamen();
    localStorage.removeItem('cadetepro_mission_progress'); 
    navigate('/resultados', {
      state: { answers: useExamStore.getState().respuestasUsuario, questions: preguntas, examLevelId },
    });
  }, [finalizarExamen, navigate, preguntas, examLevelId]);

  useEffect(() => {
    const saved = localStorage.getItem('cadetepro_mission_progress');
    if (saved) {
      try {
        const { answers, timeLeft, timestamp } = JSON.parse(saved);
        if (Date.now() - timestamp < 7200000) {
          recuperarMision(answers, timeLeft);
        }
      } catch (e) {
        console.error('Error al recuperar misión');
      }
    }
  }, [recuperarMision]);

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

  useEffect(() => {
    if (examenActivo && Object.keys(respuestasUsuario).length > 0) {
      localStorage.setItem('cadetepro_mission_progress', JSON.stringify({
        answers: respuestasUsuario,
        timeLeft: tiempoRestante,
        timestamp: Date.now()
      }));
    }
  }, [respuestasUsuario, tiempoRestante, examenActivo]);

  const goTo = (idx: number) => {
    playUIClick();
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
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center py-12 border-slate-800 bg-slate-900">
          <CardContent>
            <ShieldAlert className="w-16 h-16 text-cyan-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2 text-white">Cargando Batería Táctica</h2>
            <p className="text-slate-400 mb-6">Preparando el entorno de misión de campo...</p>
            <Button onClick={() => navigate('/')} className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black">Abortar Misión</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = preguntas[currentQuestionIndex];
  const selectedAnswerIndex = respuestasUsuario[currentQuestion.id];

  return (
    <div
      className={`min-h-screen text-[#f8fafc] flex flex-col font-mono relative overflow-hidden transition-colors duration-700 ${isDanger ? 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/40 via-[#1a0505] to-[#0a0202]' : 'bg-[#020617]'}`}
    >
      {/* TACTICAL OVERLAY: SCANLINES & NOISE */}
      <div className="fixed inset-0 pointer-events-none z-[60] opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
      <div className="fixed inset-0 pointer-events-none z-[60] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,0,0.06))] bg-[length:100%_2px,3px_100%]" />
      
      {/* DEATH PULSE FRAME */}
      {isMuerteSubita && (
        <div className="fixed inset-0 pointer-events-none z-50 border-[4px] border-red-600/20 animate-pulse" />
      )}

      <ConfirmModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onConfirm={confirmExit}
        title="Misión Incompleta"
        message={`Tienes ${preguntas.length - answeredCount} sectores sin asegurar. Si abortas ahora, se reportarán como fallidos.`}
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
              <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-400 mb-4">
                Radar de Misión — {answeredCount}/{preguntas.length} asegurados
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
                          ? 'bg-cyan-600 text-slate-900 ring-2 ring-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]'
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

      {/* Sticky HUD Section */}
      <div className="sticky top-0 z-40 p-4 md:p-6 pb-2">
        <div className={`max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] relative overflow-hidden shadow-2xl transition-all ${isDanger ? 'border-red-500/30' : ''}`}>
          <div className={`absolute top-0 right-0 w-64 h-64 ${isDanger ? 'bg-red-500' : 'bg-blue-500'}/[0.05] rounded-full blur-[80px] pointer-events-none`} />
          
          <div className="flex items-center gap-5 relative z-10 w-full sm:w-auto">
            <button 
              onClick={() => setShowExitModal(true)}
              className="p-3 bg-slate-950 border border-white/5 rounded-2xl text-slate-500 hover:text-white transition-all hover:scale-105"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 sm:flex-none">
              <div className={`text-[9px] font-black uppercase tracking-[0.3em] mb-1 ${isDanger ? 'text-red-500 animate-pulse' : 'text-cyan-500'}`}>
                {isDanger ? '☣️ Colapso Temporal' : 'Operación Activa_'}
              </div>
              <div className="flex items-center gap-3">
                 <h1 className="text-xl font-black text-white uppercase tracking-tighter sm:text-2xl">Misión {currentQuestionIndex + 1}/{preguntas.length}</h1>
                 <div className="w-24 h-1 bg-slate-950 border border-white/5 rounded-full overflow-hidden hidden md:block">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${((currentQuestionIndex + 1) / preguntas.length) * 100}%` }}
                     className="h-full bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                   />
                 </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 relative z-10 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-3 bg-slate-950/50 border border-white/5 p-2 pr-6 rounded-2xl">
               <TimerRing secondsTotal={TOTAL_TIME} secondsLeft={tiempoRestante} size={50} />
               <div>
                  <div className={`text-[8px] font-black uppercase tracking-[0.2em] ${isDanger ? 'text-red-400' : 'text-slate-500'}`}>Extracción</div>
                  <div className={`text-sm font-black font-mono tracking-widest ${isDanger ? 'text-red-500' : 'text-white'}`}>
                    {Math.floor(tiempoRestante / 60)}:{(tiempoRestante % 60).toString().padStart(2, '0')}
                  </div>
               </div>
            </div>

            <button
              onClick={() => setShowMap(true)}
              className="p-4 bg-slate-950 border border-white/5 rounded-2xl text-slate-500 hover:text-cyan-400 transition-all hover:scale-105 relative group"
            >
              <Grid3X3 className="w-5 h-5" />
              <div className="absolute -top-1 -right-1 bg-cyan-600 text-slate-950 text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#020617] group-hover:bg-cyan-400">
                {answeredCount}
              </div>
            </button>
          </div>
        </div>
        {/* Danger line below HUD if critical */}
        {isDanger && (
          <motion.div 
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            className="h-0.5 max-w-4xl mx-auto bg-red-600 mt-2 rounded-full overflow-hidden"
          >
            <motion.div 
              animate={{ opacity: [1, 0, 1] }} 
              transition={{ repeat: Infinity, duration: 1 }} 
              className="w-full h-full bg-red-400 shadow-[0_0_10px_rgba(239,68,68,0.8)]"
            />
          </motion.div>
        )}
      </div>

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
              <h2 className="text-xl md:text-2xl font-bold text-slate-100 leading-tight">
                {currentQuestion.texto}
              </h2>
            </div>

            <div className="space-y-3">
              {currentQuestion.options.map((opcion, idx) => {
                const isSelected = selectedAnswerIndex === idx;
                const isPractice = isPracticeMode || (examLevelId && parseInt(examLevelId) < 3);
                const showFeedback = (isPractice && selectedAnswerIndex !== undefined) || showImmediateFeedback;
                const isCorrect = idx === currentQuestion.correctOptionIndex;

                let btnClass = isSelected
                      ? 'bg-cyan-600/20 border-cyan-500 text-cyan-50 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                      : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-600 hover:bg-slate-800/60';
                
                let letterClass = isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500';

                if (showFeedback) {
                  if (isCorrect) {
                     btnClass = 'bg-emerald-600/20 border-emerald-500 text-emerald-50 shadow-[0_0_15px_rgba(16,185,129,0.2)]';
                     letterClass = 'bg-emerald-500/80 text-white';
                  } else if (isSelected) {
                     btnClass = 'bg-red-600/20 border-red-500 text-red-50';
                     letterClass = 'bg-red-500/80 text-white';
                  } else {
                     btnClass = 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-50';
                  }
                }

                return (
                <motion.button
                  key={idx}
                  whileTap={{ scale: 0.98 }}
                  disabled={showFeedback}
                  onClick={() => {
                    playUIClick();
                    registrarRespuesta(currentQuestion.id, idx);
                    if (isMuerteSubita && currentQuestion.correctOptionIndex !== idx) {
                      finalizarExamen();
                      navigate('/resultados', { state: { answers: { ...respuestasUsuario, [currentQuestion.id]: idx }, questions: preguntas } });
                    }
                  }}
                  className={`w-full text-left p-5 rounded-2xl border transition-all duration-200 flex items-center gap-4 min-h-[64px] ${btnClass}`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0 transition-colors ${letterClass}`}>
                    {showFeedback && isCorrect ? <CheckCircle2 className="w-5 h-5" /> : String.fromCharCode(65 + idx)}
                  </div>
                  <span className="text-sm md:text-base font-medium leading-snug">{opcion}</span>
                </motion.button>
              )})}
            </div>
            
            {(isPracticeMode || (examLevelId && parseInt(examLevelId) < 3) || showImmediateFeedback) && selectedAnswerIndex !== undefined && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-4 bg-slate-900/80 rounded-xl border border-slate-700 shadow-inner">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
                   <BrainCircuit className="w-4 h-4 text-amber-400" /> Reporte de Inteligencia
                 </p>
                 <p className="text-slate-300 text-sm leading-relaxed">{currentQuestion.justification}</p>
                 {selectedAnswerIndex === currentQuestion.correctOptionIndex ? (
                    <div className="mt-3 text-emerald-400 font-bold text-xs">¡Excelente decisión táctica!</div>
                 ) : (
                    <div className="mt-3 text-red-400 font-bold text-xs flex items-center gap-2">
                      <ShieldAlert className="w-3.5 h-3.5" /> 
                      Revisa la justificación para evitar fallos en combate real.
                    </div>
                 )}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer navigation */}
      <footer className="border-t border-slate-800/80 p-4" style={{ background: isDanger ? 'rgba(20,5,5,0.95)' : 'rgba(6,13,26,0.95)' }}>
        <div className="max-w-3xl mx-auto flex gap-3">
          <Button
            variant="secondary"
            className="h-14 flex-1 gap-2 border-slate-700 hover:border-slate-500"
            onClick={() => goTo(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="w-5 h-5 text-slate-500" />
            <span className="hidden sm:inline text-[10px] font-black tracking-widest">RETROCESO TÁCTICO</span>
          </Button>

          {currentQuestionIndex === preguntas.length - 1 ? (
            <Button
              variant="primary"
              className="h-14 flex-1 gap-2 bg-emerald-600 hover:bg-emerald-500 font-black shadow-[0_0_15px_rgba(16,185,129,0.3)] text-slate-950 uppercase tracking-widest"
              onClick={handleFinish}
            >
              <Send className="w-5 h-5" />
              Finalizar Operación
            </Button>
          ) : (
            <Button
              variant="primary"
              className="h-14 flex-1 gap-2 font-black shadow-[0_0_10px_rgba(59,130,246,0.2)]"
              onClick={() => goTo(Math.min(preguntas.length - 1, currentQuestionIndex + 1))}
            >
              <span className="hidden sm:inline text-[10px] tracking-widest">CONTINUAR AVANCE</span>
              <ChevronRight className="w-5 h-5" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
};
