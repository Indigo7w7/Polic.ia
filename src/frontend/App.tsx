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
import { AdminPanel } from './views/AdminPanel';
import { AdminCommandCenter } from './views/AdminCommandCenter';
import { ProgressAudit } from './views/ProgressAudit';
import { Profile } from './views/Profile';
import { Login } from './views/Login';
import { SchoolSelector } from './views/SchoolSelector';
import { RequireAuth } from './components/common/RequireAuth';
import { RequireAdmin } from './components/common/RequireAdmin';
import { LeadMagnet } from './views/LeadMagnet';
import { LearningGallery } from './views/LearningGallery';
import { PressureNotification } from './components/ui/PressureNotification';
import { MascotAdvisor } from './components/MascotAdvisor';
import { Toaster } from 'sonner';
import { Shield, Loader2 } from 'lucide-react';
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
      <span className="text-[9px] text-red-400 font-black tracking-widest">VER: 03.30.C-INFALIBLE</span>
    </div>
  </div>
);

const AdminRedirector = () => {
  const { role, uid } = useUserStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // FORCE CLEAR OLD STORAGE IF IT EXISTS
    if (localStorage.getItem('policia-user-storage')) {
      console.log('[CACHE] Purging legacy session data...');
      localStorage.removeItem('policia-user-storage');
      window.location.reload();
    }
    
    
    
    // If we are at the root, login, or school selector and we have an admin role, force jump to portal
    const adminRestrictedPaths = ['/', '/login', '/seleccionar-escuela'];
    
    // MEGA BYPASS: Check role OR raw email if role hasn't synced yet
    const rawEmail = auth.currentUser?.email?.toLowerCase().trim();
    const isOwner = rawEmail === 'brizq02@gmail.com';

    if (uid && (role === 'admin' || isOwner) && adminRestrictedPaths.includes(location.pathname)) {
      console.log('[MEGA-FIX] High-Privilege access detected (Email Check), routing to Command Center');
      navigate('/admin-portal', { replace: true });
    }
  }, [role, uid, navigate, location.pathname]);

  return null;
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
        // Note: we don't set authResolved here yet, wait for profileQuery
      } else {
        console.log('[AUTH] No Firebase user detected');
        setUserData({ uid: null, estado_financiero: 'FREE', status: 'ACTIVE', fecha_expiracion_premium: null, role: 'user', photoURL: null, modalidad_postulacion: null });
        setAuthResolved(true);
      }
    });

    return () => unsubscribeAuth();
  }, [setUserData]);

  useEffect(() => {
    if (profileQuery.status === 'success' || profileQuery.status === 'error' || !uid) {
      setAuthResolved(true);
    }
  }, [profileQuery.status, uid]);

  // Periodically update user's lastSeen timestamp
  const updateLastSeenMutation = trpc.user.updateLastSeen.useMutation();
  useEffect(() => {
    if (uid) {
      const interval = setInterval(() => {
        updateLastSeenMutation.mutate({ uid });
      }, 180000); // 3 minutos
      return () => clearInterval(interval);
    }
  }, [uid, updateLastSeenMutation]);

  if (!authResolved) return <AuthLoader />;

  return (
    <div className="relative">
      <AdminRedirector />
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

        {/* Protected: Premium only */}
        <Route path="/poligono" element={<RequireAuth><Flashcards /></RequireAuth>} />
        <Route path="/progreso" element={<RequireAuth><ProgressAudit /></RequireAuth>} />
        <Route path="/perfil" element={<RequireAuth><Profile /></RequireAuth>} />

        {/* Protected: Admin only */}
        <Route path="/admin-portal" element={<RequireAdmin><AdminCommandCenter /></RequireAdmin>} />
        <Route path="/admin" element={<RequireAdmin><AdminPanel /></RequireAdmin>} />
        <Route path="/comando-central" element={<RequireAdmin><AdminCommandCenter /></RequireAdmin>} />
        <Route path="/acceso-comando" element={<RequireAdmin><AdminPanel /></RequireAdmin>} />
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
