import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { trpc } from '../../shared/utils/trpc';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/useUserStore';
import { playUIClick } from '../utils/sounds';
import {
  ArrowLeft, Brain, RotateCcw, CheckCircle2, Loader2,
  Trophy, BarChart3, TrendingUp, ChevronLeft, Keyboard,
  Undo2, X, Zap, Volume2, Edit3, Search, Download
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, ResponsiveContainer,
  Tooltip, PieChart, Pie, Cell
} from 'recharts';
import { sanitizeHTML, CARD_STYLES, HINT_SCRIPT } from '../../shared/utils/cardRenderer';
import { evaluateAnswer, buildDiffHtml } from '../../shared/utils/levenshtein';
import { speak, stopTTS, isSpeaking } from '../../shared/utils/tts';

type Rating = 1 | 2 | 3 | 4;

const RATING_CONFIG: Record<Rating, {
  label: string; sublabel: string; key: string;
  bg: string; border: string; text: string; ring: string;
}> = {
  1: { label: 'Olvidé',   sublabel: 'Again',   key: '1', bg: 'bg-red-950/60',    border: 'border-red-700',    text: 'text-red-300',    ring: 'ring-red-600' },
  2: { label: 'Difícil',  sublabel: 'Hard',    key: '2', bg: 'bg-orange-950/60', border: 'border-orange-700', text: 'text-orange-300', ring: 'ring-orange-600' },
  3: { label: 'Bien',     sublabel: 'Good',    key: '3', bg: 'bg-emerald-950/60',border: 'border-emerald-700',text: 'text-emerald-300',ring: 'ring-emerald-600' },
  4: { label: 'Perfecto', sublabel: 'Easy',    key: '4', bg: 'bg-blue-950/60',   border: 'border-blue-700',   text: 'text-blue-300',   ring: 'ring-blue-600' },
};

const PIE_COLORS = ['#22d3ee', '#f59e0b', '#ef4444'];

