'use client';

// =====================================================
// ProgrammesBrowser — client-side search + smooth scroll
// =====================================================
// Owns the search input and renders either:
//   - the normal level-cards / by-level / by-pathway sections, OR
//   - a flat grid of programmes matching the search query
//
// Also exposes a SmoothScrollLink that scrolls to a level section
// with a slow ease-in-out (the default `scroll-behavior: smooth` is
// too abrupt).

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  LEVEL_LABEL, LEVEL_SHORT, LEVEL_COLOR, LEVEL_ORDER,
  PATHWAY_LABEL, PATHWAY_COLOR, STATUS_COLOR,
} from '@/lib/labels';

// Custom slow-easing scroll. Duration 1200ms with cubic ease-in-out.
function smoothScrollTo(targetY, duration = 1200) {
  const startY = window.scrollY;
  const diff = targetY - startY;
  if (Math.abs(diff) < 5) return;
  const startTime = performance.now();
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // easeInOutCubic
    const eased = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    window.scrollTo(0, startY + diff * eased);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function SmoothScrollLink({ level, children, className, style }) {
  function onClick(e) {
    e.preventDefault();
    const target = document.getElementById(`level-${level}`);
    if (target) {
      const targetY = target.getBoundingClientRect().top + window.scrollY - 100;
      smoothScrollTo(targetY, 1200);
      history.replaceState(null, '', `#level-${level}`);
    }
  }
  return (
    <a href={`#level-${level}`} onClick={onClick} className={className} style={style}>
      {children}
    </a>
  );
}

export default function ProgrammesBrowser({ programmes, byLevel, byPathway }) {
  const [query, setQuery] = useState('');
  const trimmed = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!trimmed) return null;
    return programmes.filter(p => {
      const haystack = [
        p.name, p.description, p.partners, p.yearLevel, p.venue, p.dates,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(trimmed);
    });
  }, [programmes, trimmed]);

  const isSearching = matches !== null;

  return (
    <>
      {/* ───── Sticky search bar ───── */}
      <div className="bg-white/95 backdrop-blur border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-3">
          <div className="relative">
            {/* Magnifying glass icon */}
            <span
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              aria-hidden="true"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search programmes by name, partner, year level, venue…"
              className="w-full pl-11 pr-10 py-2.5 border border-gray-300 rounded-full text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                aria-label="Clear search"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
          {isSearching && (
            <div className="mt-2 text-xs text-gray-500">
              {matches.length === 0
                ? <>No programmes match <span className="font-semibold text-gray-900">"{query}"</span>.</>
                : <>{matches.length} programme{matches.length === 1 ? '' : 's'} match <span className="font-semibold text-gray-900">"{query}"</span>.</>}
            </div>
          )}
        </div>
      </div>

      {isSearching ? (
        <SearchResultsGrid matches={matches} query={query} />
      ) : (
        <>
          {/* ───── Level quick-jump cards ───── */}
          <section className="bg-gray-50">
            <div className="max-w-5xl mx-auto px-6 py-14">
              <div className="mb-8">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-700">Browse by level</div>
                <h2 className="mt-1 text-3xl font-extrabold text-gray-900">Programmes by Level</h2>
                <p className="mt-2 text-gray-600">Click a card to jump to that level's programmes.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {LEVEL_ORDER.map(level => (
                  <LevelCard key={level} level={level} programmes={byLevel[level] || []} />
                ))}
              </div>
            </div>
          </section>

          {/* ───── By Level (detailed) ───── */}
          <section className="bg-white">
            <div className="max-w-5xl mx-auto px-6 py-14">
              <div className="mb-8">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-700">All programmes</div>
                <h2 className="mt-1 text-3xl font-extrabold text-gray-900">Programme List</h2>
                <p className="mt-2 text-gray-600">Click a programme to see its recap videos, photos, articles, and resources.</p>
              </div>
              <div className="text-xs text-gray-500 mb-6 flex flex-wrap gap-x-5 gap-y-1">
                <span className="font-semibold text-gray-700">Colour key:</span>
                <span><span className="inline-block w-3 h-3 rounded-sm align-middle mr-1" style={{ backgroundColor: '#2563eb' }}></span> pathway colour = programme type</span>
                <span><span className="inline-block w-3 h-3 rounded-full align-middle mr-1" style={{ backgroundColor: '#2563eb' }}></span> round badge = level</span>
              </div>
              {LEVEL_ORDER.map(level => (
                <LevelSection key={level} level={level} programmes={byLevel[level] || []} />
              ))}
            </div>
          </section>

          {/* ───── By Pathway ───── */}
          <section className="bg-gray-50">
            <div className="max-w-5xl mx-auto px-6 py-14">
              <div className="mb-8">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-700">Browse by pathway</div>
                <h2 className="mt-1 text-3xl font-extrabold text-gray-900">Programmes by Pathway</h2>
                <p className="mt-2 text-gray-600">Each pathway is a different flavour of super-curriculum experience.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {Object.entries(byPathway).map(([pathway, items]) => (
                  <PathwayCard key={pathway} pathway={pathway} items={items} />
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────

function SearchResultsGrid({ matches, query }) {
  return (
    <section className="bg-white">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-700">Search results</div>
          <h2 className="mt-1 text-2xl font-extrabold text-gray-900">"{query}"</h2>
        </div>
        {matches.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No programmes match your search.</p>
            <p className="text-sm mt-1">Try a different keyword, or browse by level or pathway.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches.map(p => <ProgrammeCard key={p.id} programme={p} />)}
          </div>
        )}
      </div>
    </section>
  );
}

function LevelCard({ level, programmes }) {
  const count = programmes.length;
  const byPathwayCount = {};
  for (const p of programmes) {
    byPathwayCount[p.pathway] = (byPathwayCount[p.pathway] || 0) + 1;
  }
  const pathways = Object.entries(byPathwayCount).sort((a, b) => b[1] - a[1]);

  return (
    <SmoothScrollLink
      level={level}
      className={`card flex flex-col group overflow-hidden ${count === 0 ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {/* Blackboard surface */}
      <div
        className="relative h-24 flex items-center justify-center"
        style={{
          backgroundColor: '#000000',
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.04) 0, transparent 40%),' +
            'radial-gradient(circle at 70% 60%, rgba(255,255,255,0.03) 0, transparent 40%),' +
            'radial-gradient(circle at 40% 80%, rgba(255,255,255,0.05) 0, transparent 30%)',
        }}
      >
        <div className="absolute top-2 left-3 text-white/5 text-[10px] pointer-events-none" style={{ fontFamily: "var(--font-caveat), cursive" }}>~</div>
        <div className="absolute bottom-3 right-4 text-white/5 text-[12px] pointer-events-none" style={{ fontFamily: "var(--font-caveat), cursive" }}>~</div>
        <span
          className="text-white text-4xl"
          style={{
            fontFamily: "var(--font-caveat), 'Bradley Hand', 'Brush Script MT', cursive",
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
        <div
          className="absolute bottom-0 left-0 right-0 h-1.5"
          style={{
            background: 'linear-gradient(180deg, #92400e 0%, #78350f 50%, #451a03 100%)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
          }}
        />
      </div>
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
    </SmoothScrollLink>
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
        {programmes.map(p => <ProgrammeCard key={p.id} programme={p} />)}
      </div>
    </div>
  );
}

function ProgrammeCard({ programme }) {
  const hasCover = programme.files?.some(f => f.category === 'COVER_IMAGE');
  const otherFiles = programme.files?.filter(f => f.category !== 'COVER_IMAGE') || [];
  return (
    <Link
      href={`/programmes/${programme.id}`}
      className="card flex flex-col group"
    >
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
            style={{ backgroundColor: LEVEL_COLOR[programme.level], color: '#fff' }}
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
