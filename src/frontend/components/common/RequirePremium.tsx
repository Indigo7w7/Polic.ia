import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserStore } from '../../store/useUserStore';

interface RequirePremiumProps {
  children: React.ReactNode;
}

/**
 * Higher-Order Component (HOC) para proteger rutas exclusivas de usuarios PREMIUM.
 * Valida el estado_financiero y la fecha_expiracion_premium.
 */
export const RequirePremium: React.FC<RequirePremiumProps> = ({ children }) => {
  const { isPremiumActive } = useUserStore();
  const location = useLocation();

  if (!isPremiumActive()) {
    // Redirigir a la pasarela Yape si no es premium o expiró
    // Pasamos la ruta intentada en el state para redirigir después del pago (opcional)
    return <Navigate to="/yape-checkout" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
