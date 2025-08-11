#!/usr/bin/env node
/* Simple env validator for CRA build/start */
try { require('dotenv').config(); } catch {}

const required = ['REACT_APP_APPWRITE_ENDPOINT','REACT_APP_APPWRITE_PROJECT_ID'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.warn('\n[verify-env] Missing required env vars (continuing so banner can show inside app): ' + missing.join(', '));
  console.warn('[verify-env] Add them to .env then fully restart dev server.');
}

// Optional warnings (non-fatal)
const optional = [
  'REACT_APP_APPWRITE_DATABASE_ID',
  'REACT_APP_APPWRITE_COMPANY_DSA_BUCKET_ID'
];
const optionalMissing = optional.filter(k => !process.env[k]);
if (optionalMissing.length) {
  console.warn('[verify-env] Warning: optional env vars not set: ' + optionalMissing.join(', '));
}
