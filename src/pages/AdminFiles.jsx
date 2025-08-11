import React, { useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { config } from "../lib/appwrite";
import { uploadToBucket, deleteFromBucket, meta, fileUrl } from "../lib/files";

const YEAR_OPTIONS = [
  { key: "1", label: "1st Year", bucketKey: "bucketYear1" },
  { key: "2", label: "2nd Year", bucketKey: "bucketYear2" },
  { key: "3", label: "3rd Year", bucketKey: "bucketYear3" },
  { key: "4", label: "4th Year", bucketKey: "bucketYear4" },
];

export default function AdminFiles() {
  const { user } = useAuth();
  const isAdmin = useMemo(() => config.adminEmails.includes(user?.email || ""), [user]);

  const [year, setYear] = useState("1");
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [subject, setSubject] = useState("");
  const [unit, setUnit] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const bucketId = config[YEAR_OPTIONS.find(y => y.key === year)?.bucketKey] || config.bucketId;

  const onUpload = async () => {
    setErr(""); setMsg(""); setBusy(true);
    try {
      if (!files?.length) throw new Error("Select files first");
      for (const file of files) {
        const created = await uploadToBucket(bucketId, file);
        await meta.create({
          title: title || file.name,
          description,
          category: category || "General",
          bucketId,
          fileId: created.$id,
          tags: tags ? tags.split(",").map(s => s.trim()).filter(Boolean) : [],
          year,
          subject,
          unit,
        });
      }
      setMsg("Upload complete.");
      setFiles([]); setTitle(""); setDescription(""); setCategory(""); setTags("");
      setRefreshKey(v => v + 1);
    } catch (e) {
      setErr(e?.message || "Upload failed");
    } finally { setBusy(false); }
  };


  if (!isAdmin) return <div className="container" style={{ padding: 24 }}>Not authorized.</div>;

  return (
    <div className="container" style={{ padding: 24 }}>
      <h2>Admin • File Manager</h2>

      <div className="profile__grid" style={{ alignItems: "start" }}>
        <div className="profile__card">
          <h3>Upload files</h3>
          <div style={{ display: "grid", gap: 8 }}>
            <label>
              <span>Year/Bucket</span>
              <select value={year} onChange={(e) => setYear(e.target.value)}>
                {YEAR_OPTIONS.map(y => <option key={y.key} value={y.key}>{y.label}</option>)}
              </select>
            </label>
            <label>
              <span>Files</span>
              <input type="file" multiple onChange={(e) => setFiles([...e.target.files])} />
            </label>
            <label>
              <span>Title (optional)</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Defaults to file name" />
            </label>
            <label>
              <span>Description (optional)</span>
              <input value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <label>
              <span>Category</span>
              <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Theory, Lab" />
            </label>
            <label>
              <span>Subject</span>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Physics, Mathematics" />
            </label>
            <label>
              <span>Unit</span>
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. Unit 1" />
            </label>
            <label>
              <span>Tags (comma-separated)</span>
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. unit-1, notes, pdf" />
            </label>
            <button className="button primary" onClick={onUpload} disabled={busy}>{busy ? "Uploading..." : "Upload"}</button>
          </div>
        </div>

        <AdminFileList key={refreshKey} />
      </div>

      {msg && <div className="alert success" style={{ marginTop: 12 }}>{msg}</div>}
      {err && <div className="alert error" style={{ marginTop: 12 }}>{err}</div>}
    </div>
  );
}

function AdminFileList() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState([]);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  React.useEffect(() => {
    let on = true;
    setLoading(true);
    meta.list({ q, category }).then((d) => { if (on) setDocs(d); }).catch((e) => setErr(e?.message || "Failed"))
      .finally(() => on && setLoading(false));
    return () => { on = false; };
  }, [q, category]);

  return (
    <div className="profile__card">
      <h3>Files</h3>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input placeholder="Search title..." value={q} onChange={(e) => setQ(e.target.value)} />
        <input placeholder="Filter category..." value={category} onChange={(e) => setCategory(e.target.value)} />
      </div>
  {info && <div className="alert success" style={{marginBottom:8}}>{info}</div>}
  {loading ? <div>Loading...</div> : err ? <div className="alert error">{err}</div> : (
        <ul className="doclist">
          {docs.map((d) => (
            <li key={d.$id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <strong>{d.title}</strong>
                <div className="muted" style={{ fontSize: 12 }}>{d.category} • {d.tags?.join(", ")}</div>
                <div className="muted" style={{ fontSize: 12 }}>{d.bucketId} / {d.fileId}</div>
              </div>
              <a className="button ghost" href={fileUrl.download(d.bucketId, d.fileId)} target="_blank" rel="noreferrer">Download</a>
      <DeleteButton doc={d} onDeleted={() => { setDocs(prev => prev.filter(x => x.$id !== d.$id)); setInfo("Deleted."); }} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DeleteButton({ doc, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const onDelete = async () => {
    if (!window.confirm("Delete file and metadata?")) return;
    setBusy(true); setErr("");
    try {
      await deleteFromBucket(doc.bucketId, doc.fileId);
      await meta.remove(doc.$id);
  onDeleted?.();
    } catch (e) { setErr(e?.message || "Delete failed"); }
    finally { setBusy(false); }
  };
  return (
    <>
      <button className="button ghost" onClick={onDelete} disabled={busy}>{busy ? "Deleting..." : "Delete"}</button>
      {err && <span className="muted">{err}</span>}
    </>
  );
}

