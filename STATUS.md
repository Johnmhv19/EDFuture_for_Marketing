# YCYW Programmes Platform — Project Status

> Daily project log. **Read at the start of every session** to refresh
> context, then update with what we did today before the session ends.

_Last updated: 2026-08-31_

---

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
| **DB** | 33 programmes (2 starter + 31 from Notion) · **0 files** uploaded |
| **Latest commit** | 2026-08-28 — "Add search bar + softer smooth scroll + full-black hero" |
| **GitHub collaborator added?** | ❌ `shouli.pu@ycyw.cn` not yet added (IT, user's action) |
| **Production deployed?** | ❌ IT hasn't deployed yet |
| **Demo (2026-08-28)** | ❓ Unknown — user never reported back |

---

## Where we left off (2026-08-28)

### Built & shipped
- **Home page** (`/`) — blackboard hero (full black) with chalk-style "Seeds of the Future" in Caveat handwriting font, 4 inline stat numbers
- **Sticky search bar** with magnifying-glass icon — real-time filter across name, description, partners, year level, venue, dates
- **5 chalkboard level quick-jump cards** — all same dark color, click to scroll, 1200ms ease-in-out cubic
- **Programme list** grouped by level (with colour-key legend)
- **Programme detail** page with cover, metadata sidebar, file list
- **Admin section** — dashboard with stats, programme list with level filters, create/edit form, file upload UI
- **Auth** — `/login` accepts admin or viewer token, 7-day httpOnly cookie
- **API** — 7 routes: healthz, auth login, file streaming, admin CRUD on programmes + files
- **All pushed to GitHub** in `Johnmhv19/EDFuture_for_Marketing`

### Design decisions (locked in)
- Level cards: chalkboard style with all-same dark color, so colour codes unambiguously mean **pathway type** on programme cards
- Self-hosted Caveat woff2 in `/public/fonts/` (no Google Fonts dep)
- Smooth scroll: 1200ms ease-in-out cubic (browser default was too abrupt)
- All enums stored as strings (SQLite + Prisma no native enums)

---

## Open tasks (check off as we go)

### User action items
- [ ] Add IT collaborator `shouli.pu@ycyw.cn` to the GitHub repo (Settings → Collaborators)
- [ ] (Optional) Revoke the fine-grained PAT used for the initial push — `https://github.com/settings/tokens`
- [ ] Upload real programme files (covers, videos, photos, articles) via the admin UI

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
- `ProgrammeFile` — id, programmeId, category, status (ACTIVE/ARCHIVED), displayName, originalName, storageKey (relative to UPLOAD_DIR), mimeType, sizeBytes, caption, uploadedAt

### String enums (validated at app layer — see `src/lib/labels.js`)
- **Level**: `L1 | L2 | L3 | L2_AND_L3 | WHOLE_SCHOOL`
- **Pathway**: `WHOLE_SCHOOL | ROBOTICS_ENGINEERING | BUSINESS_LAW | CREATIVE_EXPERIENCE | HEALTH_MEDICINE | SCIENCE_RESEARCH | COMPUTER_SCIENCE_DATA_SCIENCE`
- **FileCategory**: `VIDEO | PHOTO | ARTICLE | RESOURCE | COVER_IMAGE`
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

### 2026-08-31
- User returned after the weekend, asked for this status log
- Created `STATUS.md` and added memory note to read it at start of every session
- No code changes
