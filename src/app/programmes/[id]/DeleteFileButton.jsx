'use client';

// DeleteFileButton — the trash icon next to a file on the public
// programme detail page. Posts to the canonical viewer-aware
// endpoint /api/programmes/[id]/files/[fileId] which checks role.
// Admin always has delete permission; viewer only on viewer-
// uploaded files (the parent server component hides the button
// for other cases).

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { withBase } from '@/lib/basePath';

export default function DeleteFileButton({ programmeId, fileId, fileName }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    const ok = window.confirm(
      `Delete "${fileName}"?\n\nThis cannot be undone.`
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(withBase(`/api/programmes/${programmeId}/files/${fileId}`), {
        method: 'DELETE',
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert('Delete failed: ' + (data.error || res.statusText));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="text-gray-400 hover:text-red-600 disabled:opacity-50 p-1"
      aria-label={`Delete ${fileName}`}
      title={busy ? 'Deleting…' : 'Delete'}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </svg>
    </button>
  );
}
