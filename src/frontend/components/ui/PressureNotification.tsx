import React, { useEffect, useRef } from 'react';
import { useUserStore } from '../../store/useUserStore';
import { trpc } from '../../../shared/utils/trpc';
import { toast } from 'sonner';
import { Brain, ShieldAlert, Clock, Trophy } from 'lucide-react';

const NOTIFICATION_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours
const INACTIVITY_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_KEY = 'polia_last_notif';

interface NotifConfig {
  message: string;
  description?: string;
  icon: React.ReactNode;
  priority: number;
}

export const PressureNotification: React.FC = () => {
  const { uid, isPremiumActive } = useUserStore();
  const fired = useRef(false);

  const leitnerCountQuery = trpc.leitner.getCountByLevel.useQuery(
    { userId: uid || '', level: 1 },
    { enabled: !!uid }
  );

  useEffect(() => {
    if (fired.current || !uid || leitnerCountQuery.isLoading) return;

    const lastNotif = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    const now = Date.now();

    // Respect cooldown — don't spam the user
    if (now - lastNotif < NOTIFICATION_COOLDOWN_MS) return;

    const runCheck = async () => {
      fired.current = true;
      const isPremium = isPremiumActive();
      const notifs: NotifConfig[] = [];

      // Check inactivity
      const lastActive = parseInt(localStorage.getItem('last_active') || '0', 10);
      if (lastActive && now - lastActive > INACTIVITY_THRESHOLD_MS) {
        notifs.push({
          priority: 1,
          icon: <Clock className="w-5 h-5 text-red-400" />,
          message: '¡Llevas +24h inactivo!',
          description: 'Tu competencia ya repasó 100 preguntas mientras descansabas.',
        });
      }

      // Check Leitner backlog
      const backlogSize = leitnerCountQuery.data || 0;
      if (backlogSize > 10) {
        notifs.push({
          priority: 2,
          icon: <Brain className="w-5 h-5 text-amber-400" />,
          message: `${backlogSize} flashcards en Nivel 1`,
          description: 'Estás olvidando base legal crítica. Repasa ahora.',
        });
      }

      // FREE user nudge
      if (!isPremium) {
        notifs.push({
          priority: 3,
          icon: <ShieldAlert className="w-5 h-5 text-amber-400" />,
          message: 'Acceso Premium bloqueado',
          description: '8 de cada 10 ingresantes usaron el simulador completo.',
        });
      }

      // Default motivational
      notifs.push({
        priority: 99,
        icon: <Trophy className="w-5 h-5 text-blue-400" />,
        message: 'Sigue entrenando',
        description: 'El examen real no espera. Puliste tu doctrina hoy.',
      });

      // Fire the highest priority notification
      notifs.sort((a, b) => a.priority - b.priority);
      const top = notifs[0];

      setTimeout(() => {
        toast(top.message, {
          description: top.description,
          icon: top.icon,
          duration: 6000,
          position: 'bottom-right',
        });
        localStorage.setItem(STORAGE_KEY, now.toString());
        localStorage.setItem('last_active', now.toString());
      }, 3000); // Slight delay so the page loads first
    };

    runCheck();
  }, [uid, isPremiumActive]);

  return null; // No DOM — uses toast system
};
