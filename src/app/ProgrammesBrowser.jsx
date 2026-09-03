'use client';

// =====================================================
// ProgrammesBrowser — client-side search + smooth scroll
// =====================================================
// Owns the search input and renders either:
//   - the view-mode selected via the toggle (By Level | By Pathway),
//   - or a flat grid of programmes matching the search query.
//
// Also exposes a SmoothScrollLink that scrolls to a section anchor
// (level or pathway) with a slow ease-in-out (the default
// `scroll-behavior: smooth` is too abrupt).
//
// View choice persists in localStorage as `pp.view` ('level' | 'pathway').
// Default is 'pathway'. SSR is safe: we read localStorage in an effect
// and fall back to the server-rendered default during the first frame.

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  LEVEL_LABEL, LEVEL_SHORT, LEVEL_COLOR, LEVEL_ORDER,
  PATHWAY_LABEL, PATHWAY_COLOR, PATHWAY_ORDER, STATUS_COLOR,
  formatProgrammeDate,
} from '@/lib/labels';

const VIEW_STORAGE_KEY = 'pp.view';
const DEFAULT_VIEW = 'pathway';

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

// SmoothScrollLink scrolls to a section anchor. `kind` is
// 'level' (anchor id `level-${level}`) or 'pathway' (anchor id
// `pathway-${pathway}`). Same smooth-scroll behaviour either way.
function SmoothScrollLink({ kind, value, children, className, style }) {
  const anchor = `${kind}-${value}`;
  function onClick(e) {
    e.preventDefault();
    const target = document.getElementById(anchor);
    if (target) {
      const targetY = target.getBoundingClientRect().top + window.scrollY - 100;
      smoothScrollTo(targetY, 1200);
      history.replaceState(null, '', `#${anchor}`);
    }
  }
  return (
    <a href={`#${anchor}`} onClick={onClick} className={className} style={style}>
      {children}
    </a>
  );
}

export default function ProgrammesBrowser({ programmes, byLevel, byPathway }) {
  const [query, setQuery] = useState('');

  // null = "not yet read" (server-render state); 'level' | 'pathway' = the
  // real value. We pick `DEFAULT_VIEW` for the first frame so SSR
  // and the first client render match (no hydration warning), then
  // sync with localStorage in the effect.
  const [view, setView] = useState(DEFAULT_VIEW);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (stored === 'level' || stored === 'pathway') {
        setView(stored);
      }
    } catch {
      // localStorage may be unavailable (private mode, sandbox) —
      // fall back to the default.
    }
  }, []);

  function changeView(next) {
    setView(next);
    try { window.localStorage.setItem(VIEW_STORAGE_KEY, next); } catch {}
  }

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

  // Pathway section order. The user-visible "Whole School" group
  // sits at the end of the pathway view.
  const pathwayOrder = useMemo(() => {
    const seen = new Set();
    const order = [];
    for (const p of PATHWAY_ORDER) {
      if (byPathway[p] && byPathway[p].length > 0) {
        order.push(p);
        seen.add(p);
      }
    }
    // Any pathway present in data but not in PATHWAY_ORDER goes
    // at the end (defensive — shouldn't happen, but cheaper than
    // an unknown-key render).
    for (const p of Object.keys(byPathway)) {
      if (!seen.has(p) && byPathway[p].length > 0) order.push(p);
    }
    return order;
  }, [byPathway]);

  return (
    <>
      {/* ───── Sticky search bar + view toggle ───── */}
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

          {/* ───── View toggle: By Level | By Pathway ───── */}
          <div className="mt-3 flex items-center gap-1" role="tablist" aria-label="View programmes by">
            <ViewTab
              active={view === 'level'}
              onClick={() => changeView('level')}
              label="By Level"
            />
            <ViewTab
              active={view === 'pathway'}
              onClick={() => changeView('pathway')}
              label="By Pathway"
            />
            <span className="ml-auto text-[10px] text-gray-400 uppercase tracking-wider">
              {view === 'pathway' ? 'Default view' : ''}
            </span>
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
      ) : view === 'pathway' ? (
        <PathwayView byPathway={byPathway} pathwayOrder={pathwayOrder} />
      ) : (
        <LevelView byLevel={byLevel} />
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────

function ViewTab({ active, onClick, label }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full transition"
      style={{
        backgroundColor: active ? '#000000' : 'transparent',
        color: active ? '#ffffff' : '#374151',
        border: active ? '1px solid #000000' : '1px solid #d1d5db',
      }}
    >
      {label}
    </button>
  );
}

function LevelView({ byLevel }) {
  return (
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
    </>
  );
}

