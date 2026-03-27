import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;

if (!serviceAccountPath) {
  console.error('CRITICAL: FIREBASE_SERVICE_ACCOUNT is missing in environment variables.');
  process.exit(1);
}
if (!firebaseProjectId) {
  console.error('CRITICAL: FIREBASE_PROJECT_ID is missing in environment variables.');
  process.exit(1);
}

let serviceAccount;
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
  console.error('FAILURE: Could not parse Firebase Service Account JSON.');
  console.error('ERROR DETAILS:', error.message);
  console.error('HINT: Ensure the variable in Railway contains the FULL JSON content starting with { and ending with }');
  process.exit(1);
}

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: firebaseProjectId,
}, 'polic-ia-admin');

export const adminAuth = getAuth(app);
export const firebaseAdminAuth = adminAuth;
export const db = getFirestore(app);
export const storage = getStorage(app);

// MySQL Pool Configuration
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
