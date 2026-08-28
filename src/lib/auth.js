// Two-tier bearer-token auth. The client stores its role in an httpOnly
// cookie set by /api/auth/login, and sends it back on every request.
// The middleware reads the cookie and attaches `role` to the request.

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { config } from './config.js';

export const ROLE = { ADMIN: 'admin', VIEWER: 'viewer', NONE: 'none' };

export async function getRole() {
  const c = await cookies();
  const v = c.get(config.roleCookieName)?.value;
  if (v === ROLE.ADMIN) return ROLE.ADMIN;
  if (v === ROLE.VIEWER) return ROLE.VIEWER;
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
  if (config.adminToken && tok === config.adminToken) return ROLE.ADMIN;
  if (config.viewToken && tok === config.viewToken) return ROLE.VIEWER;
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
