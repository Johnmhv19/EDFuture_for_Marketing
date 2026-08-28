# program-platform

> YCYW Advanced Pathways Academy — programmes for marketing. Replaces the
> previous Notion implementation. Local-first, SQLite, single Next.js
> process. Read-only view for the marketing team; full edit for the
> programme owner.

## What this is

A small internal web app that:

- Shows the 31 programmes organised by **level** (L1 / L2 / L3 / L2 & L3 / Whole-school) and by **pathway** (Robotics & Engineering, Business / Law, Creative Experience, Health & Medicine, Science Research, Computer Science / Data Science, Whole-School)
- Lets the marketing team **download** the recap videos, photos, articles, and resources for each programme
- Lets the admin (you) **upload, edit, and delete** programmes and their files
- Authenticates with two bearer tokens — one admin, one viewer

## Tech stack

- **Next.js 14** (App Router) — single codebase, single process
- **SQLite** via **Prisma** — zero-config local DB
- **Tailwind CSS** — styling
- **Local filesystem** for uploaded files (configurable path)
- No Docker required (but easy to add if IT wants it)

## Quick start (local dev — under 5 minutes)

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# Edit .env — at minimum, set:
#   ADMIN_TOKEN (any random 32+ char string)
#   VIEW_TOKEN  (any random 32+ char string)
# Generate them with:
#   openssl rand -hex 32

# 3. Set up the database
npm run db:migrate:dev    # creates data/dev.db, runs migrations

# 4. (Optional) Seed from the previous Notion database
# Requires NOTION_TOKEN env var
NOTION_TOKEN=secret_xxxx npm run db:seed:notion

# OR seed the small starter set (no Notion needed)
npm run db:seed

# 5. Run
npm run dev
# open http://localhost:3000
```

## Daily workflow

```bash
# Develop
npm run dev

# Lint
npm run lint

# Build for production
npm run build
npm start
```

## Project structure

```
program-platform/
├── prisma/
│   ├── schema.prisma              ← Database schema (Programmes, Files)
│   ├── migrations/                ← Prisma migration history
│   ├── seed.mjs                   ← Tiny starter seed
│   └── seed-from-notion.mjs       ← One-off Notion migration
├── scripts/
│   └── generate-cover-placeholders.mjs
├── src/
│   ├── middleware.js              ← Auth gating
│   ├── lib/                       ← config, db, auth, labels
│   ├── app/
│   │   ├── layout.jsx, globals.css
│   │   ├── page.jsx               ← Public home (marketing view)
│   │   ├── login/page.jsx         ← Token entry page
│   │   ├── programmes/[id]/page.jsx ← Public programme detail
│   │   ├── admin/                 ← Admin-only pages
│   │   │   ├── layout.jsx
│   │   │   ├── page.jsx           ← Dashboard
│   │   │   └── programmes/        ← List, new, edit + file mgr
│   │   └── api/                   ← REST endpoints
│   │       ├── healthz/
│   │       ├── auth/login/
│   │       ├── files/[id]/        ← Public file streaming
│   │       └── admin/             ← Admin-only mutations
│   ├── components/                ← (none yet; admin pages inline)
├── data/                          ← gitignored — SQLite + uploads
├── .env.example
├── DEPLOY.md
├── README.md  ← you are here
```

## Authentication

Two bearer tokens, configured in `.env`:

| Token | Role | Can do |
|---|---|---|
| `ADMIN_TOKEN` | admin | Edit programmes, upload/delete files |
| `VIEW_TOKEN` | viewer (marketing) | Browse + download only |

Visit `/login`, paste a token, click the matching role. The role is stored in an `httpOnly` cookie for 7 days.

The marketing team gets the `VIEW_TOKEN`. You use the `ADMIN_TOKEN`. Don't share them, don't commit them.

## Environment variables

See `.env.example` — every variable is documented with its purpose and a placeholder.

## Database

SQLite, file-based. Path is `DATABASE_URL`, defaults to `./data/dev.db`. Migrations live in `prisma/migrations/`.

- `npm run db:migrate:dev` — apply migrations in dev (creates the DB if missing)
- `npm run db:migrate` — apply migrations in production (no prompts)
- `npm run db:reset` — **destructive**, wipes the DB and re-runs migrations + seed
- `npm run db:seed` — load the small starter set (idempotent)
- `npm run db:seed:notion` — pull from Notion (requires `NOTION_TOKEN`)

The DB file lives in `data/` which is **outside `dist/` and `.next/`** — it survives rebuilds.

## File uploads

Uploaded files (videos, photos, articles, resources, cover images) are stored on the local filesystem at `UPLOAD_DIR` (defaults to `./data/uploads`). Each file gets a generated `storageKey` like `<programmeId>/<timestamp>_<rand>_<sanitised-name>` so filenames are unique and safe.

The path is **outside the build output** so uploaded files survive `npm run build` and `npm start` restarts.

`MAX_UPLOAD_MB` defaults to 500 MB. Adjust in `.env` if you need larger videos.

## How the Notion migration worked (if you're curious)

The previous Notion implementation had a 9-property Programmes database. This app:

- Mirrors the 9 properties (Name, Level, Pathway, Partners, Year Level, Venue, Dates, Status, Description)
- Drops the page-cover convention in favour of a `COVER_IMAGE` file in a `ProgrammeFile` table — more flexible, version-controlled
- Keeps the same L1/L2/L3 + L2 & L3 + Whole-school taxonomy
- Same six pathway palette (just renamed to enum-safe keys in the DB)

The `prisma/seed-from-notion.mjs` script does a one-off pull. Run it once after `npm install`. After that, the local DB is the source of truth.

## What's different from Notion (intentional)

- **No separate "L2 & L3" view** — L2 & L3 programmes are folded into both L2 and L3 lists (so marketing doesn't have to click two places)
- **Programme detail page** is a real page with proper file lists, not just text
- **One canonical file model** — cover, video, photo, article, resource are all `ProgrammeFile` rows, no Notion-specific quirks
- **Marketing auth** — marketing can only read; no accidental edits

## Gotchas

- **Don't commit `.env`** — it has the real tokens. `.gitignore` covers it.
- **Don't run `db:reset` in production** — it drops everything. Migrations only.
- **Don't change the upload dir without copying the files** — paths in the DB are relative to `UPLOAD_DIR`.

## See also

- `DEPLOY.md` — full deployment guide for IT
