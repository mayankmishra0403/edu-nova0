/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
  const [skillsInput, setSkillsInput] = useState("");
  const [skills, setSkills] = useState([]); // array of strings
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  // Autosave / local draft
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const draftLoadedRef = useRef(false);

  const requiredFields = useMemo(() => ({ name: displayName.trim(), phone: phone.trim(), rollNo: rollNo.trim() }), [displayName, phone, rollNo]);
  const completion = useMemo(() => {
    const total = Object.keys(requiredFields).length;
    const done = Object.values(requiredFields).filter(Boolean).length;
    return Math.round((done / total) * 100);
  }, [requiredFields]);

  const localDraftKey = user ? `profileDraft_${user.$id}` : null;

  // Helper sanitation
  const sanitizeUrl = (val) => {
    if (!val) return "";
    let v = val.trim();
    if (!/^https?:\/\//i.test(v)) return ""; // require protocol
    try { const u = new URL(v); return u.toString(); } catch { return ""; }
  };

  const normalizeNumeric = (v) => {
    if (v === null || v === undefined || v === "") return "";
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : "";
  };

  const mergedPayload = () => {
    return {
      name: displayName.trim(),
      phone: phone.trim(),
      rollNo: rollNo.trim(),
      branch: branch.trim(),
      year: normalizeNumeric(year),
      semester: normalizeNumeric(semester),
      section: section.trim(),
      bio: bio.trim(),
      skills: skills,
      github: sanitizeUrl(github),
      linkedin: sanitizeUrl(linkedin),
      updatedAt: new Date().toISOString(),
    };
  };

  // Persist draft locally
  useEffect(() => {
    if (!localDraftKey) return;
    const draft = {
      displayName, phone, rollNo, branch, year, semester, section, bio, skills, github, linkedin, ts: Date.now()
    };
    try { localStorage.setItem(localDraftKey, JSON.stringify(draft)); } catch {}
  }, [displayName, phone, rollNo, branch, year, semester, section, bio, skills, github, linkedin, localDraftKey]);

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
              if (existing.skills) setSkills(Array.isArray(existing.skills) ? existing.skills.filter(Boolean) : String(existing.skills).split(',').map(s=>s.trim()).filter(Boolean));
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
            // Load local draft only once (after remote fetch) if exists
            if (!draftLoadedRef.current && localDraftKey) {
              draftLoadedRef.current = true;
              try {
                const raw = localStorage.getItem(localDraftKey);
                if (raw) {
                  const d = JSON.parse(raw);
                  if (!existing) setDisplayName(d.displayName || displayName);
                  if (d.phone && !phone) setPhone(d.phone);
                  if (d.rollNo && !rollNo) setRollNo(d.rollNo);
                  if (d.branch) setBranch(d.branch);
                  if (d.year !== undefined) setYear(d.year);
                  if (d.semester !== undefined) setSemester(d.semester);
                  if (d.section) setSection(d.section);
                  if (d.bio) setBio(d.bio);
                  if (Array.isArray(d.skills) && d.skills.length) setSkills(d.skills);
                  if (d.github) setGithub(d.github);
                  if (d.linkedin) setLinkedin(d.linkedin);
                }
              } catch {}
            }
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

  const commitProfile = async (payload) => {
    if (!user) return;
    const profileCollection = config.effectiveUserProfileCollectionId || config.userProfileCollectionId;
    if (config.databaseId && profileCollection && profileDocId) {
      try {
        await databases.updateDocument(config.databaseId, profileCollection, profileDocId, payload);
      } catch (e) {
        throw e;
      }
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault(); setSavingName(true); setMsg(""); setErr("");
    try {
      await account.updateName(displayName || "");
      await account.updatePrefs({ ...(user?.prefs || {}), phone: phone.trim(), rollNo: rollNo.trim() });
      await commitProfile(mergedPayload());
      const fresh = await account.get(); setUser(fresh);
      setMsg("Profile saved.");
      setLastSavedAt(new Date());
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
        try { await databases.updateDocument(config.databaseId, profileCollection, profileDocId, { avatarFileId: fileId, ...mergedPayload() }); } catch {}
      }
      setMsg("Avatar updated.");
    } catch (e) { setErr(e?.message || "Upload failed"); }
    finally { setUploading(false); e.target.value = ""; }
  };

  // Removed explicit remove avatar for simplicity per request.

  const signOut = async () => {
    try { await account.deleteSession("current"); setUser(null); } catch {}
  };

  // Autosave (debounced)
  useEffect(() => {
    if (!user) return;
    if (!displayName.trim() || !phone.trim() || !rollNo.trim()) return; // only when required filled
    const handle = setTimeout(async () => {
      try {
        setAutoSaving(true);
        await account.updatePrefs({ ...(user?.prefs || {}), phone: phone.trim(), rollNo: rollNo.trim() });
        await commitProfile(mergedPayload());
        setLastSavedAt(new Date());
      } catch (e) {
        console.warn('Autosave failed', e?.message);
      } finally { setAutoSaving(false); }
    }, 900);
    return () => clearTimeout(handle);
  }, [displayName, phone, rollNo, branch, year, semester, section, bio, skills, github, linkedin, user]);
  // Skill handlers (must be before any early returns)
  const addSkill = useCallback(() => {
    const val = skillsInput.trim();
    if (!val) return;
    const lowered = val.toLowerCase();
    if (skills.some(s => s.toLowerCase() === lowered)) { setSkillsInput(''); return; }
    setSkills(prev => [...prev, val]);
    setSkillsInput('');
  }, [skillsInput, skills]);

  const removeSkill = (s) => setSkills(prev => prev.filter(x => x !== s));

  const onSkillInputKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(); }
    else if (e.key === 'Backspace' && !skillsInput) { setSkills(prev => prev.slice(0, -1)); }
  };

  if (loading) return <div className="container" style={{ padding: 24 }}>Loading...</div>;
  if (!user) return <div className="container" style={{ padding: 24 }}><Auth /></div>;

  const needsAvatar = !avatarUrl;
  const needsPhone = !phone.trim();
  const needsRoll = !rollNo.trim();
  const incomplete = needsPhone || needsRoll || !displayName.trim();

  return (
    <div className="container" style={{ padding: 24 }}>
      <section className="profile" style={{ display:'grid', gap:24 }}>
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
            <div style={{marginTop:8, display:'flex', flexDirection:'column', gap:8}}>
              {incomplete && (
                <div className="alert error" style={{marginTop:0, padding:'6px 10px'}}>
                  Complete required: {needsPhone && ' phone'} {needsRoll && ' roll no'} {!displayName.trim() && ' name'}
                </div>
              )}
              <div className="profile-progress">
                <div className="profile-progress__bar" aria-label={`Profile completion ${completion}%`}>
                  <div className="profile-progress__fill" style={{ width: completion + '%' }} />
                </div>
                <span className="profile-progress__label">{completion}% complete</span>
                {needsAvatar && <span className="muted" style={{fontSize:12}}>Add a photo for a richer profile.</span>}
              </div>
            </div>
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

        <div className="profile__grid" style={{alignItems:'start'}}>
          <div className="profile__card" style={{display:'flex', flexDirection:'column', gap:16}}>
            <h3 style={{margin:0}}>Profile details</h3>
            <form className="profile__form" onSubmit={saveProfile} style={{flexDirection:'column', alignItems:'stretch'}}>
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
              <div style={{display:'flex', flexDirection:'column', gap:6}}>
                <span style={{fontWeight:600}}>Skills</span>
                <div className="skills-editor" onClick={() => document.getElementById('skillInput')?.focus()}>
                  {skills.map(s => (
                    <button type="button" key={s} className="skill-chip" title="Remove" onClick={() => removeSkill(s)}>{s}<span aria-hidden>×</span></button>
                  ))}
                  <input
                    id="skillInput"
                    value={skillsInput}
                    onChange={e=>setSkillsInput(e.target.value)}
                    onKeyDown={onSkillInputKey}
                    placeholder={skills.length ? '' : 'Add a skill and press Enter'}
                    className="skill-input"
                  />
                </div>
                {skills.length === 0 && <span className="muted" style={{fontSize:12}}>Add some skills to showcase what you know.</span>}
              </div>
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
              <div style={{display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', marginTop:8}}>
                <button className="button primary" disabled={savingName || incomplete}>{savingName ? "Saving..." : "Save"}</button>
                {autoSaving && <span className="muted" style={{fontSize:12}}>Autosaving...</span>}
                {!autoSaving && lastSavedAt && <span className="muted" style={{fontSize:12}}>Saved {lastSavedAt.toLocaleTimeString()}</span>}
              </div>
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

