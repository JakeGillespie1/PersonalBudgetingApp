import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

// Ensure environment variables from .env are loaded even if this module is imported before index.ts
dotenv.config();

// Prefer Application Default Credentials if available (e.g., GOOGLE_APPLICATION_CREDENTIALS set)
const useApplicationDefault = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (useApplicationDefault) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
} else {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase service account environment variables.');
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export const db = admin.firestore();
export default admin;