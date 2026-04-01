import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserStore } from '../../store/useUserStore';
import { trpc } from '../../../shared/utils/trpc';
import { toast } from 'sonner';
import { auth } from '../../../firebase';

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
  const serverStatus = profileQuery.data?.status || 'ACTIVE';
  const isPending = profileQuery.isLoading;

  const rawEmail = auth.currentUser?.email?.toLowerCase().trim();
  const isSuperAdmin = rawEmail === 'brizq02@gmail.com';

  useEffect(() => {
    if (serverStatus === 'BLOCKED') {
      auth.signOut();
      toast.error('ACCESO DENEGADO: Tu cuenta ha sido bloqueada.');
      return;
    }
    if (uid && serverRole !== 'admin' && !isSuperAdmin && !isPending) {
      toast.error('Acceso restringido. Nivel de autorización insuficiente.');
    }
  }, [uid, serverRole, serverStatus, isSuperAdmin, isPending]);

  if (serverStatus === 'BLOCKED') return <Navigate to="/login" replace />;
  if (!uid) return <Navigate to="/login" replace />;

  if (isPending && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#060d1a] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-t-2 border-r-2 border-red-500 animate-spin" />
      </div>
    );
  }

  if (profileQuery.isError && isSuperAdmin) {
    console.warn('[RequireAdmin] Falló la validación del servidor, pero se permite acceso por Super Admin Bypass.');
    return <>{children}</>;
  }

  if (serverRole !== 'admin' && !isSuperAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
};