export const Flashcards: React.FC = () => {
  const navigate = useNavigate();
  const { uid, isPremiumActive } = useUserStore();
  const isPremium = isPremiumActive();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState<Rating | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showKeyboardHint, setShowKeyboardHint] = useState(true);
  const [sessionErrors, setSessionErrors] = useState(0);
  const [cardStartTime, setCardStartTime] = useState<number>(Date.now());
  const [canUndo, setCanUndo] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(0);

  const [isTypeMode, setIsTypeMode] = useState(false);
  const [typeInput, setTypeInput] = useState('');
  const [typeResultHtml, setTypeResultHtml] = useState<string | null>(null);
  const [isTTSActive, setIsTTSActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── tRPC ──────────────────────────────────────────────────────────────────
  const pendingCards = trpc.leitner.getPending.useQuery(
    { userId: uid || '', limit: 30 },
    { enabled: !!uid }
  );
  const statsQuery = trpc.leitner.getStats.useQuery(
    { userId: uid || '' },
    { enabled: !!uid }
  );
  const analyticsQuery = trpc.leitner.getAnalytics.useQuery(
    { userId: uid || '' },
    { enabled: !!uid && showStats }
  );
  const searchResultsQuery = trpc.leitner.searchCards.useQuery(
    { userId: uid || '', query: searchQuery },
    { enabled: !!uid && showStats && searchQuery.length >= 2 }
  );
  const reviewMutation = trpc.leitner.reviewCard.useMutation();
  const undoMutation = trpc.leitner.undoLastReview.useMutation();

  const cards = pendingCards.data || [];
  const currentCard = cards[currentIndex];
  const stats = statsQuery.data;

  // ── Inyectar hints script en el iframe ────────────────────────────────────
  useEffect(() => {
    if (!iframeRef.current || !isFlipped) return;
    const iframeDoc = iframeRef.current.contentDocument;
    if (!iframeDoc) return;
    const script = iframeDoc.createElement('script');
    script.textContent = HINT_SCRIPT;
    iframeDoc.body.appendChild(script);
  }, [isFlipped]);

  // ── Esconder tooltip de teclado después de 5s ─────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setShowKeyboardHint(false), 5000);
    return () => clearTimeout(t);
  }, []);

  // ── Restablecer timer al cambiar de tarjeta ───────────────────────────────
  useEffect(() => {
    setCardStartTime(Date.now());
    setTypeInput('');
    setTypeResultHtml(null);
    stopTTS();
    setIsTTSActive(false);
  }, [currentIndex]);

  // ── Función de calificación ───────────────────────────────────────────────
  const handleRate = useCallback(async (rating: Rating) => {
    if (!currentCard || processing || !isFlipped) return;
    if (!isPremium && sessionErrors >= 3) return;

    setProcessing(true);
    playUIClick();

    const timeTaken = Date.now() - cardStartTime;

    try {
      const response = await reviewMutation.mutateAsync({
        id: currentCard.id,
        ease: rating,
        timeTaken,
      });

      if (response.achievementsUnlocked && response.achievementsUnlocked.length > 0) {
        response.achievementsUnlocked.forEach((ach: any) => {
          useUserStore.getState().pushAchievement(ach);
        });
      }

      if (rating === 1) setSessionErrors(e => e + 1);
      setCanUndo(true);
      setSessionCompleted(n => n + 1);
      setShowLevelUp(rating);
      setTimeout(() => setShowLevelUp(null), 1000);

      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex(i => i + 1);
        setProcessing(false);
      }, 350);
    } catch {
      setProcessing(false);
    }
  }, [currentCard, processing, isFlipped, isPremium, sessionErrors, cardStartTime, reviewMutation]);

  // ── Flip tarjeta ─────────────────────────────────────────────────────────
  const handleFlip = useCallback(() => {
    if (!currentCard || processing) return;
    playUIClick();
    setIsFlipped(f => !f);
  }, [currentCard, processing]);

  // ── Undo ─────────────────────────────────────────────────────────────────
  const handleUndo = useCallback(async () => {
    if (!canUndo || processing) return;
    try {
      await undoMutation.mutateAsync();
      setCanUndo(false);
      setCurrentIndex(i => Math.max(0, i - 1));
      setIsFlipped(false);
      setSessionCompleted(n => Math.max(0, n - 1));
      setTypeResultHtml(null);
      setTypeInput('');
      pendingCards.refetch();
    } catch { /* silencio */ }
  }, [canUndo, processing, undoMutation, pendingCards]);

  // ── Modos ─────────────────────────────────────────────────────────────────
  const handleTypeSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!currentCard || !typeInput.trim() || processing) return;
    
    // Obtener la respuesta correcta (limpiando posibles etiquetas HTML si hubiera)
    const rawCorrect = String((currentCard.options as string[])?.[currentCard.correctOption] || '');
    const cleanCorrect = rawCorrect.replace(/<[^>]+>/g, '').trim();
    
    const { isCorrect, ease } = evaluateAnswer(typeInput, cleanCorrect);
    const diffHtml = buildDiffHtml(typeInput, cleanCorrect);
    
    setTypeResultHtml(diffHtml);
    setIsFlipped(true); // Ver el dorso forzosamente
    
    // Autocalificar tras 1.5s permitiendo ver el feedback
    setTimeout(() => {
      handleRate(ease);
    }, 1800);
  };

  const handleTTS = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpeaking()) {
      stopTTS();
      setIsTTSActive(false);
      return;
    }
    setIsTTSActive(true);
    const textToRead = isFlipped 
      ? String((currentCard.options as string[])?.[currentCard.correctOption] || '')
      : currentCard.question;
      
    speak(textToRead, {
      onEnd: () => setIsTTSActive(false)
    });
  };

  // ── Atajos de teclado ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // No activar en inputs
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!isFlipped) handleFlip();
        else handleRate(3);
      }
      if (isFlipped) {
        if (e.key === '1') handleRate(1);
        if (e.key === '2') handleRate(2);
        if (e.key === '3') handleRate(3);
        if (e.key === '4') handleRate(4);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if (e.key === 'ArrowLeft') {
        handleUndo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFlipped, handleFlip, handleRate, handleUndo]);

  // ── Render iframe del contenido de la tarjeta (sandboxado) ────────────────
  const renderCardContent = (html: string, side: 'front' | 'back') => {
    const safeHtml = sanitizeHTML(html);
    const iframeDoc = `<!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <style>
        body { margin: 0; padding: 16px; background: transparent; color: #e2e8f0; 
               font-family: 'Inter', sans-serif; font-size: 18px; text-align: center;
               display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        ${CARD_STYLES}
      </style>
    </head><body>${safeHtml}</body></html>`;
    return `data:text/html;charset=utf-8,${encodeURIComponent(iframeDoc)}`;
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (pendingCards.isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center animate-pulse">
            <Brain className="w-8 h-8 text-blue-400" />
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
          <p className="text-[10px] text-slate-600 uppercase tracking-[0.3em]">Cargando mazo cognitivo…</p>
        </div>
      </div>
    );
  }

  // ── Límite free ───────────────────────────────────────────────────────────
  if (!isPremium && sessionErrors >= 3) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-slate-900/80 border border-amber-500/30 rounded-3xl p-8 text-center">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-xl font-black text-white mb-2">Límite de sesión gratuita</h2>
          <p className="text-slate-400 text-sm mb-6">Activa PRO para sesiones ilimitadas con el motor FSRS completo.</p>
          <button onClick={() => navigate('/yape-checkout')}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl text-white font-black text-sm">
            Activar PRO
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Panel de Estadísticas ─────────────────────────────────────────────────
  if (showStats) {
    const analytics = analyticsQuery.data;
    return (
      <div className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setShowStats(false)}
                className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Polígono Cognitivo_</div>
                <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Panel de Telemetría</h1>
              </div>
            </div>
            
            <button 
              onClick={() => window.open(`/api/export/deck?userId=${uid}`, '_blank')}
              className="p-2 lg:px-4 lg:py-2 border border-slate-700 bg-slate-900 rounded-xl text-slate-400 hover:text-emerald-400 hover:border-emerald-500 transition-all flex items-center gap-2 text-sm font-black">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar .pkg</span>
            </button>
          </div>

          {/* Barra de Búsqueda FULLTEXT */}
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
            <input 
               type="text" 
               placeholder="Buscar en tus tarjetas (FULLTEXT by Levenshtein Engine)..." 
               className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Resultados de Búsqueda */}
          {searchQuery.length >= 2 && (
            <div className="bg-slate-900/60 border border-blue-900/50 rounded-2xl p-4 overflow-hidden">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-3">Resultados de Búsqueda</h3>
              {searchResultsQuery.isLoading ? (
                <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-blue-500"/></div>
              ) : searchResultsQuery.data && searchResultsQuery.data.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {searchResultsQuery.data.map(card => (
                    <div key={card.id} className="p-3 border border-slate-800 bg-slate-950/50 rounded-lg flex items-start gap-3">
                      <div className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-slate-800 text-slate-400 mt-1">
                        {card.state}
                      </div>
                      <div className="text-sm text-slate-300" dangerouslySetInnerHTML={{ __html: sanitizeHTML(card.question || '') }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500 italic p-4 text-center">No se encontraron tarjetas que coincidan.</div>
              )}
            </div>
          )}

          {/* Resumen rápido */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Nuevas', value: stats?.newCount || 0, color: 'text-blue-400' },
              { label: 'Aprendizaje', value: stats?.learningCount || 0, color: 'text-amber-400' },
              { label: 'Repaso', value: stats?.reviewCount || 0, color: 'text-emerald-400' },
              { label: 'Total', value: stats?.totalCount || 0, color: 'text-purple-400' },
            ].map(item => (
              <div key={item.label} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
                <div className={`text-2xl font-black ${item.color}`}>{item.value}</div>
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">{item.label}</div>
              </div>
            ))}
          </div>

          {analyticsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Retención Real */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Retención Real (30d)
                  </span>
                </div>
                {analytics?.retention && analytics.retention.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={analytics.retention}>
                      <XAxis dataKey="day" tick={{ fontSize: 8, fill: '#475569' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 8, fill: '#475569' }} />
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }} />
                      <Line type="monotone" dataKey="retention_pct" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-40 text-sm text-slate-600 italic">
                    Sin datos aún — completa más repasos
                  </div>
                )}
              </div>

              {/* Carga Proyectada */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Carga Proyectada (30d)
                  </span>
                </div>
                {analytics?.forecast && analytics.forecast.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={analytics.forecast}>
                      <XAxis dataKey="due_date" tick={{ fontSize: 8, fill: '#475569' }} />
                      <YAxis tick={{ fontSize: 8, fill: '#475569' }} />
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }} />
                      <Bar dataKey="cards_due" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-40 text-sm text-slate-600 italic">
                    Sin repasos programados
                  </div>
                )}
              </div>

              {/* Distribución de Dificultad */}
              {analytics?.difficulty && analytics.difficulty.length > 0 && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Distribución de Dificultad
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={140}>
                      <PieChart>
                        <Pie data={analytics.difficulty} dataKey="count" cx="50%" cy="50%" innerRadius={35} outerRadius={60}>
                          {analytics.difficulty.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {analytics.difficulty.map((d, i) => (
                        <div key={d.difficulty_band} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i] }} />
                          <span className="text-[10px] text-slate-400">{d.difficulty_band}: <span className="text-white font-bold">{d.count}</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Vista Principal ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 select-none">
      {/* Header */}
      <header className="max-w-2xl mx-auto px-4 pt-6 pb-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')}
              className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-500 hover:text-white transition-all">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="text-[9px] font-black text-blue-500 uppercase tracking-[0.3em]">Polígono Cognitivo_</div>
              <h1 className="text-lg font-black text-white uppercase tracking-tighter">
                Repaso FSRS {!isPremium && <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase ml-1">DEMO</span>}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Undo button */}
            {canUndo && (
              <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }}
                onClick={handleUndo}
                className="p-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-400 hover:text-amber-400 hover:border-amber-700 transition-all"
                title="Deshacer (Ctrl+Z)">
                <Undo2 className="w-4 h-4" />
              </motion.button>
            )}
            <button onClick={() => setIsTypeMode(!isTypeMode)}
              className={`p-2 border rounded-xl transition-all ${isTypeMode ? 'bg-blue-900/50 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-white'}`}
              title="Modo Escritura">
              <Edit3 className="w-4 h-4" />
            </button>
            <button onClick={() => setShowStats(true)}
              className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-500 hover:text-white transition-all">
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bar sesión */}
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-600">
            <span>{sessionCompleted} completadas hoy</span>
            <span>{currentIndex}/{cards.length} en sesión</span>
          </div>
          <div className="flex gap-1 h-1">
            <div className="flex-1 bg-blue-500/30 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all" style={{ width: `${(stats?.newCount ? Math.min(sessionCompleted / stats.newCount * 100, 100) : 0)}%` }} />
            </div>
            <div className="flex-1 bg-amber-500/30 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 transition-all" style={{ width: `${stats?.learningCount ? Math.min(sessionCompleted / stats.learningCount * 100, 100) : 0}%` }} />
            </div>
            <div className="flex-1 bg-emerald-500/30 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${stats?.reviewCount ? Math.min(sessionCompleted / stats.reviewCount * 100, 100) : 0}%` }} />
            </div>
          </div>
          <div className="flex gap-1 text-[8px] text-slate-600">
            <span className="flex-1 text-blue-500">Nueva: {stats?.newCount || 0}</span>
            <span className="flex-1 text-amber-500 text-center">Aprendiendo: {stats?.learningCount || 0}</span>
            <span className="flex-1 text-emerald-500 text-right">Repaso: {stats?.reviewCount || 0}</span>
          </div>
        </div>
      </header>

      {/* Tooltip teclado */}
      <AnimatePresence>
        {showKeyboardHint && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="max-w-2xl mx-auto px-4 mt-2">
            <div className="flex items-center gap-2 p-2 bg-slate-900/60 border border-slate-800 rounded-xl">
              <Keyboard className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <p className="text-[9px] text-slate-500 flex-1">
                <kbd className="bg-slate-800 px-1 rounded text-slate-400">Espacio</kbd> voltear ·
                <kbd className="bg-slate-800 px-1 rounded text-slate-400 ml-1">1</kbd>–
                <kbd className="bg-slate-800 px-1 rounded text-slate-400">4</kbd> calificar ·
                <kbd className="bg-slate-800 px-1 rounded text-slate-400 ml-1">Ctrl+Z</kbd> deshacer
              </p>
              <button onClick={() => setShowKeyboardHint(false)} className="text-slate-700 hover:text-slate-500">
                <X className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-2xl mx-auto px-4 py-4">
        {!currentCard ? (
          /* Sesión completada */
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="text-center py-16 space-y-6">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white mb-2">¡Mazo completado!</h2>
              <p className="text-slate-400 text-sm">Procesaste {sessionCompleted} tarjetas hoy. El algoritmo FSRS ha recalibrado tus intervalos.</p>
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setShowStats(true)}
                className="px-5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-black text-slate-300 hover:text-white transition-all">
                Ver Telemetría
              </button>
              <button onClick={() => navigate('/')}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-black text-white transition-all">
                Volver al Dashboard
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {/* Tarjeta con flip 3D */}
            <div className="relative h-[360px] cursor-pointer perspective-1000" onClick={handleFlip}>
              <motion.div
                className="w-full h-full relative preserve-3d transition-all duration-500"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              >
                {/* Frente */}
                <div className="absolute inset-0 backface-hidden">
                  <div className="w-full h-full bg-slate-900 border border-slate-700 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
                    <div className="text-[9px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4">
                      {currentCard.state === 'new' ? '🆕 Nueva' : currentCard.state === 'learning' ? '📖 Aprendiendo' : currentCard.state === 'relearning' ? '🔄 Reaprendiendo' : '✅ Repaso'}
                    </div>
                    <iframe
                      className="w-full flex-1 border-0 bg-transparent"
                      sandbox="allow-scripts"
                      src={renderCardContent(currentCard.question, 'front')}
                      title="tarjeta-frente"
                    />
                    
                    {/* Controles de tarjeta (TTS) */}
                    <button onClick={handleTTS} 
                       className={`absolute top-4 right-4 p-2 rounded-full backdrop-blur transition-all ${isTTSActive ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                      <Volume2 className="w-4 h-4" />
                    </button>

                    {!isTypeMode ? (
                      <div className="mt-4 flex items-center gap-2 text-slate-600 text-xs">
                        <RotateCcw className="w-3 h-3" /> Toca o pulsa Espacio para ver respuesta
                      </div>
                    ) : (
                      <div className="mt-4 w-full" onClick={e => e.stopPropagation()}>
                        <form onSubmit={handleTypeSubmit} className="relative">
                          <input 
                            type="text" 
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                            placeholder="Escribe tu respuesta y presiona Enter..."
                            value={typeInput}
                            onChange={(e) => setTypeInput(e.target.value)}
                            disabled={processing || !!typeResultHtml}
                            autoFocus
                          />
                        </form>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dorso */}
                <div className="absolute inset-0 backface-hidden" style={{ transform: 'rotateY(180deg)' }}>
                  <div className="w-full h-full bg-slate-900 border border-emerald-700/40 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                    <div className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-4">✓ Respuesta Correcta</div>
                    <iframe
                      ref={iframeRef}
                      className="w-full flex-1 border-0 bg-transparent"
                      sandbox="allow-scripts"
                      src={renderCardContent(
                        String((currentCard.options as string[])?.[currentCard.correctOption] || ''),
                        'back'
                      )}
                      title="tarjeta-dorso"
                    />

                    <button onClick={handleTTS} 
                       className={`absolute top-4 right-4 p-2 rounded-full backdrop-blur transition-all ${isTTSActive ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                      <Volume2 className="w-4 h-4" />
                    </button>

                    <div className="mt-3 w-full">
                      {isTypeMode && typeResultHtml ? (
                         <div className="w-full text-center" dangerouslySetInnerHTML={{ __html: typeResultHtml }} />
                      ) : (
                        <>
                          <div className="text-[8px] font-black uppercase tracking-widest text-slate-600 mb-2 text-center">Todas las opciones</div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {(currentCard.options as string[]).map((opt, i) => (
                              <div key={i}
                                className={`text-[10px] p-2 rounded-lg border ${i === currentCard.correctOption ? 'border-emerald-700 bg-emerald-950/40 text-emerald-300' : 'border-slate-800 bg-slate-900/60 text-slate-500'}`}>
                                {String.fromCharCode(65 + i)}. {opt}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Level Up Overlay */}
                <AnimatePresence>
                  {showLevelUp && (
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.3, opacity: 0 }}
                      className={`absolute inset-0 z-50 flex flex-col items-center justify-center rounded-3xl backdrop-blur-sm border-2 ${RATING_CONFIG[showLevelUp].ring} ${RATING_CONFIG[showLevelUp].bg}`}
                    >
                      <div className={`text-4xl font-black ${RATING_CONFIG[showLevelUp].text}`}>
                        {showLevelUp === 1 ? '🔴' : showLevelUp === 2 ? '🟠' : showLevelUp === 3 ? '🟢' : '💎'}
                      </div>
                      <div className={`text-lg font-black uppercase tracking-[0.2em] mt-2 ${RATING_CONFIG[showLevelUp].text}`}>
                        {RATING_CONFIG[showLevelUp].label}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            {/* Botones de calificación (4 ratings) */}
            <AnimatePresence>
              {isFlipped && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-4 gap-2"
                >
                  {([1, 2, 3, 4] as Rating[]).map((rating) => {
                    const cfg = RATING_CONFIG[rating];
                    const interval = (currentCard as any).previewIntervals?.[rating] || '?';
                    return (
                      <button
                        key={rating}
                        onClick={(e) => { e.stopPropagation(); handleRate(rating); }}
                        disabled={processing}
                        className={`relative flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border ${cfg.bg} ${cfg.border} hover:scale-[1.04] active:scale-95 transition-all duration-150 disabled:opacity-50`}
                      >
                        <span className={`text-sm font-black ${cfg.text}`}>{cfg.label}</span>
                        <span className="text-[9px] text-slate-500 uppercase">{interval}</span>
                        <span className="absolute top-1 right-1.5 text-[8px] font-black text-slate-600 bg-slate-950/50 px-1 rounded">
                          [{cfg.key}]
                        </span>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Indicador de retención */}
            {currentCard.stability > 0.5 && (
              <div className="flex items-center justify-center gap-2 text-[9px] text-slate-600">
                <span>Estabilidad actual:</span>
                <span className="font-black text-blue-500">{currentCard.stability.toFixed(1)}d</span>
                <span>·</span>
                <span>Dificultad:</span>
                <span className="font-black text-amber-500">{currentCard.difficulty.toFixed(1)}/10</span>
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        
        .diff-container { font-size: 14px; text-align: left; background: rgba(0,0,0,0.4); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); }
        .diff-user { margin-bottom: 6px; }
        .diff-label { font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-right: 6px; }
        .diff-correct { color: #10b981; font-weight: bold; }
        .diff-wrong { color: #ef4444; font-weight: bold; text-decoration: line-through; }
        .diff-partial { color: #f59e0b; font-weight: bold; }
      `}</style>
    </div>
  );
};
