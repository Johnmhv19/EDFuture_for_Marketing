// Display labels + colour helpers shared across server and client code.
// All "enum" values are plain strings (SQLite + Prisma doesn't support
// native enums). Validated at the application layer in API routes.

export const LEVEL_LABEL = {
  L1: 'L1 — Foundation',
  L2: 'L2 — Intermediate',
  L3: 'L3 — Advanced',
  L2_AND_L3: 'L2 & L3 — Dual Level',
  WHOLE_SCHOOL: 'Whole-School',
};

export const LEVEL_SHORT = {
  L1: 'L1',
  L2: 'L2',
  L3: 'L3',
  L2_AND_L3: 'L2 & L3',
  WHOLE_SCHOOL: 'Whole',
};

export const LEVEL_COLOR = {
  L1: '#2563eb',            // blue
  L2: '#16a34a',            // green
  L3: '#a855f7',            // purple
  L2_AND_L3: '#f97316',      // orange
  WHOLE_SCHOOL: '#ef4444',   // red
};

export const LEVEL_ORDER = ['L1', 'L2', 'L3', 'L2_AND_L3', 'WHOLE_SCHOOL'];

export const PATHWAY_LABEL = {
  WHOLE_SCHOOL: 'Whole-School',
  ROBOTICS_ENGINEERING: 'Robotics & Engineering',
  BUSINESS_LAW: 'Business / Law',
  CREATIVE_EXPERIENCE: 'Creative Experience',
  HEALTH_MEDICINE: 'Health & Medicine',
  SCIENCE_RESEARCH: 'Science Research',
  COMPUTER_SCIENCE_DATA_SCIENCE: 'Computer Science / Data Science',
};

export const PATHWAY_COLOR = {
  WHOLE_SCHOOL: '#ef4444',
  ROBOTICS_ENGINEERING: '#2563eb',
  BUSINESS_LAW: '#f97316',
  CREATIVE_EXPERIENCE: '#a855f7',
  HEALTH_MEDICINE: '#16a34a',
  SCIENCE_RESEARCH: '#0891b2',
  COMPUTER_SCIENCE_DATA_SCIENCE: '#6b7280',
};

// Canonical order for pathway sections. Used by the home page
// view toggle and any other UI that lists pathways. The WHOLE_SCHOOL
// pathway is intentionally NOT in this order — programmes with that
// pathway go in a "Whole School" section at the end of the pathway
// view.
export const PATHWAY_ORDER = [
  'ROBOTICS_ENGINEERING',
  'BUSINESS_LAW',
  'CREATIVE_EXPERIENCE',
  'HEALTH_MEDICINE',
  'SCIENCE_RESEARCH',
  'COMPUTER_SCIENCE_DATA_SCIENCE',
];

export const FILE_CATEGORY_LABEL = {
  VIDEO: 'Video',
  PHOTO: 'Photo',
  ARTICLE: 'Article',
  RESOURCE: 'Resource',
  COVER_IMAGE: 'Cover Image',
};

export const FILE_CATEGORY_ICON = {
  VIDEO: '🎬',
  PHOTO: '📷',
  ARTICLE: '📄',
  RESOURCE: '📦',
  COVER_IMAGE: '🖼',
};

export const FILE_STATUS = { ACTIVE: 'ACTIVE', ARCHIVED: 'ARCHIVED' };
export const FILE_STATUS_ORDER = ['ACTIVE', 'ARCHIVED'];

// File type — how the file is stored/linked.
// UPLOAD = file on disk, served via /api/files/[id]
// LINK   = external URL to a single resource (YouTube, Bilibili, TEAMS doc)
// FOLDER = external URL to a folder of resources (Google Drive, OneDrive)
export const FILE_TYPE_LABEL = {
  UPLOAD: 'Upload file',
  LINK:   'External link',
  FOLDER: 'External folder',
};
export const FILE_TYPE_ICON = {
  UPLOAD: '⬆',
  LINK:   '🔗',
  FOLDER: '📁',
};
export const FILE_TYPES = { UPLOAD: 'UPLOAD', LINK: 'LINK', FOLDER: 'FOLDER' };
export const FILE_TYPE_ORDER = ['UPLOAD', 'LINK', 'FOLDER'];

// Public-visible categories (everything except COVER_IMAGE)
export const PUBLIC_FILE_CATEGORIES = ['VIDEO', 'PHOTO', 'ARTICLE', 'RESOURCE'];

export const STATUS_COLOR = {
  Confirmed: 'bg-emerald-100 text-emerald-800',
  Planned: 'bg-amber-100 text-amber-800',
  TBD: 'bg-gray-100 text-gray-800',
  'In development': 'bg-blue-100 text-blue-800',
};

// Role of the uploader — used to decide who can delete a file.
// Viewers may only delete files they themselves uploaded; admins
// can delete any file.
export const UPLOADED_BY_LABEL = {
  admin: 'Uploaded by admin',
  viewer: 'Uploaded by viewer',
};

export const UPLOADED_BY_BADGE = {
  admin: 'bg-blue-100 text-blue-800',
  viewer: 'bg-emerald-100 text-emerald-800',
};

export const UPLOADED_BY_ORDER = ['admin', 'viewer'];

// -----------------------------------------------------------------
// Date formatting helpers (structured startDate / endDate)
// -----------------------------------------------------------------
// Used by the programme detail page ("Dates" fact) and the home page
// "Coming up" / "Recent past" sections. All inputs may be a Date
// object, an ISO string, or null. Null = TBD (no scheduled date).
//
// We use Intl.DateTimeFormat with en-US so the output is consistent
// across server (Node) and client (browser) runtimes. The output
// is intentionally plain ASCII ("Mon DD, YYYY" / "Sep 5") so it
// renders the same in every locale.

