import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserStore } from '../../store/useUserStore';
import { trpc } from '../../../shared/utils/trpc';
import { toast } from 'sonner';

interface RequireAdminProps {
  children: React.ReactNode;
}

/**
 * HOC: Protege rutas exclusivas de administradores.
 * Doble validación: autenticado + role === 'admin' desde DB.
 */
export const RequireAdmin: React.FC<RequireAdminProps> = ({ children }) => {
  const { uid, role } = useUserStore();
  
  // Real-time server validation
  const profileQuery = trpc.user.getProfile.useQuery(
    { uid: uid || '' }, 
    { enabled: !!uid, refetchOnMount: 'always' }
  );

  const serverRole = profileQuery.data?.role || role;
  const isPending = profileQuery.isLoading;

  useEffect(() => {
    if (uid && serverRole !== 'admin' && !isPending) {
      toast.error('Acceso restringido. Nivel de autorización insuficiente.');
    }
  }, [uid, serverRole, isPending]);

  if (!uid) return <Navigate to="/login" replace />;
  if (isPending) return <div className="min-h-screen bg-[#060d1a] flex items-center justify-center"><div className="w-8 h-8 rounded-full border-t-2 border-r-2 border-red-500 animate-spin" /></div>;
  if (serverRole !== 'admin') return <Navigate to="/" replace />;

  return <>{children}</>;
};
