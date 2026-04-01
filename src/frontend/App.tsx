/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { trpc } from '../shared/utils/trpc';
import { auth } from '@/src/firebase';
import { useUserStore } from './store/useUserStore';
import { Dashboard } from './views/Dashboard';
import { Simulador } from './views/Simulador';
import { YapeCheckout } from './views/YapeCheckout';
import { Resultados } from './views/Resultados';
import { Flashcards } from './views/Flashcards';
import { Ranking } from './views/Ranking';
import { AdminCommandCenter } from './views/AdminCommandCenter';
import { ProgressAudit } from './views/ProgressAudit';
import { Profile } from './views/Profile';
import { Login } from './views/Login';
import { SchoolSelector } from './views/SchoolSelector';
import { Reentrenamiento } from './views/Reentrenamiento';
import { EntrevistaIA } from './views/EntrevistaIA';
import { RequireAuth } from './components/common/RequireAuth';
import { RequireAdmin } from './components/common/RequireAdmin';
import { LeadMagnet } from './views/LeadMagnet';
import { LearningGallery } from './views/LearningGallery';
import { PressureNotification } from './components/ui/PressureNotification';
import { MascotAdvisor } from './components/MascotAdvisor';
import { Toaster } from 'sonner';
import { Shield, Loader2, AlertTriangle, X } from 'lucide-react';
import { ErrorBoundary } from './components/common/ErrorBoundary';

/** Full-screen loader shown while Firebase resolves auth state */
const AuthLoader = () => (
  <div className="min-h-screen bg-[#060d1a] flex flex-col items-center justify-center gap-4">
    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30 animate-pulse">
      <Shield className="w-8 h-8 text-white" />
    </div>
    <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
    <p className="text-[10px] text-slate-600 uppercase tracking-[0.3em] font-bold">Verificando acceso…</p>
    <div className="mt-4 p-1 px-3 bg-red-600/20 border border-red-500/30 rounded-full">
      <span className="text-[9px] text-red-400 font-black tracking-widest">VER: 04.01.A</span>
    </div>
  </div>
);

const AdminRedirector = () => {
  const { role, uid } = useUserStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (localStorage.getItem('policia-user-storage')) {
      console.log('[CACHE] Purging legacy session data...');
      localStorage.removeItem('policia-user-storage');
      window.location.reload();
    }
    const adminRestrictedPaths = ['/', '/login', '/seleccionar-escuela'];
    const rawEmail = auth.currentUser?.email?.toLowerCase().trim();
    const isOwner = rawEmail === 'brizq02@gmail.com';
    if (uid && (role === 'admin' || isOwner) && adminRestrictedPaths.includes(location.pathname)) {
      console.log('[MEGA-FIX] High-Privilege access detected, routing to Command Center');
      navigate('/admin-portal', { replace: true });
    }
  }, [role, uid, navigate, location.pathname]);

  return null;
};

