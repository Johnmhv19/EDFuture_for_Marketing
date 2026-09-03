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

_Last updated: 2026-09-03 (late evening)_

---

**Status: handoff to IT imminent.** All requested features built and tested. IT collaborator accepted, made their own commit (Chinese-language sub-path fix). User confirmed sub-path + viewer features + structured event dates all working on their Mac after running `npx prisma generate` + `npx prisma migrate deploy`. **New since afternoon: (1) replaced free-text `dates` text field with the structured startDate/endDate picker everywhere (admin forms, public programme cards, admin list, detail sidebar — all use the new field, "TBD" when both null); (2) home page "Coming up" / "Recent past" collapsed into a single toggleable card; (3) fixed "Recent past" filter to require endDate to have *actually* passed (was treating the whole current month as "past" — broke for end dates later in the current month); (4) pathway quick-jump cards now use each pathway's brand colour (was a hard-coded blackboard); (5) hero + level cards switched from chalkboard to whiteboard.** All 9 audit fixes preserved; build clean. Next step: IT deploy.

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

### 2026-09-03 (afternoon) — three viewer-facing features
- **PM**: User asked for three changes that turn the platform from "admin-curated, viewers passively browse" into "viewers can contribute":
  1. **Home page view toggle** — `By Level | By Pathway` tabs in the search bar. Default = `By Pathway`. Choice persisted in `localStorage` as `pp.view`. SSR-safe (server renders the default; client hydrates and reads localStorage in an effect). New `PathwayView` component with pathway quick-jump cards + pathway-coloured programme sections (anchor IDs `pathway-ROBOTICS_ENGINEERING` etc.). `PathwaySection` reuses `ProgrammeCard`. Whole-School section goes at the end of pathway order
  2. **Viewer upload** — new `POST /api/programmes/[id]/files` (no `/admin/` prefix). Authenticated viewers can upload files / add links / add folders. `uploadedByRole` set to `'viewer'` for viewer requests, `'admin'` if an admin hits the same endpoint. `isPublic` forced to `true` for viewers (server-enforced, not just UI). Old admin endpoint refactored to delegate to a shared `handleProgrammeFilePost` in `src/lib/upload.js` — same MIME allowlist, same try/catch + type-check pattern
  3. **Role-aware delete** — new `DELETE /api/programmes/[id]/files/[fileId]`. Admin: can delete any file. Viewer: can delete only files where `uploadedByRole === 'viewer'`. Viewer trying to delete an admin-uploaded file gets 404 (existence not leaked, same M-2 pattern). Legacy `/api/admin/.../files/[fileId]` endpoint left in place for admin convenience, still works
- **PM**: Schema change — added `uploadedByRole String @default("admin")` to `ProgrammeFile`. New migration `20260903044758_add_file_uploaded_by_role`. Existing rows default to `'admin'` so they're not undeletable by viewers
- **PM**: New components: `ViewerFileUploader.jsx` (upload form, no isPublic checkbox, no COVER_IMAGE category), `DeleteFileButton.jsx` (trash icon, calls canonical `/api/programmes/...` endpoint)
- **PM**: Public programme page updated — `role` from `getRole()` decides: admin sees all + delete on every file, viewer sees public only + delete on own uploads only, unauth gets redirected by middleware. File list now shows "Uploaded by viewer" badge on viewer-uploaded items
- **PM**: Labels updated — `UPLOADED_BY_LABEL`, `UPLOADED_BY_BADGE`, `UPLOADED_BY_ORDER`, `PATHWAY_ORDER` (new canonical pathway order)
- **PM**: Audit regression check all green: C-1 forged cookie → 307 / 401, H-1 HTML upload → MIME rejected, H-2 numeric name → 400 not 500, M-1 open-redirect still blocked by LoginForm, M-2 private file → viewer 404 / admin 200, M-3/M-4 all security headers present, M-6 BASE_PATH validation intact
- **PM**: Build clean, two new routes (`/api/programmes/[id]/files`, `/api/programmes/[id]/files/[fileId]`). Status: ready to push

### 2026-09-03 (evening) — structured event dates
- **PM**: User asked for structured event dates on `Programme` plus two new home page sections ("Coming up" + "Recent past") so marketing can show what's next and what just happened. No regressions to the 9 audit fixes; no new dependencies; no redesign of existing components
- **PM**: Schema change — added two nullable columns to `Programme`: `startDate DateTime?` and `endDate DateTime?` (with `@@index([startDate])` + `@@index([endDate])` for the home-page queries). New migration `20260903050147_add_programme_dates`. Existing seeded rows are left as `(null, null)` ("TBD" — free-text `dates` field preserved)
- **PM**: Validation helpers added to `src/lib/validate.js`: `dateOrNull` (parses YYYY-MM-DD with strict calendar-date round-trip — rejects 2026-02-31), `validateDateRange` (enforces `endDate >= startDate` when both set), `toDateInputValue` (Date → "YYYY-MM-DD" for `<input type="date">`)
- **PM**: `POST /api/admin/programmes` and `PATCH /api/admin/programmes/[id]` accept `startDate` / `endDate`. PATCH merges with existing values before validating the range, so a partial update (e.g. only `endDate` sent) is checked against the still-existing `startDate`. Existing H-2 try/catch + `P2002` translation preserved
- **PM**: TBD semantics — a programme is TBD when both fields are null. New programme form default: TBD checked, both date pickers disabled. Edit form derives TBD from the existing row. Both forms send `{startDate: null, endDate: null}` to the server when the TBD checkbox is on, regardless of stale state in the date inputs
- **PM**: New home-page section component `src/app/HomeDateSections.jsx` — server-rendered, two thin-bordered cards above the search/toggle area. "Coming up" filters: `startDate` not null, in current month or future, `endDate` not in past. "Recent past" filters: `endDate` not null, in current month or past, `startDate` not null. Both sort + take 3. TBD programmes do not appear in either section
- **PM**: Each row: programme name, level badge (level color), pathway label, pathway color as left border, link to programme detail, "starts DD MMM" / "ended DD MMM" label. Empty section shows muted placeholder text — the section itself is never hidden
- **PM**: Date format helpers added to `src/lib/labels.js`: `formatDateRange` (returns "Sep 5 – Sep 9, 2027" or full years on both sides when different), `formatShortDate`, `formatRelativeStartLabel` / `formatRelativeEndLabel`, `isInCurrentMonthOrFuture` / `isInCurrentMonthOrPast` / `isInPast`. All UTC-based for cross-runtime consistency
- **PM**: Public programme detail sidebar — "Dates" row replaced by "Date" row using the structured field. Renders "TBD" when both null, "Mon DD – Mon DD, YYYY" when both set, or a single short date when only one is set. Free-text `dates` field kept on the DB row but no longer rendered in the sidebar (the structured date is the source of truth going forward)
- **PM**: All 9 audit fixes still in place — re-ran the full repro set: C-1 forged cookie → 307, H-1 HTML upload → MIME rejected, H-2 numeric name → 400 (not 500), M-2 viewer can't fetch COVER_IMAGE, M-3 nosniff on all responses, M-4 full security-header suite, M-6 BASE_PATH regex enforced. Build clean (10 routes, no warnings)

