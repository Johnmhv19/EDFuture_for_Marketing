// Public marketing home — read-only. The hero is server-rendered for
// fast first paint; the rest of the page is delegated to a client
// component (ProgrammesBrowser) which owns search state + the slow
// smooth scroll for level jumps.

import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ensureDataDirs } from '@/lib/config';
import { isAdmin } from '@/lib/auth';
import { LEVEL_ORDER } from '@/lib/labels';
import ProgrammesBrowser from './ProgrammesBrowser';

// Run on every request so that fresh deploys with empty data dirs
// don't crash. Idempotent and cheap.
ensureDataDirs();

export const dynamic = 'force-dynamic';

async function getProgrammes() {
  return prisma.programme.findMany({
    orderBy: [{ level: 'asc' }, { name: 'asc' }],
    include: {
      files: {
        where: { status: 'ACTIVE', category: { in: ['VIDEO', 'PHOTO', 'ARTICLE', 'RESOURCE'] } },
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
  };
  const admin = await isAdmin();

  return (
    <main className="min-h-screen">
      {/* ───── Admin bar (only visible to admin users) ───── */}
      {admin && (
        <div className="bg-gray-900 text-white">
          <div className="max-w-6xl mx-auto px-6 py-2 flex items-center justify-between text-sm">
            <span className="text-gray-400">Signed in as <span className="font-semibold text-white">Admin</span></span>
            <Link
              href="/admin"
              className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold"
            >
              Open admin panel →
            </Link>
          </div>
        </div>
      )}

      {/* ───── Hero (chalkboard, full black) ───── */}
      <section
        className="relative"
        style={{
          backgroundColor: '#000000',
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.04) 0, transparent 40%),' +
            'radial-gradient(circle at 70% 60%, rgba(255,255,255,0.03) 0, transparent 40%),' +
            'radial-gradient(circle at 40% 80%, rgba(255,255,255,0.05) 0, transparent 30%)',
        }}
      >
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

      {/* ───── Client-side: search + level cards + programme list ───── */}
      <ProgrammesBrowser
        programmes={programmes}
        byLevel={byLevel}
        byPathway={byPathway}
      />

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
