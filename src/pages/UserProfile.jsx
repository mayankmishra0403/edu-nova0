/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState, useRef } from "react";
import Auth from "./Auth.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { account, storage, databases, ID, config, Permission, Role, Query } from "../lib/appwrite";

export default function UserProfile({ onNavigate }) {
  const { user, setUser, loading } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [profileDocId, setProfileDocId] = useState("");
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const avatarInputRef = useRef(null);
  const [adminVerified, setAdminVerified] = useState(false);
  const [phone, setPhone] = useState("");
  const [rollNo, setRollNo] = useState("");
  // Extended attributes
  const [branch, setBranch] = useState("");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  const [section, setSection] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState(""); // comma separated
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");

  useEffect(() => {
    if (user) {
      setDisplayName(user.name || "");
    const fileId = user?.prefs?.avatarFileId;
    const avatarBucket = config.avatarsBucketId || config.bucketId;
    if (fileId && avatarBucket) {
        try {
      const url = storage.getFilePreview(avatarBucket, fileId, 200, 200).href || storage.getFilePreview(avatarBucket, fileId, 200, 200);
          setAvatarUrl(url);
        } catch {}
      } else {
        setAvatarUrl("");
      }
      const profileCollection = config.effectiveUserProfileCollectionId || config.userProfileCollectionId;
      if (config.databaseId && profileCollection) {
        (async () => {
          try {
            const res = await databases.listDocuments(config.databaseId, profileCollection, [Query.equal('userId', user.$id), Query.limit(1)]);
            const existing = (res.documents || [])[0];
            if (existing) {
              setProfileDocId(existing.$id);
              if (typeof existing.adminVerified === 'boolean') setAdminVerified(existing.adminVerified);
              if (existing.phone) setPhone(existing.phone);
              if (existing.rollNo) setRollNo(existing.rollNo);
              if (existing.branch) setBranch(existing.branch);
              if (existing.year) setYear(existing.year);
              if (existing.semester) setSemester(existing.semester);
              if (existing.section) setSection(existing.section);
              if (existing.bio) setBio(existing.bio);
              if (existing.skills) setSkills(Array.isArray(existing.skills) ? existing.skills.join(', ') : existing.skills);
              if (existing.github) setGithub(existing.github);
              if (existing.linkedin) setLinkedin(existing.linkedin);
            } else {
              // Create profile doc with permissive read so admins (and potentially public) can list; limit write/delete to owner.
              const doc = await databases.createDocument(
                config.databaseId,
                profileCollection,
                ID.unique(),
                {
                  userId: user.$id,
                  email: user.email,
                  name: user.name || '',
                  avatarFileId: fileId || '',
                  createdAt: new Date().toISOString(),
                  adminVerified: false,
                  phone: '',
                  rollNo: '',
                  branch: '',
                  year: '',
                  semester: '',
                  section: '',
                  bio: '',
                  skills: [],
                  github: '',
                  linkedin: ''
                },
                [
                  Permission.read(Role.any()), // allow listing by admins without custom per-user session
                  Permission.update(Role.user(user.$id)),
                  Permission.delete(Role.user(user.$id)),
                ]
              );
              setProfileDocId(doc.$id);
              setAdminVerified(false);
            }
            // Also hydrate from prefs if present
            if (user?.prefs?.phone && !phone) setPhone(user.prefs.phone);
            if (user?.prefs?.rollNo && !rollNo) setRollNo(user.prefs.rollNo);
          } catch (e) {
            console.warn('[profile] doc load/create failed', e?.message);
          }
        })();
      }
    }
  }, [user]);

  useEffect(() => {
    // Load recent documents (if DB/Collection configured)
    const load = async () => {
      if (!config.databaseId || !config.collectionId) return;
      try {
        const res = await databases.listDocuments(config.databaseId, config.collectionId);
        setDocs((res?.documents || []).slice(0, 5));
      } catch {}
    };
    load();
  }, []);

  const resendVerification = async () => {
    setBusy(true); setMsg(""); setErr("");
    try {
      await account.createVerification(config.appBaseUrl || window.location.origin);
      setMsg("Verification email sent.");
    } catch (e) { setErr(e?.message || "Failed to send verification"); }
    finally { setBusy(false); }
  };

  const saveProfile = async (e) => {
    e.preventDefault(); setSavingName(true); setMsg(""); setErr("");
    try {
      // Update name
      await account.updateName(displayName || "");
      // Update prefs with phone, rollNo (and avatar already handled separately)
      await account.updatePrefs({ ...(user?.prefs || {}), phone, rollNo });
      // Update profile document if present
      const profileCollection = config.effectiveUserProfileCollectionId || config.userProfileCollectionId;
      if (config.databaseId && profileCollection && profileDocId) {
        try { await databases.updateDocument(config.databaseId, profileCollection, profileDocId, { name: displayName, phone, rollNo, branch, year, semester, section, bio, skills: skills.split(',').map(s=>s.trim()).filter(Boolean), github, linkedin, updatedAt: new Date().toISOString() }); } catch {}
      }
      const fresh = await account.get(); setUser(fresh);
      setMsg("Profile saved.");
    } catch (e) { setErr(e?.message || "Update failed"); }
    finally { setSavingName(false); }
  };

  const onAvatarChange = async (e) => {
    const file = e.target.files?.[0];
  const avatarBucket = config.avatarsBucketId || config.bucketId;
  if (!file || !avatarBucket) return;
    // Basic MIME validation (must be an image). Removed strict extension check to allow heic/jfif/tiff etc.
    if (!file.type.startsWith('image/')) {
      setErr('Selected file is not detected as an image.');
      e.target.value='';
      return;
    }
    setUploading(true); setMsg(""); setErr("");
    try {
  const created = await storage.createFile(avatarBucket, ID.unique(), file);
      const fileId = created?.$id;
      await account.updatePrefs({ ...(user?.prefs || {}), avatarFileId: fileId });
      const fresh = await account.get();
      setUser(fresh);
  const url = storage.getFilePreview(avatarBucket, fileId, 200, 200).href || storage.getFilePreview(avatarBucket, fileId, 200, 200);
      setAvatarUrl(url);
      const profileCollection = config.effectiveUserProfileCollectionId || config.userProfileCollectionId;
      if (config.databaseId && profileCollection && profileDocId) {
        try { await databases.updateDocument(config.databaseId, profileCollection, profileDocId, { avatarFileId: fileId, name: displayName, phone, rollNo, branch, year, semester, section, bio, skills: skills.split(',').map(s=>s.trim()).filter(Boolean), github, linkedin, updatedAt: new Date().toISOString() }); } catch {}
      }
      setMsg("Avatar updated.");
    } catch (e) { setErr(e?.message || "Upload failed"); }
    finally { setUploading(false); e.target.value = ""; }
  };

  // Removed explicit remove avatar for simplicity per request.

  const signOut = async () => {
    try { await account.deleteSession("current"); setUser(null); } catch {}
  };

  if (loading) return <div className="container" style={{ padding: 24 }}>Loading...</div>;
  if (!user) return <div className="container" style={{ padding: 24 }}><Auth /></div>;

  const needsAvatar = !avatarUrl;
  const needsPhone = !phone.trim();
  const needsRoll = !rollNo.trim();
  const incomplete = needsAvatar || needsPhone || needsRoll || !displayName.trim();
  return (
    <div className="container" style={{ padding: 24 }}>
      <section className="profile">
        <div className="profile__header">
          <div
            className="avatar"
            aria-label="User avatar (click to change)"
            style={{ cursor: uploading ? 'progress' : 'pointer', position: 'relative' }}
            onClick={() => { if (!uploading) avatarInputRef.current?.click(); }}
            title={uploading ? 'Uploading...' : 'Click to change avatar'}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" />
            ) : (
              <span>{(user.name || user.email || "?").slice(0,1).toUpperCase()}</span>
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={onAvatarChange}
              disabled={uploading}
            />
            {uploading && (
              <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:12, borderRadius:'50%'}}>Uploading...</div>
            )}
          </div>
          <div className="profile__info">
            <h2>{user.name || user.email}</h2>
            <p className="muted">{user.email}</p>
            {incomplete && (
              <div className="alert error" style={{marginTop:8, padding:'6px 10px'}}>
                Complete your profile: {needsAvatar && 'photo '} {needsPhone && 'phone '} {needsRoll && 'roll no '} {!displayName.trim() && 'name'}
              </div>
            )}
            <div className="badges">
              {user.emailVerification ? (
                <span className="badge">Verified</span>
              ) : (
                <button className="button ghost" onClick={resendVerification} disabled={busy}>Verify Email</button>
              )}
              {adminVerified && <span className="badge" style={{background:'#2e8540'}}>Admin ✔</span>}
              <button className="button ghost" onClick={signOut}>Sign out</button>
            </div>
          </div>
        </div>

        <div className="profile__grid">
          <div className="profile__card">
            <h3>Profile details</h3>
            <form className="profile__form" onSubmit={saveProfile}>
              <label>
                <span>Name *</span>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" required />
              </label>
              <div style={{display:'grid', gap:12, gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))'}}>
                <label>
                  <span>Phone *</span>
                  <input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="Phone number" required />
                </label>
                <label>
                  <span>Roll No. *</span>
                  <input value={rollNo} onChange={(e)=>setRollNo(e.target.value)} placeholder="Roll number" required />
                </label>
                <label>
                  <span>Branch</span>
                  <input value={branch} onChange={(e)=>setBranch(e.target.value)} placeholder="e.g. CSE" />
                </label>
                <label>
                  <span>Year</span>
                  <input value={year} onChange={(e)=>setYear(e.target.value)} placeholder="e.g. 2" />
                </label>
                <label>
                  <span>Semester</span>
                  <input value={semester} onChange={(e)=>setSemester(e.target.value)} placeholder="e.g. 3" />
                </label>
                <label>
                  <span>Section</span>
                  <input value={section} onChange={(e)=>setSection(e.target.value)} placeholder="e.g. A" />
                </label>
              </div>
              <label>
                <span>Bio</span>
                <textarea value={bio} onChange={(e)=>setBio(e.target.value)} placeholder="Short introduction" rows={3} />
              </label>
              <label>
                <span>Skills (comma separated)</span>
                <input value={skills} onChange={(e)=>setSkills(e.target.value)} placeholder="e.g. C, Java, DSA" />
              </label>
              <div style={{display:'grid', gap:12, gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))'}}>
                <label>
                  <span>GitHub</span>
                  <input value={github} onChange={(e)=>setGithub(e.target.value)} placeholder="GitHub profile URL" />
                </label>
                <label>
                  <span>LinkedIn</span>
                  <input value={linkedin} onChange={(e)=>setLinkedin(e.target.value)} placeholder="LinkedIn profile URL" />
                </label>
              </div>
              <button className="button primary" disabled={savingName || incomplete} title={incomplete ? 'Fill all required fields & avatar' : ''}>{savingName ? "Saving..." : "Save"}</button>
            </form>
          </div>

          <div className="profile__card">
            <h3>Recent documents</h3>
            {!config.databaseId || !config.collectionId ? (
              <p className="muted">Database not configured.</p>
            ) : docs.length === 0 ? (
              <p className="muted">No documents yet.</p>
            ) : (
              <ul className="doclist">
                {docs.map((d) => (
                  <li key={d.$id}>
                    <div>
                      <strong>{d.title || d.name || d.$id}</strong>
                      <div className="muted" style={{ fontSize: 12 }}>{new Date(d.$createdAt).toLocaleString()}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {msg && <div className="alert success" style={{ marginTop: 12 }}>{msg}</div>}
        {err && <div className="alert error" style={{ marginTop: 12 }}>{err}</div>}
      </section>
    </div>
  );
}

