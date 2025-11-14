// Firebase backend configuration and utilities.
// This file exports the Firebase instances and helper objects
// that the rest of the app uses for authentication, database, and storage.
//
// Expected env variables (standard Firebase vars):
// REACT_APP_FIREBASE_API_KEY
// REACT_APP_FIREBASE_AUTH_DOMAIN
// REACT_APP_FIREBASE_PROJECT_ID
// REACT_APP_FIREBASE_STORAGE_BUCKET
// REACT_APP_FIREBASE_MESSAGING_SENDER_ID
// REACT_APP_FIREBASE_APP_ID
// (optionally) REACT_APP_FIREBASE_MEASUREMENT_ID

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfigFromEnv = (() => {
  // Allow either a single JSON blob or individual vars
  if (process.env.REACT_APP_FIREBASE_CONFIG) {
    try {
      return JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG);
    } catch (e) {
      // fallthrough to individual vars
    }
  }
  const apiKey = process.env.REACT_APP_FIREBASE_API_KEY;
  const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID;
  if (!apiKey || !projectId) return null;
  return {
    apiKey,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID || `1:${process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID}:web:xxxx`,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
  };
})();

const hasConfig = Boolean(firebaseConfigFromEnv);
if (!hasConfig) {
  // eslint-disable-next-line no-console
  console.warn('[Firebase shim] Missing Firebase configuration environment variables. Set REACT_APP_FIREBASE_API_KEY and REACT_APP_FIREBASE_PROJECT_ID (or REACT_APP_FIREBASE_CONFIG).');
}

let app = null;
if (hasConfig) {
  try {
    app = (getApps().length ? getApp() : initializeApp(firebaseConfigFromEnv));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[Firebase shim] Failed to initialize Firebase app:', e);
  }
}

export const account = app ? getAuth(app) : null; // Firebase Auth instance
export const databases = app ? getFirestore(app) : null; // Firestore instance
export const storage = app ? getStorage(app) : null; // Firebase Storage instance

// ID and Query are shims to reduce required changes across the codebase.
// ID.unique() returns a UUID-like string. Query is a light placeholder (not a full replacement).
export const ID = {
  unique: () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    // fallback
    return 'id_' + Math.random().toString(36).slice(2, 10);
  }
};

export const Query = {
  // Example helper: where(field, op, value) -> { type: 'where', args: [...] }
  where: (...args) => ({ type: 'where', args }),
};

// Permission/Role helper objects (placeholders for Firebase security rules)
export const Permission = {};
export const Role = {};

export const config = {
  // keep familiar keys used across the app but map to Firebase-friendly names
  project: firebaseConfigFromEnv?.projectId || null,
  storageBucket: firebaseConfigFromEnv?.storageBucket || null,
  // keep legacy names so other files referencing them won't blow up; encourage migration
  databaseId: process.env.REACT_APP_FIREBASE_PROJECT_ID || null,
  collectionId: process.env.REACT_APP_FIREBASE_COLLECTION_ID || null,
  bucketId: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || null,
  companyDsaBucketId: process.env.REACT_APP_FIREBASE_COMPANY_DSA_BUCKET_ID,
  companyDsaPagesCollectionId: process.env.REACT_APP_FIREBASE_COMPANY_DSA_PAGES_COLLECTION_ID,
  userProfileCollectionId: process.env.REACT_APP_FIREBASE_USER_PROFILE_COLLECTION_ID,
  adminEmails: (process.env.REACT_APP_FIREBASE_ADMIN_EMAILS || '').split(',').map(s=>s.trim()).filter(Boolean),
  appBaseUrl: process.env.REACT_APP_APP_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : null),
};

// Lightweight dev-time diagnostic
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  const missing = [];
  if (!config.project) missing.push('project / REACT_APP_FIREBASE_PROJECT_ID');
  if (!config.storageBucket) missing.push('storageBucket / REACT_APP_FIREBASE_STORAGE_BUCKET');
  if (missing.length) {
    // eslint-disable-next-line no-console
    console.warn('[Firebase shim][config] Missing keys:', missing.join(', '));
  }
}