// ─── GLOBAL ALERT LISTENER (para todos los usuarios) ──────────
const GlobalAlertListener = () => {
  const { role } = useUserStore();
  const [dismissed, setDismissed] = useState<number | null>(null);

  // Public query — accessible to all authenticated users
  const broadcastQ = trpc.admin.getActiveBroadcast.useQuery(undefined, {
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const alert = broadcastQ.data;
  if (!alert || alert.id === dismissed || role === 'admin') return null;

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-black border-2 border-red-500 rounded-xl overflow-hidden shadow-[0_0_80px_rgba(239,68,68,0.4)]">
        {/* Pulsing red overlay */}
        <div className="absolute inset-0 pointer-events-none animate-pulse bg-red-950/15" />
        {/* Scanlines */}
        <div className="absolute inset-0 pointer-events-none opacity-10" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(239,68,68,0.3) 2px, rgba(239,68,68,0.3) 4px)'
        }} />
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
              onClick={() => setDismissed(alert.id)}
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
  const [authResolved, setAuthResolved] = useState(false);

  // Sync with MySQL
  const profileQuery = trpc.user.getProfile.useQuery(
    { uid: uid || '' },
    { enabled: !!uid, refetchOnWindowFocus: false }
  );

  useEffect(() => {
    if (profileQuery.data) {
      console.log(`[PROFILE] Backend response user.school: ${profileQuery.data.school}`);
      const data = profileQuery.data;
      const currentState = useUserStore.getState();
      
      setUserData({
        uid: data.uid,
        name: data.name || 'Postulante',
        photoURL: data.photoURL || null,
        // Override DB with our bypass logic if already set
        role: currentState.role === 'admin' ? 'admin' : (data.role || 'user'),
        status: data.status || 'ACTIVE',
        estado_financiero: data.membership || 'FREE',
        acceso_unificado: false,
        // Local state ALWAYS wins for school selection to avoid reset loops
        modalidad_postulacion: currentState.modalidad_postulacion || (data.school as any) || null,
        fecha_expiracion_premium: data.premiumExpiration || null,
      });
    }
  }, [profileQuery.data, setUserData]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const normalizedEmail = user.email?.toLowerCase().trim();
        console.log(`[AUTH] Firebase login: ${normalizedEmail} (UID: ${user.uid})`);
        
        // Extract and persist idToken for tRPC Authorization header
        try {
          const idToken = await user.getIdToken(false);
          localStorage.setItem('authToken', idToken);
        } catch (e) {
          console.warn('[AUTH] Could not get idToken:', e);
        }

        let localRole = 'user';
        if (normalizedEmail === 'brizq02@gmail.com') {
          console.log('[AUTH] SUPER ADMIN BYPASS ACTIVATED (App.tsx)');
          localRole = 'admin';
        }
        
        setUserData({ 
          uid: user.uid, 
          role: localRole as 'admin' | 'user',
          photoURL: user.photoURL 
        });
      } else {
        console.log('[AUTH] No Firebase user detected');
        localStorage.removeItem('authToken');
        setUserData({ uid: null, estado_financiero: 'FREE', status: 'ACTIVE', fecha_expiracion_premium: null, role: 'user', photoURL: null, modalidad_postulacion: null });
        setAuthResolved(true);
      }
    });

    return () => unsubscribeAuth();
  }, [setUserData]);


  useEffect(() => {
    const isSuperAdmin = auth.currentUser?.email?.toLowerCase().trim() === 'brizq02@gmail.com';
    
    if (profileQuery.status === 'success' || !uid) {
      setAuthResolved(true);
    } else if (profileQuery.status === 'error') {
      console.error('[APP] Error al cargar el perfil desde el backend:', profileQuery.error);
      setAuthResolved(true);
      if (isSuperAdmin) {
         setUserData({ role: 'admin' });
      }
    }
  }, [profileQuery.status, uid, profileQuery.error, setUserData]);

  // Periodically update user's lastActive timestamp (Point 3: Every 3 min)
  const updateActivityMutation = trpc.user.updateLastSeen.useMutation();
  useEffect(() => {
    if (uid) {
      const interval = setInterval(() => {
        updateActivityMutation.mutateAsync({ uid }).catch(() => null); // Blindaje anti-500
      }, 180000); // 3 minutos
      return () => clearInterval(interval);
    }
  }, [uid, updateActivityMutation]);

  if (!authResolved) return <AuthLoader />;

  return (
    <div className="relative">
      <AdminRedirector />
      <GlobalAlertListener />
      <Toaster position="top-center" theme="dark" richColors />
      <PressureNotification />
      {role !== 'admin' && <MascotAdvisor />}
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/cebo" element={<LeadMagnet />} />

        {/* Protected: any logged-in user */}
        <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/seleccionar-escuela" element={<RequireAuth><SchoolSelector /></RequireAuth>} />
        <Route path="/yape-checkout" element={<RequireAuth><YapeCheckout /></RequireAuth>} />
        <Route path="/resultados" element={<RequireAuth><Resultados /></RequireAuth>} />
        <Route path="/simulador" element={<RequireAuth><Simulador /></RequireAuth>} />
        <Route path="/galeria" element={<RequireAuth><LearningGallery /></RequireAuth>} />
        <Route path="/ranking" element={<RequireAuth><Ranking /></RequireAuth>} />
        <Route path="/reentrenamiento" element={<RequireAuth><Reentrenamiento /></RequireAuth>} />
        <Route path="/entrevista" element={<RequireAuth><EntrevistaIA /></RequireAuth>} />

        {/* Protected: Premium only */}
        <Route path="/poligono" element={<RequireAuth><Flashcards /></RequireAuth>} />
        <Route path="/progreso" element={<RequireAuth><ProgressAudit /></RequireAuth>} />
        <Route path="/perfil" element={<RequireAuth><Profile /></RequireAuth>} />

        {/* Protected: Admin only */}
        <Route path="/admin-portal"     element={<RequireAdmin><AdminCommandCenter /></RequireAdmin>} />
        <Route path="/comando-central"  element={<RequireAdmin><AdminCommandCenter /></RequireAdmin>} />
      </Routes>

    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppContent />
      </Router>
    </ErrorBoundary>
  );
}
