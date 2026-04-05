import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/useUserStore';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import {
  Shield, Trophy, Lock, LogOut, Zap, BrainCircuit, History,
  ChevronRight, FileText, Clock, ShieldAlert, Play,
  Brain, Target, TrendingUp, CheckCircle2, BarChart3,
  GraduationCap, Unlock, Star, BookOpen, Megaphone, RotateCcw
} from 'lucide-react';
import { trpc } from '../../shared/utils/trpc';
import { useExamStore } from '../store/useExamStore';
import { useExamManager } from '../hooks/useExamManager';
import { ExamDocument, LeitnerDocument } from '../../shared/types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer 
} from 'recharts';
import { getMilitaryRank, getRankColor } from '../utils/ranks';
import { isExamUnlocked, type ExamLevel } from '../../database/data/examenes_config';


interface Metrics {
  leitnerCount: number;
  avgScore: number;
  examCount: number;
  bestScore: number;
  lastExamDate: string | null;
  weakestArea: string | null;
}

export const Dashboard: React.FC = () => {
  const { uid, role, isPremiumActive, name, photoURL, modalidad_postulacion, examProgress, honorPoints } = useUserStore();
  const navigate = useNavigate();
  const isPremium = isPremiumActive();

  // tRPC Queries
  const userStats = trpc.user.getStats.useQuery({ uid: uid || '' }, { enabled: !!uid });
  const leitnerStats = trpc.leitner.getStats.useQuery({ userId: uid || '' }, { enabled: !!uid });
  const rankingQuery = trpc.user.getRanking.useQuery({ school: modalidad_postulacion || undefined }, { enabled: !!uid });
  const levelsQuery = trpc.exam.getLevels.useQuery();
  const broadcastQuery = trpc.user.getLastBroadcast.useQuery(undefined, { refetchInterval: 60000 });
  const categoryStatsQuery = trpc.user.getCategoryStats.useQuery({ uid: uid || '' }, { enabled: !!uid });
  const activeCountQuery = trpc.admin.getActiveCount.useQuery(undefined, {
    refetchInterval: 30000,
    refetchOnWindowFocus: true
  });

  const metricsLoading = userStats.isLoading || leitnerStats.isLoading;
  
  // Rank Position
  const rankPos = rankingQuery.data?.findIndex(r => r.uid === uid) + 1 || '--';

  // Calcular weakestArea en base a categoryStats
  let weakestArea = null;
  if (categoryStatsQuery.data && categoryStatsQuery.data.length > 0) {
    const sorted = [...categoryStatsQuery.data].sort((a, b) => a.score - b.score);
    if (sorted[0].score < 50) {
      weakestArea = sorted[0].area;
    }
  }

  const metrics: Metrics = {
    leitnerCount: leitnerStats.data?.count || 0,
    avgScore: Math.round(Number(userStats.data?.averageScore || 0) * 100),
    examCount: userStats.data?.totalAttempts || 0,
    bestScore: Math.round(Number(userStats.data?.bestScore || 0) * 100),
    lastExamDate: userStats.data?.lastExamDate ? new Date(userStats.data.lastExamDate).toLocaleDateString('es-PE') : null,
    weakestArea,
  };

  const { startingExam, startLevel } = useExamManager();

  const showEO = modalidad_postulacion === 'EO' || modalidad_postulacion === null;
  const showEESTP = modalidad_postulacion === 'EESTP' || modalidad_postulacion === null;

  const firstName = name === 'Invitado' ? 'Postulante' : name.split(' ')[0];
  const currentRank = getMilitaryRank(honorPoints, modalidad_postulacion);
  const rankStyle = getRankColor(honorPoints);

  const welcomeTitle = modalidad_postulacion === 'EO'
    ? `CADETE: ${firstName}`
    : modalidad_postulacion === 'EESTP'
      ? `ALUMNO PNP: ${firstName}`
      : `POSTULANTE: ${firstName}`;

  // Logout Handler
  const handleLogout = async () => {
    const { auth } = await import('../../firebase');
    await auth.signOut();
    useUserStore.getState().setUserData({
      uid: null,
      role: 'user',
      estado_financiero: 'FREE',
      modalidad_postulacion: null,
      fecha_expiracion_premium: null,
    });
    navigate('/login');
  };

  const MetricProgress = ({ label, value, max = 100, unit = '', icon: Icon, colorClass }: any) => {
    const percentage = Math.min((value / max) * 100, 100);
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between items-end">
          <div className="flex items-center gap-1.5 text-slate-500 uppercase font-black text-[8px] tracking-[0.2em]">
            <Icon className={`w-2.5 h-2.5 ${colorClass}`} />
            {label}
          </div>
          <span className="text-[9px] font-bold text-slate-400 font-mono">{value}{unit}</span>
        </div>
        <div className="h-1 bg-slate-950 rounded-full overflow-hidden border border-white/5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            className={`h-full ${colorClass.replace('text', 'bg')} shadow-[0_0_8px_rgba(59,130,246,0.1)]`}
          />
        </div>
      </div>
    );
  };

  const renderExamTrack = (
    examList: any[],
    trackLabel: string,
    trackIcon: React.ReactNode,
    gradient: string,
    borderColor: string,
  ) => (
    <div className="space-y-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
        {trackIcon} {trackLabel}
        {!isPremium && <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded text-[8px] font-black uppercase ml-auto">PRO</span>}
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
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black shrink-0 ${
                progress?.passed
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : unlocked
                    ? 'bg-white/10 text-white'
                    : 'bg-slate-800 text-slate-600'
              }`}>
                {progress?.passed ? <CheckCircle2 className="w-6 h-6" /> : isLocked || needsPreviousPass ? <Lock className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`text-base font-black truncate ${unlocked ? 'text-white' : 'text-slate-500'}`}>
                    NIVEL {level.level.toString().padStart(2, '0')}: {level.title}
                  </h3>
                  {level.isDemo && (
                     <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[9px] font-black uppercase">Demo Gratuita</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <FileText size={12} className={unlocked ? 'text-white/60' : 'text-slate-700'} />
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${unlocked ? 'text-white/60' : 'text-slate-700'}`}>
                      {level.totalPreguntas || 20} Reactivos
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={12} className={unlocked ? 'text-white/60' : 'text-slate-700'} />
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${unlocked ? 'text-white/60' : 'text-slate-700'}`}>
                      {level.tiempoLimite || 30} Minutos
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* BROADCAST ALERT */}
        <AnimatePresence>
          {broadcastQuery.data && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="flex items-center gap-3 p-4 bg-red-950/20 border border-red-500/30 rounded-2xl mb-8 relative overflow-hidden group">
                <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
                <div className="relative z-10 w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center shrink-0">
                  <Megaphone className="w-5 h-5 text-red-500 animate-bounce" />
                </div>
                <div className="relative z-10 flex-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Mensaje del Mando Central</span>
                  <p className="text-sm font-bold text-red-100 italic">"{broadcastQuery.data.message}"</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PROFILE & METRICS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-8 space-y-6">
            <div className="p-6 sm:p-8 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] relative overflow-hidden">
               <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/[0.03] rounded-full blur-[100px]" />
               
               <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-8">
                <div className="shrink-0 flex flex-col items-center gap-4">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-3xl border border-white/10 p-1 bg-slate-950 overflow-hidden shadow-2xl">
                      {photoURL ? (
                        <img src={photoURL} alt={name} className="w-full h-full rounded-[1.25rem] object-cover" />
                      ) : (
                        <div className="w-full h-full rounded-[1.25rem] bg-slate-900 flex items-center justify-center text-slate-700">
                          <Shield size={48} />
                        </div>
                      )}
                    </div>
                    {isPremium && (
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl border-4 border-slate-950 flex items-center justify-center shadow-lg">
                        <Star className="w-5 h-5 text-white fill-current" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-center px-4 py-2 bg-slate-950/50 border border-white/5 rounded-2xl">
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500 mb-1">Status Online</span>
                    <div className="flex items-center gap-2">
                       <span className="flex h-2 w-2 relative">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                       </span>
                       <span className="text-xs font-black text-emerald-500 font-mono">{activeCountQuery.data?.count || 1}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-6 text-center sm:text-left pt-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                      <h1 className="text-3xl font-black text-white uppercase tracking-tighter sm:text-4xl">
                        {welcomeTitle}
                      </h1>
                      <button onClick={handleLogout} className="p-2 text-slate-600 hover:text-red-500 transition-colors" title="Desconectar Operativo">
                        <LogOut className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-center sm:justify-start gap-3 mt-2">
                      <div className={`px-3 py-1 border rounded-lg text-[10px] font-black uppercase tracking-[0.2em] ${rankStyle}`}>
                         {currentRank}
                      </div>
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">#{rankPos} Global</span>
                    </div>
                  </div>

                  {/* MINI PROGRESS BARS (HUD) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 pt-4 border-t border-white/5">
                    <MetricProgress label="Volumen Entrenamiento" value={metrics.examCount} max={50} unit=" exm" icon={FileText} colorClass="text-blue-400" />
                    <MetricProgress label="Eficacia Académica" value={metrics.avgScore} unit="%" icon={Zap} colorClass="text-amber-400" />
                    <MetricProgress label="Retención Cognitiva" value={metrics.leitnerCount} max={500} unit=" flash" icon={BrainCircuit} colorClass="text-purple-400" />
                    <MetricProgress label="Rendimiento Pico" value={metrics.bestScore} unit="%" icon={CheckCircle2} colorClass="text-emerald-400" />
                  </div>

                  <div className="flex flex-wrap justify-center sm:justify-start gap-3 pt-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950/40 rounded-xl border border-white/5">
                      <Trophy size={12} className="text-amber-500" />
                      <span className="text-[10px] font-black uppercase text-slate-400">{(userStats.data as any)?.meritPoints || 0} <span className="text-slate-600 ml-1">Mérito</span></span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950/40 rounded-xl border border-white/5">
                      <Star size={12} className="text-emerald-500" />
                      <span className="text-[10px] font-black uppercase text-slate-400">{(userStats.data as any)?.honorPoints || 0} <span className="text-slate-600 ml-1">Honor</span></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Radar and Weakness */}
            {categoryStatsQuery.data && categoryStatsQuery.data.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-slate-900/40 border-slate-800">
                  <CardHeader className="py-3 px-4 border-b border-slate-800/50">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <Target className="w-3.5 h-3.5 text-blue-400" /> Radar de Aptitud
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 h-[220px]">
                    {categoryStatsQuery.data.length >= 3 ? (
                      <ResponsiveContainer width="100%" height={220} minHeight={220}>
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={categoryStatsQuery.data}>
                          <PolarGrid stroke="#334155" />
                          <PolarAngleAxis dataKey="area" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                          <Radar name="Aciertos" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-[10px] text-slate-500 italic px-4 text-center">Datos Insuficientes</div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/40 border-slate-800 p-5 flex flex-col justify-center">
                  {metrics.weakestArea ? (
                    <>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400"><Brain className="w-5 h-5" /></div>
                        <div>
                          <p className="text-[9px] font-black uppercase text-red-400">Brecha Táctica</p>
                          <h3 className="text-sm font-bold text-slate-200">Reforzar {metrics.weakestArea}</h3>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mb-4 leading-relaxed">Índice de eficacia inferior al 50%. Inicie entrenamiento correctivo.</p>
                      <Button variant="primary" className="w-full bg-red-600 hover:bg-red-500 text-xs py-2" onClick={() => navigate('/poligono')}>Iniciar Correctivo</Button>
                    </>
                  ) : (
                    <div className="text-center flex flex-col items-center">
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 mb-3"><CheckCircle2 className="w-6 h-6" /></div>
                      <h3 className="text-sm font-bold text-slate-200 mb-1">Sin Brechas Críticas</h3>
                      <p className="text-xs text-slate-400">Eficacia superior al 50% en todas las áreas.</p>
                    </div>
                  )}
                </Card>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <BookOpen className="w-5 h-5 text-cyan-400" />, label: 'Libreria', path: '/galeria', premium: false },
                { icon: <RotateCcw className="w-5 h-5 text-red-400" />, label: 'Anti-Fallo', path: '/reentrenamiento', premium: true },
                { icon: <Shield className="w-5 h-5 text-red-500" />, label: 'Entrevista IA', path: '/entrevista', premium: true },
                { icon: <BrainCircuit className="w-5 h-5 text-purple-400" />, label: 'Polígono', path: '/poligono', premium: true },
                { icon: <Target className="w-5 h-5 text-emerald-400" />, label: 'Expediente', path: '/progreso', premium: true },
                { icon: <Trophy className="w-5 h-5 text-amber-400" />, label: 'Rango Élite', path: '/ranking', premium: false },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => { if (item.premium && !isPremium) { navigate('/yape-checkout'); return; } navigate(item.path); }}
                  className="flex flex-col items-center justify-center p-4 bg-slate-900/40 border border-slate-800 rounded-2xl hover:bg-slate-800/40 hover:scale-[1.03] transition-all"
                >
                  <div className="mb-2">{item.icon}</div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</span>
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* EXAM TRACKS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-800">
          {showEO && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400"><GraduationCap className="w-6 h-6" /></div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tighter">Oficiales (EO)</h2>
                  <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Ruta de Mando</p>
                </div>
              </div>
               {renderExamTrack((levelsQuery.data?.filter(l => l.school === 'EO') || []) as any, 'Fase Evaluación', <Zap size={14} className="text-amber-500" />, 'from-blue-600/20 to-blue-900/10', '')}
            </div>
          )}
          {showEESTP && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400"><Shield className="w-6 h-6" /></div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tighter">Técnica (EESTP)</h2>
                  <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Fuerza Operativa</p>
                </div>
              </div>
              {renderExamTrack((levelsQuery.data?.filter(l => l.school === 'EESTP') || []) as any, 'Fase Evaluación', <Shield size={14} className="text-emerald-500" />, 'from-emerald-600/20 to-emerald-900/10', '')}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
