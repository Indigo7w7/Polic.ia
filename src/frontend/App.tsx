import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, Suspense, lazy } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { trpc } from '../shared/utils/trpc';
import { auth } from '../firebase';
import { useUserStore } from './store/useUserStore';
import { AdminLogin } from './views/AdminLogin';
import { RequireAuth } from './components/common/RequireAuth';
import { RequireAdmin } from './components/common/RequireAdmin';
import { PressureNotification } from './components/ui/PressureNotification';
import { MascotAdvisor } from './components/MascotAdvisor';
import { Toaster } from 'sonner';
import { Shield, Loader2, AlertTriangle, X } from 'lucide-react';
import { Sidebar } from './components/ui/Sidebar';
import { TacticalErrorBoundary } from './components/common/TacticalErrorBoundary';

// BUG-17 FIX: dev-only logger — zero output in production builds
const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log(...args);
};

// Lazy Loaded Routes (Performance Step 4)
const Dashboard = lazy(() => import('./views/Dashboard').then(m => ({ default: m.Dashboard })));
const Simulador = lazy(() => import('./views/Simulador').then(m => ({ default: m.Simulador })));
const YapeCheckout = lazy(() => import('./views/YapeCheckout').then(m => ({ default: m.YapeCheckout })));
const Resultados = lazy(() => import('./views/Resultados').then(m => ({ default: m.Resultados })));
const Ranking = lazy(() => import('./views/Ranking').then(m => ({ default: m.Ranking })));
const ProgressAudit = lazy(() => import('./views/ProgressAudit').then(m => ({ default: m.ProgressAudit })));
const Login = lazy(() => import('./views/Login').then(m => ({ default: m.Login })));
const SchoolSelector = lazy(() => import('./views/SchoolSelector').then(m => ({ default: m.SchoolSelector })));
const Reentrenamiento = lazy(() => import('./views/Reentrenamiento').then(m => ({ default: m.Reentrenamiento })));
const LeadMagnet = lazy(() => import('./views/LeadMagnet').then(m => ({ default: m.LeadMagnet })));
const Flashcards = lazy(() => import('./views/Flashcards').then(m => ({ default: m.Flashcards })));
const ScenariosView = lazy(() => import('./views/ScenariosView').then(m => ({ default: m.default })));
const ScenarioChat = lazy(() => import('./components/scenarios/ScenarioChat').then(m => ({ default: m.default })));
const ExamGeneratorView = lazy(() => import('./views/ExamGeneratorView').then(m => ({ default: m.default })));
const AdminCommandCenter = lazy(() => import('./views/AdminCommandCenter').then(m => ({ default: m.AdminCommandCenter })));
const LearningGallery = lazy(() => import('./views/LearningGallery').then(m => ({ default: m.LearningGallery })));
const EntrevistaIA = lazy(() => import('./views/EntrevistaIA').then(m => ({ default: m.EntrevistaEnVivo })));
const MedalGallery = lazy(() => import('./views/MedalGallery').then(m => ({ default: m.MedalGallery })));
const Profile = lazy(() => import('./views/Profile').then(m => ({ default: m.Profile })));

/** Full-screen loader shown while Firebase resolves auth state */
const AuthLoader = () => (
  <div className="min-h-screen bg-[#060d1a] flex flex-col items-center justify-center gap-4">
    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30 animate-pulse">
      <Shield className="w-8 h-8 text-white" />
    </div>
    <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
    <p className="text-[10px] text-slate-600 uppercase tracking-[0.3em] font-bold">Verificando acceso…</p>
    <div className="mt-4 p-1 px-3 bg-indigo-600/20 border border-indigo-500/30 rounded-full">
      <span className="text-[9px] text-indigo-400 font-black tracking-widest uppercase">SYSLOG: 04.01.H_MEGA_V12_PROD_FIX</span>
    </div>
  </div>
);

const GlobalRedirector = () => {
  const { role, uid, modalidad_postulacion } = useUserStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 1. Administration Override (Portals)
    const adminRestrictedPaths = ['/', '/login', '/seleccionar-escuela'];

    if (uid && role === 'admin' && adminRestrictedPaths.includes(location.pathname)) {
      devLog('[AUTH] Admin access detected, routing to Command Center');
      navigate('/admin-command-center', { replace: true });
      return;
    }

    // 2. Onboarding: Mandatory School Selection for Users
    const authPublicPaths = ['/login', '/yape-checkout', '/seleccionar-escuela'];
    if (uid && role === 'user' && !modalidad_postulacion && !authPublicPaths.includes(location.pathname)) {
      devLog('[ONBOARDING] No school selected, routing to School Selector');
      navigate('/seleccionar-escuela', { replace: true });
    }
  }, [role, uid, modalidad_postulacion, navigate, location.pathname]);

  return null;
};

