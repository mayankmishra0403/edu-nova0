#!/usr/bin/env node
/* Simple env validator for CRA build/start */
const required = [
  'REACT_APP_APPWRITE_ENDPOINT',
  'REACT_APP_APPWRITE_PROJECT_ID'
];

const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error('\n[verify-env] Missing required env vars: ' + missing.join(', '));
  console.error('Add them to your .env locally (restart) or to hosting provider environment settings.');
  process.exit(1);
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
