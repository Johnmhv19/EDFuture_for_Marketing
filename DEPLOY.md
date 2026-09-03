# DEPLOY.md

> Deployment guide for the program-platform (YCYW Programmes for Marketing).
> Audience: IT operations.

## What you're deploying

- A **Next.js 14** Node.js application
- A **SQLite** database file (one file on disk)
- A directory of **uploaded files** (videos, photos, articles, resources)
- Two **bearer tokens** (admin + viewer) in environment variables

The app is stateless — the only state is on disk: the SQLite file and the uploads directory. Both are configurable via env vars and **must live outside the build output directory** to survive redeploys.

> **Sub-path deployment** (e.g. served as `https://edfutures.ycyw.com/Marketing/`)
> is supported via the `BASE_PATH` and `NEXT_PUBLIC_BASE_PATH` env vars — see
> [§ Sub-path deployment](#sub-path-deployment) below. If you're serving at
> the domain root (`https://programmes.ycyw.edu/`), skip that section.

## Prerequisites

| | Version |
|---|---|
| Node.js | **20.x or 22.x LTS** (anything ≥ 18.18 works) |
| npm | ≥ 10 |
| OS | Linux (Ubuntu 22.04 LTS recommended) or macOS |
| Disk | 1 GB minimum + 5–50 GB for uploads (depends on video size) |
| Memory | 512 MB minimum, 1 GB recommended |
| Network | Outbound HTTPS to `registry.npmjs.org` (build) and to `api.notion.com` (only if running the Notion seed) |

No Docker, no Nginx, no Redis, no external DB. The whole stack is one Node process + two directories.

## Architecture

```
┌──────────────────┐
│ Reverse proxy    │  (optional, e.g. Nginx for TLS — see §SSL below)
│  :443            │
└────────┬─────────┘
         │
┌────────▼─────────┐
│ Node.js process  │  `node node_modules/.bin/next start -p 3000`
│  :3000           │
│  (Next.js 14)    │
└────────┬─────────┘
         │
   ┌─────┴──────┐
   ▼            ▼
┌───────┐  ┌──────────┐
│*.db   │  │uploads/  │  (both on local disk, both configurable)
│SQLite │  │videos,   │
│       │  │photos,   │
└───────┘  └──────────┘
```

## Files & directories you need to provision

| Path (suggested) | What | Permissions | Notes |
|---|---|---|---|
| `/opt/ycyw-program-platform/` | App source + `node_modules/` + `.next/` | read+execute for the app user | Rebuild on update; this is ephemeral |
| `/var/data/ycyw-program-platform/db.sqlite` | SQLite file | read+write for the app user | Persistent; back this up |
| `/var/data/ycyw-program-platform/uploads/` | Uploaded files | read+write for the app user | Persistent; back this up |
| `/etc/ycyw-program-platform/.env` | Environment file | read-only for the app user | Generated once, rotated manually |

> **DO NOT** put the DB or uploads inside `/opt/ycyw-program-platform/.next/` — that's the Next.js build cache, gets wiped on every deploy.

## First-time setup

```bash
# 1. Create the app user (no shell, no home dir)
sudo useradd --system --shell /usr/sbin/nologin --home-dir /opt/ycyw-program-platform ycyw-app

# 2. Create persistent data dirs
sudo mkdir -p /var/data/ycyw-program-platform
sudo chown -R ycyw-app:ycyw-app /var/data/ycyw-program-platform
sudo chmod 750 /var/data/ycyw-program-platform

# 3. Unpack the source (or clone the repo)
sudo mkdir -p /opt/ycyw-program-platform
sudo chown ycyw-app:ycyw-app /opt/ycyw-program-platform
# As the app user, or via sudo -u ycyw-app:
sudo -u ycyw-app bash <<'EOF'
cd /opt/ycyw-program-platform
git clone <repo-url> .   # or: tar -xzf ../ycyw-program-platform.tar.gz
npm ci                   # production install
EOF

# 4. Create the .env
sudo tee /etc/ycyw-program-platform/.env > /dev/null <<'EOF'
APP_BASE_URL=https://programmes.ycyw.edu
PORT=3000
DATABASE_URL="file:/var/data/ycyw-program-platform/db.sqlite"
UPLOAD_DIR="/var/data/ycyw-program-platform/uploads"
MAX_UPLOAD_MB=500

# Generate these with: openssl rand -hex 32
ADMIN_TOKEN="<paste-admin-token>"
VIEW_TOKEN="<paste-view-token>"

ROLE_COOKIE_NAME=pp_role
EOF
sudo chmod 640 /etc/ycyw-program-platform/.env
sudo chown root:ycyw-app /etc/ycyw-program-platform/.env

# 5. Run migrations (idempotent)
sudo -u ycyw-app bash -c 'set -a; source /etc/ycyw-program-platform/.env; set +a; npm run db:migrate'

# 6. (Optional) seed from Notion
sudo -u ycyw-app bash -c 'set -a; source /etc/ycyw-program-platform/.env; set +a; \
  NOTION_TOKEN=<paste-notion-token> npm run db:seed:notion'
# OR seed the small starter set:
sudo -u ycyw-app bash -c 'set -a; source /etc/ycyw-program-platform/.env; set +a; npm run db:seed'

# 7. Build
sudo -u ycyw-app bash -c 'cd /opt/ycyw-program-platform; npm run build'

# 8. Start
sudo -u ycyw-app bash -c 'cd /opt/ycyw-program-platform; \
  set -a; source /etc/ycyw-program-platform/.env; set +a; \
  npm start &'
```

## systemd unit (recommended)

Create `/etc/systemd/system/ycyw-program-platform.service`:

```ini
[Unit]
Description=YCYW Programmes Platform
After=network.target

[Service]
Type=simple
User=ycyw-app
Group=ycyw-app
WorkingDirectory=/opt/ycyw-program-platform
EnvironmentFile=/etc/ycyw-program-platform/.env
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start -p 3000
Restart=on-failure
RestartSec=5
# Hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/data/ycyw-program-platform
PrivateTmp=true
NoNewPrivileges=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictAddressFamilies=AF_INET AF_INET6
RestrictNamespaces=true
RestrictRealtime=true
SystemCallArchitectures=native

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ycyw-program-platform
sudo systemctl status ycyw-program-platform
```

## Health check

The app exposes `GET /api/healthz`. It returns:

- `200 {"ok":true,"ts":"..."}` when the DB is reachable
- `503 {"ok":false,"error":"database_unreachable"}` otherwise

Suggested uptime check:

```bash
curl -fsS https://programmes.ycyw.edu/api/healthz
```

Or via systemd watchdog: `WatchdogSec=30` + `Type=notify` in the unit (requires app-level support — not currently implemented, see §Future below).

## SSL / reverse proxy

This guide ships the app over plain HTTP on port 3000. Put it behind Nginx or Caddy for TLS:

**Nginx** (minimal example):
```nginx
server {
  listen 443 ssl http2;
  server_name programmes.ycyw.edu;
  ssl_certificate /etc/letsencrypt/live/programmes.ycyw.edu/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/programmes.ycyw.edu/privkey.pem;

  client_max_body_size 600M;  # allow up to MAX_UPLOAD_MB + headroom

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 120s;
  }
}
```

## Updating

The deploy is idempotent — re-run the same steps. Order of operations:

```bash
# 1. Pull new code
cd /opt/ycyw-program-platform
sudo -u ycyw-app git pull
# (or copy new tarball)

# 2. Apply any new migrations
sudo -u ycyw-app bash -c 'set -a; source /etc/ycyw-program-platform/.env; set +a; npm run db:migrate'

# 3. Rebuild
sudo -u ycyw-app npm run build

# 4. Restart
sudo systemctl restart ycyw-program-platform
```

**No data is touched** during an update — the DB and uploads are in `/var/data/` and survive every redeploy.

## Backup strategy

Two things to back up, on separate schedules:

| What | Where | Cadence | How |
|---|---|---|---|
| Database | `/var/data/ycyw-program-platform/db.sqlite` | Hourly | `sqlite3 db.sqlite ".backup '/var/backups/db-$(date +%H).sqlite'"` |
| Uploads | `/var/data/ycyw-program-platform/uploads/` | Daily | `rsync -a` to off-site storage |

SQLite's `.backup` command is safe to run while the app is serving (uses SQLite's online backup API). Don't just `cp db.sqlite` while the app is running — you can get a partial write.

