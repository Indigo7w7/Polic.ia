import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/useUserStore';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area
} from 'recharts';
import {
  ChevronLeft, Target, TrendingUp, ShieldCheck, AlertCircle, Brain, Lock,
  BookOpen, Zap, Award, BarChart3
} from 'lucide-react';
import { trpc } from '../../shared/utils/trpc';
import { motion } from 'motion/react';

export const ProgressAudit: React.FC = () => {
  const navigate = useNavigate();
  const { uid, isPremiumActive } = useUserStore();
  const isPremium = isPremiumActive();

  const historyQuery = trpc.exam.getHistory.useQuery({ userId: uid || '' }, { enabled: !!uid });
  const leitnerStatsQuery = trpc.leitner.getStatsByArea.useQuery({ userId: uid || '' }, { enabled: !!uid });

  const history = historyQuery.data || [];
  const areaStats = leitnerStatsQuery.data || [];

  // Build line chart data (last 15 exams, score normalized to /20)
  const historyData = history.slice(-15).map((d: any, i: number) => ({
    name: `Eval ${i + 1}`,
    puntaje: d.score != null ? Math.round((d.score / (d.totalQuestions || 20)) * 20 * 10) / 10 : 0,
  }));

  // Radar — build from leitner area stats, dynamically
  const radarData = areaStats.length > 0
    ? areaStats.slice(0, 6).map((area: any) => ({
        subject: area.areaName?.slice(0, 12) || 'General',
        nivel: Math.max(10, 100 - (area.count || 0) * 4),
        fullMark: 100,
      }))
    : [
        { subject: 'Constitución', nivel: 70, fullMark: 100 },
        { subject: 'Derechos HH', nivel: 55, fullMark: 100 },
        { subject: 'Cód. Penal', nivel: 40, fullMark: 100 },
        { subject: 'Razonamiento', nivel: 80, fullMark: 100 },
        { subject: 'Cultura Gral', nivel: 60, fullMark: 100 },
        { subject: 'Psicométrico', nivel: 75, fullMark: 100 },
      ];

  const sortedAreas = [...areaStats].sort((a: any, b: any) => b.count - a.count);
  const weakest = sortedAreas[0];
  const strongest = sortedAreas[sortedAreas.length - 1];
  const avgScore = historyData.length
    ? Math.round((historyData.reduce((s, d) => s + d.puntaje, 0) / historyData.length) * 10) / 10
    : null;

  const totalExams = history.length;
  const lastScore = historyData[historyData.length - 1]?.puntaje ?? null;

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-200">

      {/* ─── Header compacto ─── */}
      <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-slate-300" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-black text-white">Radar de Rendimiento</h1>
          <p className="text-xs text-slate-500">Análisis de tu progreso académico</p>
        </div>
        <BarChart3 className="w-6 h-6 text-emerald-400" />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 pb-28 space-y-5">

        {/* ─── Stats rápidos ─── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Award, label: 'Evaluaciones', value: totalExams, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
            { icon: TrendingUp, label: 'Prom. /20', value: avgScore ?? '—', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
            { icon: Zap, label: 'Último', value: lastScore ?? '—', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 sm:p-4 rounded-2xl border ${bg} text-center`}
            >
              <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
              <p className={`text-lg sm:text-2xl font-black ${color}`}>{value}</p>
              <p className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider">{label}</p>
            </motion.div>
          ))}
        </div>

        {/* ─── Evolución de puntaje ─── */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-black text-white uppercase tracking-wider">Evolución de Puntaje</h2>
          </div>
          {historyData.length === 0 ? (
            <div className="h-[180px] flex flex-col items-center justify-center text-slate-600">
              <BookOpen className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-xs font-bold">Completa al menos un examen para ver tu evolución</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={historyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} domain={[0, 20]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: 12 }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Area type="monotone" dataKey="puntaje" stroke="#10b981" strokeWidth={2.5} fill="url(#scoreGrad)" dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ─── Perfil de competencias radar ─── */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-black text-white uppercase tracking-wider">Perfil de Competencias</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
              <PolarGrid stroke="#1e293b" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="Nivel" dataKey="nivel" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
          {areaStats.length === 0 && (
            <p className="text-center text-[10px] text-slate-600 font-bold mt-2">
              Este gráfico se actualiza a medida que completas flashcards y exámenes
            </p>
          )}
        </div>

        {/* ─── Insights PRO ─── */}
        <div className="relative">
          {!isPremium && (
            <div className="absolute inset-0 z-10 backdrop-blur-md bg-slate-900/70 rounded-2xl flex flex-col items-center justify-center p-6 border border-slate-700">
              <Lock className="w-8 h-8 text-amber-400 mb-3" />
              <h3 className="text-base font-black text-white mb-1">Análisis Detallado PRO</h3>
              <p className="text-xs text-slate-400 text-center mb-5 max-w-xs leading-relaxed">
                Descubre exactamente en qué áreas necesitas mayor refuerzo con recomendaciones personalizadas.
              </p>
              <button onClick={() => navigate('/yape-checkout')} className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl transition-all">
                Desbloquear PRO
              </button>
            </div>
          )}
          <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${!isPremium ? 'opacity-30 pointer-events-none blur-sm' : ''}`}>

            <div className="p-4 bg-slate-900/60 border border-l-4 border-emerald-500 border-r-slate-800 border-t-slate-800 border-b-slate-800 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Punto Fuerte</span>
              </div>
              <p className="font-black text-white text-sm">{strongest?.areaName || 'Sin datos'}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Mejor retención en fichas de estudio</p>
            </div>

            <div className="p-4 bg-slate-900/60 border border-l-4 border-amber-500 border-r-slate-800 border-t-slate-800 border-b-slate-800 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Área Crítica</span>
              </div>
              <p className="font-black text-white text-sm">{weakest?.areaName || 'Sin datos'}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Mayor concentración de errores</p>
            </div>

            <div className="p-4 bg-slate-900/60 border border-l-4 border-blue-500 border-r-slate-800 border-t-slate-800 border-b-slate-800 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Recomendación</span>
              </div>
              <p className="font-black text-white text-sm">
                {weakest?.areaName ? `Refuerza ${weakest.areaName}` : 'Completa más exámenes'}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {weakest ? `${weakest.count} errores registrados` : 'Para obtener análisis personalizados'}
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
