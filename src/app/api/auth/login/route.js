// POST /api/auth/login
// Body: { token: string, role: 'admin' | 'viewer' }
// On success, sets the role cookie and returns 200.

import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { roleForToken } from '@/lib/auth';

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { body = {}; }
  const { token, role } = body;

  if (!token || !role || !['admin', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // The role hint is checked but the actual authorisation is the token.
  if (roleForToken(token) !== role) {
    return NextResponse.json({ error: 'Invalid token for that role' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, role });
  res.cookies.set({
    name: config.roleCookieName,
    value: role,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
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
