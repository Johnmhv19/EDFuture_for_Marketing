// Signed-cookie helpers for the role cookie (pp_role).
//
// The cookie value is `role.signature` where `signature` is
// base64url(HMAC-SHA256(COOKIE_SECRET, role)). Both the Edge
// middleware and the Node-side `getRole()` use `verifyRole()`
// to ensure the cookie is genuine before trusting the role.
//
// We use the Web Crypto API (crypto.subtle) because it works in
// both the Edge runtime (middleware) and the Node runtime
// (route handlers, server components). The HMAC `verify`
// operation is specified to be constant-time, so this also
// covers the timing-attack concern: the signature never has to
// be compared via a regular `===` against a known value.
//
// IMPORTANT: This module must stay Edge-safe. Do NOT import any
// Node-only modules (fs, path, node:crypto) here — the middleware
// pulls this in.

const ROLE_ADMIN = 'admin';
const ROLE_VIEWER = 'viewer';

const COOKIE_SECRET = process.env.COOKIE_SECRET || '';

// Lazily import the HMAC key. `importKey` is async; we cache the
// promise so we only do the import once per process.
let _keyPromise = null;
function getKey() {
  if (!_keyPromise) {
    if (!COOKIE_SECRET) {
      throw new Error(
        'COOKIE_SECRET is not set. Generate one with `openssl rand -hex 32` ' +
        'and set it in your .env (or process environment).'
      );
    }
    const enc = new TextEncoder();
    _keyPromise = crypto.subtle.importKey(
      'raw',
      enc.encode(COOKIE_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify'],
    );
  }
  return _keyPromise;
}

function toBase64Url(bytes) {
  // Buffer is available in Node; in the Edge runtime it's also
  // available in Next.js 14's middleware polyfill.
  return Buffer.from(bytes).toString('base64url');
}

function fromBase64Url(s) {
  return new Uint8Array(Buffer.from(s, 'base64url'));
}

// Build the cookie value for a role. Returns `role.signature`.
export async function signRole(role) {
  if (role !== ROLE_ADMIN && role !== ROLE_VIEWER) {
    throw new Error('signRole: invalid role');
  }
  const key = await getKey();
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(role));
  return role + '.' + toBase64Url(sig);
}

// Verify a cookie value. Returns the role string on success,
// or null on any failure (malformed, tampered, wrong role,
// missing signature, etc.). Never throws.
export async function verifyRole(value) {
  if (typeof value !== 'string' || value.length === 0) return null;
  const dot = value.indexOf('.');
  if (dot <= 0 || dot === value.length - 1) return null;
  const role = value.slice(0, dot);
  const sigStr = value.slice(dot + 1);
  if (role !== ROLE_ADMIN && role !== ROLE_VIEWER) return null;
  let sigBytes;
  try {
    sigBytes = fromBase64Url(sigStr);
  } catch {
    return null;
  }
  if (sigBytes.length === 0) return null;
  let ok = false;
  try {
    const key = await getKey();
    const enc = new TextEncoder();
    ok = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(role));
  } catch {
    return false;
  }
  return ok ? role : null;
}
