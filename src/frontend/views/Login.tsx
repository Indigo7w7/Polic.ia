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
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loginMutation = trpc.auth.login.useMutation();

  const syncUserToMySQL = async (uid: string, displayName: string | null, email: string | null, photoURL: string | null) => {
    try {
      await loginMutation.mutateAsync({
        email: email || '',
        name: displayName || 'Postulante',
        photoURL: photoURL || undefined,
      });
    } catch (e) {
      console.error('Error syncing to MySQL:', e);
    }
  };


  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await syncUserToMySQL(result.user.uid, result.user.displayName, result.user.email, result.user.photoURL);
      toast.success('Acceso concedido. Bienvenido, Postulante.');
      navigate('/');
    } catch (err: any) {
      setError('Error al autenticar con Google. Intenta de nuevo.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Acceso concedido.');
      } else {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await syncUserToMySQL(result.user.uid, null, email, null);
        toast.success('Cuenta creada. Bienvenido al sistema.');
      }
      navigate('/');
    } catch (err: any) {
      const msgs: Record<string, string> = {
        'auth/invalid-credential': 'Credenciales incorrectas.',
        'auth/email-already-in-use': 'Este correo ya está registrado.',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
        'auth/invalid-email': 'Correo electrónico inválido.',
      };
      setError(msgs[err.code] || 'Error de autenticación. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060d1a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(#2563eb 1px, transparent 1px), linear-gradient(90deg, #2563eb 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />

      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)'
      }} />

      {/* Glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-red-600/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div
        className="relative w-full max-w-md"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}
      >
        {/* Top security badge */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 border border-blue-500/20 rounded-full">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Sistema Seguro · TLS 1.3</span>
          </div>
        </div>

        {/* Main card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
          {/* Header stripe */}
          <div className="h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-emerald-500" />

          <div className="p-8">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/30 relative">
                <Shield className="w-8 h-8 text-white" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                </div>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white mb-1">POLIC<span className="text-blue-400">.</span>ia</h1>
              <p className="text-slate-500 text-xs uppercase tracking-[0.2em] font-bold">Sistema de Entrenamiento Táctico PNP</p>
            </div>

            {/* Google button */}
            <div className="space-y-6">
              <p className="text-slate-400 text-sm text-center leading-relaxed">
                Para garantizar la seguridad de tu expediente y sincronización con el Ranking Nacional, el acceso es exclusivo vía Google.
              </p>
              
              <button
                onClick={handleGoogle}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 py-4 bg-white text-slate-900 hover:bg-slate-100 rounded-xl transition-all duration-200 font-black text-sm uppercase tracking-widest disabled:opacity-50 shadow-xl shadow-white/10"
              >
                {googleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}
                Continuar con Google
              </button>

              <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 shrink-0" />
                <p className="text-[10px] text-blue-300 leading-tight uppercase font-bold">
                  Atención: Si ya tenías una cuenta con correo y contraseña, inicia sesión con el Google asociado a ese mismo correo para recuperar tus datos.
                </p>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="px-8 pb-6 text-center">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">
              Plataforma oficial de preparación · PNP {new Date().getFullYear()}
            </p>
          </div>
        </div>

        {/* Bottom stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          {[
            { val: '+5,200', label: 'Postulantes' },
            { val: '98%', label: 'Efectividad' },
            { val: '2026', label: 'Proceso' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-lg font-black text-white">{s.val}</div>
              <div className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
