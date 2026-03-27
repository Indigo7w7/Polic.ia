import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/useUserStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { 
  ChevronLeft, 
  Target, 
  TrendingUp, 
  ShieldCheck, 
  AlertCircle,
  Brain,
  Lock
} from 'lucide-react';

import { trpc } from '../../shared/utils/trpc';
// ... other imports

export const ProgressAudit: React.FC = () => {
  const navigate = useNavigate();
  const { uid, isPremiumActive } = useUserStore();
  const isPremium = isPremiumActive();

  const historyQuery = trpc.exam.getHistory.useQuery({ userId: uid || '' }, { enabled: !!uid });
  const leitnerStatsQuery = trpc.leitner.getStatsByArea.useQuery({ userId: uid || '' }, { enabled: !!uid });

  const historyData = (historyQuery.data || []).slice(-15).map((d, i) => ({
    name: `Ex ${i + 1}`,
    score: Math.round(((d.score || 0) / 5) * 10) / 10, // Assuming 0-100 score, scaling to 20
  }));

  const areaStats = leitnerStatsQuery.data || [];
  const categories = ['Constitución', 'Uso Fuerza', 'Código Penal', 'Derechos HH', 'Doctrina PNP', 'Cultura Gral'];
  const radarData = categories.map(c => {
    const area = areaStats.find(s => s.areaName === c);
    let A = 80;
    if (area) A = Math.max(20, 100 - (area.count * 5));
    return { subject: c, A, full: 100 };
  });

  const sortedAreas = [...areaStats].sort((a, b) => b.count - a.count);
  const debilidad = sortedAreas.length > 0 ? sortedAreas[0].areaName : 'Desconocida';
  const fortaleza = sortedAreas.length > 0 ? sortedAreas[sortedAreas.length - 1].areaName : 'General';
  const insights = {
    fortaleza,
    debilidad,
    recomendacion: debilidad !== 'Desconocida' ? `Aumenta flashcards en ${debilidad}.` : 'Sigue practicando simulacros.'
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] p-4 md:p-8 font-sans">
      <header className="max-w-5xl mx-auto flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate('/')}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Auditoría de Progreso</h1>
          <p className="text-sm text-slate-500 font-mono uppercase tracking-widest">Análisis Táctico de Rendimiento</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar Chart: Strengths & Weaknesses */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-400" />
                Perfil de Competencias
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Rendimiento"
                    dataKey="A"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Line Chart: Historical Evolution */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Evolución de Puntaje
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    domain={[0, 20]}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                    itemStyle={{ color: '#3b82f6' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={{ fill: '#10b981', r: 4 }} 
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tactical Summary Cards */}
        <div className="relative mt-8">
          {!isPremium && (
            <div className="absolute inset-0 z-10 backdrop-blur-md bg-slate-900/60 rounded-2xl flex flex-col items-center justify-center p-6 border border-slate-700 shadow-2xl">
              <Lock className="w-10 h-10 text-amber-400 mb-4 drop-shadow-lg" />
              <h3 className="text-xl font-black text-white mb-2 tracking-tight">Análisis Táctico Bloqueado</h3>
              <p className="text-sm text-slate-300 text-center max-w-md mb-6 leading-relaxed">Descubre exactamente en qué temas estás fallando y recibe recomendaciones de estudio generadas por IA.</p>
              <button onClick={() => navigate('/yape-checkout')} className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-lg shadow-amber-500/20">
                Desbloquear Premium
              </button>
            </div>
          )}
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${!isPremium ? 'opacity-40 pointer-events-none filter blur-md select-none' : ''}`}>
          <Card className="bg-slate-900 border-slate-800 border-l-4 border-l-emerald-500">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Fortaleza Principal</h3>
              </div>
              <p className="text-xl font-bold">{insights.fortaleza}</p>
              <p className="text-xs text-slate-500 mt-1">Mejor retención en Leitner.</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 border-l-4 border-l-amber-500">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Punto Crítico</h3>
              </div>
              <p className="text-xl font-bold">{insights.debilidad}</p>
              <p className="text-xs text-slate-500 mt-1">Acumula más errores en esta área.</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Brain className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Recomendación AI</h3>
              </div>
              <p className="text-xl font-bold">{insights.recomendacion.split('.')[0]}</p>
              <p className="text-xs text-slate-500 mt-1">{insights.recomendacion.split('.')[1] || ''}</p>
            </CardContent>
          </Card>
          </div>
        </div>
      </main>
    </div>
  );
};
