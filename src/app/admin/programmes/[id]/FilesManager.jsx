'use client';

// FilesManager — admin UI for adding and removing files, links, and
// folders for a programme.
//
// The "Add" form has a type selector:
//   - UPLOAD: shows a file picker, sends multipart/form-data
//   - LINK / FOLDER: shows a URL field, sends application/json
//
// All three types use the same displayName, category, caption, and
// isPublic fields. isPublic controls whether non-admin viewers can
// fetch the file (see AUDIT-REPORT.md M-2).

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FILE_CATEGORY_LABEL, FILE_CATEGORY_ICON,
  FILE_TYPE_LABEL, FILE_TYPE_ICON, FILE_TYPE_ORDER,
  UPLOADED_BY_LABEL, UPLOADED_BY_BADGE,
} from '@/lib/labels';
import { withBase } from '@/lib/basePath';

const CATEGORIES = ['COVER_IMAGE', 'VIDEO', 'PHOTO', 'ARTICLE', 'RESOURCE'];

// Default isPublic per category: covers are private (admins only),
// everything else is public. Matches the backfill in the migration
// and the default in src/app/api/admin/programmes/[id]/files/route.js.
function defaultIsPublic(category) {
  return category !== 'COVER_IMAGE';
}

export default function FilesManager({ programmeId, files }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [type, setType] = useState('UPLOAD');
  const [category, setCategory] = useState('VIDEO');
  // isPublic tracks the checkbox. When the user changes category
  // we reset it to the category default to avoid the surprise of
  // e.g. a private VIDEO being uploaded as a private COVER_IMAGE
  // by accident.
  const [isPublic, setIsPublic] = useState(() => defaultIsPublic('VIDEO'));
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [caption, setCaption] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    setIsPublic(defaultIsPublic(category));
  }, [category]);

  // Group by type first, then category (so UPLOAD shows first)
  const grouped = {};
  for (const t of FILE_TYPE_ORDER) grouped[t] = {};
  for (const c of CATEGORIES) for (const t of FILE_TYPE_ORDER) grouped[t][c] = [];
  for (const f of files) {
    const t = f.type || 'UPLOAD';
    if (!grouped[t]) grouped[t] = {};
    if (!grouped[t][f.category]) grouped[t][f.category] = [];
    grouped[t][f.category].push(f);
  }

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
        form.append('isPublic', isPublic ? 'true' : 'false');
        const res = await fetch(withBase(`/api/admin/programmes/${programmeId}/files`), {
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
      const res = await fetch(withBase(`/api/admin/programmes/${programmeId}/files`), {
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

  async function deleteFile(id) {
    if (!confirm('Delete this file/link/folder? This cannot be undone.')) return;
    const res = await fetch(withBase(`/api/admin/programmes/${programmeId}/files/${id}`), { method: 'DELETE' });
    if (res.ok) router.refresh();
    else setErr('Failed to delete');
  }

  const totalFiles = files.length;

  return (
    <div className="space-y-4">
      <h2 className="font-bold">Files, links & folders</h2>

      {err && <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded">{err}</div>}

      {/* ─── Add form ─── */}
      <div className="card p-5">
        <h3 className="text-sm font-bold mb-3 text-gray-700">Add to this programme</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
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
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-700">Display name (optional)</span>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="input"
              placeholder={type === 'UPLOAD' ? 'overrides filename' : 'e.g. Recap 2026 (YouTube)'}
            />
          </label>
        </div>

        <div className="mb-3">
          <label className="text-xs font-bold uppercase tracking-wide text-gray-700">
            Caption (optional)
          </label>
          <input
            value={caption}
            onChange={e => setCaption(e.target.value)}
            className="input"
            placeholder="Short description shown below the link"
          />
        </div>

        <div className="mb-3 flex items-start gap-2">
          <input
            id="isPublic"
            type="checkbox"
            checked={isPublic}
            onChange={e => setIsPublic(e.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <label htmlFor="isPublic" className="text-sm text-gray-700">
            <span className="font-semibold">Public</span>
            <span className="block text-xs text-gray-500">
              Viewers can download this file. Uncheck to keep it admin-only
              (useful for cover images, internal memos, drafts).
            </span>
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

        <style>{`
          .input { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db;
            border-radius: 0.375rem; font-size: 0.875rem; margin-top: 0.25rem; }
        `}</style>
      </div>

      {/* ─── Existing items ─── */}
      {totalFiles === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          No files yet. Use the form above to upload one or add an external link.
        </div>
      ) : (
        FILE_TYPE_ORDER.map(t => {
          const items = Object.values(grouped[t] || {}).flat();
          if (items.length === 0) return null;
          return (
            <div key={t} className="card p-5">
              <h3 className="text-sm font-bold mb-3 text-gray-700">
                {FILE_TYPE_ICON[t]} {FILE_TYPE_LABEL[t]} ({items.length})
              </h3>
              <ul className="divide-y divide-gray-100">
                {items.map(f => (
                  <li key={f.id} className="py-3 flex items-center gap-3">
                    <div className="text-xl shrink-0">{FILE_CATEGORY_ICON[f.category]}</div>
                    <div className="flex-1 min-w-0">
                      {f.type === 'UPLOAD' ? (
                        <a href={withBase(`/api/files/${f.id}`)} target="_blank" className="font-medium text-blue-700 hover:underline truncate block">
                          {f.displayName}
                        </a>
                      ) : (
                        <a href={f.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-700 hover:underline truncate block">
                          {f.displayName}
                        </a>
                      )}
                      {f.caption && <p className="text-xs text-gray-500">{f.caption}</p>}
                      <p className="text-xs text-gray-400 flex flex-wrap items-center gap-x-1.5">
                        <span>{FILE_CATEGORY_LABEL[f.category]}</span>
                        {f.type === 'UPLOAD' && f.originalName && <span>· {f.originalName}</span>}
                        {f.type === 'UPLOAD' && f.sizeBytes && <span>· {formatBytes(f.sizeBytes)}</span>}
                        {f.type !== 'UPLOAD' && f.url && <span>· {shortUrl(f.url)}</span>}
                        <span className={`ml-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          f.isPublic ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                        }`} title={f.isPublic ? 'Viewers can download this file' : 'Admin only — viewers get 404'}>
                          {f.isPublic ? 'Public' : 'Private'}
                        </span>
                        {f.uploadedByRole && f.uploadedByRole !== 'admin' && (
                          <span
                            className={`ml-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${UPLOADED_BY_BADGE[f.uploadedByRole] || 'bg-gray-200 text-gray-700'}`}
                            title={UPLOADED_BY_LABEL[f.uploadedByRole] || f.uploadedByRole}
                          >
                            {UPLOADED_BY_LABEL[f.uploadedByRole] || f.uploadedByRole}
                          </span>
                        )}
                      </p>
                    </div>
                    <button onClick={() => deleteFile(f.id)} className="text-xs text-red-600 hover:text-red-800 shrink-0">
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}
    </div>
  );
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function shortUrl(url) {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}
