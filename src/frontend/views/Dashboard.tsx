import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/useUserStore';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import {
  Shield, Trophy, Lock, LogOut, Zap, BrainCircuit, History,
  ChevronRight, FileText, Clock, ShieldAlert, Play,
  Brain, Target, ExternalLink, TrendingUp, CheckCircle2, BarChart3,
  GraduationCap, Unlock, Star, BookOpen, Sparkles, Megaphone
} from 'lucide-react';
import { trpc } from '../../shared/utils/trpc';
import { useExamStore } from '../store/useExamStore';
import { useExamManager } from '../hooks/useExamManager';
import { Header } from '../components/common/Header';
import { ExamDocument, LeitnerDocument } from '../../shared/types';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { isExamUnlocked, type ExamLevel } from '../../database/data/examenes_config';

const ResourceButton: React.FC<{ title: string; url: string }> = ({ title, url }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center justify-between w-full p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:bg-slate-700/50 transition-all group"
  >
    <span className="text-xs font-bold uppercase tracking-widest text-slate-300 group-hover:text-white transition-colors">{title}</span>
    <ExternalLink size={16} className="text-blue-400 group-hover:scale-110 transition-transform" />
  </a>
);

interface Metrics {
  leitnerCount: number;
  avgScore: number;
  examCount: number;
  bestScore: number;
  lastExamDate: string | null;
  weakestArea: string | null;
}