### 2026-09-03 (late evening) — UX polish + post-deploy prep
- **PM**: User reported viewer upload was failing. Root cause: their local `prisma/client` was the old one and the DB hadn't been migrated to the new columns. Two issues had to be fixed in order: (1) `npx prisma generate` to regenerate the client (was throwing "Unknown field `startDate`" on the PATCH), (2) `npx prisma migrate deploy` to add the columns (was throwing "column does not exist"). User's existing 33 programmes now display their free-text `dates` correctly through the new `formatProgrammeDate` helper until admin sets structured dates
- **PM**: User asked to drop the free-text `dates` field everywhere — admin forms, programme cards, admin list — and use the new structured picker exclusively. Replaced: removed the "Dates (free-text, optional)" input from both admin forms; public programme card (`ProgrammesBrowser.jsx`) and admin list page now render `formatProgrammeDate(programme)` which falls back to "TBD" when both columns are null. The `dates` column is still in the Prisma schema (no destructive migration) but no UI writes or reads it. To drop the column later: add a new migration with `ALTER TABLE "Programme" DROP COLUMN "dates"`
- **PM**: New shared helper `formatProgrammeDate(programme)` in `src/lib/labels.js` — wraps `formatDateRange` and returns "TBD" when both start and end are null. Replaces the local copy that lived in `programmes/[id]/page.jsx`; the detail sidebar now imports the shared one
- **PM**: Home page "Coming up" / "Recent past" — user wanted a toggle, not two side-by-side cards. Converted `HomeDateSections` from a server component (showing both at once) to a client component with a two-button `Coming up | Recent past` toggle in the top-right. Persists in `localStorage` as `pp.dateView`. SSR-safe: default = 'upcoming' on the server, then a `useEffect` reads localStorage after hydration (avoids mismatch warning). Toggle styling matches the By Level / By Pathway toggle further down the page
- **PM**: Bug fix in `HomeDateSections` — "Recent past" was using `isInCurrentMonthOrPast` which treats the entire current calendar month as "past", so a programme ending Sept 15 showed up as "Recent past" on Sept 3. Replaced with `isInPast(d, now)` which is `d < now` — strict "the end date has actually passed" semantics. Also dropped the unused `isInCurrentMonthOrPast` import. No view-page rebuild needed for the user beyond the file
- **PM**: User asked to make pathway quick-jump cards use each pathway's brand colour instead of the shared blackboard. The old card had a hard-coded `backgroundColor: '#000000'` with only a 1.5px pathway-colour strip at the bottom. Now: `backgroundColor: color` (the pathway's `PATHWAY_COLOR`), white text on the saturated background, the bottom strip removed (would be invisible anyway), and the subtle "~" scribbles kept but moved from white/5 to gray-300 for the lighter background. Contrast holds across the full palette (red / blue / orange / purple / green / cyan / gray)
- **PM**: User asked to switch the hero (top frame) and the level quick-jump cards from chalkboard to whiteboard. Hero: off-white `#fafaf9` background with faint horizontal ruled lines (`repeating-linear-gradient`), dark gray / black text (no glow), light gray "~" scribbles, and a light-gray aluminum frame at the bottom (replaces the brown wooden ledge). Level cards: same treatment, lines tighter to match the smaller height. Pathway cards (which use pathway colour) untouched. The "Seeds of the Future" cursive title and the stat numbers stay large and use the Caveat font
- **PM**: 5 commits pushed today (16eb88a, bb7ed48, 564e534, c3b0357, e7cd4b3, 615d253 — last one is the whiteboard switch). User pulled each via `curl` from `raw.githubusercontent.com` because the Mac VPN still blocks HTTPS git. `.next/` cache invalidation required after every code change — documented in the user's `~/EDFuture_for_Marketing` workflow
- **PM**: Open for tomorrow: schedule the deferred `next@16` upgrade (audit report has the CVE list), drop the now-unused `dates` column in a separate migration once the user has backfilled the structured dates on the existing 33 programmes, hand `DEPLOY.md` to IT
- **PM**: All 9 audit fixes still green
