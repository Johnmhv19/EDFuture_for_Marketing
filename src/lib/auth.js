// Two-tier bearer-token auth. The client stores its role in an
// httpOnly cookie set by /api/auth/login, and sends it back on every
// request. The cookie value is signed (see ./signedCookie.js) so the
// server can verify it is genuine and has not been forged by the
// client. The middleware reads and verifies the cookie; route
// handlers use `getRole()` which also verifies.

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { config } from './config.js';
import { verifyRole } from './signedCookie.js';

export const ROLE = { ADMIN: 'admin', VIEWER: 'viewer', NONE: 'none' };

// Constant-time string equality. Buffers of different length are
// rejected without a length-probing side channel. Used for the
// bearer-token compare at /api/auth/login.
function safeEq(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export async function getRole() {
  const c = await cookies();
  const raw = c.get(config.roleCookieName)?.value;
  if (!raw) return ROLE.NONE;
  const verified = await verifyRole(raw);
  if (verified === ROLE.ADMIN) return ROLE.ADMIN;
  if (verified === ROLE.VIEWER) return ROLE.VIEWER;
  return ROLE.NONE;
}

export async function isAdmin() {
  return (await getRole()) === ROLE.ADMIN;
}

export async function isAtLeastViewer() {
  const r = await getRole();
  return r === ROLE.ADMIN || r === ROLE.VIEWER;
}

// Login: accept a raw token (from a form POST or Authorization header),
// compare with ADMIN_TOKEN / VIEW_TOKEN, return the role or null.
export function roleForToken(raw) {
  if (!raw) return null;
  // Accept "Bearer xxx" or plain "xxx"
  const tok = raw.replace(/^Bearer\s+/i, '').trim();
  if (config.adminToken && safeEq(tok, config.adminToken)) return ROLE.ADMIN;
  if (config.viewToken && safeEq(tok, config.viewToken)) return ROLE.VIEWER;
  return null;
}

// For API routes — return 401 if not at least a viewer; 403 if not admin.
export async function requireAdmin() {
  if (await isAdmin()) return null;
  return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
}

export async function requireViewer() {
  if (await isAtLeastViewer()) return null;
  return NextResponse.json({ error: 'Login required' }, { status: 401 });
}