const MONTH_DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const MONTH_DAY_YEAR = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function toDate(d) {
  if (!d) return null;
  if (d instanceof Date) return Number.isNaN(d.getTime()) ? null : d;
  if (typeof d === 'string') {
    // Server sends Date as ISO; client sometimes sees raw YYYY-MM-DD.
    const parsed = new Date(d.length === 10 ? d + 'T00:00:00.000Z' : d);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function sameYear(a, b) {
  return a && b && a.getUTCFullYear() === b.getUTCFullYear();
}

// "Mon DD" or "Mon DD, YYYY" (year only if non-current).
// `currentYear` defaults to this year; pass null to always include
// the year. Used by the programme detail "Dates" row.
export function formatShortDate(d, { currentYear } = {}) {
  const dt = toDate(d);
  if (!dt) return '';
  const yr = currentYear === undefined ? new Date().getUTCFullYear() : currentYear;
  return dt.getUTCFullYear() === yr
    ? MONTH_DAY.format(dt)
    : MONTH_DAY_YEAR.format(dt);
}

// "Mon DD – Mon DD, YYYY" (or full years on both sides if they
// differ). If both dates are in the same year, the year is shown
// only once at the end. Either input may be null.
export function formatDateRange(startDate, endDate, { currentYear } = {}) {
  const s = toDate(startDate);
  const e = toDate(endDate);
  if (s && !e) return formatShortDate(s, { currentYear });
  if (!s && e) return formatShortDate(e, { currentYear });
  if (!s && !e) return '';
  if (s.getTime() === e.getTime()) return formatShortDate(s, { currentYear });
  const yr = currentYear === undefined ? new Date().getUTCFullYear() : currentYear;
  if (sameYear(s, e) && s.getUTCFullYear() === yr) {
    // e.g. "Sep 5 – Sep 9, 2027"
    const left = MONTH_DAY.format(s);
    const right = MONTH_DAY_YEAR.format(e);
    return `${left} \u2013 ${right}`;
  }
  // Different years, or both outside the current year — show
  // full dates on both sides.
  const left = MONTH_DAY_YEAR.format(s);
  const right = MONTH_DAY_YEAR.format(e);
  return `${left} \u2013 ${right}`;
}

// "starts DD MMM" / "ends DD MMM" / "starts DD MMM YYYY" — used by
// the home page "Coming up" / "Recent past" section rows. Returns
// '' if the date is missing.
export function formatRelativeStartLabel(d, { currentYear } = {}) {
  const dt = toDate(d);
  if (!dt) return '';
  const yr = currentYear === undefined ? new Date().getUTCFullYear() : currentYear;
  const tail = dt.getUTCFullYear() === yr
    ? MONTH_DAY.format(dt)
    : MONTH_DAY_YEAR.format(dt);
  return `starts ${tail}`;
}

export function formatRelativeEndLabel(d, { currentYear } = {}) {
  const dt = toDate(d);
  if (!dt) return '';
  const yr = currentYear === undefined ? new Date().getUTCFullYear() : currentYear;
  const tail = dt.getUTCFullYear() === yr
    ? MONTH_DAY.format(dt)
    : MONTH_DAY_YEAR.format(dt);
  return `ended ${tail}`;
}

// Returns true if the date is in the current calendar month
// (server's UTC month, or the supplied `now`). Used to filter
// "Coming up" / "Recent past" rows. A date in the current month
// counts as both "coming up" (if it's a startDate) and "recent
// past" (if it's an endDate).
export function isInCurrentMonth(d, now) {
  const dt = toDate(d);
  if (!dt) return false;
  const n = now || new Date();
  return dt.getUTCFullYear() === n.getUTCFullYear() && dt.getUTCMonth() === n.getUTCMonth();
}

// True if the date is in the current month or any month in the
// future (relative to `now`, defaulting to the current instant).
export function isInCurrentMonthOrFuture(d, now) {
  const dt = toDate(d);
  if (!dt) return false;
  const n = now || new Date();
  // First day of the current month at UTC midnight
  const monthStart = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1);
  const dayStart = Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
  return dayStart >= monthStart;
}

// Format a programme's structured dates (startDate + endDate) for
// display in cards, list rows, and sidebars. Returns "TBD" when
// both fields are null (the default for programmes that haven't
// been scheduled yet). Otherwise delegates to formatDateRange for
// the actual rendering.
//
// The free-text `dates` column on the Programme model is no longer
// surfaced in the UI — every visible "Date" label now comes from
// this helper. The column itself is kept in the schema for now to
// avoid a destructive migration; admin forms no longer write to it.
export function formatProgrammeDate(programme) {
  if (!programme) return '';
  const { startDate, endDate } = programme;
  if (!startDate && !endDate) return 'TBD';
  return formatDateRange(startDate, endDate);
}

// True if the date is in the current month or any month in the
// past (relative to `now`). Strictly before next month, inclusive
// of the current month.
export function isInCurrentMonthOrPast(d, now) {
  const dt = toDate(d);
  if (!dt) return false;
  const n = now || new Date();
  const monthStart = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1);
  const nextMonthStart = Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 1);
  const dayStart = Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
  return dayStart >= monthStart && dayStart < nextMonthStart;
}

// True if the date is strictly in the past (before the current
// instant). Used to exclude already-finished programmes from the
// "Coming up" section.
export function isInPast(d, now) {
  const dt = toDate(d);
  if (!dt) return false;
  const n = now || new Date();
  return dt.getTime() < n.getTime();
}
