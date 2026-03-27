import * as admin from 'firebase-admin';

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;

if (!serviceAccountPath || !firebaseProjectId) {
  throw new Error('Las variables de entorno FIREBASE_SERVICE_ACCOUNT y FIREBASE_PROJECT_ID deben estar definidas.');
}

let serviceAccount;
try {
  // Try to parse as JSON string first
  if (serviceAccountPath.trim().startsWith('{')) {
    serviceAccount = JSON.parse(serviceAccountPath);
  } else {
    // If not JSON, assume it's a file path
    const { readFileSync } = await import('fs');
    serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  }
} catch (error) {
  throw new Error(`Error al cargar la cuenta de servicio de Firebase: ${error.message}`);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: firebaseProjectId,
});

export const firebaseAdminAuth = admin.auth();
export const adminAuth = firebaseAdminAuth;
export const db = admin.firestore();
export const storage = admin.storage();
