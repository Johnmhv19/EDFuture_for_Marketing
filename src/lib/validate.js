// Validation helpers shared by API route handlers. Centralised so
// every endpoint that accepts user input applies the same rules.
//
// Used by:
//   - src/app/api/admin/programmes/route.js
//   - src/app/api/admin/programmes/[id]/route.js
//   - src/app/api/admin/programmes/[id]/files/route.js

// Type-check a string-typed field from a JSON body. Trims and
// returns the value, or null if missing/empty. Throws a
// ValidationError if the value is present but not a string.
export function stringOrNull(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new ValidationError('must be a string');
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

// Get a required string field. Returns the trimmed value, or
// throws if missing, empty, or non-string.
export function requireString(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`${fieldName} is required`);
  }
  return value.trim();
}

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
}

// Date helpers for the structured startDate / endDate fields on
// Programme (see AUDIT-REPORT.md and the dates feature shipped
// 2026-09-03). TBD is represented as `null` for both fields. If
// only one is set, that's allowed (programme has one of start or
// end but not the other). If both are set, endDate must be >=
// startDate — enforced by `validateDateRange` below.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Parse a YYYY-MM-DD string (as produced by <input type="date">)
// into a Date object at UTC midnight. Returns null if the value
// is null/empty, or throws a ValidationError if the value is
// present but not a valid date.
export function dateOrNull(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new ValidationError('must be a string in YYYY-MM-DD format');
  }
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (!ISO_DATE.test(trimmed)) {
    throw new ValidationError('must be a YYYY-MM-DD date string');
  }
  // Construct as UTC midnight so the value doesn't drift across
  // server timezones. We use the Date constructor's strict ISO
  // path (YYYY-MM-DD is treated as UTC by the spec).
  const d = new Date(trimmed + 'T00:00:00.000Z');
  if (Number.isNaN(d.getTime())) {
    throw new ValidationError('is not a valid date');
  }
  // Defensive: round-trip check (e.g. 2026-02-31 normalises).
  if (d.toISOString().slice(0, 10) !== trimmed) {
    throw new ValidationError('is not a valid calendar date');
  }
  return d;
}

// Validate that, if both startDate and endDate are set,
// endDate >= startDate. Either may be null. Throws
// ValidationError if the range is inverted.
export function validateDateRange(startDate, endDate) {
  if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
    throw new ValidationError('endDate must be on or after startDate');
  }
}

// Format a Date as a YYYY-MM-DD string, suitable for an
// <input type="date"> default value. Returns '' for null.
export function toDateInputValue(d) {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  // Use UTC so the date displayed in the input is the date the
  // server stored (avoids TZ drift when reading back at midnight).
  return d.toISOString().slice(0, 10);
}

// MIME-type allowlist for uploaded files. Anything outside this
// list is rejected before the bytes are written to disk. See
// AUDIT-REPORT.md H-1.
//
// Categories:
//   - image/*        jpeg, png, gif, webp, svg, avif, …
//   - video/*        mp4, webm, mov, m4v, …
//   - application/pdf
//   - application/zip and the legacy application/x-zip-compressed
//   - Microsoft Word: .doc and .docx
//
// Explicitly REJECTED (with a comment on each so a future
// developer understands why):
//   - text/html, application/xhtml+xml — browser would render the
//     file in the same origin and execute any inline <script>.
//     Even with Content-Disposition: attachment, a 200 OK on
//     same-origin HTML is a stored-XSS risk if the disposition
//     is ever overridden or stripped by a proxy.
//   - application/javascript, text/javascript — same origin
//     script execution.
//   - application/octet-stream — fallback that could mask any
//     real type. Always sniff the real type server-side or
//     require a known type.
const MIME_ALLOWLIST = [
  /^image\//,
  /^video\//,
  /^application\/pdf$/,
  /^application\/zip$/,
  /^application\/x-zip-compressed$/,
  /^application\/msword$/,
  /^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/,
];

const MIME_DENYLIST = [
  /^text\/html$/,
  /^application\/xhtml\+xml$/,
  /^text\/javascript$/,
  /^application\/javascript$/,
  /^application\/x-javascript$/,
  /^text\/xml$/,
  /^application\/xml$/,
  /^image\/svg\+xml$/, // see note below
];

// SVG is technically `image/svg+xml` and matches `image/*` in the
// allowlist, but SVG can contain inline <script> and event
// handlers. We allow it as an image (the user explicitly listed
// image/*) but the file route serves it with
// Content-Disposition: attachment so the browser never renders
// it inline. If you need to lock it down further, add
// `^image\/svg` to the denylist above and accept it as e.g.
// `application/octet-stream` instead.
export function isAllowedMime(mime) {
  if (typeof mime !== 'string' || mime.trim() === '') return false;
  const m = mime.trim().toLowerCase();
  if (MIME_DENYLIST.some(re => re.test(m))) return false;
  return MIME_ALLOWLIST.some(re => re.test(m));
}
