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

_Last updated: 2026-09-01_

---

**Status: handoff to IT imminent.** All requested features built and tested. User confirmed external link/folder support works on their Mac. IT has confirmed SQLite is acceptable. IT collaborator invitation sent, pending their accept. User wants to publish soon so colleagues can start populating. Next step: hand `DEPLOY.md` to IT once collaborator accepts.

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
- **Status**: end of session, waiting for IT collaborator to accept. User to hand `DEPLOY.md` to IT once accepted. No code changes this session
