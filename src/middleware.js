// Auth middleware. Runs on Next.js Edge runtime — must not import
// any Node modules (fs, path, crypto, etc.) at the top level.
//
// Logic:
//   - Public routes (/login, /api/auth/*, /api/healthz, /_next/*) pass
//     through.
//   - Admin routes (/admin/*, /api/admin/*) require the 'admin' cookie.
//   - Auth-gated read endpoints (/api/files/*) require 'admin' or 'viewer'.
//   - Everything else (home, programme detail) requires ANY auth.

import { NextResponse } from 'next/server';

const COOKIE = process.env.ROLE_COOKIE_NAME || 'pp_role';

const PUBLIC_PREFIXES = [
  '/login',
  '/api/auth/',
  '/api/healthz',
  '/_next/',
  '/favicon',
  '/public/',
];

const ADMIN_PREFIXES = ['/admin', '/api/admin'];

export function middleware(req) {
  const { pathname } = req.nextUrl;
  const role = req.cookies.get(COOKIE)?.value || null;

  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (ADMIN_PREFIXES.some(p => pathname.startsWith(p))) {
    if (role !== 'admin') {
      if (pathname.startsWith('/api/')) {
        return new NextResponse(JSON.stringify({ error: 'admin role required' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/files/')) {
    if (role !== 'admin' && role !== 'viewer') {
      return new NextResponse(JSON.stringify({ error: 'login required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return NextResponse.next();
  }

  if (!role) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
