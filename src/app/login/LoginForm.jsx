'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { withBase } from '@/lib/basePath';

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/';

  // Open-redirect protection (AUDIT-REPORT.md M-1). Only accept a
  // single leading slash, and reject protocol-relative URLs
  // (`//evil.com`) and absolute URLs (`https://evil.com`).
  const safeNext = (() => {
    if (typeof next !== 'string') return '/';
    if (!next.startsWith('/') || next.startsWith('//')) return '/';
    return next;
  })();

  const [adminToken, setAdminToken] = useState('');
  const [viewToken, setViewToken]   = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy]   = useState(false);

  async function login(role) {
    const token = role === 'admin' ? adminToken : viewToken;
    if (!token) {
      setError('Please paste a token first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch(withBase('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, role }),
      });
      if (res.ok) {
        // Admins go straight to /admin (unless they were trying to land
        // somewhere else). Viewers go wherever the page redirected from
        // (or the marketing home). The dest is always a single-leading-
        // slash path; absolute and protocol-relative URLs were rejected
        // above.
        const dest = role === 'admin' ? (safeNext === '/' ? '/admin' : safeNext) : safeNext;
        router.push(dest);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Invalid token');
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-5">
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-gray-700">Admin token</label>
          <div className="mt-1 flex gap-2">
            <input
              type="password"
              value={adminToken}
              onChange={e => setAdminToken(e.target.value)}
              placeholder="paste admin token"
              className="flex-1 px-3 py-2 border border-gray-300 rounded font-mono text-sm"
              autoComplete="off"
            />
            <button onClick={() => login('admin')} disabled={busy} className="btn btn-primary">
              Sign in as admin
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">Full access — can edit programmes, upload files.</p>
        </div>

        <div className="border-t border-gray-100 pt-5">
          <label className="text-xs font-bold uppercase tracking-wide text-gray-700">Marketing viewer token</label>
          <div className="mt-1 flex gap-2">
            <input
              type="password"
              value={viewToken}
              onChange={e => setViewToken(e.target.value)}
              placeholder="paste viewer token"
              className="flex-1 px-3 py-2 border border-gray-300 rounded font-mono text-sm"
              autoComplete="off"
            />
            <button onClick={() => login('viewer')} disabled={busy} className="btn btn-ghost">
              Sign in as viewer
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">Read-only — browse and download.</p>
        </div>
      </div>
    </>
  );
}
