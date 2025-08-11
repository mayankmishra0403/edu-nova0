import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { storage, config } from './appwrite';

// Progressive + cached sanitized HTML loader.
// Options:
// - bucketId: override bucket id
// - allowScripts: allow <script> tags (default false)
// - progressive: incrementally sanitize & append to avoid main-thread jank for huge files
// - initialChars: chars to sanitize immediately before yielding (default 50k)
// - chunkSize: chars per subsequent chunk (default 25k)
// - onProgress: callback(progress [0-1])
const memoryCache = new Map(); // key: fileId + ':' + allowScripts + ':' + bucketId -> { html, ts }

export function useSanitizedHtml(fileId, options = {}) {
  const {
    bucketId = config.companyDsaBucketId,
    allowScripts = false,
    progressive = false,
    initialChars = 50_000,
    chunkSize = 25_000,
    onProgress,
    maxCacheAgeMs = 1000 * 60 * 30 // 30 min
  } = options;

  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [bytes, setBytes] = useState(0);

  // Internal safe set progress
  const updateProgress = (p) => {
    setProgress(p);
    if (typeof onProgress === 'function') {
      try { onProgress(p); } catch { /* ignore */ }
    }
  };

  useEffect(() => {
    let cancelled = false;
    updateProgress(0);
    setHtml('');
    setError(null);

    async function run() {
      if (!fileId || !bucketId) return;
      const cacheKey = `${fileId}:${allowScripts}:${bucketId}`;
      const cached = memoryCache.get(cacheKey);
      if (cached && (Date.now() - cached.ts) < maxCacheAgeMs) {
        setHtml(cached.html);
        updateProgress(1);
        return;
      }
      setLoading(true);
      try {
        const res = await storage.getFileView(bucketId, fileId);
        const url = res?.href || res;
        const resp = await fetch(url);
        const raw = await resp.text();
        if (cancelled) return;
        setBytes(raw.length);
        if (!progressive || raw.length <= initialChars + chunkSize) {
          // Simple path
            const clean = DOMPurify.sanitize(raw, { FORBID_TAGS: allowScripts ? [] : ['script'] });
          if (cancelled) return;
          setHtml(clean);
          memoryCache.set(cacheKey, { html: clean, ts: Date.now() });
          updateProgress(1);
        } else {
          // Progressive path
          const first = raw.slice(0, initialChars);
          const rest = raw.slice(initialChars);
          const cleanFirst = DOMPurify.sanitize(first, { FORBID_TAGS: allowScripts ? [] : ['script'] });
          if (cancelled) return;
          setHtml(cleanFirst);
          updateProgress(initialChars / raw.length);

          let offset = 0;
          function processChunk() {
            if (cancelled) return;
            if (offset >= rest.length) {
              updateProgress(1);
              memoryCache.set(cacheKey, { html: cleanFirst + restProcessed.current, ts: Date.now() });
              return;
            }
            const slice = rest.slice(offset, offset + chunkSize);
            offset += chunkSize;
            // Sanitize each slice independently (DOMPurify ok for fragments)
            const cleanFrag = DOMPurify.sanitize(slice, { FORBID_TAGS: allowScripts ? [] : ['script'] });
            restProcessed.current += cleanFrag;
            setHtml(prev => prev + cleanFrag);
            updateProgress((initialChars + offset) / raw.length);
            // Yield control
            setTimeout(processChunk, 0);
          }
          const restProcessed = { current: '' };
          setTimeout(processChunk, 0);
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId, bucketId, allowScripts, progressive, initialChars, chunkSize]);

  return { html, loading, error, progress, bytes };
}

export default useSanitizedHtml;
