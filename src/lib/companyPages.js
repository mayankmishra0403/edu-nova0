// Company DSA pages management utilities
// Handles: listing, creating (metadata) after uploading HTML to storage, and deleting

import { databases, storage, ID, config } from './firebase';

if (!config.companyDsaBucketId && process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line no-console
  console.warn('[companyPages] Missing companyDsaBucketId env variable');
}

export const companyPages = {
  uploadAndRegister: async (file) => {
    if (!config.companyDsaBucketId) throw new Error('Bucket not configured');
    if (!config.databaseId || !config.companyDsaPagesCollectionId) throw new Error('Pages collection not configured');
    if (!file) throw new Error('No file provided');
    // Create storage file
    const stored = await storage.createFile(config.companyDsaBucketId, ID.unique(), file);
    const name = file.name.replace(/\.html?$/i, '');
    // Create metadata doc
    const doc = await databases.createDocument(
      config.databaseId,
      config.companyDsaPagesCollectionId,
      ID.unique(),
      {
        company: name,
        bucketId: config.companyDsaBucketId,
        fileId: stored.$id,
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      }
    );
    return { stored, doc };
  },
  list: async () => {
    if (!config.databaseId || !config.companyDsaPagesCollectionId) throw new Error('Pages collection not configured');
    const res = await databases.listDocuments(config.databaseId, config.companyDsaPagesCollectionId);
    return res.documents || [];
  },
  remove: async (docId, bucketId, fileId) => {
    if (!config.databaseId || !config.companyDsaPagesCollectionId) throw new Error('Pages collection not configured');
    if (bucketId && fileId) {
      try { await storage.deleteFile(bucketId, fileId); } catch (e) { /* ignore */ }
    }
    return databases.deleteDocument(config.databaseId, config.companyDsaPagesCollectionId, docId);
  }
};

export default companyPages;
