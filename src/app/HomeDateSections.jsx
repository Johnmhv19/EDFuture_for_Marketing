// =====================================================
// HomeDateSections — "Coming up" / "Recent past" toggle
// =====================================================
// Client component. Rendered above the search/toggle area on
// the home page. A two-button toggle (Coming up | Recent past)
// selects which window to show. Default is "Coming up" on first
// load; the choice persists in localStorage as `pp.dateView` so
// it survives page reloads.
//
// Data filtering rules (unchanged from the 2026-09-03 spec):
//
//   Coming up:
//     - startDate is not null
//     - startDate is in the current calendar month OR future
//     - If endDate is set and is in the past, exclude
//     - Sort by startDate ASC, take 3
//
//   Recent past:
//     - endDate is not null
//     - startDate is not null
//     - endDate is in the current calendar month OR past
//     - Sort by endDate DESC, take 3
//
// TBD programmes (both dates null) do NOT appear in either window.

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LEVEL_SHORT, LEVEL_COLOR,
  PATHWAY_LABEL, PATHWAY_COLOR,
  isInCurrentMonthOrFuture, isInCurrentMonthOrPast, isInPast,
  formatRelativeStartLabel, formatRelativeEndLabel, formatDateRange,
} from '@/lib/labels';

const VIEW_KEY = 'pp.dateView';
const VIEW_UPCOMING = 'upcoming';
const VIEW_PAST = 'past';
const TAKE = 3;

function pickComingUp(programmes, now) {
  return programmes
    .filter(p => p.startDate)
    .filter(p => isInCurrentMonthOrFuture(p.startDate, now))
    .filter(p => !(p.endDate && isInPast(p.endDate, now)))
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    .slice(0, TAKE);
}

function pickRecentPast(programmes, now) {
  return programmes
    .filter(p => p.endDate)
    .filter(p => p.startDate)
    .filter(p => isInCurrentMonthOrPast(p.endDate, now))
    .sort((a, b) => new Date(b.endDate) - new Date(a.endDate))
    .slice(0, TAKE);
}

export default function HomeDateSections({ programmes }) {
  // SSR-safe: default to 'upcoming' on the server. After hydration
  // we read localStorage and switch if it says otherwise. The first
  // paint therefore matches the server HTML, avoiding a hydration
  // mismatch warning.
  const [view, setView] = useState(VIEW_UPCOMING);

  useEffect(() => {
    let stored = null;
    try { stored = localStorage.getItem(VIEW_KEY); } catch { /* SSR or quota */ }
    if (stored === VIEW_PAST || stored === VIEW_UPCOMING) {
      setView(stored);
    }
  }, []);

  function selectView(next) {
    setView(next);
    try { localStorage.setItem(VIEW_KEY, next); } catch { /* ignore */ }
  }

  // Compute `now` on render so it stays in sync with the user's
  // current time. Cheap (single Date construction per render).
  const now = new Date();
  const items = view === VIEW_PAST ? pickRecentPast(programmes, now) : pickComingUp(programmes, now);
  const emptyMessage = view === VIEW_PAST
    ? 'No past programmes yet.'
    : 'No upcoming programmes yet.';
  const subtitle = view === VIEW_PAST
    ? 'Programmes that finished this month or earlier'
    : 'Programmes starting this month or later';

  return (
    <section className="bg-white">
      <div className="max-w-5xl mx-auto px-6 pt-10 pb-2">
        <div className="card p-4 flex flex-col">
          {/* Toggle header — same look as the By Level / By Pathway
              toggle further down the page so the UI feels consistent. */}
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-blue-700">
                {view === VIEW_PAST ? 'Recent past' : 'Coming up'}
              </div>
              <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
            </div>
            <div
              role="tablist"
              aria-label="Date window"
              className="inline-flex rounded border border-gray-200 overflow-hidden text-sm"
            >
              <ToggleButton
                label="Coming up"
                active={view === VIEW_UPCOMING}
                onClick={() => selectView(VIEW_UPCOMING)}
              />
              <ToggleButton
                label="Recent past"
                active={view === VIEW_PAST}
                onClick={() => selectView(VIEW_PAST)}
              />
            </div>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-2">{emptyMessage}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {items.map(p => (
                <DateRow key={p.id} programme={p} view={view} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function ToggleButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        'px-3 py-1 transition ' +
        (active
          ? 'bg-blue-600 text-white'
          : 'bg-white text-gray-700 hover:bg-gray-50')
      }
    >
      {label}
    </button>
  );
}

function DateRow({ programme, view }) {
  const pathwayColor = PATHWAY_COLOR[programme.pathway] || '#6b7280';
  const levelColor = LEVEL_COLOR[programme.level] || '#6b7280';
  const dateLabel = view === VIEW_PAST
    ? formatRelativeEndLabel(programme.endDate) || formatDateRange(programme.startDate, programme.endDate)
    : formatRelativeStartLabel(programme.startDate) || formatDateRange(programme.startDate, programme.endDate);
  return (
    <li>
      <Link
        href={`/programmes/${programme.id}`}
        className="block rounded border border-gray-200 hover:border-gray-400 transition overflow-hidden"
      >
        <div className="flex items-stretch">
          <div className="w-1.5 shrink-0" style={{ backgroundColor: pathwayColor }} />
          <div className="flex-1 p-2.5 flex items-center gap-2 min-w-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white shrink-0"
                  style={{ backgroundColor: levelColor }}
                >
                  {LEVEL_SHORT[programme.level]}
                </span>
                <span className="text-[10px] text-gray-500 truncate">
                  {PATHWAY_LABEL[programme.pathway] || programme.pathway}
                </span>
              </div>
              <div className="text-sm font-semibold text-gray-900 truncate">
                {programme.name}
              </div>
              <div className="text-[11px] text-gray-500">
                {dateLabel || formatDateRange(programme.startDate, programme.endDate)}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
}
