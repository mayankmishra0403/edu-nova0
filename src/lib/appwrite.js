// Appwrite client setup
// Requires: npm install appwrite
// Env vars required (in .env):
// - REACT_APP_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1 (or your self-hosted URL)
// - REACT_APP_APPWRITE_PROJECT_ID=xxxxxxxxxxxxx
// - REACT_APP_APPWRITE_DATABASE_ID=xxxxxxxxxxxxx
// - REACT_APP_APPWRITE_COLLECTION_ID=xxxxxxxxxxxxx
// - REACT_APP_APPWRITE_BUCKET_ID=xxxxxxxxxxxxx
// - REACT_APP_APP_BASE_URL=http://localhost:3000 (used for email verification redirect)

import { Client, Account, Databases, Storage, ID, Query, Permission, Role } from 'appwrite';

const endpoint = process.env.REACT_APP_APPWRITE_ENDPOINT;
const project = process.env.REACT_APP_APPWRITE_PROJECT_ID;

if (!endpoint || !project) {
  // eslint-disable-next-line no-console
  console.warn('[Appwrite] Missing endpoint or project id. Set REACT_APP_APPWRITE_ENDPOINT and REACT_APP_APPWRITE_PROJECT_ID');
}

export const client = new Client().setEndpoint(endpoint || '').setProject(project || '');
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export { ID, Query, Permission, Role };

export const config = {
  endpoint,
  project,
  databaseId: process.env.REACT_APP_APPWRITE_DATABASE_ID,
  collectionId: process.env.REACT_APP_APPWRITE_COLLECTION_ID,
  bucketId: process.env.REACT_APP_APPWRITE_BUCKET_ID,
  // Optional per-year buckets for content organization
  bucketYear1: process.env.REACT_APP_APPWRITE_BUCKET_ID_YEAR1,
  bucketYear2: process.env.REACT_APP_APPWRITE_BUCKET_ID_YEAR2,
  bucketYear3: process.env.REACT_APP_APPWRITE_BUCKET_ID_YEAR3,
  bucketYear4: process.env.REACT_APP_APPWRITE_BUCKET_ID_YEAR4,
  filesCollectionId: process.env.REACT_APP_APPWRITE_FILES_COLLECTION_ID,
  adminEmails: (process.env.REACT_APP_APPWRITE_ADMIN_EMAILS || "").split(",").map((s) => s.trim()).filter(Boolean),
  appBaseUrl: process.env.REACT_APP_APP_BASE_URL || window.location.origin,
  chatSessionsCollectionId: process.env.REACT_APP_APPWRITE_CHAT_SESSIONS_COLLECTION_ID,
  chatMessagesCollectionId: process.env.REACT_APP_APPWRITE_CHAT_MESSAGES_COLLECTION_ID,
  companyDsaBucketId: process.env.REACT_APP_APPWRITE_COMPANY_DSA_BUCKET_ID,
  companyDsaUsageCollectionId: process.env.REACT_APP_APPWRITE_COMPANY_DSA_USAGE_COLLECTION_ID,
  companyDsaPagesCollectionId: process.env.REACT_APP_APPWRITE_COMPANY_DSA_PAGES_COLLECTION_ID,
  userProfileCollectionId: process.env.REACT_APP_APPWRITE_USER_PROFILE_COLLECTION_ID,
  // Fallback to explicit collection ID provided by user if env not set
  get effectiveUserProfileCollectionId() { return this.userProfileCollectionId || '6898ce9200142eb38348'; },
  avatarsBucketId: process.env.REACT_APP_APPWRITE_AVATARS_BUCKET_ID, // dedicated bucket for profile pictures (optional)
};

// Lightweight diagnostic (only IDs, no secrets) – runs once
if (typeof window !== 'undefined') {
  const missing = [];
  ['companyDsaBucketId','companyDsaPagesCollectionId','companyDsaUsageCollectionId','databaseId'].forEach(k=>{ if(!config[k]) missing.push(k); });
  if (missing.length) {
    // eslint-disable-next-line no-console
    console.warn('[Appwrite][config] Missing keys:', missing.join(', '));
  }
}

