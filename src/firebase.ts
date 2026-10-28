import { getApp, getApps, initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAniKiRt49Yjywa6gE-j7mI2jwEKyIP-1Y',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'sdg8-4fca4.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'sdg8-4fca4',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'sdg8-4fca4.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '716301157311',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:716301157311:web:0257c71d0cfc6bbba0170a'
};
for (const key of ['apiKey', 'authDomain', 'projectId', 'appId'] as const) {
  if (!firebaseConfig[key]) throw new Error(`Firebase web configuration is missing: ${key}. Set the VITE_FIREBASE_* build environment variables.`);
}
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const authReady = setPersistence(auth, browserLocalPersistence);
// Analytics is not initialized and is not an authentication dependency.
