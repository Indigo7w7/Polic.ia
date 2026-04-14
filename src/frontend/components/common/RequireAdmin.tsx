import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserStore } from '../../store/useUserStore';
import { ShieldAlert } from 'lucide-react';

interface RequireAdminProps {
  children: React.ReactNode;
}

/**
 * HOC: Protege rutas administrativas.
 * Solo permite el paso si el usuario tiene role === 'admin'.
 */
export const RequireAdmin: React.FC<RequireAdminProps> = ({ children }) => {
  const { uid, role } = useUserStore();
  const location = useLocation();

  if (!uid) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-3xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">Acceso Restringido</h2>
            <p className="text-slate-400 text-sm">No tienes privilegios administrativos para acceder a esta sección.</p>
          </div>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-sm rounded-xl transition-all"
          >
            VOLVER AL DASHBOARD
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};