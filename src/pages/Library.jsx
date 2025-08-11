import React from "react";
import { meta, fileUrl } from "../lib/files";

export default function Library() {
  const [q, setQ] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [docs, setDocs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    let on = true;
    setLoading(true);
    meta.list({ q, category })
      .then((d) => { if (on) setDocs(d); })
      .catch((e) => setErr(e?.message || "Failed"))
      .finally(() => on && setLoading(false));
    return () => { on = false; }
  }, [q, category]);

  return (
    <div className="container" style={{ padding: 24 }}>
      <h2>Library</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input placeholder="Search title..." value={q} onChange={(e) => setQ(e.target.value)} />
        <input placeholder="Filter category..." value={category} onChange={(e) => setCategory(e.target.value)} />
      </div>
      {loading ? <div>Loading...</div> : err ? <div className="alert error">{err}</div> : (
        <ul className="doclist">
          {docs.map((d) => (
            <li key={d.$id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <strong>{d.title}</strong>
                <div className="muted" style={{ fontSize: 12 }}>{d.category} • {d.tags?.join(", ")}</div>
              </div>
              <a className="button ghost" href={fileUrl.download(d.bucketId, d.fileId)} target="_blank" rel="noreferrer">Download</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

