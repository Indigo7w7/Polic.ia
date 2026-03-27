import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserStore } from '../../store/useUserStore';

interface RequireAdminProps {
  children: React.ReactNode;
}

/**
 * HOC: Protege rutas exclusivas de administradores.
 * Doble validación: autenticado + role === 'admin'.
 */
export const RequireAdmin: React.FC<RequireAdminProps> = ({ children }) => {
  const { uid, role } = useUserStore();

  if (!uid) return <Navigate to="/login" replace />;
  if (role !== 'admin') return <Navigate to="/" replace />;

  return <>{children}</>;
};
