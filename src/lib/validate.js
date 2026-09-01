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
