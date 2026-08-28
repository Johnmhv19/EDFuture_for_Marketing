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
      {/* ───── Hero ─────
          Same chalkboard style as the level cards below — dark slate
          with white chalk text, wood frame on the bottom. Kept short
          so it doesn't take over the page. */}
      <section
        className="relative"
        style={{
          backgroundColor: '#1f2937',
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.04) 0, transparent 40%),' +
            'radial-gradient(circle at 70% 60%, rgba(255,255,255,0.03) 0, transparent 40%),' +
            'radial-gradient(circle at 40% 80%, rgba(255,255,255,0.05) 0, transparent 30%)',
        }}
      >
        {/* Faint chalk smudges for atmosphere */}
        <div className="absolute top-4 left-8 text-white/5 text-sm pointer-events-none" style={{ fontFamily: "'Caveat', cursive" }}>~</div>
        <div className="absolute bottom-6 right-10 text-white/5 text-lg pointer-events-none" style={{ fontFamily: "'Caveat', cursive" }}>~</div>

        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div
              className="text-xs font-bold uppercase tracking-wider"
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontFamily: "'Caveat', cursive",
                fontSize: '1.1rem',
                fontWeight: '500',
                letterSpacing: '0.05em',
                textShadow: '0 0 1px rgba(255,255,255,0.3)',
              }}
            >
              YCYW Advanced Pathways Academy
            </div>
            <h1
              className="mt-1 text-white"
              style={{
                fontFamily: "'Caveat', 'Bradley Hand', 'Brush Script MT', cursive",
                fontWeight: '700',
                fontSize: '3.25rem',
                lineHeight: '1',
                textShadow:
                  '0 0 1px rgba(255,255,255,0.4),' +
                  '0 0 8px rgba(255,255,255,0.18),' +
                  '0 1px 0 rgba(0,0,0,0.5)',
                letterSpacing: '0.01em',
              }}
            >
              Seeds of the Future
            </h1>
            <div
              className="mt-1"
              style={{
                color: 'rgba(255,255,255,0.7)',
                fontFamily: "'Caveat', cursive",
                fontSize: '1.15rem',
                textShadow: '0 0 1px rgba(255,255,255,0.2)',
              }}
            >
              Programmes for marketing
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {[
              { n: counts.total, l: 'programmes' },
              { n: counts.pathways, l: 'pathways' },
              { n: 'G1–A2', l: 'year levels' },
              { n: 'Sep–Jul', l: 'schedule' },
            ].map((s, i) => (
              <div key={i} className="flex items-baseline gap-1.5">
                <span
                  className="text-white"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    fontSize: '2rem',
                    fontWeight: '700',
                    textShadow: '0 0 1px rgba(255,255,255,0.3), 0 0 6px rgba(255,255,255,0.15)',
                    lineHeight: '1',
                  }}
                >
                  {s.n}
                </span>
                <span
                  className="uppercase"
                  style={{
                    color: 'rgba(255,255,255,0.65)',
                    fontFamily: "'Caveat', cursive",
                    fontSize: '0.95rem',
                    textShadow: '0 0 1px rgba(255,255,255,0.2)',
                  }}
                >
                  {s.l}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Wood frame along the bottom edge of the slate */}
        <div
          className="h-1.5"
          style={{
            background: 'linear-gradient(180deg, #92400e 0%, #78350f 50%, #451a03 100%)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
          }}
        />
      </section>

      {/* ───── Level quick-jump cards ───── */}
      <Section
        eyebrow="Browse by level"
        title="Programmes by Level"
        subtitle="Click a card to jump to that level's programmes."
        background="bg-gray-50"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {LEVEL_ORDER.map(level => (
            <LevelCard
              key={level}
              level={level}
              programmes={byLevel[level] || []}
            />
          ))}
        </div>
      </Section>

      {/* ───── By Level (detailed) ───── */}
      <Section
        eyebrow="All programmes"
        title="Programme List"
        subtitle="Click a programme to see its recap videos, photos, articles, and resources."
      >
        <div className="text-xs text-gray-500 mb-6 flex flex-wrap gap-x-5 gap-y-1">
          <span className="font-semibold text-gray-700">Colour key:</span>
          <span><span className="inline-block w-3 h-3 rounded-sm align-middle mr-1" style={{ backgroundColor: '#2563eb' }}></span> pathway colour = programme type</span>
          <span><span className="inline-block w-3 h-3 rounded-full align-middle mr-1" style={{ backgroundColor: '#2563eb' }}></span> round badge = level</span>
        </div>
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
    <div className="mb-12 last:mb-0 scroll-mt-32" id={`level-${level}`}>
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

