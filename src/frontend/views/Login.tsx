import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { trpc } from '../../shared/utils/trpc';
import { auth } from '@/src/firebase';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useUserStore } from '../store/useUserStore';

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  const images = useMemo(() => ['/p1.jpeg', '/p2.png', '/p3.png', '/p4.png'], []);

  useEffect(() => { 
    setMounted(true);
    const interval = setInterval(() => {
      setCurrentImgIndex((prev) => (prev + 1) % images.length);
    }, 5000); 
    return () => clearInterval(interval);
  }, [images.length]);

  const loginMutation = trpc.auth.login.useMutation();
  const publicStats = trpc.auth.getPublicStats.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 300000, // 5 min
  });

  const syncUserToMySQL = async (uid: string, displayName: string | null, email: string | null, photoURL: string | null) => {
    const finalName = (displayName && displayName.trim() && displayName !== 'Postulante')
      ? displayName.trim()
      : (email?.split('@')[0] || 'Usuario');
    try {
      await loginMutation.mutateAsync({ email: email || '', name: finalName, photoURL: photoURL || undefined });
    } catch (e) {
      if (import.meta.env.DEV) console.error('Error syncing to MySQL:', e);
    }
  };

  // Handle result from signInWithRedirect (Android / mobile flow)
  useEffect(() => {
    getRedirectResult(auth).then(async (result) => {
      if (!result?.user) return;
      const { user } = result;
      let displayName = user.displayName;
      if (!displayName) {
        await user.reload();
        displayName = auth.currentUser?.displayName || null;
      }
      await syncUserToMySQL(user.uid, displayName, user.email, user.photoURL);
      toast.success(displayName ? `Bienvenido, ${displayName.split(' ')[0]}.` : 'Acceso concedido.');
      navigate('/');
    }).catch(() => {
      // No redirect result — this is fine on desktop
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      // Use redirect on mobile/Android (popups often fail in WebViews)
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        await signInWithRedirect(auth, provider);
        return; // Page will redirect — result handled in useEffect above
      }
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      let displayName = user.displayName;
      if (!displayName) {
        await new Promise(res => setTimeout(res, 1000));
        await user.reload();
        displayName = auth.currentUser?.displayName || null;
      }
      await syncUserToMySQL(user.uid, displayName, user.email, user.photoURL);
      const greeting = displayName ? `Bienvenido, ${displayName.split(' ')[0]}.` : 'Acceso concedido.';
      toast.success(greeting);
      navigate('/');
    } catch (err: any) {
      toast.error('Error al autenticar con Google. Intenta de nuevo.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden bg-[#060d1a]">
      {/* ── MOBILE BACKGROUND (Guaranteed visibility) ── */}
      <div 
        className="lg:hidden absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: 'url("/p3.png")',
          backgroundColor: '#020617' 
        }}
      >
        <div className="absolute inset-0 bg-[#020617]/80 backdrop-blur-[2px]" />
      </div>

      {/* ── LEFT: Hero image (Desktop only) ── */}
      <div className="hidden lg:block relative w-1/2 overflow-hidden bg-slate-950">
        {images.map((img, idx) => (
          <img
            key={img}
            src={img}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms] ${
              idx === currentImgIndex ? 'opacity-100' : 'opacity-0'
            }`}
            alt=""
          />
        ))}
        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#060d1a]/20 to-[#060d1a]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060d1a]/70 via-transparent to-transparent" />
        {/* Branding overlay on image */}
        <div className="absolute bottom-10 left-10 right-10">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 mb-3">
            Plataforma Oficial · PNP 2026
          </p>
          <h2 className="text-4xl font-black text-white leading-tight">
            Prepárate para<br />
            <span className="text-blue-400">superar el proceso</span><br />
            de admisión.
          </h2>
        </div>
      </div>

      {/* ── RIGHT: Login panel ── */}
      <div
        className="relative flex-1 flex items-center justify-center p-8 lg:p-16"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'none' : 'translateY(16px)',
          transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >

        {/* Ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative w-full max-sm:px-4 w-full max-w-sm space-y-12">
          {/* Logo */}
          <div className="text-center space-y-2">
            <h1 className="text-6xl font-black tracking-tighter text-white">
              POLIC<span className="text-blue-500">.</span>ia
            </h1>
            <p className="text-blue-400/80 text-[11px] uppercase tracking-[0.4em] font-bold">
              Sistema de Preparación Académica
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] space-y-8">
            <div className="text-center">
              <p className="text-slate-400 text-sm font-medium leading-relaxed">
                Inicia sesión para acceder a tu plan de preparación personalizado.
              </p>
            </div>

            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              className="group relative w-full overflow-hidden"
            >
              <div className="absolute inset-0 bg-blue-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center justify-center gap-4 py-4 bg-white hover:bg-slate-50 rounded-2xl border-2 border-blue-500 transition-all duration-300 group-active:scale-[0.98]">
                {googleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                ) : (
                  <div className="bg-white p-1 rounded-lg shadow-sm">
                    <GoogleIcon />
                  </div>
                )}
                <span className="text-slate-900 font-black text-sm uppercase tracking-[0.15em]">
                  Continuar con Google
                </span>
              </div>
            </button>

            <p className="text-center text-[9px] text-slate-600 font-bold uppercase tracking-widest">
              Acceso seguro · Encriptación TLS/AES-256
            </p>
          </div>

          {/* Bottom stats */}
          <div className="flex justify-between px-4">
            <div className="flex flex-col items-center">
              <span className="text-sm font-black text-white">
                {publicStats.data?.totalUsers ? `+${publicStats.data.totalUsers}` : '...'}
              </span>
              <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Postulantes</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-black text-white">24/7</span>
              <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Disponible</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-black text-white">2026</span>
              <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Proceso</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
