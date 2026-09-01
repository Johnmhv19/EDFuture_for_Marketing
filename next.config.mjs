// Validate BASE_PATH at build time. We do this here (and again in
// src/lib/config.js and src/lib/basePath.js) because next.config.mjs
// is evaluated separately from the runtime code paths, and a bad
// value here would either crash the build or pass through into
// generated URLs. The regex matches the runtime validators.
// See AUDIT-REPORT.md M-6.
{
  const bp = process.env.BASE_PATH || '';
  if (bp && !/^\/[a-zA-Z0-9_-]+$/.test(bp)) {
    throw new Error(
      `Invalid BASE_PATH: ${JSON.stringify(bp)}. ` +
      `Must start with "/" and contain only URL-safe characters ` +
      `([a-zA-Z0-9_-]). Example: "/Marketing".`
    );
  }
  const npb = process.env.NEXT_PUBLIC_BASE_PATH || '';
  if (npb && !/^\/[a-zA-Z0-9_-]+$/.test(npb)) {
    throw new Error(
      `Invalid NEXT_PUBLIC_BASE_PATH: ${JSON.stringify(npb)}. ` +
      `Must start with "/" and contain only URL-safe characters ` +
      `([a-zA-Z0-9_-]). Example: "/Marketing".`
    );
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optional deployment under a sub-path (e.g. /Marketing instead of /).
  // Set BASE_PATH=/Marketing in the environment when deploying under a
  // sub-directory. Leave it empty (default) for root deployments.
  // Must match `^/[a-zA-Z0-9_-]+$` (validated at build time above and
  // again at startup in src/lib/config.js) — see AUDIT-REPORT.md M-6.
  basePath: process.env.BASE_PATH || '',

  // Drop the `X-Powered-By: Next.js` header (information disclosure).
  poweredByHeader: false,

  // Upload size is configured in the route handler, but we bump the
  // server body parser limit here as a safety net.
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
  // Avoid trailing slash redirects (cleaner URLs)
  trailingSlash: false,
  // Generate a stable build id per build
  generateBuildId: async () => `build-${Date.now()}`,

  // Security headers (AUDIT-REPORT.md M-3 / M-4).
  // Applied to every route (/:path*) including the file-streaming
  // route. We are deliberately conservative on the CSP because
  // next/font injects inline styles and the layout uses inline
  // style attributes; loosening `style-src` and `script-src` to
  // match this is the trade-off documented in the report.
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';

    // Base headers applied to every response.
    const baseHeaders = [
      // Block content-type sniffing. Pair with Content-Disposition:
      // attachment on the file route for the full XSS mitigation
      // (AUDIT-REPORT.md H-1 / M-3).
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      // Block framing — clickjacking protection on the login form.
      { key: 'X-Frame-Options', value: 'DENY' },
      // Don't leak the full path of internal pages to external
      // destinations.
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      // Lock down sensors/mic/camera by default; this app uses
      // none of them.
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      // Conservative CSP. Loosened from a strict default because
      // the app relies on inline `style` attributes (Tailwind
      // utilities + the chalkboard hero uses inline styles) and
      // next/font injects a CSS variable in a <style> tag. So:
      //   - default-src 'self'      → only same-origin resources
      //   - script-src 'self'       → no inline JS, no eval
      //   - style-src 'self' 'unsafe-inline' → allow inline styles
      //   - img-src 'self' data:    → allow data: URLs (logo etc.)
      //   - font-src 'self' data:   → allow next/font's data: woff2
      //   - frame-ancestors 'none'  → redundant with X-Frame-Options
      //                              but RFC-compliant
      //   - base-uri 'self'         → block <base> hijacking
      //   - form-action 'self'      → block form submissions to
      //                              attacker-controlled endpoints
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data:",
          "font-src 'self' data:",
          "connect-src 'self'",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; '),
      },
    ];

    // HSTS only in production. It is meaningless over plain HTTP
    // and a missing `Strict-Transport-Security` in development is
    // correct.
    if (isProd) {
      baseHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
      });
    }

    return [
      {
        source: '/:path*',
        headers: baseHeaders,
      },
    ];
  },
};

export default nextConfig;
