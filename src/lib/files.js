// File management utilities for Appwrite Storage + Database metadata
// - Creates file URLs (view/download)
// - CRUD metadata in a dedicated collection (optional)
// - Normalizes Appwrite SDK return values

import { storage, databases, ID, config } from "./appwrite";

export const fileUrl = {
  view: (bucketId, fileId) => {
    if (!bucketId || !fileId) return "#";
    const u = storage.getFileView(bucketId, fileId);
    return u?.href || u;
  },
  download: (bucketId, fileId) => {
    if (!bucketId || !fileId) return "#";
    const u = storage.getFileDownload(bucketId, fileId);
    return u?.href || u;
  },
  preview: (bucketId, fileId, w = 400, h = 400) => {
    if (!bucketId || !fileId) return "#";
    const u = storage.getFilePreview(bucketId, fileId, w, h);
    return u?.href || u;
  },
};

export const meta = {
  create: async ({
    title,
    description,
    category,
    bucketId,
    fileId,
    tags = [],
    year,
    subject,
    unit,
  }) => {
    if (!config.databaseId || !config.filesCollectionId)
      throw new Error("Files collection not configured");
    const payload = { title, description, category, bucketId, fileId, tags, year, subject, unit };
    const doc = await databases.createDocument(
      config.databaseId,
      config.filesCollectionId,
      ID.unique(),
      payload
    );
    return doc;
  },
  list: async ({ q = "", category, tag, year, subject } = {}) => {
    if (!config.databaseId || !config.filesCollectionId)
      throw new Error("Files collection not configured");
    // Simple client-side filter after listing (optimize later with queries)
    const res = await databases.listDocuments(
      config.databaseId,
      config.filesCollectionId
    );
    let docs = res.documents || [];
    if (q) docs = docs.filter((d) => (d.title || "").toLowerCase().includes(q.toLowerCase()));
    if (category) docs = docs.filter((d) => d.category === category);
    if (tag) docs = docs.filter((d) => (d.tags || []).includes(tag));
    if (year) docs = docs.filter((d) => (d.year || "") === year);
    if (subject) docs = docs.filter((d) => (d.subject || "") === subject);
    return docs;
  },
  remove: async (id) => {
    if (!config.databaseId || !config.filesCollectionId)
      throw new Error("Files collection not configured");
    return databases.deleteDocument(config.databaseId, config.filesCollectionId, id);
  },
};

export const uploadToBucket = async (bucketId, file) => {
  if (!bucketId || !file) throw new Error("Missing bucketId or file");
  const created = await storage.createFile(bucketId, ID.unique(), file);
  return created;
};

export const deleteFromBucket = async (bucketId, fileId) => {
  if (!bucketId || !fileId) throw new Error("Missing bucketId or fileId");
  return storage.deleteFile(bucketId, fileId);
};

