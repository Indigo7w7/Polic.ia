import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;

if (!serviceAccountPath && process.env.NODE_ENV === 'production') {
  console.error('CRITICAL: FIREBASE_SERVICE_ACCOUNT is missing in environment variables.');
  process.exit(1);
}
if (!firebaseProjectId && process.env.NODE_ENV === 'production') {
  console.error('CRITICAL: FIREBASE_PROJECT_ID is missing in environment variables.');
  process.exit(1);
}

if (!serviceAccountPath || !firebaseProjectId) {
  console.warn('WARNING: Firebase credentials missing. Some features (Auth/Storage) will be disabled.');
}

let serviceAccount;
if (serviceAccountPath && firebaseProjectId) {
  try {
    const cleanPath = serviceAccountPath.trim();
    if (cleanPath.startsWith('{')) {
      serviceAccount = JSON.parse(cleanPath);
      console.log('Firebase Service Account loaded from JSON string.');
    } else {
      const { readFileSync } = await import('fs');
      serviceAccount = JSON.parse(readFileSync(cleanPath, 'utf8'));
      console.log(`Firebase Service Account loaded from file: ${cleanPath}`);
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.error('FAILURE: Could not parse Firebase Service Account JSON.');
      console.error('ERROR DETAILS:', error.message);
      process.exit(1);
    } else {
      console.warn('WARNING: Could not load Firebase credentials. Auth will be disabled.');
    }
  }
}

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: firebaseProjectId,
}, 'polic-ia-admin');

export const adminAuth = getAuth(app);
export const firebaseAdminAuth = adminAuth;
export const db = getFirestore(app);
export const storage = getStorage(app);

// Reuse the shared database pool for consistency
export { poolConnection as default } from '../../database/db';
