import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserStore } from '../../store/useUserStore';

interface RequireAuthProps {
  children: React.ReactNode;
}

/**
 * HOC: Protege rutas de usuarios no autenticados.
 * Redirige a /login preservando la ruta intentada.
 */
export const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const { uid, status } = useUserStore();
  const location = useLocation();

  if (status === 'BLOCKED') {
    import('@/src/firebase').then(({ auth }) => auth.signOut());
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f0505] text-red-500 font-mono p-4 text-center">
        <h1 className="text-4xl font-black mb-4">ACCESO DENEGADO</h1>
        <p className="tracking-widest uppercase mb-8">Esta cuenta ha sido bloqueada por el Comando de Administración.</p>
        <button onClick={() => window.location.href = '/login'} className="px-6 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700">ENTENDIDO</button>
      </div>
    );
  }

  if (!uid) {
    console.log('[AUTH] No authenticated user. Routing to login...');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
