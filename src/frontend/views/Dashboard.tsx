import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/useUserStore';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import {
  Shield, Trophy, Lock, LogOut, Zap, BrainCircuit, History,
  ChevronRight, FileText, Clock, ShieldAlert, Play,
  Brain, Target, ExternalLink, TrendingUp, CheckCircle2, BarChart3,
  GraduationCap, Unlock, Star, BookOpen, Sparkles, Megaphone, RotateCcw
} from 'lucide-react';
import { trpc } from '../../shared/utils/trpc';
import { useExamStore } from '../store/useExamStore';
import { useExamManager } from '../hooks/useExamManager';
import { Header } from '../components/common/Header';
import { ExamDocument, LeitnerDocument } from '../../shared/types';
import { toast } from 'sonner';
import { motion } from 'motion/react';
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
  const { uid, role, isPremiumActive, name, photoURL, modalidad_postulacion, examProgress, honorPoints } = useUserStore();
  const navigate = useNavigate();
  const isPremium = isPremiumActive();

  // tRPC Queries
  const userStats = trpc.user.getStats.useQuery({ uid: uid || '' }, { enabled: !!uid });
  const leitnerStats = trpc.leitner.getStats.useQuery({ userId: uid || '' }, { enabled: !!uid });
  const levelsQuery = trpc.exam.getLevels.useQuery();
  const broadcastQuery = trpc.user.getLastBroadcast.useQuery(undefined, { refetchInterval: 60000 });
  const categoryStatsQuery = trpc.user.getCategoryStats.useQuery({ uid: uid || '' }, { enabled: !!uid });

  const metricsLoading = userStats.isLoading || leitnerStats.isLoading;
  
  // Calcular weakestArea en base a categoryStats
  let weakestArea = null;
  if (categoryStatsQuery.data && categoryStatsQuery.data.length > 0) {
    const sorted = [...categoryStatsQuery.data].sort((a, b) => a.score - b.score);
    // Solo si tiene menos del 50% lo consideramos una vulnerabilidad crítica
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

  const utils = trpc.useUtils();
  const { startingExam, startLevel } = useExamManager();


  /* ── Start a level-based exam ── */


  /* ── School filtering ── */
  const isFree = !isPremium;
  const showEO = modalidad_postulacion === 'EO' || modalidad_postulacion === null;
  const showEESTP = modalidad_postulacion === 'EESTP' || modalidad_postulacion === null;

  /* ── Personalized welcome ── */
  const firstName = name === 'Invitado' ? 'Postulante' : name.split(' ')[0];
  const currentRank = getMilitaryRank(honorPoints, modalidad_postulacion);
  const rankStyle = getRankColor(honorPoints);

  const welcomeTitle = modalidad_postulacion === 'EO'
    ? `¡Adelante, ${currentRank} ${firstName}!`
    : modalidad_postulacion === 'EESTP'
      ? `¡Vamos con todo, ${currentRank} PNP ${firstName}!`
      : `Modo Explorador: ${firstName}`;

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

              {/* Text content */}
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
                      {level.totalPreguntas} Reactivos
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={12} className={unlocked ? 'text-white/60' : 'text-slate-700'} />
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${unlocked ? 'text-white/60' : 'text-slate-700'}`}>
                      {level.tiempoLimite} Minutos
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              {!isLocked && !needsPreviousPass && (
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <ChevronRight className="w-5 h-5 text-white" />
                </div>
              )}
            </div>

            {/* Background elements */}
            {unlocked && (
              <>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-500" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12 transition-transform group-hover:scale-150 duration-500" />
              </>
            )}
          </motion.button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-blue-500/30">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* ── BROADCAST ALERT ── */}
        <AnimatePresence>
          {broadcastQuery.data && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
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

        {/* ── PROFILE & METRICS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Welcome and Summary */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6 p-6 bg-slate-900/40 border border-slate-800 rounded-3xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px]" />
               
               <div className="relative shrink-0 flex flex-col items-center gap-2">
                <div className="w-24 h-24 rounded-full border-2 border-blue-500/30 p-1.5 bg-slate-900 shadow-2xl relative">
                  {photoURL ? (
                    <img src={photoURL} alt={name} className="w-full h-full rounded-full object-cover grayscale-[0.3]" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                      <Shield size={40} />
                    </div>
                  )}
                  {isPremium && (
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-amber-500 rounded-full border-4 border-slate-900 flex items-center justify-center shadow-lg">
                      <Star className="w-4 h-4 text-white fill-current" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Mérito Total</span>
                  <div className="flex items-center gap-1 text-amber-500">
                    <Trophy className="w-3.5 h-3.5" />
                    <span className="text-sm font-bold">{userStats.data?.meritPoints || 0}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <h1 className="text-2xl font-black text-white uppercase tracking-tighter sm:text-3xl">
                    {welcomeTitle}
                  </h1>
                  <div className={`px-3 py-1 border rounded-lg text-[10px] font-black uppercase tracking-widest inline-block ${rankStyle}`}>
                     {currentRank}
                  </div>
                </div>
                <p className="text-sm text-slate-400 mt-1 max-w-[500px]">
                  {isPremium 
                    ? "Unidad de Élite - Rango PRO [Acceso Total]"
                    : "Unidad en Entrenamiento - Rango FREE [Acceso Limitado]"
                  }
                </p>
                <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-4">
                  {[
                    { label: 'Exámenes', val: metrics.examCount, icon: <FileText size={12}/> },
                    { label: 'Promedio', val: `${metrics.avgScore}%`, icon: <TrendingUp size={12}/> },
                    { label: 'Flashcards', val: metrics.leitnerCount, icon: <Brain size={12}/> }
                  ].map(m => (
                    <div key={m.label} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/40 rounded-full border border-slate-700/50">
                      <span className="text-blue-400">{m.icon}</span>
                      <span className="text-[11px] font-black uppercase text-slate-300">{m.val} <span className="text-slate-600 ml-1">{m.label}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Mejor Nota', val: `${metrics.bestScore}%`, icon: <Trophy className="text-amber-500" /> },
                { label: 'Último Tes', val: metrics.lastExamDate || 'N/A', icon: <Clock className="text-blue-500" /> },
                { label: 'Leitner', val: metrics.leitnerCount, icon: <BrainCircuit className="text-purple-500" /> },
                { label: 'Puntos Honor', val: userStats.data?.honorPoints || 0, icon: <Star className="text-emerald-500" /> },
              ].map((stat, i) => (
                <motion.div 
                  key={stat.label} 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.1 * i }}
                  className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl hover:border-slate-700 transition-all group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="group-hover:scale-110 transition-transform">{stat.icon}</div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{stat.label}</span>
                  </div>
                  <div className="text-xl font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">{stat.val}</div>
                </motion.div>
              ))}
            </div>

            {/* Weakness alert and Radar Chart */}
            {categoryStatsQuery.data && categoryStatsQuery.data.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Radar Chart */}
                <Card className="bg-slate-900/40 border-slate-800">
                  <CardHeader className="py-3 px-4 border-b border-slate-800/50">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <Target className="w-3.5 h-3.5 text-blue-400" /> Radar de Aptitud
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 h-[220px]">
                    {categoryStatsQuery.data.length >= 3 ? (
                      <ResponsiveContainer width="100%" height={220} minHeight={220}>
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={categoryStatsQuery.data.map(d => ({ ...d, fullMark: 100 }))}>
                          <PolarGrid stroke="#334155" />
                          <PolarAngleAxis dataKey="area" tick={{ fill: '#94a3b8', fontSize: 9, fontFamily: 'monospace' }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar name="Aciertos" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-[10px] text-slate-500 font-mono italic uppercase px-4 text-center">
                        Requiere actividad en al menos 3 áreas distintas para generar el radar
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Priority Mission */}
                <Card className="bg-slate-900/40 border-slate-800 flex flex-col justify-center relative overflow-hidden">
                  {metrics.weakestArea ? (
                    <>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl" />
                      <CardContent className="p-5 relative z-10">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                            <Brain className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-red-400">Brecha Táctica</p>
                            <h3 className="text-sm font-bold text-slate-200">Reforzar {metrics.weakestArea}</h3>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                          La IA ha detectado un índice de eficacia menor al 50% en esta área según tus últimos operativos.
                        </p>
                        <Button variant="primary" className="w-full bg-red-600 hover:bg-red-500 text-xs py-2 shadow-lg shadow-red-900/20" onClick={() => navigate('/poligono')}>
                          Iniciar Entrenamiento Correctivo
                        </Button>
                      </CardContent>
                    </>
                  ) : (
                    <>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
                      <CardContent className="p-5 relative z-10 text-center flex flex-col items-center justify-center h-full">
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 mb-3 inline-flex">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-200 mb-1">Sin Brechas Críticas</h3>
                        <p className="text-xs text-slate-400 mb-4">Mantienes una eficacia superior al 50% en todas las áreas de estudio. ¡Excelente perfil!</p>
                        <Button variant="outline" className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={() => navigate('/poligono')}>
                          Mantenimiento Rutinario
                        </Button>
                      </CardContent>
                    </>
                  )}
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
                  <Button variant="primary" className="bg-amber-600 hover:bg-amber-500 text-slate-900 border-none px-6" onClick={() => navigate('/yape-checkout')}>Mejorar Ahora</Button>
                </div>
              </motion.div>
            )}

          </div>

          {/* Lateral Actions and Quick Access */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Secondary Nav Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <BookOpen className="w-5 h-5 text-cyan-400" />, label: 'Base de Datos', path: '/galeria', premium: false },
                { icon: <RotateCcw className="w-5 h-5 text-red-400" />, label: 'Anti-Fallo', path: '/reentrenamiento', premium: true },
                { icon: <Shield className="w-5 h-5 text-red-500" />, label: 'Entrevista IA', path: '/entrevista', premium: true },
                { icon: <BrainCircuit className="w-5 h-5 text-purple-400" />, label: 'Polígono', path: '/poligono', premium: true },
                { icon: <Target className="w-5 h-5 text-emerald-400" />, label: 'Expediente', path: '/progreso', premium: true },
                { icon: <Trophy className="w-5 h-5 text-amber-400" />, label: 'Rango Élite', path: '/ranking', premium: false },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => {
                    if (item.premium && !isPremium) { navigate('/yape-checkout'); return; }
                    navigate(item.path);
                  }}
                  className="flex flex-col items-center justify-center p-4 bg-slate-900/40 border border-slate-800 rounded-2xl hover:bg-slate-800/40 hover:scale-[1.03] active:scale-95 transition-all group"
                >
                  <div className="mb-2 group-hover:scale-110 transition-transform">{item.icon}</div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Resources Section */}
            <Card className="bg-slate-900/40 border-slate-800">
              <CardHeader className="py-4 border-b border-slate-800/50">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" /> Material Estratégico
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <ResourceButton title="Prospecto de Admisión 2025" url="https://policia.ia/manuales/prospecto-2025.pdf" />
                <ResourceButton title="Tabla de Talla y Peso" url="https://policia.ia/manuales/requisitos-fisicos.pdf" />
                <ResourceButton title="Guía de Doctrina Policial" url="https://policia.ia/manuales/doctrina-nacional.pdf" />
              </CardContent>
            </Card>

            {/* Support section */}
            <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-3xl text-center">
              <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                <Shield className="text-blue-400 w-6 h-6" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest mb-1 text-white">¿Necesitas Ayuda?</h3>
              <p className="text-xs text-slate-400 mb-4">Nuestro equipo técnico está listo para asistirte en tu preparación.</p>
              <Button variant="outline" className="w-full text-xs py-2 border-slate-600 hover:bg-white hover:text-slate-900 transition-all font-black uppercase tracking-widest">
                Contactar Soporte
              </Button>
            </div>
          </div>
        </div>

        {/* ── EXAM TRACKS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* EO PNP SECTION */}
          {showEO && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tighter">Escuela de Oficiales (EO)</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ruta de Mando Gubernamental</p>
                </div>
              </div>
              
              {renderExamTrack(
                levelsQuery.data?.filter(l => l.school === 'EO') || [],
                'Fase de Evaluación: Oficiales',
                <Zap size={14} className="text-amber-500" />,
                'from-blue-600/20 to-blue-900/10',
                'border-blue-500/30'
              )}
            </div>
          )}

          {/* EESTP PNP SECTION */}
          {showEESTP && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                  <Shield size={6} className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tighter">Escuela Técnica (EESTP)</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fuerza Operativa de la Nación</p>
                </div>
              </div>

              {renderExamTrack(
                levelsQuery.data?.filter(l => l.school === 'EESTP') || [],
                'Fase de Evaluación: Suboficiales',
                <Shield size={14} className="text-emerald-500" />,
                'from-emerald-600/20 to-emerald-900/10',
                'border-emerald-500/30'
              )}
            </div>
          )}

        </div>

      </main>
    </div>
  );
};
