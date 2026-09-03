// =====================================================
// HomeDateSections — "Coming up" + "Recent past" cards
// =====================================================
// Server component. Rendered above the search/toggle area on
// the home page. Both sections show a thin-bordered card with up
// to 3 programme rows; an empty section shows muted placeholder
// text (the spec: "If 0 matches: show 'No upcoming programmes
// yet' in muted text. Don't hide the section.").
//
// Data filtering rules (see spec, 2026-09-03):
//
//   Coming up:
//     - startDate is not null
//     - startDate is in the current calendar month OR future
//     - If endDate is set and is in the past, exclude
//     - Sort by startDate ASC, take 3
//
//   Recent past:
//     - endDate is not null
//     - endDate is in the current calendar month OR past
//     - startDate is not null
//     - Sort by endDate DESC, take 3
//
// TBD programmes (both dates null) do NOT appear in either section.

import Link from 'next/link';
import {
  LEVEL_SHORT, LEVEL_COLOR,
  PATHWAY_LABEL, PATHWAY_COLOR,
  isInCurrentMonthOrFuture, isInCurrentMonthOrPast, isInPast,
  formatRelativeStartLabel, formatRelativeEndLabel, formatDateRange,
} from '@/lib/labels';

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
  // Compute `now` once per request so both sections agree on the
  // boundary. UTC-based — the spec's "current calendar month" is
  // defined in terms of Date math, no timezone math needed.
  const now = new Date();
  const comingUp = pickComingUp(programmes, now);
  const recentPast = pickRecentPast(programmes, now);

  return (
    <section className="bg-white">
      <div className="max-w-5xl mx-auto px-6 pt-10 pb-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DateSection
            kind="coming-up"
            title="Coming up"
            subtitle="Programmes starting this month or later"
            programmes={comingUp}
          />
          <DateSection
            kind="recent-past"
            title="Recent past"
            subtitle="Programmes that finished this month or earlier"
            programmes={recentPast}
          />
        </div>
      </div>
    </section>
  );
}

function DateSection({ kind, title, subtitle, programmes }) {
  return (
    <div className="card p-4 flex flex-col">
      <div className="mb-3">
        <div className="text-xs font-bold uppercase tracking-wider text-blue-700">{title}</div>
        <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
      </div>
      {programmes.length === 0 ? (
        <p className="text-sm text-gray-400 italic">
          {kind === 'coming-up' ? 'No upcoming programmes yet.' : 'No past programmes yet.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {programmes.map(p => (
            <DateRow key={p.id} programme={p} kind={kind} />
          ))}
        </ul>
      )}
    </div>
  );
}

function DateRow({ programme, kind }) {
  const pathwayColor = PATHWAY_COLOR[programme.pathway] || '#6b7280';
  const levelColor = LEVEL_COLOR[programme.level] || '#6b7280';
  const dateLabel = kind === 'coming-up'
    ? formatRelativeStartLabel(programme.startDate) || formatDateRange(programme.startDate, programme.endDate)
    : formatRelativeEndLabel(programme.endDate) || formatDateRange(programme.startDate, programme.endDate);
  return (
    <li>
      <Link
        href={`/programmes/${programme.id}`}
        className="block rounded border border-gray-200 hover:border-gray-400 transition overflow-hidden"
      >
        <div
          className="flex items-stretch"
        >
          {/* Pathway colour as the left border bar. */}
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
              <div className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-700">
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
