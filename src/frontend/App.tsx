/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
  </div>
);

export default function App() {
  const { uid, role, setUserData } = useUserStore();
  const [authResolved, setAuthResolved] = useState(false);

  // Sync with MySQL
  const profileQuery = trpc.user.getProfile.useQuery(
    { uid: uid || '' },
    { enabled: !!uid, refetchOnWindowFocus: false }
  );

  useEffect(() => {
    if (profileQuery.data) {
      console.log(`[PROFILE] Backend response: ${profileQuery.data.email} role=${profileQuery.data.role}`);
      const data = profileQuery.data;
      setUserData({
        uid: data.uid,
        name: data.name || 'Postulante',
        photoURL: data.photoURL || null,
        role: data.email === 'brizq02@gmail.com' ? 'admin' : (data.role || 'user'),
        estado_financiero: data.membership || 'FREE',
        acceso_unificado: false,
        modalidad_postulacion: data.school as any || null,
        fecha_expiracion_premium: data.premiumExpiration || null,
      });
    }
  }, [profileQuery.data, setUserData]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Initial set to trigger profileQuery - include owner fail-safe
        console.log(`[AUTH] Firebase login: ${user.email}`);
        setUserData({ 
          uid: user.uid, 
          role: user.email === 'brizq02@gmail.com' ? 'admin' : 'user', 
          estado_financiero: 'FREE', 
          fecha_expiracion_premium: null, 
          photoURL: user.photoURL 
        });
      } else {
        setUserData({ uid: null, estado_financiero: 'FREE', fecha_expiracion_premium: null, role: 'user', photoURL: null });
        setAuthResolved(true);
      }
    });

    return () => unsubscribeAuth();
  }, [setUserData]);

  // Once profile is loaded or user is logged out, resolve auth
  useEffect(() => {
    if (profileQuery.status === 'success' || profileQuery.status === 'error' || !uid) {
      setAuthResolved(true);
    }
  }, [profileQuery.status, uid]);

  if (!authResolved) return <AuthLoader />;

  return (
    <ErrorBoundary>
      <Router>
      <Toaster position="top-center" theme="dark" richColors />
      <PressureNotification />
      <MascotAdvisor />
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
      </Router>
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        color: '#0f0',
        fontSize: '10px',
        padding: '2px 8px',
        zIndex: 99999,
        display: 'flex',
        justifyContent: 'space-between',
        pointerEvents: 'none',
        borderTop: '1px solid #333'
      }}>
        <span>API: {import.meta.env.VITE_API_URL || 'LOCAL'}</span>
        <span>UID: {uid || 'OFFLINE'}</span>
        <span>ROLE: {role || 'NONE'}</span>
      </div>
    </ErrorBoundary>
  );
}
