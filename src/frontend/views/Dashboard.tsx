import React, { useEffect, useState, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/useUserStore';
import { Shield, Zap, CheckCircle2, GraduationCap } from 'lucide-react';
import { trpc } from '../../shared/utils/trpc';
import { useExamManager } from '../hooks/useExamManager';
import { getMilitaryRank, getRankColor } from '../utils/ranks';

// Dashboard Components
import { BroadcastAlert } from '../components/dashboard/BroadcastAlert';
import { AchievementOverlay } from '../components/dashboard/AchievementOverlay';

// Lazy Loaded Components
const ExamTrack = lazy(() => import('../components/dashboard/ExamTrack').then(m => ({ default: m.ExamTrack })));

let socket: any;

export const Dashboard: React.FC = () => {
  const {
    uid, role, isPremiumActive, name, photoURL, modalidad_postulacion,
    honorPoints, achievementsQueue, popAchievement, examProgress
  } = useUserStore();

  const navigate = useNavigate();
  const isPremium = isPremiumActive();

  const dashboardQuery = trpc.user.getDashboardSummary.useQuery(
    { uid: uid || '', school: modalidad_postulacion || undefined },
    { enabled: !!uid, refetchOnWindowFocus: false }
  );

  const levelsQuery = trpc.exam.getLevels.useQuery();

  const dashboardData = dashboardQuery.data;
  const userStats = dashboardData?.stats;
  const lastBroadcast = dashboardData?.lastBroadcast;
  const metricsLoading = dashboardQuery.isLoading;

  const activeCountQuery = trpc.admin.getActiveCount.useQuery(undefined, {
    enabled: !!uid && role === 'admin',
    refetchInterval: 30000,
  });

  const { startingExam, startLevel } = useExamManager();
  const currentRank = getMilitaryRank(honorPoints, modalidad_postulacion);

  const [realtimeBroadcast, setRealtimeBroadcast] = useState<any>(null);
  const [showBroadcast, setShowBroadcast] = useState(false);

  useEffect(() => {
    const SOCKET_URL = window.location.hostname === 'localhost'
      ? 'http://localhost:3001'
      : 'https://polic-ia-production.up.railway.app';

    if (typeof window !== 'undefined' && (window as any).io) {
      const ioClient = (window as any).io;
      socket = ioClient(SOCKET_URL, { transports: ['websocket'] });

      socket.on('system_broadcast', (data: any) => {
        setRealtimeBroadcast(data);
        setShowBroadcast(true);
        setTimeout(() => setShowBroadcast(false), 15000);
      });
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (lastBroadcast && !realtimeBroadcast) {
      setRealtimeBroadcast(lastBroadcast);
      setShowBroadcast(true);
      const t = setTimeout(() => setShowBroadcast(false), 10000);
      return () => clearTimeout(t);
    }
  }, [lastBroadcast, realtimeBroadcast]);

  const showEO = modalidad_postulacion === 'EO' || modalidad_postulacion === null;
  const showEESTP = modalidad_postulacion === 'EESTP' || modalidad_postulacion === null;
  const firstName = name === 'Invitado' ? 'Postulante' : name?.split(' ')[0] || 'Postulante';

  const welcomeTitle = modalidad_postulacion === 'EO'
    ? `CADETE: ${firstName}`
    : modalidad_postulacion === 'EESTP'
      ? `ALUMNO PNP: ${firstName}`
      : `POSTULANTE: ${firstName}`;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <AchievementOverlay unlocked={achievementsQueue?.[0] || null} onClose={popAchievement} />
        <BroadcastAlert data={realtimeBroadcast as any} visible={showBroadcast} />

        {/* ─── MINI HEADER (click → perfil) ────────────────────────── */}
        {metricsLoading ? (
          <div className="h-20 bg-slate-900/40 animate-pulse rounded-[2rem] border border-slate-800" />
        ) : (
          <div
            className="flex items-center gap-4 px-6 py-4 bg-slate-900/60 border border-slate-800/80 rounded-[2rem] cursor-pointer hover:border-slate-700 transition-colors group"
            onClick={() => navigate('/perfil')}
          >
            <div className="relative shrink-0">
              <img
                src={photoURL || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Postulante&backgroundColor=0f172a`}
                alt="Avatar"
                className="w-12 h-12 rounded-xl border-2 border-slate-700 object-cover"
              />
              {isPremium && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-[#020617] flex items-center justify-center">
                  <span className="text-[6px] font-black text-black">★</span>
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">{welcomeTitle}</p>
              <p className="text-sm font-black text-white truncate">{currentRank}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right hidden sm:block">
                <p className="text-[9px] text-slate-500 uppercase tracking-widest">Honor</p>
                <p className="text-sm font-black text-emerald-400">{honorPoints}</p>
              </div>
              <div className="p-2 bg-slate-800 rounded-xl text-slate-500 group-hover:text-slate-300 transition-colors">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
          </div>
        )}

        {/* ─── RUTA DE MANDO ───────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600/20 border border-blue-500/40 rounded-2xl">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Ruta de Mando</h1>
                <p className="text-[10px] font-bold tracking-widest text-blue-400/70 uppercase">Simulacros por Nivel — Comienza Aquí</p>
              </div>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-blue-600/30 to-transparent" />
          </div>

          <Suspense fallback={<div className="h-96 bg-slate-900/20 animate-pulse rounded-3xl" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {showEO && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-white uppercase tracking-tighter">Oficiales (EO)</h2>
                      <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Ruta de Mando</p>
                    </div>
                  </div>
                  {levelsQuery.isLoading ? (
                    <div className="h-64 bg-slate-900/20 animate-pulse rounded-3xl" />
                  ) : (
                    <ExamTrack
                      examList={(levelsQuery.data?.filter(l => l.school === 'EO') || []) as any}
                      trackLabel="Fase Evaluación" trackIcon={<Zap size={14} className="text-amber-500" />}
                      isPremium={isPremium} examProgress={examProgress}
                      startingExam={!!startingExam} onStartLevel={startLevel}
                    />
                  )}
                </div>
              )}
              {showEESTP && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-white uppercase tracking-tighter">Técnica (EESTP)</h2>
                      <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Fuerza Operativa</p>
                    </div>
                  </div>
                  {levelsQuery.isLoading ? (
                    <div className="h-64 bg-slate-900/20 animate-pulse rounded-3xl" />
                  ) : (
                    <ExamTrack
                      examList={(levelsQuery.data?.filter(l => l.school === 'EESTP') || []) as any}
                      trackLabel="Fase Evaluación" trackIcon={<Shield size={14} className="text-emerald-500" />}
                      isPremium={isPremium} examProgress={examProgress}
                      startingExam={!!startingExam} onStartLevel={startLevel}
                    />
                  )}
                </div>
              )}
            </div>
          </Suspense>
        </div>

        {/* ─── ANTI-CAÍDA ──────────────────────────────────────────── */}
        <div
          className="relative p-6 rounded-[2rem] bg-red-950/20 border border-red-900/30 flex items-center gap-5 cursor-pointer hover:bg-red-950/30 transition-colors group"
          onClick={() => navigate('/reentrenamiento')}
        >
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl shrink-0 group-hover:bg-red-500/20 transition-colors">
            <CheckCircle2 className="w-7 h-7 text-red-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-black text-white uppercase tracking-tighter">Entrenamiento Anti-Caída</h2>
            <p className="text-xs text-slate-400 mt-0.5">Refuerza tus preguntas con más errores para no fallar en el examen.</p>
          </div>
          <div className="shrink-0">
            <Zap className="w-5 h-5 text-red-400/60 group-hover:text-red-400 transition-colors" />
          </div>
        </div>

      </main>
    </div>
  );
};