## Rotating tokens

To rotate `ADMIN_TOKEN` or `VIEW_TOKEN`:

1. Generate new: `openssl rand -hex 32`
2. Edit `/etc/ycyw-program-platform/.env`
3. `sudo systemctl restart ycyw-program-platform`
4. Existing user sessions are invalidated (cookies tied to the old token via the role check)

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| 503 on `/api/healthz` | DB file path wrong, or write perms missing | Check `DATABASE_URL`; `ls -la /var/data/ycyw-program-platform/` |
| Uploads return 500 | `UPLOAD_DIR` not writable | `chown -R ycyw-app:ycyw-app /var/data/ycyw-program-platform` |
| Login fails with "Invalid token" | Token mismatch (likely trailing whitespace) | `cat -A /etc/ycyw-program-platform/.env` to check |
| Token rotation didn't take effect | Forgot to restart | `sudo systemctl restart ycyw-program-platform` |
| Cannot write uploads (max 500 MB) | `MAX_UPLOAD_MB` too low | Bump in `.env`, restart |
| Build fails with "out of memory" | Less than 1.5 GB free RAM | Add swap, or build on a separate machine and copy `.next/` |

## Environment variables (full reference)

| Var | Required | Default | Description |
|---|---|---|---|
| `APP_BASE_URL` | no | `http://localhost:3000` | Public origin (used in metadata) |
| `PORT` | no | `3000` | Port to listen on |
| `DATABASE_URL` | no | `file:./data/dev.db` | SQLite file path. **Outside the build dir.** |
| `UPLOAD_DIR` | no | `./data/uploads` | Where uploaded files go. **Outside the build dir.** |
| `MAX_UPLOAD_MB` | no | `500` | Per-file upload size limit |
| `ADMIN_TOKEN` | **yes** | — | Bearer token for admin login |
| `VIEW_TOKEN` | **yes** | — | Bearer token for marketing viewer login |
| `ROLE_COOKIE_NAME` | no | `pp_role` | Cookie name (only change if collision) |
| `BASE_PATH` | only for sub-path deploy | `""` (root) | Sub-directory path prefix. Build-time only. See [§ Sub-path deployment](#sub-path-deployment). |
| `NEXT_PUBLIC_BASE_PATH` | only for sub-path deploy | `""` (root) | Must be the SAME value as `BASE_PATH`. Inlined at build time. |
| `NOTION_TOKEN` | only for seed | — | One-off Notion integration token for the seed script |

## Sub-path deployment

If the app is served under a sub-directory of another site (e.g.
`https://edfutures.ycyw.com/Marketing/`), the app must know its sub-path
at **build time** so all generated URLs include the prefix.

### What you set

Add to `/etc/ycyw-program-platform/.env`:

```bash
BASE_PATH=/Marketing
NEXT_PUBLIC_BASE_PATH=/Marketing
```

Rules:
- Must start with `/` (e.g. `/Marketing`, not `Marketing`)
- Must NOT end with `/`
- Both vars must be set to the same value

### What changes

When the app is rebuilt with these vars:

| Resource | URL |
|---|---|
| Home | `https://edfutures.ycyw.com/Marketing/` |
| Login | `https://edfutures.ycyw.com/Marketing/login` |
| Health check | `https://edfutures.ycyw.com/Marketing/api/healthz` |
| Static assets | `https://edfutures.ycyw.com/Marketing/_next/static/...` |
| Self-hosted Caveat font | `https://edfutures.ycyw.com/Marketing/_next/static/media/...woff2` |
| API | `https://edfutures.ycyw.com/Marketing/api/...` |
| Programme detail | `https://edfutures.ycyw.com/Marketing/programmes/<id>` |

How each kind of URL gets the prefix:

- **Handled by Next.js itself** — `<Link>`, `router.push()`, server-side
  `redirect()`, `NextResponse.redirect()` in the middleware, `_next/*`
  assets, and the `next/font/local` face. Nothing to do.
- **Handled by `withBase()`** (`src/lib/basePath.js`, reads
  `NEXT_PUBLIC_BASE_PATH`) — everything where the app builds a URL string
  by hand: every client-side `fetch('/api/...')`, plain `<a href>`, and
  `<img src>`.

> **When adding code:** `basePath` does **not** rewrite `fetch()`. A bare
> `fetch('/api/...')` in a client component works at the root but 404s
> under a sub-path. Always wrap it: `fetch(withBase('/api/...'))`.

### What the reverse proxy must do

The upstream proxy (whatever serves `edfutures.ycyw.com`) must:
1. Route requests for `/Marketing/*` to this Node.js app on port 3000
2. NOT strip the `/Marketing` prefix when forwarding — the app expects
   to see `/Marketing/...` in `req.url`
3. Pass through the original `Host:` header (the app uses it for redirects)

Example Nginx `location` block (if the upstream is Nginx):

```nginx
location /Marketing/ {
    proxy_pass http://127.0.0.1:3000;   # NO trailing slash — preserves /Marketing
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;
    # WebSocket not needed; large uploads do (see below)
    client_max_body_size 520M;           # a little over MAX_UPLOAD_MB
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
}
```

### Verification after deploy

```bash
# Health check (must include the sub-path)
curl -fsS https://edfutures.ycyw.com/Marketing/api/healthz
# -> {"ok":true,"ts":"..."}

# Login page (must include the sub-path)
curl -fsS -o /dev/null -w "%{http_code}\n" https://edfutures.ycyw.com/Marketing/login
# -> 200

# Asset paths in the served HTML must start with /Marketing/_next/
curl -fsS https://edfutures.ycyw.com/Marketing/login | grep -oE 'href="/Marketing/_next[^"]*"' | head -1

# The login POST must land on the sub-path, not the domain root
curl -fsS -o /dev/null -w "%{http_code}\n" -X POST \
  -H 'Content-Type: application/json' \
  -d '{"token":"<VIEW_TOKEN>","role":"viewer"}' \
  https://edfutures.ycyw.com/Marketing/api/auth/login
# -> 200
```

The curl checks above only prove the server side. **Also open the site in a
browser and actually sign in** — the login button, uploads, and deletes all
go through client-side `fetch()`, which curl never exercises. If the network
tab shows a request to `/api/...` without the `/Marketing` prefix, that call
site is missing its `withBase()` wrapper.

If the asset URLs don't include `/Marketing/`, the build wasn't done
with `BASE_PATH` set — re-run the build with the env vars in place.

## Known framework vulnerabilities (`next@14.2.18+`)

A `npm audit` on the current dependency tree (Next.js 14.2.x) reports
**20 advisories in `next` and 4 in the bundled `postcss`** (all flagged
"high" by npm, all in the `next 9.3.4-canary.0 – 16.3.0-preview.10`
range). The only patched version npm offers is **`next@16.3.4`**, which
is a breaking change. We have decided to **defer the upgrade** until
after the initial presentation to allow the deployment to proceed.

This section is the explicit acknowledgement of that decision, with the
per-CVE reasoning. If your security review disagrees, the upgrade path
is at the bottom.

### CVEs that **apply** to this deployment

| CVE / Advisory | What it is | Our exposure | Mitigation in place |
|---|---|---|---|
| **GHSA-ggv3-7p47-pfv8** — DoS via Server Components | An attacker can send a request that triggers expensive deserialization in RSC | Server is exposed via the marketing page and admin panel | Rate limiting missing (L-1 from audit); the attack is DoS-class (server slows/crashes), not data breach. Auth required for any RSC path that touches user data. **Risk: medium — outage-class, not data-class.** |
| **GHSA-q4gf-8mx6-v5v3** / **GHSA-8h8q-6873-q5fj** — DoS with Server Components | Similar — RSC payload shapes that cause high CPU/memory | Same as above | Same as above. **Risk: medium.** |
| **GHSA-3g8h-86w9-wvmq** — Middleware redirects cache-poisoned | A misconfigured intermediate cache can serve the wrong user's auth redirect | We use `NextResponse.redirect()` from middleware | All redirects go to the same `/login` path. The `next` query param is basePath-stripped server-side (we do not trust user-supplied `next`). An attacker who could poison a redirect would land a victim on `/login?next=...`, which the open-redirect fix (M-1) already validates. **Risk: low — already mitigated by the M-1 fix.** |
| **GHSA-vfv6-92ff-j949** / **GHSA-wfc6-r584-vfw7** — Cache poisoning via RSC responses | A shared cache can return one user's RSC payload to another | We use RSC; the app is single-tenant behind Nginx (no shared cache by default) | Nginx config in this doc does not enable shared caching. **Risk: low unless IT adds a shared cache layer.** |
| **GHSA-68g3-v927-f742** / **GHSA-4633-3j49-mh5q** — Cache confusion of response bodies | Similar cache confusion, including via invalid UTF-8 | We do `fetch('/api/auth/login', …)` in the LoginForm (same-origin, no cache directives) | Same — no shared cache in the documented Nginx config. **Risk: low.** |

### CVEs that **do not apply**

These advisories are listed for completeness. They affect features the
app does not use.

| Feature the CVE is about | Do we use it? |
|---|---|
| `next/image` (Image Optimizer, disk cache, remotePatterns) | **No** — we use plain `<img>` with `/api/files/...` |
| Rewrites (HTTP smuggling, SSRF in rewrites) | **No** — no `rewrites()` in `next.config.mjs` |
| i18n / locale routing (Middleware bypass) | **No** — no `i18n` config |
| Server Actions (DoS, SSRF, unbounded payload) | **No** — we use API route handlers under `src/app/api/...` |
| WebSocket upgrades (SSRF) | **No** |
| CSP nonces (XSS) | **No** — we set a static CSP in `headers()` |
| `beforeInteractive` scripts (XSS) | **No** — no `<Script strategy="beforeInteractive">` |
| Server Functions (unauthenticated disclosure) | **No** |
| PostCSS sourceMappingURL (file read, path traversal) | **No** — user-supplied data is never fed into PostCSS |

### PostCSS transitive (`node_modules/next/node_modules/postcss`)

The postcss advisories (XSS via unescaped `</style>`, file read via
`sourceMappingURL`) apply to PostCSS when it processes **untrusted
CSS input**. Our build pipeline processes only Tailwind's output
and the static `globals.css` — no user input reaches PostCSS. **Risk:
negligible.**

### Why we are not upgrading immediately

- The deployment is for an internal marketing tool behind a corporate
  firewall, not a public SaaS.
- The CVEs that *do* apply are DoS-class and cache-poisoning-class. DoS
  is an availability issue (annoying, not catastrophic). Cache poisoning
  requires a shared cache that we are not deploying.
- The `next@16.3.4` upgrade touches: middleware internals, the
  `next/font/local` loader, CSP defaults, and the React 19 runtime. The
  migration would re-test all 9 security fixes from the audit and the
  sub-path deployment. Estimated 2–3 hours of focused work.
- We want the initial presentation to go ahead with the 9 application
  fixes in place; framework upgrade is queued as a follow-up.

### When to revisit

- **After the initial presentation** — schedule the `next@16` upgrade
  as a separate piece of work.
- **If any of the "applies" CVEs are upgraded to "actively exploited in
  the wild"** — escalate immediately.
- **If the deployment gains a shared cache layer (e.g. CDN in front of
  the app)** — re-evaluate the cache-poisoning advisories.

### Upgrade path (when ready)

```bash
# In a worktree
git worktree add ../pp-next16 -b chore/next-16-upgrade
cd ../pp-next16
npm install next@16.3.4
# Read https://nextjs.org/docs/app/building-your-application/upgrading/version-16
# Fix any build errors
npm run build && npm run dev
# Re-run the audit repros (see AUDIT-REPORT.md) — every fix must still hold.
# Re-test sub-path deployment (BASE_PATH=/Marketing)
# Commit, push, merge, deploy
```

The 9 security fixes from `AUDIT-REPORT.md` were implemented with
minimal Next.js API surface (`NextResponse`, `NextRequest`, `cookies()`,
`crypto.subtle` for the Edge runtime, plain `crypto` for Node). They
should survive the upgrade unchanged, but must be re-tested.

---

## Future (not implemented yet)

- Docker image + compose for one-command deploy
- systemd `Type=notify` with app-side watchdog
- File-by-file backup with restic/B2
- S3-compatible object storage as an alternative to local disk (would require a small refactor in `src/lib/upload.js`)
- A second auth tier (Microsoft 365 SSO) for the marketing team
