'use client';

// Inline delete button for the programme list. Asks for confirmation,
// then calls DELETE /api/admin/programmes/[id] and refreshes.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteButton({ id, name }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    const ok = window.confirm(
      `Delete "${name}"?\n\n` +
      `This will:\n` +
      `• Remove the programme from the database\n` +
      `• Delete all uploaded files (videos, photos, articles, covers)\n\n` +
      `This cannot be undone.`
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/programmes/${id}`, { method: 'DELETE' });
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
      className="text-red-600 hover:text-red-800 hover:underline text-xs disabled:opacity-50"
    >
      {busy ? 'Deleting…' : 'Delete'}
    </button>
  );
}
