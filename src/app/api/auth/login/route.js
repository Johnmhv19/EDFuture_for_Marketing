// POST /api/auth/login
// Body: { token: string, role: 'admin' | 'viewer' }
// On success, sets a signed role cookie and returns 200.
//
// The cookie value is role + '.' + base64url(hmacSha256(COOKIE_SECRET, role))
// so that the middleware can verify it is genuine on every request.
// Plain "admin" cookies are no longer accepted — see src/lib/signedCookie.js.

import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { roleForToken } from '@/lib/auth';
import { signRole } from '@/lib/signedCookie';

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { body = {}; }
  const { token, role } = body;

  if (!token || !role || !['admin', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // The role hint is checked but the actual authorisation is the token.
  if (roleForToken(token) !== role) {
    // Small artificial delay to deny length-probing on the token.
    await new Promise(r => setTimeout(r, 50));
    return NextResponse.json({ error: 'Invalid token for that role' }, { status: 401 });
  }

  // Sign the cookie value so a forged 'admin' literal is rejected
  // by the middleware (see AUDIT-REPORT.md C-1).
  const signed = await signRole(role);

  const res = NextResponse.json({ ok: true, role });
  res.cookies.set({
    name: config.roleCookieName,
    value: signed,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // Strict: the role cookie is only sent on same-site requests.
    // There is no legitimate cross-site login flow that would
    // require 'lax' or 'none'. See AUDIT-REPORT.md H-4.
    sameSite: 'strict',
    path: '/',
    // 7 days
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(config.roleCookieName);
  return res;
}
