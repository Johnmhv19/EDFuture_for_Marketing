---
project: YCYW Programmes Platform
slug: edfuture-for-marketing
repo: Johnmhv19/EDFuture_for_Marketing
sandbox_path: /workspace/program-platform/
user_path: ~/EDFuture_for_Marketing/
---

# YCYW Programmes Platform — Project Status

> Daily project log. **Read at the start of every session** to refresh
> context, then update with what we did today before the session ends.
> The YAML frontmatter above is the canonical identifier — always check
> `project:` matches before treating this file as context.

_Last updated: 2026-09-03 (morning)

---

**Status: handoff to IT imminent.** All requested features built and tested. User confirmed external link/folder support works on their Mac. IT has confirmed SQLite is acceptable. IT collaborator invitation sent, pending their accept. **New today: sub-path deployment support** (for serving at `https://edfutures.ycyw.com/Marketing/`). Tested both modes locally. Next step: hand `DEPLOY.md` to IT once collaborator accepts.

## At a glance

| | |
|---|---|
| **Repo** | https://github.com/Johnmhv19/EDFuture_for_Marketing |
| **Local path** (user) | `~/EDFuture_for_Marketing/` (M3 Mac) |
| **Local path** (sandbox) | `/workspace/program-platform/` |
| **Stack** | Next.js 14 + Prisma 5 + SQLite + Tailwind + self-hosted Caveat font |
| **Auth** | Two-tier bearer tokens (admin + viewer) → httpOnly cookie `pp_role` |
| **Source data** | Notion "Seeds of the Future programmes for Marketing" — 31 programmes (database `052db8b1-c3d4-42b3-bb37-fe3120adea4d`) |
| **Docs** | `README.md` (local dev) · `DEPLOY.md` (IT deployment) · `STATUS.md` (this file) |
| **Health check** | `GET /api/healthz` → 200/503 |

---

## Current state

| | |
|---|---|
| **DB** | 33 programmes · **0 files** uploaded (1 test link tried and cleaned up) |
| **Latest commit** | 2026-08-31 — "Support external links and folders" |
| **External LINK/FOLDER type** | ✅ Built, migration applied, API + UI working — user confirmed on their Mac |
| **GitHub collaborator added?** | ⏳ Invite sent to `shouli.pu@ycyw.cn` on 2026-09-01, pending their accept |
| **Production deployed?** | ❌ IT hasn't deployed yet |
| **Demo (2026-08-28)** | ❓ Still unknown — user never reported back |
| **Git auth on user's Mac** | ❌ VPN blocks HTTPS git; user uses `curl` to fetch files from GitHub instead |

---

## Where we left off (2026-08-31)

### Built & shipped
- **Admin section restructured** — 3 colour-coded quick-action cards on the dashboard (Add / Edit / Delete), dedicated `/admin/programmes/new` page, inline delete buttons per row in the list
- **External link & folder support** — each ProgrammeFile now has a `type` of `UPLOAD` | `LINK` | `FOLDER`. Admins can paste a YouTube/Bilibili/TEAMS URL or a Google Drive folder URL instead of uploading. The public `/api/files/[id]` endpoint 302-redirects to the external URL for links/folders
- **Login flow** — admins are now sent to `/admin` after login (not `/`); the home page shows an "Open admin panel →" bar at the top for signed-in admins
- **Admin nav** — three colour-coded action links (+ Add / Edit / Delete) right in the top bar
- **STATUS.md created and committed** — daily log that gets read at session start, updated at session end

### Design decisions (locked in)
- File types: UPLOAD (existing) / LINK (external URL) / FOLDER (external URL to a folder). Category is orthogonal — a FOLDER can be a "PHOTO" (folder of photos)
- Migration: 20260831033751_add_file_type_and_url. Existing rows default to UPLOAD with their original storageKey
- Login redirect: admin → /admin, viewer → wherever the ?next= param points (default /)

---

## Open tasks (check off as we go)

### User action items
- [x] Add IT collaborator `shouli.pu@ycyw.cn` to the GitHub repo (invite sent 2026-09-01, **awaiting their accept**)
- [ ] (Optional) Revoke the fine-grained PAT used for the initial push — `https://github.com/settings/tokens`
- [ ] Fix git auth on the Mac (so `git pull` works) — VPN blocks HTTPS git; options are GitHub CLI auth or an SSH key
- [ ] Upload real programme files (covers, videos, photos, articles) via the admin UI
- [ ] Add a few real **external links/folders** via the new LINK/FOLDER type (e.g. paste a YouTube recap URL on the first programme, try it out)
- [ ] (Optional) Cleanup: remove the two `localhost:3000` / `3000` defaults in `src/lib/config.js` for full IT cleanliness

