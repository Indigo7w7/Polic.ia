import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../../shared/utils/trpc';
import { useUserStore } from '../store/useUserStore';
import {
  ChevronLeft,
  Send,
  Users,
  Clock,
  Star,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Bot,
  UserCheck,
  MessageSquare,
  CircleDot,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const MAX_QUESTIONS = 10;
const WAIT_TIMEOUT_SECONDS = 90;

const SOCKET_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001' 
  : 'https://polic-ia-production.up.railway.app'; // Reemplazar con URL real si es distinta

// ─── WAITING ROOM ─────────────────────────────────────────────
const WaitingRoom = ({
  secondsElapsed,
  onCancel,
  onPractice,
  showPracticeOffer,
}: {
  secondsElapsed: number;
  onCancel: () => void;
  onPractice: () => void;
  showPracticeOffer: boolean;
}) => (
  <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#1e1b4b,_#020617_60%)] flex items-center justify-center p-6 text-white font-sans">
    <div className="w-full max-w-lg text-center space-y-12">
      <AnimatePresence mode="wait">
        {!showPracticeOffer ? (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="space-y-12"
          >
            <div className="relative mx-auto w-48 h-48">
              <motion.div
                className="absolute inset-0 rounded-full border-[1px] border-blue-500/20"
                animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-[1px] border-blue-400/40"
                animate={{ scale: [1, 1.2], opacity: [0.5, 0] }}
                transition={{ duration: 2, delay: 0.5, repeat: Infinity }}
              />
              <div className="absolute inset-4 rounded-full bg-blue-600/10 backdrop-blur-xl border border-blue-500/30 flex items-center justify-center">
                <Users className="w-16 h-16 text-blue-400" />
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-light tracking-tight">Sincronizando...</h1>
              <p className="text-slate-400 text-lg font-light max-w-sm mx-auto">
                Buscando un compañero de estudio para tu sesión de evaluación mutua.
              </p>
              <div className="pt-8">
                 <div className="text-slate-500 font-mono text-sm tracking-widest uppercase mb-4">
                  Tiempo de espera: {secondsElapsed}s
                </div>
                <div className="max-w-xs mx-auto h-1 bg-slate-900 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-blue-500"
                    animate={{ width: `${(secondsElapsed / WAIT_TIMEOUT_SECONDS) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={onCancel}
              className="text-slate-500 hover:text-white transition-colors text-sm font-bold tracking-widest uppercase"
            >
              Cancelar sesión
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="practice-offer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
             <div className="p-8 bg-blue-900/10 backdrop-blur-2xl border border-blue-500/20 rounded-[2.5rem] shadow-2xl">
              <AlertCircle className="w-12 h-12 text-blue-400 mx-auto mb-6" />
              <h2 className="text-2xl font-normal mb-4">Módulo saturado</h2>
              <p className="text-slate-400 leading-relaxed text-lg font-light">
                No hay postulantes activos en este momento. Si deseas, puedes realizar una <span className="text-blue-400 font-medium">práctica individual</span> supervisada por nuestra IA.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <button
                onClick={onPractice}
                className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-[0_0_40px_rgba(37,99,235,0.3)] flex items-center justify-center gap-3 text-lg"
              >
                <Bot className="w-6 h-6" />
                Iniciar práctica asistida
              </button>
              <button
                onClick={onCancel}
                className="w-full py-4 bg-transparent border border-slate-800 hover:border-slate-600 text-slate-400 hover:text-white rounded-2xl font-bold transition-all"
              >
                Seguir esperando postulante
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
);

// ─── SCORE SCREEN ──────────────────────────────────────────────
const ScoreSlider = ({ value, onChange }: { value: number; onChange: (v: number) => void; }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-end">
      <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Rendimiento</span>
      <span className="text-6xl font-extralight text-white">{value}<span className="text-2xl text-slate-600">/20</span></span>
    </div>
    <input
      type="range"
      min={0}
      max={20}
      step={1}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
    />
    <div className="grid grid-cols-6 gap-2">
      {[0, 5, 10, 11, 14, 20].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`py-2 text-[10px] font-black rounded-xl border transition-all ${
            value === n ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  </div>
);

// ─── MAIN COMPONENT ────────────────────────────────────────────
export const EntrevistaEnVivo: React.FC = () => {
  const navigate = useNavigate();
  const { uid, name } = useUserStore();

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [role, setRole] = useState<'A' | 'B'>('A');
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [lastMsgId, setLastMsgId] = useState<number>(0);
  const [input, setInput] = useState('');
  const [myScore, setMyScore] = useState(10);
  const [hasSubmittedScore, setHasSubmittedScore] = useState(false);
  const [secondsWaiting, setSecondsWaiting] = useState(0);
  const [showPracticeOffer, setShowPracticeOffer] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const findOrCreate = trpc.interview.findOrCreate.useMutation();
  const startPractice = trpc.interview.startPractice.useMutation();
  const sendMessage = trpc.interview.sendMessage.useMutation();
  const submitScore = trpc.interview.submitScore.useMutation();
  const cancelSession = trpc.interview.cancelSession.useMutation();
  const socketRef = useRef<any>(null);

  const sessionQuery = trpc.interview.getSession.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId, refetchOnWindowFocus: false }
  );

  const messagesQuery = trpc.interview.getMessages.useQuery(
    { sessionId: sessionId!, since: lastMsgId },
    { enabled: !!sessionId && session?.status !== 'waiting', refetchOnWindowFocus: false }
  );

  useEffect(() => {
    if (!uid || !name) return;
    findOrCreate.mutateAsync({ userId: uid, userName: name }).then((res) => {
      setSessionId(res.session.id);
      setRole(res.role as 'A' | 'B');
      setSession(res.session);
    });
  }, [uid, name]);

  useEffect(() => {
    if (!sessionId || session?.status !== 'waiting') return;
    const interval = setInterval(() => {
      setSecondsWaiting((s) => {
        const next = s + 1;
        if (next >= WAIT_TIMEOUT_SECONDS) setShowPracticeOffer(true);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionId, session?.status]);

  // SOCKET.IO CONNECTION
  useEffect(() => {
    if (!sessionId) return;

    if (typeof window === 'undefined' || !(window as any).io) return;
    const socket = (window as any).io(SOCKET_URL, {
      transports: ['websocket'],
      upgrade: false
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[WS] Connected to server');
      socket.emit('join_session', sessionId.toString());
    });

    socket.on('session_update', (data: any) => {
      console.log('[WS] Update received:', data.type);
      
      if (data.achievementsUnlocked && data.achievementsUnlocked.length > 0) {
        data.achievementsUnlocked.forEach((ach: any) => {
          useUserStore.getState().pushAchievement(ach);
        });
      }

      // Trigger data refresh
      sessionQuery.refetch();
      messagesQuery.refetch();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId]);

  useEffect(() => {
    if (sessionQuery.data) setSession(sessionQuery.data);
  }, [sessionQuery.data]);

  useEffect(() => {
    if (messagesQuery.data && messagesQuery.data.length > 0) {
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newMsgs = messagesQuery.data.filter((m: any) => !existingIds.has(m.id));
        if (newMsgs.length === 0) return prev;
        const updated = [...prev, ...newMsgs];
        setLastMsgId(updated[updated.length - 1].id);
        return updated;
      });
    }
  }, [messagesQuery.data]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !sessionId || !uid || !name || isSending) return;
    setIsSending(true);
    const text = input.trim();
    setInput('');
    try {
      await sendMessage.mutateAsync({
        sessionId,
        userId: uid,
        userName: name,
        message: text,
      });
    } catch (e: any) {
      toast.error(e.message || 'Error al enviar.');
    } finally {
      setIsSending(false);
    }
  }, [input, sessionId, uid, name, isSending]);


  const handleCancel = async () => {
    if (sessionId) await cancelSession.mutateAsync({ sessionId });
    navigate('/');
  };

  const handlePractice = async () => {
    if (!uid || !name) return;
    const res = await startPractice.mutateAsync({ userId: uid, userName: name });
    setSessionId(res.session.id);
    setRole('A');
    setSession(res.session);
    setShowPracticeOffer(false);
  };

  const handleSubmitScore = async () => {
    if (!sessionId || !uid) return;
    const res = await submitScore.mutateAsync({ sessionId, userId: uid, score: myScore });
    
    if (res.achievementsUnlocked && res.achievementsUnlocked.length > 0) {
      res.achievementsUnlocked.forEach((ach: any) => {
        useUserStore.getState().pushAchievement(ach);
      });
    }

    setHasSubmittedScore(true);
    toast.success('Puntuación registrada.');
  };

  if (!sessionId || (session?.status === 'waiting' && !session?.userBId)) {
    return (
      <WaitingRoom
        secondsElapsed={secondsWaiting}
        onCancel={handleCancel}
        onPractice={handlePractice}
        showPracticeOffer={showPracticeOffer}
      />
    );
  }

  const isInterviewer = session?.currentInterviewerId === uid;
  const isInterviewee = !isInterviewer && (session?.userAId === uid || session?.userBId === uid);
  
  const currentTurnStatus = session?.currentTurnStatus;
  const canIType = (isInterviewer && currentTurnStatus === 'questioning') || 
                  (isInterviewee && currentTurnStatus === 'responding');

  const actualPartnerName = role === 'A' ? session?.userBName : session?.userAName;

  const msgInPhaseCount = (session?.aQuestionCount || 0) + (session?.bQuestionCount || 0);
  const cycleNumber = Math.ceil((msgInPhaseCount + 1) / 2);

  // ─── RESULTS SCREEN ───────────────────────────────────────────
  if (session?.status === 'done') {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#1e1b4b,_#020617_80%)] flex items-center justify-center p-6 text-white">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl space-y-12">
          <div className="text-center space-y-4">
            <div className="mx-auto w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-12 h-12 text-blue-400" />
            </div>
            <h1 className="text-5xl font-extralight tracking-tight">Evaluación completa</h1>
            <p className="text-slate-400 text-xl font-light">Resultados obtenidos</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
             <div className="p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] text-center space-y-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Recibida</p>
                <div className="text-7xl font-extralight">{(role === 'A' ? session?.scoreBtoA : session?.scoreAtoB) ?? '—'}</div>
                <p className="text-slate-400 text-sm font-light">Calificación de {actualPartnerName}</p>
             </div>
             <div className="p-8 bg-blue-600/10 backdrop-blur-xl border border-blue-500/20 rounded-[2.5rem] text-center space-y-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">Entregada</p>
                <div className="text-7xl font-extralight">{(role === 'A' ? session?.scoreAtoB : session?.scoreBtoA) ?? '—'}</div>
                <p className="text-slate-400 text-sm font-light">A {actualPartnerName}</p>
             </div>
          </div>

          <button onClick={() => navigate('/')} className="w-full py-6 bg-white text-black font-black rounded-3xl hover:bg-slate-200 transition-all text-xl shadow-2xl">
            Volver al inicio
          </button>
        </motion.div>
      </div>
    );
  }

  // ─── RATING SCREEN ────────────────────────────────────────────
  if (session?.status === 'rating') {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_bottom_right,_#1e1b4b,_#020617_70%)] flex items-center justify-center p-6 text-white font-sans">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg space-y-12">
          <div className="text-center space-y-4">
            <Star className="w-16 h-16 text-blue-500 mx-auto mb-6" />
            <h2 className="text-4xl font-light tracking-tight">Evaluación final</h2>
            <p className="text-slate-400 text-lg font-light leading-relaxed">
              Define el nivel mostrado por <span className="text-white font-medium">{actualPartnerName}</span>. Considera la calidad de sus respuestas y la seriedad de sus preguntas.
            </p>
          </div>

          <div className="p-10 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] shadow-2xl">
            <ScoreSlider value={myScore} onChange={setMyScore} />
            <div className="mt-12">
                 <button
                    onClick={handleSubmitScore}
                    disabled={hasSubmittedScore}
                    className="w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 text-lg"
                    >
                    {hasSubmittedScore ? (
                        <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Esperando compañero...
                        </>
                    ) : (
                        <>
                        <CheckCircle2 className="w-5 h-5" />
                        Finalizar evaluación
                        </>
                    )}
                </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── CHAT SCREEN ("SYNCRA" MODE) ──────────────────────────────────
  let statusBanner = "";
  if (currentTurnStatus === 'questioning') {
    statusBanner = isInterviewer ? "Tu turno: Haz tu pregunta" : `Esperando pregunta de ${actualPartnerName}`;
  } else if (currentTurnStatus === 'responding') {
    statusBanner = isInterviewee ? "Tu turno: Responde ahora" : `${actualPartnerName} está respondiendo...`;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#0f172a,_#020617_90%)] text-white flex flex-col font-sans overflow-hidden">
      
      {/* Visual background overlay (Syncra glow) */}
      <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-indigo-600/5 blur-[100px] rounded-full" />
      </div>

      <header className="sticky top-0 z-[100] px-8 py-6 flex items-center justify-between border-b border-white/5 backdrop-blur-xl bg-[#020617]/80">
        <div className="flex items-center gap-6">
            <button onClick={() => { if (window.confirm('¿Deseas salir de la sesión?')) handleCancel(); }} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
                <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
                <h1 className="text-2xl font-light tracking-tight">{actualPartnerName}</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500/80">
                   Fase {session?.phase || 1} — Ciclo {cycleNumber > 10 ? 10 : cycleNumber} de 10
                </p>
            </div>
        </div>
        
        <div className="flex items-center gap-8">
            <div className="text-right hidden sm:block">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                   {isInterviewer ? 'Evaluando...' : 'Siendo evaluado...'}
                </div>
                <div className="flex gap-1 justify-end">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className={`h-1 w-4 rounded-full ${i < cycleNumber - 1 ? 'bg-blue-500' : 'bg-slate-800'}`} />
                    ))}
                </div>
            </div>
            {session?.isPractice && (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
                    <Bot className="w-4 h-4 text-blue-400" />
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Feedback IA</span>
                </div>
            )}
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden relative z-10 px-8 py-4">
        <div className="flex-1 overflow-y-auto space-y-8 scrollbar-hide py-4 pr-2">
            <AnimatePresence initial={false}>
                {messages.map((msg, idx) => {
                    const isMe = msg.senderId === uid;
                    const isSystem = msg.senderId === 'SYSTEM';
                    
                    if (isSystem) return (
                        <div key={msg.id} className="flex justify-center my-4">
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.25em] bg-blue-600/10 border border-blue-500/20 px-6 py-2 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.1)]">{msg.message}</span>
                        </div>
                    );

                    return (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[80%] space-y-2 group`}>
                                <div className={`px-6 py-4 rounded-[2rem] text-lg font-light leading-relaxed backdrop-blur-xl ${
                                    isMe 
                                    ? 'bg-blue-600 text-white shadow-[0_10px_30px_rgba(37,99,235,0.2)] rounded-tr-sm' 
                                    : 'bg-white/5 border border-white/10 text-slate-100 rounded-tl-sm'
                                }`}>
                                     {msg.isQuestion && (
                                        <div className="text-[9px] font-black uppercase text-blue-300 tracking-[0.2em] mb-2 border-b border-white/10 pb-2">Planteamiento del Jurado</div>
                                    )}
                                    {msg.message}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
            <div ref={chatEndRef} />
        </div>

        {/* Global Status HUD */}
        <div className="flex justify-center py-4">
            <div className="px-6 py-2 bg-[#020617]/40 border border-white/5 rounded-full flex items-center gap-3 backdrop-blur-2xl">
                <CircleDot className={`w-2.5 h-2.5 ${canIType ? 'text-emerald-500 animate-pulse' : 'text-slate-600'}`} />
                <span className="text-xs font-medium text-slate-400 tracking-wide">{statusBanner}</span>
            </div>
        </div>
      </main>

      <footer className="px-8 pb-10 pt-4 relative z-10">
        <div className="max-w-4xl mx-auto">
            <div className={`relative group transition-all duration-500 ${!canIType ? 'opacity-30 blur-[2px] grayscale pointer-events-none' : 'opacity-100'}`}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder={isInterviewer ? "Escribe tu pregunta..." : "Escribe tu respuesta..."}
                    className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-[2.5rem] px-8 py-6 text-xl font-light focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600 backdrop-blur-2xl"
                />
                <button
                    onClick={handleSend}
                    disabled={!input.trim() || isSending}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-blue-600 text-white rounded-full hover:bg-blue-500 transition-all disabled:opacity-0 disabled:scale-90 shadow-xl"
                >
                    {isSending ? <Loader2 className="w-6 h-6 animate-spin" /> : <ArrowRight className="w-6 h-6" />}
                </button>
            </div>
        </div>
      </footer>
    </div>
  );
};
