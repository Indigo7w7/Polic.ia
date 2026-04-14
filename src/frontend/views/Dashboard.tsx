import React, { useEffect, useState, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/useUserStore';
import { 
  Shield, Zap, FileText, BrainCircuit, CheckCircle2, 
  GraduationCap, Sparkles, Sliders
} from 'lucide-react';
import { trpc } from '../../shared/utils/trpc';
import { useExamManager } from '../hooks/useExamManager';
import { getMilitaryRank, getRankColor } from '../utils/ranks';

// Dashboard Components
import { ProfileHeader } from '../components/dashboard/ProfileHeader';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { BroadcastAlert } from '../components/dashboard/BroadcastAlert';
import { MetricProgress } from '../components/dashboard/MetricProgress';
import { AchievementOverlay } from '../components/dashboard/AchievementOverlay';

// Lazy Loaded Components
const AptitudeRadar = lazy(() => import('../components/dashboard/AptitudeRadar').then(m => ({ default: m.AptitudeRadar })));
const ExamTrack = lazy(() => import('../components/dashboard/ExamTrack').then(m => ({ default: m.ExamTrack })));

interface Metrics {
  leitnerCount: number;
  avgScore: number;
  examCount: number;
  bestScore: number;
  lastExamDate: string | null;
  weakestArea: string | null;
}

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
  const achievementsQuery = trpc.gamification.getAchievements.useQuery(undefined, { enabled: !!uid });
  
  const dashboardData = dashboardQuery.data;
  const userStats = dashboardData?.stats;
  const leitnerStats = dashboardData?.leitner;
  const rankPos = dashboardData?.rankPos || '--';
  const categoryStats = dashboardData?.categoryStats || [];
  const lastBroadcast = dashboardData?.lastBroadcast;

  const metricsLoading = dashboardQuery.isLoading;

  const activeCountQuery = trpc.admin.getActiveCount.useQuery(undefined, {
    enabled: !!uid && role === 'admin',
    refetchInterval: 30000,
  });

  // Predictive Prefetching (Decision: "Lo Mejor")
  const utils = trpc.useUtils();
  useEffect(() => {
    if (!metricsLoading) {
      // Prefetch Ranking (most common next click)
      utils.user.getRanking.prefetch({ school: modalidad_postulacion || undefined });
      // Prefetch specific exam levels
      utils.exam.getLevels.prefetch();
    }
  }, [metricsLoading, utils, modalidad_postulacion]);

  const unlockedCodes = (achievementsQuery.data || [])
    .filter(a => a.isUnlocked)
    .map(a => a.code);

  let weakestArea = null;
  if (categoryStats.length > 0) {
    const sorted = [...categoryStats].sort((a, b) => a.score - b.score);
    if (sorted[0].score < 50) {
      weakestArea = sorted[0].area;
    }
  }

  const metrics: Metrics = {
    leitnerCount: leitnerStats?.count || 0,
    avgScore: Math.round(Number(userStats?.averageScore || 0) * 100),
    examCount: userStats?.totalAttempts || 0,
    bestScore: Math.round(Number(userStats?.bestScore || 0) * 100),
    lastExamDate: userStats?.lastExamDate ? new Date(userStats.lastExamDate).toLocaleDateString('es-PE') : null,
    weakestArea,
  };

  const { startingExam, startLevel } = useExamManager();
  const currentRank = getMilitaryRank(honorPoints, modalidad_postulacion);
  const rankStyle = getRankColor(honorPoints);

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

  const handleLogout = async () => {
    const { auth } = await import('../../firebase');
    await auth.signOut();
    useUserStore.getState().setUserData({
      uid: null, role: 'user', estado_financiero: 'FREE', modalidad_postulacion: null,
    });
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <AchievementOverlay unlocked={achievementsQueue?.[0] || null} onClose={popAchievement} />
        <BroadcastAlert data={realtimeBroadcast as any} visible={showBroadcast} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-12 space-y-6">
            {metricsLoading ? (
              <div className="h-64 bg-slate-900/40 animate-pulse rounded-[3rem] border border-slate-800" />
            ) : (
              <ProfileHeader
                displayName={name} photoURL={photoURL} role={role} isPremium={isPremium}
                honorPoints={honorPoints} meritPoints={userStats?.meritPoints || 0}
                meritPointsFromStats={userStats?.meritPoints || 0}
                rankName={currentRank} rankStyle={rankStyle} rankPos={rankPos}
                activeUsers={activeCountQuery.data?.count || 1} onLogout={handleLogout}
                welcomeTitle={welcomeTitle} achievements={unlockedCodes}
              >
                <div className="hidden sm:grid grid-cols-2 gap-x-6 gap-y-3 pt-2 border-t border-white/5">
                  <MetricProgress label="Simulacros" value={metrics.examCount} max={50} unit=" eval" icon={FileText} colorClass="text-blue-400" />
                  <MetricProgress label="Eficacia" value={metrics.avgScore} unit="%" icon={Zap} colorClass="text-amber-400" />
                </div>
              </ProfileHeader>
            )}

            {!metricsLoading && (
              <div className="sm:hidden grid grid-cols-2 gap-x-4 gap-y-3 p-6 bg-slate-900/40 border border-slate-800 rounded-[2rem]">
                <MetricProgress label="Simulacros" value={metrics.examCount} max={50} unit=" eval" icon={FileText} colorClass="text-blue-400" />
                <MetricProgress label="Eficacia" value={metrics.avgScore} unit="%" icon={Zap} colorClass="text-amber-400" />
                <MetricProgress label="Flashcards" value={metrics.leitnerCount} max={500} unit="" icon={BrainCircuit} colorClass="text-purple-400" />
                <MetricProgress label="Pico" value={metrics.bestScore} unit="%" icon={CheckCircle2} colorClass="text-emerald-400" />
              </div>
            )}

            <ActivityFeed 
              fsrsStats={leitnerStats || { count: 0, newCount: 0, learningCount: 0, reviewCount: 0 }} 
              examCount={metrics.examCount} leitnerCount={metrics.leitnerCount}
            />

            <Suspense fallback={<div className="h-64 bg-slate-900/20 animate-pulse rounded-3xl" />}>
              <AptitudeRadar categoryStats={categoryStats || []} weakestArea={metrics.weakestArea} />
            </Suspense>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="md:col-span-2 relative p-8 rounded-[2.5rem] bg-gradient-to-r from-blue-600 to-indigo-700 border border-blue-400/30 overflow-hidden shadow-[0_0_50px_rgba(37,99,235,0.2)] group cursor-pointer" 
                   onClick={() => navigate('/generator')}>
                 <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700" />
                 <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 justify-between">
                   <div className="flex items-center gap-6">
                     <div className="p-5 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20">
                       <Sparkles className="w-8 h-8 text-white" />
                     </div>
                     <div>
                       <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Generador Táctico IA</h2>
                       <p className="text-blue-100 text-sm opacity-80 max-w-sm">Cruce sus brechas de conocimiento con simulacros personalizados según su Radar.</p>
                     </div>
                   </div>
                   <button className="px-8 py-3 bg-white text-blue-600 font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-blue-50 transition-colors shadow-lg">
                     Configurar Misión
                   </button>
                 </div>
              </div>

              <div className="relative p-8 rounded-[2.5rem] bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center group cursor-pointer"
                   onClick={() => navigate('/dashboard/scenarios')}>
                 <Shield className="w-10 h-10 text-slate-600 mb-3 group-hover:text-blue-400 transition-colors" />
                 <h3 className="text-white font-black uppercase text-sm tracking-widest">Simulador 105</h3>
                 <p className="text-[10px] text-slate-500 mt-1">Casos operativos de campo</p>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Suspense fallback={<div className="h-96 bg-slate-900/20 animate-pulse rounded-3xl" />}>
            {showEO && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400"><GraduationCap className="w-6 h-6" /></div>
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">Oficiales (EO)</h2>
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
          </Suspense>
          
          <Suspense fallback={<div className="h-96 bg-slate-900/20 animate-pulse rounded-3xl" />}>
            {showEESTP && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400"><Shield className="w-6 h-6" /></div>
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">Técnica (EESTP)</h2>
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
          </Suspense>
        </div>
      </main>
    </div>
  );
};
