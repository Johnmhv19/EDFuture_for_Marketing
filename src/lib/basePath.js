// basePath helper — used by client components that build URL strings
// manually (plain <a href="..."> or <img src="...">). The Next.js
// <Link> component handles basePath automatically; this is for the
// handful of places that need to construct a URL string directly.
//
// The same validation as src/lib/config.js is applied here so a
// misconfigured NEXT_PUBLIC_BASE_PATH crashes at build time, not at
// the first render in a production browser. See AUDIT-REPORT.md M-6.

const RAW = process.env.NEXT_PUBLIC_BASE_PATH || '';
if (RAW && !/^\/[a-zA-Z0-9_-]+$/.test(RAW)) {
  throw new Error(
    `Invalid NEXT_PUBLIC_BASE_PATH: ${JSON.stringify(RAW)}. ` +
    `Must start with "/" and contain only URL-safe characters ` +
    `([a-zA-Z0-9_-]).`
  );
}

export const BASE_PATH = RAW;

// Prepend the basePath to a path. Empty path is a no-op.
export function withBase(p) {
  if (!p) return BASE_PATH;
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  return BASE_PATH + (p.startsWith('/') ? p : '/' + p);
}
