// Auth middleware. Runs on Next.js Edge runtime — must not import
// any Node-only modules (fs, path, etc.) at the top level. We can
// use crypto.subtle (Web Crypto) which is available in both Edge
// and Node runtimes.
//
// Logic:
//   - Public routes (/login, /api/auth/*, /api/healthz, /_next/*) pass
//     through.
//   - Admin routes (/admin/*, /api/admin/*) require a verified 'admin' cookie.
//   - Auth-gated read endpoints (/api/files/*) require a verified
//     'admin' or 'viewer' cookie.
//   - Everything else (home, programme detail) requires any verified
//     role cookie.
//
// Cookie verification: the cookie value is `role.signature` and is
// checked against HMAC-SHA256(COOKIE_SECRET, role) before being
// trusted. A literal "admin" cookie is rejected — see
// src/lib/signedCookie.js and AUDIT-REPORT.md C-1.
//
// Sub-path deployment: when the app is served under a sub-directory
// (e.g. /Marketing/api/healthz), Next.js has ALREADY removed the
// basePath from req.nextUrl.pathname by the time middleware runs (it
// lives on req.nextUrl.basePath instead), and re-applies it when a
// cloned nextUrl is passed to NextResponse.redirect(). So the route
// prefixes below are always matched against root-relative paths.
// stripBase() is a belt-and-braces no-op for that normal case; it only
// does anything if a future Next version stops normalising the path.
// BASE_PATH is a build-time env var (must match next.config.mjs's
// basePath setting).

import { NextResponse } from 'next/server';
import { verifyRole } from '@/lib/signedCookie';

const COOKIE = process.env.ROLE_COOKIE_NAME || 'pp_role';
const BASE_PATH = process.env.BASE_PATH || '';

const PUBLIC_PREFIXES = [
  '/login',
  '/api/auth/',
  '/api/healthz',
  '/_next/',
  '/favicon',
  '/public/',
];

const ADMIN_PREFIXES = ['/admin', '/api/admin'];

// Strip the basePath from the start of a pathname. Returns the
// basePath-stripped path, or the original if it doesn't start with
// the basePath (which is the normal case — see the note above).
function stripBase(pathname) {
  if (BASE_PATH && pathname.startsWith(BASE_PATH)) {
    const stripped = pathname.slice(BASE_PATH.length);
    return stripped.startsWith('/') ? stripped : '/' + stripped;
  }
  return pathname;
}

export async function middleware(req) {
  const pathname = stripBase(req.nextUrl.pathname);
  const raw = req.cookies.get(COOKIE)?.value;
  // verifyRole returns the role string on a valid signature, or
  // null on any failure (missing, malformed, tampered). The HMAC
  // verify is constant-time per the Web Crypto spec, so no extra
  // timingSafeEqual is needed.
  const role = await verifyRole(raw);

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
      // Redirect to /login. The `next` param is the basePath-stripped
      // path; the login form's router.push will re-apply the basePath.
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
