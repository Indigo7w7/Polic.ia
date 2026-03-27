import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const storage = getStorage(app);

// Si usas otros productos como Firestore, los inicializarías y exportarías aquí también
// export const db = getFirestore(app);
