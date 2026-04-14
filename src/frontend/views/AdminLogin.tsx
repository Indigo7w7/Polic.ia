import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../../shared/utils/trpc';
import { useUserStore } from '../store/useUserStore';
import { Shield, Lock, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export const AdminLogin: React.FC = () => {
  const [token, setToken] = useState('');
  const navigate = useNavigate();
  const setUserData = useUserStore((state) => state.setUserData);
  
  const adminLogin = trpc.auth.adminLogin.useMutation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    try {
      await adminLogin.mutateAsync({ secretToken: token.trim() });
      setUserData({ role: 'admin' });
      toast.success('Autorización concedida. Bienvenido al Puesto de Mando.');
      navigate('/admin-command-center');
    } catch (error: any) {
      toast.error(error.message || 'Error de autenticación crítica.');
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 font-sans text-white">
      {/* Decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10 space-y-8"
      >
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-red-600/10 border border-red-500/20 rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(220,38,38,0.1)]">
            <Shield className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-4xl font-black tracking-tight">Acceso de <span className="text-red-500">Mando</span></h1>
          <p className="text-slate-400 text-sm font-medium uppercase tracking-[0.2em]">Restringido a Personal Autorizado</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <Lock className="w-5 h-5 text-slate-500 group-focus-within:text-red-500 transition-colors" />
            </div>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Código de Autorización Nivel 5"
              className="w-full bg-slate-900/50 border border-slate-800 focus:border-red-500/50 rounded-2xl py-5 pl-14 pr-6 text-lg font-mono tracking-[0.3em] outline-none transition-all placeholder:tracking-normal placeholder:text-slate-700"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={adminLogin.isPending}
            className="w-full bg-red-600 hover:bg-red-500 py-5 rounded-2xl font-black text-lg transition-all shadow-[0_10px_40px_rgba(220,38,38,0.2)] flex items-center justify-center gap-3 disabled:bg-slate-800 disabled:text-slate-600"
          >
            {adminLogin.isPending ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                Validar Rango
                <ArrowRight className="w-6 h-6" />
              </>
            )}
          </button>
        </form>

        <div className="p-6 bg-amber-950/20 border border-amber-900/30 rounded-2xl flex gap-4 items-start">
          <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200/60 leading-relaxed font-medium">
            Atención: Los intentos de acceso fallidos son registrados con dirección IP y geolocalización. El uso no autorizado de este portal constituye una falta grave.
          </p>
        </div>

        <button 
          onClick={() => navigate('/')}
          className="w-full py-4 text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
        >
          Volver al Portal Civil
        </button>
      </motion.div>
    </div>
  );
};
