import React, { createContext, useContext, useEffect, useState } from 'react';
import { account, databases, ID, config, Permission, Role, Query } from '../lib/appwrite';

const AuthContext = createContext({ user: null, loading: true });
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const ensureProfileDoc = async (u) => {
      if (!u || !config.databaseId) return;
      const collectionId = config.effectiveUserProfileCollectionId || config.userProfileCollectionId;
      if (!collectionId) return;
      try {
        // List limited docs by userId filter could be more efficient, but using list + client filter for simplicity
  const res = await databases.listDocuments(config.databaseId, collectionId, [Query.equal('userId', u.$id), Query.limit(1)]);
  const existing = (res.documents || [])[0];
        if (!existing) {
          await databases.createDocument(
            config.databaseId,
            collectionId,
            ID.unique(),
            {
              userId: u.$id,
              email: u.email,
              name: u.name || '',
              avatarFileId: u?.prefs?.avatarFileId || '',
              phone: u?.prefs?.phone || '',
              rollNo: u?.prefs?.rollNo || '',
              branch: '',
              year: '',
              semester: '',
              section: '',
              bio: '',
              skills: [],
              github: '',
              linkedin: '',
              adminVerified: false,
              createdAt: new Date().toISOString(),
            },
            [
              Permission.read(Role.any()),
              Permission.update(Role.user(u.$id)),
              Permission.delete(Role.user(u.$id)),
            ]
          );
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[auth] ensureProfileDoc failed', e?.message);
      }
    };
    account.get()
      .then(async (u) => { if (mounted) { setUser(u); await ensureProfileDoc(u); } })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  // Helpers to navigate to profile after login/signup if a callback is provided
  const value = { user, setUser, loading };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