function PathwayView({ byPathway, pathwayOrder }) {
  return (
    <>
      {/* ───── Pathway quick-jump cards ───── */}
      <section className="bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <div className="mb-8">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-700">Browse by pathway</div>
            <h2 className="mt-1 text-3xl font-extrabold text-gray-900">Programmes by Pathway</h2>
            <p className="mt-2 text-gray-600">Click a card to jump to that pathway's programmes.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pathwayOrder.map(pathway => (
              <PathwayQuickCard key={pathway} pathway={pathway} programmes={byPathway[pathway] || []} />
            ))}
          </div>
        </div>
      </section>

      {/* ───── By Pathway (detailed) ───── */}
      <section className="bg-white">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <div className="mb-8">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-700">All programmes</div>
            <h2 className="mt-1 text-3xl font-extrabold text-gray-900">Programme List</h2>
            <p className="mt-2 text-gray-600">Each pathway is a different flavour of super-curriculum experience.</p>
          </div>
          {pathwayOrder.map(pathway => (
            <PathwaySection key={pathway} pathway={pathway} programmes={byPathway[pathway] || []} />
          ))}
        </div>
      </section>
    </>
  );
}

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
      kind="level"
      value={level}
      className={`card flex flex-col group overflow-hidden ${count === 0 ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {/* Whiteboard surface */}
      <div
        className="relative h-24 flex items-center justify-center"
        style={{
          backgroundColor: '#fafaf9',
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0, transparent 22px, rgba(0,0,0,0.05) 22px, rgba(0,0,0,0.05) 23px)',
        }}
      >
        <div className="absolute top-2 left-3 text-gray-300 text-[10px] pointer-events-none" style={{ fontFamily: "var(--font-caveat), cursive" }}>~</div>
        <div className="absolute bottom-3 right-4 text-gray-300 text-[12px] pointer-events-none" style={{ fontFamily: "var(--font-caveat), cursive" }}>~</div>
        <span
          className="text-4xl"
          style={{
            color: '#111827',
            fontFamily: "var(--font-caveat), 'Bradley Hand', 'Brush Script MT', cursive",
            fontWeight: '700',
            letterSpacing: '0.02em',
          }}
        >
          {LEVEL_SHORT[level]}
        </span>
        <div
          className="absolute bottom-0 left-0 right-0 h-1.5"
          style={{
            background: 'linear-gradient(180deg, #d4d4d8 0%, #a1a1aa 50%, #71717a 100%)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
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

// Pathway quick-jump card. The pathway colour is the dominant
// visual: it fills the entire header band so each card is
// immediately identifiable. White text on a saturated mid-tone
// stays readable across the full palette (red / blue / orange /
// purple / green / cyan / gray).
function PathwayQuickCard({ pathway, programmes }) {
  const count = programmes.length;
  const color = PATHWAY_COLOR[pathway] || '#6b7280';
  const byLevelCount = {};
  for (const p of programmes) {
    byLevelCount[p.level] = (byLevelCount[p.level] || 0) + 1;
  }
  const levels = Object.entries(byLevelCount).sort((a, b) => b[1] - a[1]);
  return (
    <SmoothScrollLink
      kind="pathway"
      value={pathway}
      className={`card flex flex-col group overflow-hidden ${count === 0 ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <div
        className="relative h-24 flex items-center justify-center"
        style={{ backgroundColor: color }}
      >
        <div className="absolute top-2 left-3 text-white/15 text-[10px] pointer-events-none" style={{ fontFamily: "var(--font-caveat), cursive" }}>~</div>
        <div className="absolute bottom-3 right-4 text-white/15 text-[12px] pointer-events-none" style={{ fontFamily: "var(--font-caveat), cursive" }}>~</div>
        <span
          className="text-white text-2xl px-3 text-center"
          style={{
            fontFamily: "var(--font-caveat), 'Bradley Hand', 'Brush Script MT', cursive",
            fontWeight: '500',
            textShadow:
              '0 1px 0 rgba(0,0,0,0.35)',
            letterSpacing: '0.02em',
          }}
        >
          {PATHWAY_LABEL[pathway] || pathway}
        </span>
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <div className="text-xs text-gray-500 mb-1 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
          {pathway === 'WHOLE_SCHOOL' ? 'Whole School' : 'Pathway'}
        </div>
        <div className="text-sm font-bold text-gray-900 mb-2">
          {count} programme{count === 1 ? '' : 's'}
        </div>
        {levels.length > 0 && (
          <div className="flex flex-col gap-1 mt-auto">
            {levels.slice(0, 4).map(([lvl, n]) => (
              <div key={lvl} className="flex items-center gap-1.5 text-xs">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: LEVEL_COLOR[lvl] || '#9ca3af' }}
                />
                <span className="truncate text-gray-600 flex-1">{LEVEL_SHORT[lvl]}</span>
                <span className="text-gray-400">{n}</span>
              </div>
            ))}
            {levels.length > 4 && (
              <div className="text-xs text-gray-400">+{levels.length - 4} more</div>
            )}
          </div>
        )}
        {levels.length === 0 && (
          <div className="text-xs text-gray-400 italic mt-auto">No programmes yet</div>
        )}
      </div>
    </SmoothScrollLink>
  );
}

// Pathway detail section: pathway-coloured header bar above the
// programme grid. Same chalkboard divider vibe as LevelSection but
// the divider is the pathway colour, not the level colour.
function PathwaySection({ pathway, programmes }) {
  if (programmes.length === 0) return null;
  const color = PATHWAY_COLOR[pathway] || '#6b7280';
  return (
    <div className="mb-12 last:mb-0 scroll-mt-32" id={`pathway-${pathway}`}>
      <div className="flex items-center gap-3 mb-4">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <h3 className="text-xl font-bold" style={{ color }}>
          {PATHWAY_LABEL[pathway] || pathway}
        </h3>
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
        <p className="mt-1 text-xs text-gray-500">📅 {formatProgrammeDate(programme)}</p>
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
