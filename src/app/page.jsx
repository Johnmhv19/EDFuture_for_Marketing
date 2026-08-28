// Public marketing home — read-only. The page is intentionally
// server-rendered (no "use client") so it's fast and SEO-friendly.

import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ensureDataDirs } from '@/lib/config';
import {
  LEVEL_LABEL, LEVEL_SHORT, LEVEL_COLOR, LEVEL_ORDER,
  PATHWAY_LABEL, PATHWAY_COLOR, STATUS_COLOR,
  FILE_CATEGORY_LABEL, FILE_CATEGORY_ICON, PUBLIC_FILE_CATEGORIES,
} from '@/lib/labels';

// Run on every request so that fresh deploys with empty data dirs
// don't crash. Idempotent and cheap.
ensureDataDirs();

export const dynamic = 'force-dynamic';

async function getProgrammes() {
  return prisma.programme.findMany({
    orderBy: [{ level: 'asc' }, { name: 'asc' }],
    include: {
      files: {
        where: { status: 'ACTIVE', category: { in: PUBLIC_FILE_CATEGORIES } },
        orderBy: [{ category: 'asc' }, { uploadedAt: 'desc' }],
      },
    },
  });
}

function groupByLevel(programmes) {
  const map = {};
  for (const lvl of LEVEL_ORDER) map[lvl] = [];
  for (const p of programmes) (map[p.level] ||= []).push(p);
  return map;
}

function groupByPathway(programmes) {
  const map = {};
  for (const p of programmes) (map[p.pathway] ||= []).push(p);
  return map;
}

export default async function HomePage() {
  const programmes = await getProgrammes();
  const byLevel = groupByLevel(programmes);
  const byPathway = groupByPathway(programmes);
  const counts = {
    total: programmes.length,
    pathways: Object.keys(byPathway).length,
    confirmed: programmes.filter(p => p.status === 'Confirmed').length,
    tbd: programmes.filter(p => p.status === 'TBD').length,
  };

  return (
    <main className="min-h-screen">
      {/* ───── Hero ───── */}
      <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-700 text-white">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight">
            Seeds of the Future
          </h1>
          <p className="mt-3 text-lg md:text-xl text-blue-100">
            YCYW Advanced Pathways Academy — programmes for marketing
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {[
              { n: counts.total, l: 'programmes' },
              { n: counts.pathways, l: 'pathways' },
              { n: 'G1–A2', l: 'year levels' },
              { n: 'Sep–Jul', l: 'schedule' },
            ].map((s, i) => (
              <div key={i} className="bg-white/10 backdrop-blur rounded-xl px-5 py-3 min-w-[110px] border border-white/20">
                <div className="text-2xl font-extrabold">{s.n}</div>
                <div className="text-xs uppercase tracking-wide text-blue-100">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── By Level ───── */}
      <Section
        eyebrow="Browse by level"
        title="Programmes by Level"
        subtitle="Click a programme to see its recap videos, photos, articles, and resources."
      >
        {LEVEL_ORDER.map(level => (
          <LevelSection key={level} level={level} programmes={byLevel[level] || []} />
        ))}
      </Section>

      {/* ───── By Pathway ───── */}
      <Section
        eyebrow="Browse by pathway"
        title="Programmes by Pathway"
        subtitle="Each pathway is a different flavour of super-curriculum experience."
        background="bg-gray-50"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Object.entries(byPathway).map(([pathway, items]) => (
            <PathwayCard key={pathway} pathway={pathway} items={items} />
          ))}
        </div>
      </Section>

      {/* ───── Footer ───── */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-8 text-sm text-gray-500 flex flex-wrap items-center justify-between gap-4">
          <span>YCYW Advanced Pathways Academy · Programmes for marketing</span>
          <span>Updated {new Date().toISOString().slice(0, 10)}</span>
        </div>
      </footer>
    </main>
  );
}

// ────────────────────────────────────────────────────────────────
// Sub-components (server, no client JS)
// ────────────────────────────────────────────────────────────────

function Section({ eyebrow, title, subtitle, background = 'bg-white', children }) {
  return (
    <section className={background}>
      <div className="max-w-5xl mx-auto px-6 py-14">
        <div className="mb-8">
          {eyebrow && (
            <div className="text-xs font-bold uppercase tracking-wider text-blue-700">{eyebrow}</div>
          )}
          <h2 className="mt-1 text-3xl font-extrabold text-gray-900">{title}</h2>
          {subtitle && <p className="mt-2 text-gray-600">{subtitle}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

function LevelSection({ level, programmes }) {
  if (programmes.length === 0) return null;
  const color = LEVEL_COLOR[level];
  return (
    <div className="mb-12 last:mb-0">
      <div className="flex items-baseline gap-3 mb-4">
        <h3
          className="text-xl font-bold"
          style={{ color }}
        >
          {LEVEL_SHORT[level]}
        </h3>
        <span className="text-sm text-gray-500">{LEVEL_LABEL[level]}</span>
        <span className="text-xs text-gray-400">· {programmes.length} programme{programmes.length === 1 ? '' : 's'}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {programmes.map(p => (
          <ProgrammeCard key={p.id} programme={p} accentColor={color} />
        ))}
      </div>
    </div>
  );
}

function ProgrammeCard({ programme, accentColor }) {
  const hasCover = programme.files.some(f => f.category === 'COVER_IMAGE');
  const otherFiles = programme.files.filter(f => f.category !== 'COVER_IMAGE');
  return (
    <Link
      href={`/programmes/${programme.id}`}
      className="card flex flex-col group"
    >
      {/* cover band — solid pathway colour, no image required */}
      <div
        className="h-28 flex items-center justify-center text-white/80 text-3xl font-bold tracking-wide relative"
        style={{ backgroundColor: PATHWAY_COLOR[programme.pathway] }}
      >
        <span className="px-3 text-center text-sm font-semibold leading-snug uppercase tracking-wide">
          {programme.name}
        </span>
        {hasCover && (
          <span className="absolute top-2 right-2 text-xs bg-white/20 backdrop-blur px-1.5 py-0.5 rounded">
            has cover
          </span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span
            className="badge"
            style={{ backgroundColor: accentColor, color: '#fff' }}
          >
            {LEVEL_SHORT[programme.level]}
          </span>
          <span className="text-xs text-gray-500">
            {PATHWAY_LABEL[programme.pathway]}
          </span>
        </div>
        <h4 className="font-semibold text-gray-900 group-hover:text-blue-700">{programme.name}</h4>
        {programme.dates && (
          <p className="mt-1 text-xs text-gray-500">📅 {programme.dates}</p>
        )}
        {programme.status && (
          <span className={`mt-2 inline-block self-start text-xs px-2 py-0.5 rounded ${STATUS_COLOR[programme.status] || 'bg-gray-100 text-gray-700'}`}>
            {programme.status}
          </span>
        )}
        {otherFiles.length > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            📎 {otherFiles.length} file{otherFiles.length === 1 ? '' : 's'}
          </p>
        )}
      </div>
    </Link>
  );
}

function PathwayCard({ pathway, items }) {
  const color = PATHWAY_COLOR[pathway] || '#6b7280';
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <h4 className="font-bold text-gray-900">{PATHWAY_LABEL[pathway]}</h4>
        <span className="text-xs text-gray-500">· {items.length}</span>
      </div>
      <ul className="text-sm text-gray-700 space-y-1">
        {items.map(p => (
          <li key={p.id} className="truncate">
            <Link href={`/programmes/${p.id}`} className="hover:text-blue-700">
              {p.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
