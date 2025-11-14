
import React, { useState, useCallback } from "react";
import { companyLocalManifest } from "../data/companyLocalManifest";
import { useAuth } from "../contexts/AuthContext.jsx";
import { databases, ID, config } from "../lib/firebase";

export default function Placements() {
  const [search, setSearch] = useState("");
  const { user } = useAuth();

  // Dynamic remote loading removed in local mode
  const listLoading = false;
  const listErr = "";
  const loadCompanies = () => {};

  // Local-only source now; ignore dynamic list for this simplified mode
  const companiesSource = companyLocalManifest;
  const filtered = companiesSource.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));


  // Track user selection in database + update hash for deep link
  const logUsage = useCallback(async (company, extra = {}) => {
    if (user && config.companyDsaUsageCollectionId && config.databaseId) {
      try {
        await databases.createDocument(
          config.databaseId,
            config.companyDsaUsageCollectionId,
          ID.unique(),
          {
            userId: user.$id,
            company: company.name,
            file: company.fileId || company.file || '',
            viewedAt: new Date().toISOString(),
            ...extra,
          }
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[placements][usage] failed', e?.message);
      }
    }
  }, [user]);
  const openInNewTab = useCallback((company) => {
    logUsage(company, { event: 'open', mode: 'local-direct' });
    if (company.file) {
      const rawPath = `/${company.file.replace(/^\//,'')}`;
      const encoded = rawPath.split('/').map(seg => encodeURIComponent(decodeURIComponent(seg))).join('/');
      window.open(encoded, '_blank', 'noopener');
    }
  }, [logUsage]);

  return (
    <div className="container" style={{ padding: 24 }}>
      <h2 style={{ display:'flex', alignItems:'center', gap:12 }}>Placements <span style={{fontSize:14, fontWeight:500, color:'var(--text-muted)'}}>Company-wise DSA sets</span></h2>
      <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginTop:12}}>
        <input
          type="text"
          placeholder="Search company..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex:'1 1 260px', padding: "10px 16px", borderRadius: 10, border: "1px solid var(--border-color, #ccc)", background:'var(--surface-1)' }}
        />
        {config.companyDsaPagesCollectionId && (
          <button className="button ghost" style={{borderRadius:10}} disabled={listLoading} onClick={loadCompanies}>{listLoading ? 'Refreshing…' : 'Refresh List'}</button>
        )}
      </div>
  <p style={{maxWidth:760, marginTop:12}}>Click a company to open its page in a new browser tab (local pages).</p>
      {listErr && <div className="alert error" style={{marginTop:8}}>{listErr}</div>}
      <CompanyGrid companies={filtered} onSelect={openInNewTab} />
    </div>
  );
}

function CompanyGrid({ companies, onSelect, pageSize = 60 }) {
  const [visible, setVisible] = useState(pageSize);
  const slice = companies.slice(0, visible);
  const hasMore = visible < companies.length;
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16, margin: "24px 0" }}>
        {slice.map(company => (
          <button
            key={company.name}
            className="button ghost"
            style={{ padding: "14px 10px", borderRadius: 14, fontWeight: 600, fontSize: 14, lineHeight:1.2, background: "var(--surface-2)", border: "1px solid var(--border-color, #ddd)", position:'relative', overflow:'hidden' }}
            onClick={() => onSelect(company)}
          >
            {company.name}
            <span style={{position:'absolute', top:8, right:8, fontSize:12, opacity:.55}}>➜</span>
          </button>
        ))}
        {slice.length === 0 && (
          <div style={{opacity:.7, fontStyle:'italic'}}>No companies match your search</div>
        )}
      </div>
      {hasMore && (
        <div style={{textAlign:'center', marginBottom:24}}>
          <button className="button" onClick={() => setVisible(v => v + pageSize)}>Load More ({visible}/{companies.length})</button>
        </div>
      )}
    </>
  );
}

