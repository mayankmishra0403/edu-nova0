import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { config } from '../lib/firebase';
import { companyPages } from '../lib/companyPages';

export default function AdminWebPages() {
  const { user } = useAuth();
  const isAdmin = config.adminEmails.includes((user?.email || '').toLowerCase());
  const [files, setFiles] = useState([]);
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(0);
  const [inlineCss, setInlineCss] = useState(true);

  if (!isAdmin) return <div className="container" style={{padding:24}}>Not authorized.</div>;
  if (!config.companyDsaBucketId || !config.companyDsaPagesCollectionId) {
    return <div className="container" style={{padding:24}}>
      <h2>Admin • Company Web Pages</h2>
      <div className="alert error">Missing environment variables for company pages. Set REACT_APP_FIREBASE_COMPANY_DSA_BUCKET_ID and REACT_APP_FIREBASE_COMPANY_DSA_PAGES_COLLECTION_ID in .env.</div>
    </div>;
  }

  const onUpload = async () => {
    setErr(''); setBusy(true); setDone(0); setLog([]);
    try {
      if (!files.length) throw new Error('Select .html files first');
      // Create quick lookup for possible CSS assets by name
      const cssMap = new Map();
      files.forEach(f => { if (/\.css$/i.test(f.name)) cssMap.set(f.name, f); });
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (!/\.html?$/i.test(f.name)) {
          setLog(l => [...l, `Skip (not html): ${f.name}`]);
          continue;
        }
        setLog(l => [...l, `Uploading: ${f.name}`]);
        try {
          let fileToSend = f;
          if (inlineCss) {
            try {
              const text = await f.text();
              // Find stylesheet links: <link rel="stylesheet" href="...">
              const replaced = await inlineStylesheets(text, cssMap, (msg) => setLog(l => [...l, msg]));
              if (replaced !== text) {
                fileToSend = new File([replaced], f.name, { type: f.type || 'text/html' });
                setLog(l => [...l, `✓ Inlined CSS for ${f.name}`]);
              }
            } catch (e) {
              setLog(l => [...l, `! CSS inline failed ${f.name}: ${e?.message}`]);
            }
          }
          const { doc } = await companyPages.uploadAndRegister(fileToSend);
          setLog(l => [...l, `✔ Registered ${doc.company}`]);
        } catch (e) {
          setLog(l => [...l, `✖ Failed ${f.name}: ${e?.message}`]);
        }
        setDone(i + 1);
      }
      setLog(l => [...l, 'All done. Refresh Placements to see updates.']);
    } catch (e) {
      setErr(e?.message || 'Upload failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="container" style={{padding:24}}>
      <h2>Admin • Company Web Pages</h2>
      <p>Bulk upload HTML pages to bucket <code>{config.companyDsaBucketId}</code>. Each file name becomes the company name (minus .html).</p>
      <div style={{display:'grid', gap:12, maxWidth:560}}>
        <label style={{display:'grid', gap:4}}>
          <span>HTML Files (.html)</span>
          <input type="file" multiple accept=".html,.htm" onChange={e => setFiles([...e.target.files])} />
        </label>
        <label style={{display:'flex', alignItems:'center', gap:8, fontSize:14}}>
          <input type="checkbox" checked={inlineCss} onChange={e=>setInlineCss(e.target.checked)} /> Inline referenced CSS files (select the .css files together with HTML)
        </label>
        <button className="button primary" disabled={busy} onClick={onUpload}>{busy ? `Uploading (${done}/${files.length})...` : 'Upload & Register'}</button>
      </div>
      {err && <div className="alert error" style={{marginTop:12}}>{err}</div>}
      {log.length > 0 && (
        <div style={{marginTop:16}}>
          <h4>Log</h4>
          <ul style={{fontFamily:'monospace', fontSize:13, background:'var(--surface-2)', padding:12, borderRadius:8, maxHeight:260, overflow:'auto'}}>
            {log.map((l,i)=><li key={i}>{l}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

// Helper: inline <link rel="stylesheet" href="x.css"> occurrences with actual CSS content if the css file is provided.
async function inlineStylesheets(htmlText, cssMap, log) {
  // Quick bail-out
  if (!htmlText.includes('<link')) return htmlText;
  let modified = htmlText;
  // Regex: naive but effective for well-formed cases (no media queries attr capturing for now)
  const linkRegex = /<link\s+[^>]*rel=["']stylesheet["'][^>]*>/ig;
  const matches = [...htmlText.matchAll(linkRegex)];
  for (const m of matches) {
    const tag = m[0];
    const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) continue;
    const href = hrefMatch[1];
    // Only inline local (no protocol) and present in cssMap
    if (/^https?:\/\//i.test(href)) continue; // skip external CDN
    const fileName = href.split(/[\\/]/).pop();
    if (cssMap.has(fileName)) {
      try {
        const cssFile = cssMap.get(fileName);
        const css = await cssFile.text();
        const styleTag = `<style data-inlined="${fileName}">\n${css}\n</style>`;
        modified = modified.replace(tag, styleTag);
      } catch (e) {
        log && log(`! Failed to inline ${fileName}: ${e?.message}`);
      }
    }
  }
  return modified;
}