// Level quick-jump card — blackboard with white chalk styling.
//   - top band looks like a slate blackboard (dark, slightly textured)
//   - level text rendered in a handwriting font as white chalk
//   - wood frame on the bottom edge of the slate
//   - pathway count and breakdown below the slate
//
// All 5 level cards use the SAME blackboard colour so they read as a
// navigation element (not a category), keeping the colour codes clear
// for programme pathway type.
function LevelCard({ level, programmes }) {
  const count = programmes.length;
  const byPathwayCount = {};
  for (const p of programmes) {
    byPathwayCount[p.pathway] = (byPathwayCount[p.pathway] || 0) + 1;
  }
  const pathways = Object.entries(byPathwayCount).sort((a, b) => b[1] - a[1]);

  return (
    <a
      href={count > 0 ? `#level-${level}` : undefined}
      className={`card flex flex-col group overflow-hidden ${count === 0 ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {/* Blackboard surface */}
      <div
        className="relative h-24 flex items-center justify-center"
        style={{
          backgroundColor: '#1f2937',
          backgroundImage:
            // Very subtle noise/dust texture on the slate
            'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.04) 0, transparent 40%),' +
            'radial-gradient(circle at 70% 60%, rgba(255,255,255,0.03) 0, transparent 40%),' +
            'radial-gradient(circle at 40% 80%, rgba(255,255,255,0.05) 0, transparent 30%)',
        }}
      >
        {/* Faint chalk smudges for atmosphere */}
        <div className="absolute top-2 left-3 text-white/5 text-[10px]" style={{ fontFamily: "'Caveat', cursive" }}>~</div>
        <div className="absolute bottom-3 right-4 text-white/5 text-[12px]" style={{ fontFamily: "'Caveat', cursive" }}>~</div>

        {/* The level text in chalk — using self-hosted Caveat (handwriting font) */}
        <span
          className="text-white text-4xl"
          style={{
            fontFamily: "'Caveat', 'Bradley Hand', 'Brush Script MT', cursive",
            fontWeight: '500',
            textShadow:
              '0 0 1px rgba(255,255,255,0.4),' +
              '0 0 8px rgba(255,255,255,0.18),' +
              '0 1px 0 rgba(0,0,0,0.5)',
            letterSpacing: '0.02em',
          }}
        >
          {LEVEL_SHORT[level]}
        </span>

        {/* Wood frame along the bottom edge of the slate */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1.5"
          style={{
            background: 'linear-gradient(180deg, #92400e 0%, #78350f 50%, #451a03 100%)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
          }}
        />
      </div>

      {/* Card body */}
      <div className="p-3 flex-1 flex flex-col">
        <div className="text-xs text-gray-500 mb-1">{LEVEL_LABEL[level]}</div>
        <div className="text-sm font-bold text-gray-900 mb-2">
          {count} programme{count === 1 ? '' : 's'}
        </div>
        {pathways.length > 0 && (
          <div className="flex flex-col gap-1 mt-auto">
            {pathways.slice(0, 4).map(([pathway, n]) => (
              <div key={pathway} className="flex items-center gap-1.5 text-xs">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: PATHWAY_COLOR[pathway] || '#9ca3af' }}
                />
                <span className="truncate text-gray-600 flex-1">{PATHWAY_LABEL[pathway] || pathway}</span>
                <span className="text-gray-400">{n}</span>
              </div>
            ))}
            {pathways.length > 4 && (
              <div className="text-xs text-gray-400">+{pathways.length - 4} more</div>
            )}
          </div>
        )}
        {pathways.length === 0 && (
          <div className="text-xs text-gray-400 italic mt-auto">No programmes yet</div>
        )}
      </div>
    </a>
  );
}
