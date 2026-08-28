'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FILE_CATEGORY_LABEL, FILE_CATEGORY_ICON } from '@/lib/labels';

const CATEGORIES = ['COVER_IMAGE', 'VIDEO', 'PHOTO', 'ARTICLE', 'RESOURCE'];

export default function FilesManager({ programmeId, files }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [category, setCategory] = useState('VIDEO');
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [caption, setCaption] = useState('');

  const grouped = {};
  for (const c of CATEGORIES) grouped[c] = [];
  for (const f of files) (grouped[f.category] ||= []).push(f);

  async function onFiles(e) {
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
        const res = await fetch(`/api/admin/programmes/${programmeId}/files`, {
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

  async function deleteFile(id) {
    if (!confirm('Delete this file? This cannot be undone.')) return;
    const res = await fetch(`/api/admin/programmes/${programmeId}/files/${id}`, { method: 'DELETE' });
    if (res.ok) router.refresh();
    else setErr('Failed to delete');
  }

  return (
    <div className="space-y-4">
      <h2 className="font-bold">Files</h2>

      {err && <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded">{err}</div>}

      <div className="card p-5">
        <h3 className="text-sm font-bold mb-3 text-gray-700">Upload a new file</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-700">Category</span>
            <select value={category} onChange={e => setCategory(e.target.value)} className="input">
              {CATEGORIES.map(c => <option key={c} value={c}>{FILE_CATEGORY_ICON[c]} {FILE_CATEGORY_LABEL[c]}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-700">Display name (optional)</span>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="input" placeholder="overrides filename" />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-700">Caption (optional)</span>
            <input value={caption} onChange={e => setCaption(e.target.value)} className="input" />
          </label>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={onFiles}
          disabled={uploading}
          className="block w-full text-sm text-gray-700 file:mr-3 file:px-3 file:py-2 file:border-0 file:bg-blue-50 file:text-blue-700 file:font-semibold"
        />
        {uploading && <p className="text-sm text-gray-500 mt-2">Uploading…</p>}
        <style>{`.input { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; margin-top: 0.25rem; }`}</style>
      </div>

      {CATEGORIES.map(cat => {
        const items = grouped[cat] || [];
        if (items.length === 0) return null;
        return (
          <div key={cat} className="card p-5">
            <h3 className="text-sm font-bold mb-3 text-gray-700">
              {FILE_CATEGORY_ICON[cat]} {FILE_CATEGORY_LABEL[cat]} ({items.length})
            </h3>
            <ul className="divide-y divide-gray-100">
              {items.map(f => (
                <li key={f.id} className="py-3 flex items-center gap-3">
                  <div className="text-2xl">{FILE_CATEGORY_ICON[cat]}</div>
                  <div className="flex-1 min-w-0">
                    <a href={`/api/files/${f.id}`} target="_blank" className="font-medium text-blue-700 hover:underline truncate block">
                      {f.displayName}
                    </a>
                    {f.caption && <p className="text-xs text-gray-500">{f.caption}</p>}
                    <p className="text-xs text-gray-400">
                      {f.originalName} · {formatBytes(f.sizeBytes)} · {new Date(f.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button onClick={() => deleteFile(f.id)} className="text-xs text-red-600 hover:text-red-800">
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {files.length === 0 && (
        <div className="card p-8 text-center text-gray-500">
          No files uploaded yet. Use the form above to upload some.
        </div>
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
