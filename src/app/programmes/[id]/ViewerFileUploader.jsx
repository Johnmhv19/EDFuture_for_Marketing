'use client';

// ViewerFileUploader — the upload form for the public programme page.
// Available to any authenticated viewer (or admin). Always public
// (the server forces isPublic = true for viewer uploads). Sends to
// /api/programmes/[id]/files (not the admin endpoint) so the role
// is recorded correctly.

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  FILE_CATEGORY_LABEL, FILE_CATEGORY_ICON,
  FILE_TYPE_LABEL, FILE_TYPE_ICON, FILE_TYPE_ORDER,
} from '@/lib/labels';
import { withBase } from '@/lib/basePath';

const CATEGORIES = ['VIDEO', 'PHOTO', 'ARTICLE', 'RESOURCE'];
// COVER_IMAGE is admin-only — viewers can't upload cover images.

export default function ViewerFileUploader({ programmeId }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('UPLOAD');
  const [category, setCategory] = useState('VIDEO');
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [caption, setCaption] = useState('');
  const [url, setUrl] = useState('');

  async function addUpload(e) {
    const list = e.target.files;
    if (!list || list.length === 0) return;
    setUploading(true);
    setErr('');
    for (const f of Array.from(list)) {
      try {
        const form = new FormData();
        form.append('file', f);
        form.append('category', category);
        if (displayName) form.append('displayName', displayName);
        if (caption) form.append('caption', caption);
        // No isPublic — server forces true for viewer uploads.
        const res = await fetch(withBase(`/api/programmes/${programmeId}/files`), {
          method: 'POST',
          body: form,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setErr(`${f.name}: ${data.error || 'upload failed'}`);
        }
      } catch (e) {
        setErr(`${f.name}: ${e.message}`);
      }
    }
    setUploading(false);
    setDisplayName('');
    setCaption('');
    if (inputRef.current) inputRef.current.value = '';
    router.refresh();
  }

  async function addLink() {
    if (!url) {
      setErr('Please paste a URL.');
      return;
    }
    setUploading(true);
    setErr('');
    try {
      const res = await fetch(withBase(`/api/programmes/${programmeId}/files`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type, url: url.trim(), category,
          displayName: displayName.trim() || undefined,
          caption: caption.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(data.error || 'Failed to add link');
        return;
      }
      setUrl('');
      setDisplayName('');
      setCaption('');
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-bold text-gray-700">Add to this programme</h3>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="text-xs text-blue-700 hover:underline"
        >
          {open ? 'Hide' : 'Show'}
        </button>
      </div>

      {!open ? (
        <p className="text-xs text-gray-500">
          Upload a file or add an external link (YouTube, Google Drive, etc.).
          All viewer uploads are public.
        </p>
      ) : (
        <>
          {err && <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded">{err}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-700">Type</span>
              <select value={type} onChange={e => setType(e.target.value)} className="input">
                {FILE_TYPE_ORDER.map(t => (
                  <option key={t} value={t}>{FILE_TYPE_ICON[t]} {FILE_TYPE_LABEL[t]}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-700">Category</span>
              <select value={category} onChange={e => setCategory(e.target.value)} className="input">
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{FILE_CATEGORY_ICON[c]} {FILE_CATEGORY_LABEL[c]}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-700">Display name (optional)</span>
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="input"
                placeholder={type === 'UPLOAD' ? 'overrides filename' : 'e.g. Recap 2026 (YouTube)'}
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-700">Caption (optional)</span>
              <input
                value={caption}
                onChange={e => setCaption(e.target.value)}
                className="input"
                placeholder="Short description shown below the link"
              />
            </label>
          </div>

          {type === 'UPLOAD' ? (
            <div>
              <input
                ref={inputRef}
                type="file"
                multiple
                onChange={addUpload}
                disabled={uploading}
                className="block w-full text-sm text-gray-700 file:mr-3 file:px-3 file:py-2 file:border-0 file:bg-blue-50 file:text-blue-700 file:font-semibold"
              />
              {uploading && <p className="text-sm text-gray-500 mt-2">Uploading…</p>}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="input flex-1"
                placeholder={type === 'LINK' ? 'https://www.youtube.com/watch?v=...' : 'https://drive.google.com/drive/folders/...'}
              />
              <button
                type="button"
                onClick={addLink}
                disabled={uploading}
                className="btn btn-primary shrink-0"
              >
                {uploading ? 'Adding…' : `+ Add ${type === 'FOLDER' ? 'folder' : 'link'}`}
              </button>
            </div>
          )}

          <p className="mt-3 text-xs text-gray-500">
            All uploads from viewers are public. To remove an item you uploaded, click the trash icon next to it.
          </p>
        </>
      )}

      <style>{`
        .input { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db;
          border-radius: 0.375rem; font-size: 0.875rem; margin-top: 0.25rem; }
      `}</style>
    </div>
  );
}
