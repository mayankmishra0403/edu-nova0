#!/usr/bin/env node
/* Simple env validator for CRA build/start */
try { require('dotenv').config(); } catch {}

const hasFirebase = Boolean(process.env.REACT_APP_FIREBASE_PROJECT_ID);
if (!hasFirebase) {
  console.warn('\n[verify-env] Missing backend configuration (continuing so banner can show inside app).');
  console.warn('[verify-env] Set REACT_APP_FIREBASE_PROJECT_ID in .env then fully restart dev server.');
}

// Optional warnings (non-fatal)
const optional = [
  'REACT_APP_FIREBASE_API_KEY',
  'REACT_APP_FIREBASE_AUTH_DOMAIN'
];
const optionalMissing = optional.filter(k => !process.env[k]);
if (optionalMissing.length) {
  console.warn('[verify-env] Warning: optional env vars not set: ' + optionalMissing.join(', '));
}