### IT action items (hand them `DEPLOY.md`)
- [ ] Provision `/opt/ycyw-program-platform/` (app) + `/var/data/ycyw-program-platform/` (DB + uploads)
- [ ] Generate real ADMIN_TOKEN + VIEW_TOKEN with `openssl rand -hex 32`
- [ ] Set up systemd service + Nginx reverse proxy + TLS
- [ ] Schedule DB backups (hourly `sqlite3 .backup`, daily uploads rsync)
- [ ] Confirm `/api/healthz` returns 200 from outside the box

### Pending questions for the user
- [ ] Did the **Friday 2026-08-28 demo** happen? If so, what was the feedback?
- [ ] Want to keep the 2 starter programmes ("Example Programme A", "Example Programme B") or delete them?
- [ ] When is IT planning to deploy? (so I can be ready to help troubleshoot)

---

## Tech reference

### Database models
- `Programme` — id, name (unique), level, pathway, yearLevel, partners, venue, dates, status, description, sortOrder
- `ProgrammeFile` — id, programmeId, **category** (VIDEO | PHOTO | ARTICLE | RESOURCE | COVER_IMAGE), **type** (UPLOAD | LINK | FOLDER), status (ACTIVE | ARCHIVED), displayName, originalName (nullable), storageKey (nullable, unique), url (nullable), mimeType (nullable), sizeBytes (nullable), caption, uploadedAt

### String enums (validated at app layer — see `src/lib/labels.js`)
- **Level**: `L1 | L2 | L3 | L2_AND_L3 | WHOLE_SCHOOL`
- **Pathway**: `WHOLE_SCHOOL | ROBOTICS_ENGINEERING | BUSINESS_LAW | CREATIVE_EXPERIENCE | HEALTH_MEDICINE | SCIENCE_RESEARCH | COMPUTER_SCIENCE_DATA_SCIENCE`
- **FileCategory**: `VIDEO | PHOTO | ARTICLE | RESOURCE | COVER_IMAGE`
- **FileType**: `UPLOAD | LINK | FOLDER` (new in 2026-08-31)
- **FileStatus**: `ACTIVE | ARCHIVED`
- **Status**: free-text (commonly `Confirmed | Planned | TBD | In development`)

### npm scripts
- `dev` — `next dev -p 3000`
- `build` / `start` — production
- `db:migrate:dev` — create DB + apply migrations
- `db:migrate` — apply migrations in production (no prompts)
- `db:seed` — 2 starter programmes
- `db:seed:notion-data` — 31 real programmes from hardcoded dump (no token needed)

---

## Daily log