const GlobalAlertListener = () => {
  const { role } = useUserStore();
  const broadcastQ = trpc.admin.getActiveBroadcast.useQuery(undefined, {
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const alert = broadcastQ.data;
  const sessionKey = alert ? `broadcast_seen_${alert.id}` : null;
  const alreadySeen = sessionKey ? sessionStorage.getItem(sessionKey) === 'true' : false;
  const [dismissed, setDismissed] = useState(alreadySeen);

  if (!alert || dismissed || role === 'admin') return null;

  const handleDismiss = () => {
    if (sessionKey) sessionStorage.setItem(sessionKey, 'true');
    setDismissed(true);
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-black border-2 border-red-500 rounded-xl overflow-hidden shadow-[0_0_80px_rgba(239,68,68,0.4)]">
        <div className="absolute inset-0 pointer-events-none animate-pulse bg-red-950/15" />
        <div className="relative p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center animate-bounce">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-[9px] text-red-500 font-black tracking-[0.5em] uppercase animate-pulse">⚠ ALERTA GLOBAL ACTIVA</div>
              <div className="text-lg font-black text-red-300 tracking-wider">{alert.title}</div>
            </div>
          </div>
          <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4 mb-5">
            <p className="text-red-200 text-sm leading-relaxed">{alert.message}</p>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-red-700 uppercase tracking-widest font-mono">
              TIPO: <span className="text-red-400 font-black">{alert.type}</span>
            </span>
            <button
              onClick={handleDismiss}
              className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-[11px] tracking-widest uppercase rounded-lg transition-colors"
            >
              <X className="w-4 h-4" /> ACUSADO RECIBO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function AppContent() {
  const { uid, role, setUserData } = useUserStore();
  const location = useLocation();
  const [authResolved, setAuthResolved] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const profileQuery = trpc.user.getProfile.useQuery(
    { uid: uid || '' },
    { enabled: !!uid, refetchOnWindowFocus: false }
  );

  useEffect(() => {
    if (profileQuery.data) {
      const data = profileQuery.data;
      const currentState = useUserStore.getState();
      setUserData({
        uid: data.uid,
        name: data.name || 'Postulante',
        photoURL: data.photoURL || null,
        role: data.role || 'user',
        status: data.status || 'ACTIVE',
        estado_financiero: data.membership || 'FREE',
        acceso_unificado: false,
        modalidad_postulacion: currentState.modalidad_postulacion || (data.school as any) || null,
        fecha_expiracion_premium: data.premiumExpiration || null,
      });
      setAuthResolved(true);
    }
  }, [profileQuery.data, setUserData]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const idToken = await user.getIdToken(false);
          localStorage.setItem('authToken', idToken);
        } catch (e) { /* ignore */ }
        setUserData({ uid: user.uid, role: 'user', photoURL: user.photoURL });
        setIsAuthChecking(false);
      } else {
        localStorage.removeItem('authToken');
        setUserData({ uid: null, estado_financiero: 'FREE', status: 'ACTIVE', fecha_expiracion_premium: null, role: 'user', photoURL: null, modalidad_postulacion: null });
        setIsAuthChecking(false);
        setAuthResolved(true);
      }
    });
    return () => unsubscribeAuth();
  }, [setUserData]);

  useEffect(() => {
    if (isAuthChecking) return;
    if (!uid || profileQuery.status === 'error') {
      setAuthResolved(true);
    }
  }, [profileQuery.status, uid, isAuthChecking]);

  const updateActivityMutation = trpc.user.updateLastSeen.useMutation();
  useEffect(() => {
    if (!uid) return;
    const interval = setInterval(() => {
      updateActivityMutation.mutateAsync({ uid }).catch(() => null);
    }, 180000);
    return () => clearInterval(interval);
  }, [uid, updateActivityMutation]);

  if (!authResolved) return <AuthLoader />;

  return (
    <div className="relative">
      <GlobalRedirector />
      <GlobalAlertListener />
      <Toaster position="top-center" theme="dark" richColors />
      <PressureNotification />
      {role !== 'admin' && <MascotAdvisor />}

      {uid && role !== 'admin' && !['/login', '/cebo', '/yape-checkout', '/seleccionar-escuela', '/entrevista'].includes(location.pathname) && !location.pathname.includes('/play/') && (
         <Sidebar />
      )}

      <div className={(uid && role !== 'admin' && !['/login', '/cebo', '/entrevista'].includes(location.pathname) && !location.pathname.includes('/play/')) ? 'lg:pl-24 transition-all duration-300 min-h-screen' : 'transition-all duration-300 min-h-screen'}>
        <Suspense fallback={<AuthLoader />}>
          <Routes>
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cebo" element={<LeadMagnet />} />
            <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/seleccionar-escuela" element={<RequireAuth><SchoolSelector /></RequireAuth>} />
            <Route path="/yape-checkout" element={<RequireAuth><YapeCheckout /></RequireAuth>} />
            <Route path="/resultados" element={<RequireAuth><Resultados /></RequireAuth>} />
            <Route path="/simulador" element={<RequireAuth><Simulador /></RequireAuth>} />
            <Route path="/galeria" element={<RequireAuth><LearningGallery /></RequireAuth>} />
            <Route path="/ranking" element={<RequireAuth><Ranking /></RequireAuth>} />
            <Route path="/reentrenamiento" element={<RequireAuth><Reentrenamiento /></RequireAuth>} />
            <Route path="/entrevista" element={<RequireAuth><EntrevistaIA /></RequireAuth>} />
            <Route path="/medallas" element={<RequireAuth><MedalGallery /></RequireAuth>} />
            <Route path="/poligono" element={<RequireAuth><Flashcards /></RequireAuth>} />
            <Route path="/progreso" element={<RequireAuth><ProgressAudit /></RequireAuth>} />
            <Route path="/perfil" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="/dashboard/scenarios" element={<RequireAuth><ScenariosView /></RequireAuth>} />
            <Route path="/dashboard/scenarios/:scenarioId/play/:attemptId" element={<RequireAuth><ScenarioChat /></RequireAuth>} />
            <Route path="/generator" element={<RequireAuth><ExamGeneratorView /></RequireAuth>} />
            <Route path="/admin-portal" element={<RequireAdmin><AdminCommandCenter /></RequireAdmin>} />
            <Route path="/admin-command-center" element={<RequireAdmin><AdminCommandCenter /></RequireAdmin>} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <TacticalErrorBoundary>
      <Router>
        <AppContent />
      </Router>
    </TacticalErrorBoundary>
  );
}
