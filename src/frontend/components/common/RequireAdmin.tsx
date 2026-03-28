import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserStore } from '../../store/useUserStore';
import { toast } from 'sonner';

interface RequireAdminProps {
  children: React.ReactNode;
}

/**
 * HOC: Protege rutas exclusivas de administradores.
 * Doble validación: autenticado + role === 'admin'.
 */
export const RequireAdmin: React.FC<RequireAdminProps> = ({ children }) => {
  const { uid, role } = useUserStore();

  useEffect(() => {
    if (uid && role !== 'admin') {
      toast.error('Acceso restringido. Solo personal administrativo.');
    }
  }, [uid, role]);

  if (!uid) return <Navigate to="/login" replace />;
  if (role !== 'admin') return <Navigate to="/" replace />;

  return <>{children}</>;
};
