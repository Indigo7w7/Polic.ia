import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/src/firebase';
import { useUserStore } from '../store/useUserStore';

/**
 * Bloque 07: Gestión de sesiones
 */
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { setUserData } = useUserStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setUserData({ 
          uid: firebaseUser.uid, 
          name: firebaseUser.displayName || 'Usuario' 
        });
      } else {
        setUserData({ uid: null, name: 'Invitado' });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUserData]);

  return { user, loading };
};
