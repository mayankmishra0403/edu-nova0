import React, { useState } from 'react';
import AdminFiles from './AdminFiles.jsx';
import AdminWebPages from './AdminWebPages.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { config } from '../lib/firebase';

// Unified admin dashboard combining file manager and web page uploader.
export default function AdminDashboard() {
  const { user } = useAuth();
  const isAdmin = user && Array.isArray(config.adminEmails) && config.adminEmails.includes((user.email||'').toLowerCase());
  const [section, setSection] = useState('files');

  if (!isAdmin) return <div className="container" style={{padding:24}}>Not authorized.</div>;

  return (
    <div className="container" style={{padding:24}}>
      <h2 style={{marginTop:0}}>Admin Dashboard</h2>
      <div style={{display:'flex', gap:8, flexWrap:'wrap', margin:'8px 0 16px'}}>
  <button className={`button ${section==='files'?'primary':''}`} onClick={()=>setSection('files')}>Files</button>
  <button className={`button ${section==='web'?'primary':''}`} onClick={()=>setSection('web')}>Web Pages</button>
      </div>
      <div style={{border:'1px solid var(--border-color,#ddd)', borderRadius:12, padding:4}}> 
  {section==='files' ? <AdminFiles /> : <AdminWebPages />}
      </div>
    </div>
  );
}
