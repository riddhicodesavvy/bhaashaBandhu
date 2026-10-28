import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { AppError } from './errors';
export const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'sdg8-4fca4';
export function adminApp() {
  if (getApps()[0]) return getApps()[0];
  if (process.env.FIREBASE_ADMIN_CREDENTIALS_JSON) {
    try { return initializeApp({ projectId, credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS_JSON)) }); }
    catch { throw new AppError(503, 'FIREBASE_ADMIN_CONFIG_INVALID', 'Firebase Admin credential JSON is invalid.'); }
  }
  // Signature verification uses Google's public certificates; account-management
  // operations and optional revocation checks separately require Admin credentials.
  return initializeApp({ projectId });
}
export async function verifyIdentity(token: string): Promise<{ uid: string }> {
  let claims;
  try { claims = await getAuth(adminApp()).verifyIdToken(token, process.env.FIREBASE_CHECK_REVOKED === 'true'); }
  catch { throw new AppError(401, 'INVALID_TOKEN', 'Your session could not be verified. Sign in again.'); }
  return { uid: claims.uid };
}
export function publicConfig() {
  const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || 'AIzaSyAniKiRt49Yjywa6gE-j7mI2jwEKyIP-1Y';
  const appId = process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || '1:716301157311:web:0257c71d0cfc6bbba0170a';
  return {
    firebase: {
      apiKey,
      appId,
      projectId,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`
    },
    demo: process.env.DEMO_MODE === 'true'
  };
}
