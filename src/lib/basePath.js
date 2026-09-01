// basePath helper — used by client components that build URL strings
// manually (plain <a href="..."> or <img src="...">). The Next.js
// <Link> component handles basePath automatically; this is for the
// handful of places that need to construct a URL string directly.

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

// Prepend the basePath to a path. Empty path is a no-op.
export function withBase(p) {
  if (!p) return BASE_PATH;
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  return BASE_PATH + (p.startsWith('/') ? p : '/' + p);
}
