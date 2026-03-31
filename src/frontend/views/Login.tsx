import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { trpc } from '../../shared/utils/trpc';
import { auth } from '@/src/firebase';
import { Shield, Eye, EyeOff, Loader2, AlertCircle, ChevronRight, Ghost } from 'lucide-react';
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

  useEffect(() => {
    setMounted(true);
  }, []);

  const loginMutation = trpc.auth.login.useMutation();

  const syncUserToMySQL = async (uid: string, displayName: string | null, email: string | null, photoURL: string | null) => {
    // Resolve final name: never send "Postulante" — use email prefix as fallback
    const finalName = (displayName && displayName.trim() && displayName !== 'Postulante')
      ? displayName.trim()
      : (email?.split('@')[0] || 'Usuario');

    try {
      await loginMutation.mutateAsync({
        email: email || '',
        name: finalName,
        photoURL: photoURL || undefined,
      });
    } catch (e) {
      console.error('Error syncing to MySQL:', e);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Firebase sometimes resolves displayName async — wait up to 1s for it
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
    <div className="min-h-screen bg-[#060d1a] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Animated grid background */}
      <div className="absolute inset-0 opacity-[0.05]" style={{
        backgroundImage: `linear-gradient(#2563eb 1px, transparent 1px), linear-gradient(90deg, #2563eb 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />

      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(59, 130, 246, 0.1) 2px, rgba(59, 130, 246, 0.1) 4px)'
      }} />

      {/* Tactical Glows */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />

      <div
        className="relative w-full max-w-sm"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(24px)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Unit Identifier */}
        <div className="flex justify-center mb-10">
          <div className="group relative">
            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full scale-150 animate-pulse" />
            <div className="relative flex items-center gap-3 px-5 py-2.5 bg-slate-900/80 border border-blue-500/30 rounded-full backdrop-blur-md">
              <div className="w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(96,165,250,0.8)] animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-[0.4em] text-blue-100/70">
                Acceso de Operativos
              </span>
            </div>
          </div>
        </div>

        {/* Tactical Frame */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)]">
          {/* Top accent line */}
          <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-80" />

          <div className="p-10 pt-8">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-blue-600 blur-2xl opacity-20 scale-150" />
                <div className="relative w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.4)] border border-blue-400/30">
                  <Shield className="w-10 h-10 text-white stroke-[2.5]" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-[3px] border-slate-900 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  </div>
                </div>
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-white mb-2 italic">
                POLIC<span className="text-blue-500">.</span>ia
              </h1>
              <p className="text-blue-500 text-[10px] uppercase tracking-[0.4em] font-black">
                SISTEMA DE ENTRENAMIENTO CADETE PRO
              </p>
            </div>

            {/* Login Action Area */}
            <div className="space-y-8">
              <div className="space-y-3">
                <p className="text-slate-400 text-xs text-center font-medium leading-relaxed uppercase tracking-wider">
                  Sincronización de Identidad mediante
                </p>
                <div className="h-px w-12 bg-blue-500/30 mx-auto" />
              </div>
              
              <button
                onClick={handleGoogle}
                disabled={googleLoading}
                className="group relative w-full overflow-hidden"
              >
                {/* Button Outer Border / Shadow */}
                <div className="absolute inset-0 bg-blue-500 opacity-20 blur-lg group-hover:opacity-40 transition-opacity" />
                
                <div className="relative flex items-center justify-center gap-4 py-4.5 bg-slate-100 group-hover:bg-white border-2 border-blue-500 rounded-2xl transition-all duration-300 transform group-active:scale-[0.98]">
                  {googleLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  ) : (
                    <div className="bg-white p-1 rounded-lg">
                      <GoogleIcon />
                    </div>
                  )}
                  <span className="text-slate-900 font-black text-sm uppercase tracking-[0.15em]">
                    Ingresar con Google
                  </span>
                </div>
              </button>

              <div className="text-center">
                <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest opacity-60">
                  Encriptación de Grado Militar · AES-256
                </p>
              </div>
            </div>
          </div>

          {/* Tactical Bottom Bar */}
          <div className="bg-slate-950/50 py-4 border-t border-slate-800/50 flex justify-center items-center gap-8">
             <div className="flex items-center gap-1.5 opacity-40">
                <div className="w-1 h-1 bg-blue-400 rounded-full" />
                <span className="text-[8px] font-bold text-slate-400 tracking-tighter uppercase">PNP-OFFICIAL</span>
             </div>
             <div className="flex items-center gap-1.5 opacity-40">
                <div className="w-1 h-1 bg-blue-400 rounded-full" />
                <span className="text-[8px] font-bold text-slate-400 tracking-tighter uppercase">PROCESO-2026</span>
             </div>
          </div>
        </div>

        {/* Global Stats - Minimalist */}
        <div className="mt-8 flex justify-between px-2">
          {[
            { val: '+5K', label: 'Efectivos' },
            { val: '24/7', label: 'Operativo' },
            { val: 'TLS', label: 'Secure' },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center">
              <span className="text-xs font-black text-slate-300">{s.val}</span>
              <span className="text-[8px] text-slate-600 font-black uppercase tracking-[0.2em]">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