### 2026-08-28 — build + design iteration
- **AM**: Built full platform from scratch — Next.js scaffolding, Prisma schema, auth, admin section, API routes, all pages
- **PM**: Pushed to GitHub, user cloned to Mac, hit SWC binary bug on M3, fixed by `rm -rf node_modules package-lock.json && npm install`
- **PM**: Loaded 31 real programmes from Notion via hardcoded seed dump (no token needed on user's side)
- **PM** (design iteration): level cards → from pills to cards → from coloured to chalkboard (single dark color) → hero also chalkboard → full black
- **PM** (search + scroll): added sticky search bar with magnifying-glass icon, custom 1200ms ease-in-out scroll

### 2026-08-29, 2026-08-30
- No activity

### 2026-08-31 — admin restructure + LINK/FOLDER support
- **AM**: User returned, asked for a status log. Created `STATUS.md` and added memory note to read it at start of every session
- **AM**: User's `git pull` is broken (VPN blocks HTTPS git to github.com). Spent ~20 min debugging: tried `gh auth login` (TLS timeout), `gh auth login --with-token`, `git -c http.version=HTTP/1.1 fetch origin` — all fail because the TCP connection to 20.205.243.166:443 hangs in the VPN. Settled on the workaround: use `curl` to fetch individual files from `raw.githubusercontent.com` (which works through the VPN)
- **PM**: User asked for clearer admin sections (Add / Edit / Delete). Restructured:
  - Dashboard with 3 colour-coded quick-action cards
  - Dedicated `/admin/programmes/new` page (replaced the modal)
  - Inline delete button per row in the programme list
  - `?view=delete` mode with a red warning banner
  - Admin nav: colour-coded + Add / Edit / Delete links in the top bar
- **PM**: User asked to be redirected to /admin after admin login (not /), and to have an admin button on the home page. Done — `isAdmin()` server check, conditional admin bar, login redirect by role
- **PM**: User asked for external link/folder support (YouTube, TEAMS, Drive). Built the 3-type file model:
  - Schema migration: added `type` and `url`, made storageKey/originalName/mimeType/sizeBytes nullable
  - API accepts both multipart/form-data (UPLOAD) and application/json (LINK/FOLDER)
  - `/api/files/[id]` 302-redirects to external URL for non-UPLOAD types
  - Admin FilesManager: single form with type dropdown, switches between file picker and URL field
  - Public programme detail: shows "Link ↗" / "Folder ↗" badges for external items
- **PM**: User hit Prisma `originalName: String` error when adding a link — DB was migrated but the Prisma client wasn't regenerated. Fix: `npx prisma migrate deploy && npx prisma generate`. Worked after that. User confirmed the feature works.
- **End of session**: user said "we will continue later". No new requests. Closing out cleanly.

### 2026-09-01 — handoff prep
- **AM**: User returned with a clear goal: publish the website so colleagues can start populating programmes. Two prerequisites to check first: (1) IT collaborator must be added, (2) confirm SQLite is acceptable to IT
- **AM**: User sent the collaborator invite to `shouli.pu@ycyw.cn` — pending accept. Verified via API: user not in collaborators list yet (as expected for a pending invite)
- **AM**: User confirmed IT is OK with SQLite (not MySQL 8.0). No code change needed
- **AM**: Audited the project against IT's published checklist. Findings: ✅ all of the deployment-relevant requirements are met (idempotent migrations, env-configurable paths, .env.example, DEPLOY.md, health check, lockfile, .gitignore, no hardcoded production values). Two minor items flagged for follow-up: (a) `localhost:3000` / `3000` defaults in `src/lib/config.js` (low priority — only used when env vars unset, production overrides them), (b) data paths in `.env.example` are relative defaults — IT must override to absolute persistent paths in production
- **AM**: User asked to confirm that "updating won't affect data". Answer: yes, **as long as IT uses persistent paths** for `DATABASE_URL` and `UPLOAD_DIR` outside the build directory. Documented in `DEPLOY.md`. `git pull && npm install && npm run build && pm2 restart` replaces the app code only, not the data directory
- **Midday**: IT told user the app will be deployed as a sub-directory of `https://edfutures.ycyw.com/`, accessible at `https://edfutures.ycyw.com/Marketing/`. User asked: is the app compatible, or what needs to change?
- **Midday**: Added full sub-path support. Changes:
  - `next.config.mjs`: `basePath: process.env.BASE_PATH || ''` (build-time)
  - `src/lib/basePath.js`: new `withBase()` helper for the few plain `<a>` and `<img>` tags
  - `src/middleware.js`: strips basePath before doing route checks; lets Next.js re-apply the prefix on redirects
  - `src/app/layout.jsx`: switched self-hosted Caveat font from CSS `@font-face` to `next/font/local` (handles basePath correctly; CSS @font-face URLs are NOT auto-rewritten for basePath by Next.js)
  - All hardcoded `fontFamily: "'Caveat', ..."` → `fontFamily: "var(--font-caveat), ..."` so the font variable from next/font works
  - `.env.example`: documented `BASE_PATH` and `NEXT_PUBLIC_BASE_PATH`
  - `DEPLOY.md`: new "Sub-path deployment" section with the env vars, Nginx `location` example, and verification commands
- **Midday**: Tested both modes locally:
  - Default (no basePath): `/api/healthz` → 200, all assets at root
  - Sub-path (`/Marketing`): `/Marketing/api/healthz` → 200, HTML asset paths prefixed with `/Marketing/_next/...`, font URL is `/Marketing/_next/static/media/...woff2`, auth redirects go to `/Marketing/login?next=...` (no double basePath)
- **Status**: sub-path changes done and pushed. Hand-off list:
  1. User: pull the latest from GitHub (`curl -o DEPLOY.md https://raw.githubusercontent.com/.../DEPLOY.md` or `git pull` if auth works)
  2. Wait for `shouli.pu@ycyw.cn` to accept the GitHub invite
  3. Hand `DEPLOY.md` to IT — they'll need to set `BASE_PATH=/Marketing` in `.env` and rebuild before starting the service

### 2026-09-01 (evening) — security audit
- **PM**: User asked: "If I want to test the whole platform for security and error handle, do you do it or assign to the verifier agent?" → recommended a one-shot Verifier subagent for read-only audit (full team plan was overkill since no code was being written yet)
- **PM**: User asked for full platform audit. Spawned `Verifier` with detailed scope (auth, files, API, sub-path, error handling, info disclosure, CSRF/CORS/headers)
- **PM**: Verifier wrote `AUDIT-REPORT.md` (440 lines). Headline: **1 Critical, 4 High, 6 Medium, 6 Low**. Top blockers before deploy: (C-1) unsigned cookie granting admin to anyone who can set it; (H-1) stored XSS via uploaded HTML; (H-2) unhandled 500s + TOCTOU race
- **PM**: User asked for plain-English explanation of the issues and possible solutions before deciding
- **PM**: Spawned `Coder` with refined scope: signed cookie (C-1), MIME allowlist for uploads (H-1), input type-check + try/catch (H-2), constant-time token compare (H-3), `SameSite=Strict` (H-4), `next` param validation in LoginForm (M-1), `isPublic` field on ProgrammeFile (M-2), security headers via `next.config.mjs` (M-3/M-4), BASE_PATH validation (M-6)

### 2026-09-02 — Coder finished, IT accepted, push
- **AM**: Coder finished. All 9 fixes done in single commit `c992713`. Build clean, all audit repros pass. Deviations: (a) H-3 used Web Crypto `crypto.subtle.verify` in Edge runtime (can't use `node:crypto` there); (b) M-4 CSP had to be loosened to `style-src 'self' 'unsafe-inline'` for the chalkboard hero's inline styles; (c) H-1 SVG kept in `image/*` allowlist with explicit denylist entry for visibility
- **AM**: Tried to push, hit "remote contains work you don't have locally" — IT contact `shouli.pu@ycyw.cn` had accepted the GitHub invite and made their own commit `55dc6ae 修复/Marketing 子路径的问题` (also fixing sub-path issues from a different angle)
- **AM**: Resolved 2 conflicts (middleware.js — kept Coder's signed-cookie verify + user's more accurate sub-path comment; FilesManager.jsx — kept both `withBase()` wrapping and `isPublic` form field). Rebased and pushed as `5375a48`
- **AM**: Updated DEPLOY.md with "Sub-path deployment" section (env vars, Nginx example, verification commands)
- **AM**: Status: **IT collaborator accepted ✓** — last open dependency cleared
- **AM**: User asked user to pull, but their VPN blocked HTTPS git. Eventually got `git pull` through after retry. Then `npx prisma migrate deploy` to apply the new `isPublic` migration, `npm install`, added `COOKIE_SECRET=local-dev-cookie-secret-…` to `.env`

### 2026-09-03 — known CVEs + dev-mode CSP fix
- **AM**: `npm audit` reports 2 high-severity vulnerabilities in `next` (20 advisories) and the bundled `postcss` (4 advisories). Only patched version is `next@16.3.4` (breaking change)
- **AM**: User asked for a justification of the 2-3 hour estimate for the upgrade. I broke it down by phase. User chose option 2: stay on `next@14.2.35` and document why each CVE does/doesn't apply. Defer the upgrade to post-presentation
- **AM**: Wrote "Known framework vulnerabilities" section in DEPLOY.md: 5 CVEs that apply (DoS-class + cache-poisoning), 15 that don't (we don't use i18n, rewrites, Server Actions, WebSockets, next/image, CSP nonces, beforeInteractive, Server Functions, or user-controlled CSS). Includes upgrade path, re-evaluation triggers, per-CVE mitigation notes
- **AM**: Committed as `20c1d06`, pushed
- **AM**: User tried to log in after pulling — buttons did nothing. Console showed CSP blocking Next.js dev-mode HMR (`eval()` and inline `<script>`). Production mode wasn't affected
- **AM**: Made CSP environment-aware: in dev, `script-src 'self' 'unsafe-eval' 'unsafe-inline'`; in production, `script-src 'self'` (unchanged from the M-4 audit fix). Committed as `4d91042`, pushed
- **AM**: User pulled, restarted dev server, login works. ✅ **Status**: production-ready, with one known deferral (next@16 upgrade)
- **Open**: favicon 404 (L-5 from audit) — user said "forget about it"
