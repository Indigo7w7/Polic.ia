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
  const { uid, modalidad_postulacion } = useUserStore();
  const location = useLocation();

  if (!uid) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Enforce mandatory school selection (except if already on that page)
  if (!modalidad_postulacion && location.pathname !== '/seleccionar-escuela') {
    return <Navigate to="/seleccionar-escuela" replace />;
  }

  return <>{children}</>;
};
