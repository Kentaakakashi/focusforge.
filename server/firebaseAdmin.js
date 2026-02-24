import admin from 'firebase-admin';

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let adminInitialized = false;

try {
  if (!admin.apps.length) {
    const serviceAccountPath = path.resolve(__dirname, '..', 'focusforge-dpdx-firebase-adminsdk-fbsvc-02ce05296b.json');

    if (fs.existsSync(serviceAccountPath)) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
      });
      console.log('[FIREBASE] Admin initialized using service account file');
      adminInitialized = true;
    } else {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined;

      if (projectId && clientEmail && privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
        adminInitialized = true;
        console.log('[FIREBASE] Admin initialized using environment variables');
      } else {
        console.warn('[FIREBASE] Missing credentials (file and env), admin auth will be disabled');
        adminInitialized = false;
      }
    }
  } else {
    adminInitialized = true;
  }
} catch (err) {
  console.error('[FIREBASE] Initialization error:', err);
  adminInitialized = false;
}

export async function authenticate(req, res, next) {
  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!adminInitialized) {
    console.warn('[FIREBASE] Auth attempt while not initialized');
    return res.status(503).json({ error: 'Auth service unavailable' });
  }
  const token = authorizationHeader.slice('Bearer '.length);
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email };
    next();
  } catch (err) {
    console.error('[FIREBASE] Token verification failed:', err.message);
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Keep helper for manual use if needed
export async function verifyAuthToken(authorizationHeader) {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return null;
  }
  if (!adminInitialized) return null;
  const token = authorizationHeader.slice('Bearer '.length);
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded.uid;
  } catch (err) {
    return null;
  }
}