export const Dashboard: React.FC = () => {
  const { uid, role, isPremiumActive, name, photoURL, modalidad_postulacion, examProgress } = useUserStore();
  const navigate = useNavigate();
  const isPremium = isPremiumActive();

  // tRPC Queries
  const userStats = trpc.user.getStats.useQuery({ uid: uid || '' }, { enabled: !!uid });
  const leitnerStats = trpc.leitner.getStats.useQuery({ userId: uid || '' }, { enabled: !!uid });
  const levelsQuery = trpc.exam.getLevels.useQuery();
  const broadcastQuery = trpc.user.getLastBroadcast.useQuery(undefined, { refetchInterval: 60000 });

  const metricsLoading = userStats.isLoading || leitnerStats.isLoading;
  const metrics: Metrics = {
    leitnerCount: leitnerStats.data?.count || 0,
    avgScore: Math.round(Number(userStats.data?.averageScore || 0) * 100),
    examCount: userStats.data?.totalAttempts || 0,
    bestScore: Math.round(Number(userStats.data?.bestScore || 0) * 100),
    lastExamDate: userStats.data?.lastExamDate ? new Date(userStats.data.lastExamDate).toLocaleDateString('es-PE') : null,
    weakestArea: null, // To be implemented with more complex query if needed
  };

  const utils = trpc.useUtils();
  const { startingExam, startLevel } = useExamManager();


  /* ── Start a level-based exam ── */


  /* ── School filtering ── */
  const isFree = !isPremium;
  const showEO = modalidad_postulacion === 'EO' || modalidad_postulacion === null;
  const showEESTP = modalidad_postulacion === 'EESTP' || modalidad_postulacion === null;

  /* ── Personalized welcome ── */
  const firstName = name === 'Invitado' ? 'Postulante' : name.split(' ')[0];
  const welcomeTitle = modalidad_postulacion === 'EO'
    ? `¡Adelante, Futuro Cadete ${firstName}!`
    : modalidad_postulacion === 'EESTP'
      ? `¡Vamos con todo, Futuro Alumno PNP ${firstName}!`
      : `Bienvenido, ${firstName}`;

  /* ── Render a school track section ── */
  const renderExamTrack = (
    examList: ExamLevel[],
    trackLabel: string,
    trackIcon: React.ReactNode,
    gradient: string,
    borderColor: string,
  ) => (
    <div className="space-y-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
        {trackIcon} {trackLabel}
        {isFree && <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded text-[8px] font-black uppercase ml-auto">PRO</span>}
      </p>
      {examList.map((level, idx) => {
        const levelId = level.id.toString();
        const unlocked = level.isDemo || (isPremium && isExamUnlocked(examList, idx, examProgress));
        const progress = examProgress[levelId];
        const isLocked = !level.isDemo && !isPremium;
        const needsPreviousPass = !level.isDemo && isPremium && !isExamUnlocked(examList, idx, examProgress);

        return (
          <motion.button
            key={level.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + idx * 0.08 }}
            onClick={() => {
              if (isLocked) { navigate('/yape-checkout'); return; }
              if (needsPreviousPass) { toast.info('Aprueba el examen anterior con nota >= 11 para desbloquear este.'); return; }
              startLevel(level);
            }}
            disabled={!!startingExam}
            className={`w-full group relative overflow-hidden p-5 rounded-2xl transition-all duration-300 text-left border ${
              unlocked
                ? `bg-gradient-to-r ${gradient} border-transparent shadow-lg hover:shadow-xl`
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            } ${!!startingExam ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <div className="relative z-10 flex items-center gap-4">
              {/* Level number */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black shrink-0 ${
                progress?.passed
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : unlocked
                    ? 'bg-white/10 text-white'
                    : 'bg-slate-800 text-slate-600'
              }`}>
                {progress?.passed ? <CheckCircle2 className="w-6 h-6" /> : isLocked || needsPreviousPass ? <Lock className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className={`font-black text-base ${unlocked ? 'text-white' : 'text-slate-400'}`}>{level.title || `Nivel ${level.level}`}</h3>
                  {level.isDemo && <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">GRATIS</span>}
                </div>
                <p className={`text-xs ${unlocked ? 'text-white/60' : 'text-slate-600'}`}>
                  {`Simulacro completo para ${level.school} · Nivel ${level.level.toString().padStart(2, '0')}`}
                </p>
                {progress && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-1.5 flex-1 bg-black/20 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${progress.passed ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${Math.min(progress.score * 100, 100)}%` }} />
                    </div>
                    <span className={`text-[10px] font-black ${progress.passed ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {Math.round(progress.score * 100)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Arrow */}
              <ChevronRight className={`w-5 h-5 shrink-0 transition-all ${unlocked ? 'text-white/40 group-hover:text-white group-hover:translate-x-1' : 'text-slate-700'}`} />
            </div>
          </motion.button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-[#f8fafc] font-mono">
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none" style={{
        backgroundImage: `linear-gradient(#2563eb 1px, transparent 1px), linear-gradient(90deg, #2563eb 1px, transparent 1px)`,
        backgroundSize: '80px 80px'
      }} />

      <div className="relative p-4 md:p-8">
        {/* Header */}
        <Header showSchoolSelector={true} />

        <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-8 space-y-6">

            {broadcastQuery.data && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }} 
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-start gap-4 p-4 rounded-xl border relative overflow-hidden shadow-2xl ${
                  broadcastQuery.data.type === 'WARNING' 
                    ? 'bg-red-950/80 border-red-500/50 text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                    : broadcastQuery.data.type === 'EVENT'
                    ? 'bg-amber-950/80 border-amber-500/50 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                    : 'bg-indigo-950/80 border-indigo-500/50 text-indigo-100 shadow-[0_0_20px_rgba(99,102,241,0.2)]'
                }`}
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <Megaphone className={`w-8 h-8 shrink-0 ${
                  broadcastQuery.data.type === 'WARNING' ? 'text-red-500 animate-pulse' : 
                  broadcastQuery.data.type === 'EVENT' ? 'text-amber-500 animate-bounce' : 'text-indigo-400'
                }`} />
                <div className="flex-1">
                  <h3 className="font-black tracking-widest uppercase text-sm mb-1">{broadcastQuery.data.title}</h3>
                  <p className="text-sm font-medium leading-relaxed opacity-90">{broadcastQuery.data.message}</p>
                </div>
              </motion.div>
            )}

            {/* Metrics row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: <BrainCircuit className="w-5 h-5 text-cyan-400" />, label: 'Misiones Pendientes', value: metricsLoading ? '—' : metrics.leitnerCount.toString(), sub: 'Flashcards por repasar' },
                { icon: <Trophy className="w-5 h-5 text-amber-400" />, label: 'Eficiencia Máxima', value: metricsLoading ? '—' : `${metrics.bestScore}%`, sub: 'Pico histórico' },
                { icon: <BarChart3 className="w-5 h-5 text-emerald-400" />, label: 'Tasa de Acierto', value: metricsLoading ? '—' : `${metrics.avgScore}%`, sub: `${metrics.examCount} simulacros` },
                { icon: <Clock className="w-5 h-5 text-purple-400" />, label: 'Última Incursión', value: metricsLoading ? '—' : (metrics.lastExamDate || 'Sin datos'), sub: 'Fecha de operación' },
              ].map((m, i) => (
                <motion.div key={m.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <Card className="bg-slate-900/80 border-slate-800 hover:border-slate-700 transition-colors">
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-center justify-between mb-2">
                        {m.icon}
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">{m.label}</span>
                      </div>
                      <div className="text-2xl font-black tabular-nums">{m.value}</div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{m.sub}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Weakness alert */}
            {metrics.weakestArea && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <Card className="bg-red-950/10 border-red-900/30 overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-600" />
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 bg-red-600/15 rounded-xl shrink-0"><Brain className="w-6 h-6 text-red-400" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1">Zona de Vulnerabilidad Detectada</p>
                      <p className="text-white font-bold truncate">{metrics.weakestArea}</p>
                    </div>
                    <Button variant="primary" className="bg-red-600 hover:bg-red-500 shrink-0 text-sm" onClick={() => navigate('/poligono')}>Repasar</Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* FREE user upsell - HIDDEN FOR PRO */}
            {!isPremium && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
                <div className="bg-gradient-to-r from-blue-950/40 to-slate-900/60 border border-blue-500/20 rounded-2xl p-5 flex items-center gap-4">
                  <div className="p-3 bg-blue-600/20 rounded-xl shrink-0"><ShieldAlert className="w-6 h-6 text-amber-400" /></div>
                  <div className="flex-1">
                    <h3 className="text-amber-400 font-black text-sm mb-0.5">Más exámenes y herramientas te esperan</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Desbloquea simulacros completos de 100 preguntas, <span className="text-white font-medium">Polígono Cognitivo Leitner</span>, y más.
                    </p>
                  </div>
                  <button onClick={() => navigate('/yape-checkout')} className="shrink-0 flex items-center gap-1 text-amber-400 text-xs font-black uppercase tracking-widest hover:underline">
                    Desbloquear <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── MISIONES DE CAMPO PER SCHOOL ── */}
            {levelsQuery.isLoading ? (
              <div className="py-12 flex flex-col items-center gap-4">
                <Shield className="w-8 h-8 animate-pulse text-cyan-500" />
                <p className="text-[10px] uppercase font-black tracking-widest text-cyan-500/70">Sincronizando Radar de Mando...</p>
              </div>
            ) : (
              <>
                {showEO && renderExamTrack(
                  (levelsQuery.data as ExamLevel[] || []).filter(l => l.school === 'EO'),
                  'Escuela de Oficiales (EO-PNP)',
                  <Shield className="w-3 h-3 text-cyan-400" />,
                  'from-cyan-900/80 to-blue-900/80 border-cyan-500/30',
                  'cyan',
                )}
                {showEESTP && renderExamTrack(
                  (levelsQuery.data as ExamLevel[] || []).filter(l => l.school === 'EESTP'),
                  'Escuela Técnica (EESTP-PNP)',
                  <GraduationCap className="w-3 h-3 text-emerald-400" />,
                  'from-emerald-600/80 to-teal-700/80',
                  'emerald',
                )}
              </>
            )}

            {/* No school selected prompt */}
            {!isFree && !modalidad_postulacion && role !== 'admin' && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <button
                  onClick={() => navigate('/seleccionar-escuela')}
                  className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 p-6 rounded-2xl text-left group hover:shadow-xl transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded-xl"><Star className="w-7 h-7 text-white" /></div>
                    <div className="flex-1">
                      <h3 className="text-xl font-black mb-1">Elige tu Escuela</h3>
                      <p className="text-white/70 text-sm">Selecciona si postulas a Oficiales o a la Escuela Técnica para personalizar tu entrenamiento.</p>
                    </div>
                    <ChevronRight className="w-6 h-6 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                </button>
              </motion.div>
            )}

            {/* Official resources */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                <Shield className="w-3 h-3" /> Comunicados Oficiales PNP
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ResourceButton title="Proceso Admisión EO" url="https://www.gob.pe/institucion/pnp/colecciones/48920-proceso-de-admision-2025-promocion-2026-a-la-escuela-de-oficiales-de-la-policia-nacional-del-peru" />
                <ResourceButton title="Proceso Admisión EESTP" url="https://www.gob.pe/institucion/pnp/colecciones/49501-proceso-de-admision-extraordinario-2026-a-las-eestp-pnp" />
              </div>
            </div>

            {/* Secondary nav */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {[
                { icon: <BookOpen className="w-5 h-5 text-cyan-400" />, label: 'Base de Datos', path: '/galeria', premium: false },
                { icon: <BrainCircuit className="w-5 h-5 text-purple-400" />, label: 'Polígono', path: '/poligono', premium: true },
                { icon: <Target className="w-5 h-5 text-emerald-400" />, label: 'Expediente', path: '/progreso', premium: true },
                { icon: <Trophy className="w-5 h-5 text-amber-400" />, label: 'Rango Élite', path: '/ranking', premium: false },
                { icon: <TrendingUp className="w-5 h-5 text-cyan-400" />, label: 'Historial', path: '/resultados', premium: false },
                { icon: <FileText className="w-5 h-5 text-slate-400" />, label: 'Documentos', path: '/cebo', premium: false },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    if (item.premium && !isPremium) { navigate('/yape-checkout'); return; }
                    navigate(item.path);
                  }}
                  className="relative flex flex-col items-center justify-center p-4 bg-slate-900/80 border border-slate-800 rounded-xl hover:border-slate-600 transition-all gap-2 group"
                >
                  {item.icon}
                  <span className="text-[10px] font-bold text-slate-400 group-hover:text-white transition-colors">{item.label}</span>
                  {item.premium && !isPremium && (
                    <span className="absolute top-2 right-2 flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      <Lock className="w-2.5 h-2.5" /> PRO
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-4 space-y-4">
            {/* Premium CTA or status */}
            {!isPremium ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.02 }} className="relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 opacity-20 group-hover:opacity-30 blur-xl transition-opacity duration-500" />
                <Card className="bg-slate-900/50 backdrop-blur-xl border-amber-500/30 overflow-hidden relative shadow-2xl">
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-l from-amber-500/20 to-transparent text-amber-500 text-[9px] font-black uppercase tracking-widest border-b border-l border-amber-500/20 rounded-bl-lg">Recomendado</div>
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-center gap-2 text-amber-500 mb-3">
                      <Trophy className="w-5 h-5 drop-shadow-md" />
                      <div className="text-[10px] font-black uppercase tracking-widest drop-shadow-md">Pase de Ingreso Seguro</div>
                    </div>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-4xl font-black text-white drop-shadow-lg">S/ 15</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">/ pago único</span>
                    </div>
                    <p className="text-xs text-amber-200/60 font-medium mb-4">Domina el examen. Sin mensualidades ocultas.</p>
                    <div className="space-y-3 my-5">
                      {[
                        { text: 'Simulacros de 100 Preguntas', highlight: true },
                        { text: 'Exámenes Desbloqueables', highlight: true },
                        { text: 'Polígono Cognitivo Leitner', highlight: true },
                        { text: 'Ranking Nacional Sin Censura', highlight: false },
                      ].map((b, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 drop-shadow-md ${b.highlight ? 'text-amber-400' : 'text-emerald-400'}`} />
                          <span className={`${b.highlight ? 'text-amber-100 font-bold' : 'text-slate-300'}`}>{b.text}</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      fullWidth
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-900 font-black tracking-widest uppercase shadow-[0_0_20px_rgba(245,158,11,0.3)] border border-amber-300/50 transition-all hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] py-6 text-xs"
                      onClick={() => navigate('/yape-checkout')}
                    >
                      Desbloquear Poder PRO
                    </Button>
                    <div className="flex items-center justify-center gap-2 mt-4 text-[9px] text-slate-500 uppercase tracking-widest font-bold">
                      <Shield className="w-3 h-3 text-slate-600" /> Transacción 100% Segura
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <Card className="bg-emerald-950/20 border-emerald-500/20 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-2 opacity-20"><Sparkles className="w-6 h-6 text-emerald-400" /></div>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                    <div>
                      <p className="font-black text-emerald-400 text-sm">Premium Activo</p>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Acceso Táctico Ilimitado</p>
                    </div>
                  </div>
                  {useUserStore.getState().fecha_expiracion_premium && (
                    <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
                      <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-1">Estado de Membresía</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-300 font-medium">Vence en:</span>
                        <span className="text-xs text-white font-bold">
                          {Math.max(0, Math.ceil((new Date(useUserStore.getState().fecha_expiracion_premium!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} días
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Mini ranking preview */}
            <Card className="bg-slate-900/80 border-slate-800 relative overflow-hidden">
              <CardHeader className="border-b border-slate-800 pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-400 uppercase tracking-widest text-[10px] font-black">
                    <Trophy className="w-4 h-4 text-amber-400" /> Ranking Nacional
                  </span>
                  <button onClick={() => navigate('/ranking')} className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider flex items-center gap-1">
                    Ver todo <ChevronRight className="w-3 h-3" />
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {trpc.user.getRanking.useQuery().data?.slice(0, 3).map((user, idx) => (
                  <div key={user.uid} className="flex items-center gap-3 px-4 py-3 border-b border-slate-800/50 last:border-0 group hover:bg-white/5 transition-colors">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                      idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                      idx === 1 ? 'bg-slate-300/20 text-slate-300' :
                      'bg-amber-600/20 text-amber-600'
                    }`}>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="text-sm font-bold text-slate-200 truncate group-hover:text-white">{user.name || 'Postulante'}</div>
                       <div className="text-[9px] text-slate-500 uppercase font-black">Máximo Puntaje</div>
                    </div>
                    <div className="text-sm font-black text-blue-400 font-mono italic">{user.bestScore.toFixed(0)}%</div>
                  </div>
                ))}
                {!isPremium && (
                  <div className="p-4 bg-black/20 text-center">
                    <button onClick={() => navigate('/yape-checkout')} className="text-[9px] text-amber-400 font-black uppercase tracking-wider hover:underline flex items-center gap-1 mx-auto">
                      <Lock className="w-2.5 h-2.5" /> Desbloquear Ranking de Élite
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ad Panel - HIDDEN FOR PRO */}
            {!isPremium && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <Card className="bg-gradient-to-br from-indigo-900/40 to-slate-900/90 border-indigo-500/30 overflow-hidden group cursor-pointer hover:border-indigo-400 transition-all">
                  <CardContent className="p-4 relative">
                    <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all" />
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-0.5">Próximo Evento</p>
                        <h4 className="text-sm font-bold text-white leading-tight">Mega Simulacro Presencial 2025</h4>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-medium">Sede Lima - 15 de Abril</span>
                      <span className="text-indigo-400 font-black uppercase tracking-tighter group-hover:translate-x-1 transition-transform inline-block">Ver detalles →</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="max-w-7xl mx-auto mt-12 pt-6 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-600 text-xs text-center md:text-left">
          <p>© {new Date().getFullYear()} POLIC.ia · Sistema Táctico PNP</p>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/perfil')} className="hover:text-blue-400 transition-colors uppercase tracking-widest font-black text-[10px]">Expediente</button>
            <button onClick={() => navigate('/ranking')} className="hover:text-blue-400 transition-colors uppercase tracking-widest font-black text-[10px]">Escalafón</button>
            {role === 'admin' ? (
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2 px-4 py-2 bg-red-600/10 border border-red-500/30 text-red-500 rounded-xl hover:bg-red-600/20 transition-all text-[10px] font-black uppercase tracking-wider shadow-lg shadow-red-900/10"
              >
                <ShieldAlert className="w-3.5 h-3.5" /> Terminal General (Admin)
              </button>
            ) : (
              <span className="text-[10px] uppercase font-bold tracking-widest opacity-20">Control de Mando v1.2</span>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};
