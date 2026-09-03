// Shared file upload / link / folder handler. Used by both the
// admin endpoint (src/app/api/admin/programmes/[id]/files/route.js)
// and the viewer endpoint (src/app/api/programmes/[id]/files/route.js).
//
// Both endpoints share:
//   - the same MIME allowlist (H-1 must not regress)
//   - the same path-traversal-safe filename handling
//   - the same input type-check + try/catch pattern (H-2 must not regress)
//
// They differ in:
//   - which role is allowed to call the endpoint (enforced by the
//     route's own require*() check, NOT here)
//   - the value of `uploadedByRole` (admin → 'admin', viewer → 'viewer')
//   - whether `isPublic` is forced to true (viewer) or taken from the
//     request body (admin)

import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { prisma } from '@/lib/db';
import { config } from '@/lib/config';
import { FILE_CATEGORY_LABEL, FILE_TYPES } from '@/lib/labels';
import { isAllowedMime, stringOrNull, ValidationError } from '@/lib/validate';

export const VALID_CATEGORIES = Object.keys(FILE_CATEGORY_LABEL);
export const VALID_TYPES = Object.keys(FILE_TYPES);

export function safeJoin(base, rel) {
  const full = path.resolve(base, rel);
  if (!full.startsWith(path.resolve(base) + path.sep) && full !== path.resolve(base)) {
    throw new Error('Invalid path');
  }
  return full;
}

export function storageKey(programmeId, originalName) {
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const rand = crypto.randomBytes(6).toString('hex');
  return path.join(programmeId, `${Date.now()}_${rand}_${base}${ext}`);
}

// Parse an `isPublic` form value. Accepts "true" / "1" / "yes" /
// "false" / "0" / "no" / anything else (default behaviour). Returns
// a boolean.
function parseIsPublic(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'string') return Boolean(raw);
  const v = raw.trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes') return true;
  if (v === 'false' || v === '0' || v === 'no') return false;
  return Boolean(raw);
}

// Handle a POST request to a programme files endpoint. Distinguishes
// UPLOAD (multipart/form-data) from LINK / FOLDER (application/json).
//
// `ctx` carries the request and route params:
//   - req: the NextRequest
//   - id: programme id (resolved from route params)
//   - uploadedByRole: 'admin' or 'viewer' (set by the calling route)
//   - allowIsPublicChoice: true for admin (can choose), false for
//     viewer (forced to true on every upload)
//
// Returns a NextResponse — never throws. All input validation is
// type-checked + try/catched (H-2 must not regress).
export async function handleProgrammeFilePost({ req, id, uploadedByRole, allowIsPublicChoice }) {
  if (uploadedByRole !== 'admin' && uploadedByRole !== 'viewer') {
    return { status: 500, body: { error: 'internal_error' } };
  }
  if (!allowIsPublicChoice && uploadedByRole !== 'viewer') {
    // safety: should never happen — admin always gets the choice
    allowIsPublicChoice = true;
  }

  let programme;
  try {
    programme = await prisma.programme.findUnique({ where: { id } });
  } catch (e) {
    console.error('[upload] prisma findUnique failed', e);
    return { status: 500, body: { error: 'internal_error' } };
  }
  if (!programme) return { status: 404, body: { error: 'Programme not found' } };

  const contentType = req.headers.get('content-type') || '';

  // ── JSON path (LINK / FOLDER) ─────────────────────────────────
  if (contentType.includes('application/json')) {
    let body;
    try { body = await req.json(); } catch (e) {
      return { status: 400, body: { error: 'Invalid JSON: ' + e.message } };
    }
    const { type, url, category, displayName, caption, isPublic } = body;

    if (!type || !VALID_TYPES.includes(type)) {
      return { status: 400, body: { error: `type must be one of ${VALID_TYPES.join(', ')}` } };
    }
    if (type === 'UPLOAD') {
      return { status: 400, body: { error: 'For UPLOAD type, send multipart/form-data (not JSON)' } };
    }
    if (!url || !/^https?:\/\//i.test(url)) {
      return { status: 400, body: { error: 'url is required and must start with http:// or https://' } };
    }
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return { status: 400, body: { error: `category must be one of ${VALID_CATEGORIES.join(', ')}` } };
    }
    if (typeof url !== 'string') {
      return { status: 400, body: { error: 'url must be a string' } };
    }
    // Reject non-admin requests trying to set isPublic = false
    // (server-side enforcement — H-2 must not regress).
    if (!allowIsPublicChoice && isPublic === false) {
      return { status: 400, body: { error: 'Viewers cannot upload private files' } };
    }

    let dn, cap;
    try {
      dn = stringOrNull(displayName) || url;
      cap = stringOrNull(caption);
    } catch (e) {
      if (e instanceof ValidationError) return { status: 400, body: { error: e.message } };
      throw e;
    }

    // Force isPublic = true for viewers; admin can choose via JSON
    // body (but default = category !== 'COVER_IMAGE').
    const finalIsPublic = allowIsPublicChoice
      ? (typeof isPublic === 'boolean' ? isPublic : category !== 'COVER_IMAGE')
      : true;

    try {
      const row = await prisma.programmeFile.create({
        data: {
          programmeId: id,
          category,
          type,
          displayName: dn,
          url: url.trim(),
          caption: cap,
          isPublic: finalIsPublic,
          uploadedByRole,
        },
      });
      return { status: 201, body: { created: [row.id], errors: [] } };
    } catch (e) {
      console.error('[upload] db insert failed (link/folder)', e);
      return { status: 500, body: { error: 'internal_error' } };
    }
  }

  // ── Multipart path (UPLOAD) ──────────────────────────────────
  let form;
  try { form = await req.formData(); } catch {
    return { status: 400, body: { error: 'Could not parse form data' } };
  }

  const category = form.get('category');
  if (!category || !VALID_CATEGORIES.includes(category)) {
    return { status: 400, body: { error: `category must be one of ${VALID_CATEGORIES.join(', ')}` } };
  }

  let displayName, caption, isPublicRaw;
  try {
    displayName = stringOrNull(form.get('displayName'));
    caption = stringOrNull(form.get('caption'));
    isPublicRaw = form.get('isPublic');
  } catch (e) {
    if (e instanceof ValidationError) return { status: 400, body: { error: e.message } };
    throw e;
  }

  // Reject non-admin requests trying to set isPublic = false
  if (!allowIsPublicChoice) {
    if (isPublicRaw !== null) {
      const v = typeof isPublicRaw === 'string' ? isPublicRaw.trim().toLowerCase() : isPublicRaw;
      const wantsFalse = (v === 'false' || v === '0' || v === 'no');
      if (wantsFalse) {
        return { status: 400, body: { error: 'Viewers cannot upload private files' } };
      }
    }
  }

  // isPublic:
  //   - admin + body supplied: parse from body
  //   - admin + body absent:    default = category !== 'COVER_IMAGE'
  //   - viewer:                 forced to true
  let isPublic;
  if (!allowIsPublicChoice) {
    isPublic = true;
  } else if (isPublicRaw === null) {
    isPublic = category !== 'COVER_IMAGE';
  } else {
    const parsed = parseIsPublic(isPublicRaw);
    isPublic = parsed === null ? (category !== 'COVER_IMAGE') : parsed;
  }

  const files = form.getAll('file').filter(f => f && typeof f === 'object' && 'arrayBuffer' in f);
  if (files.length === 0) return { status: 400, body: { error: 'No files provided' } };

  const maxBytes = config.maxUploadMb * 1024 * 1024;
  const created = [];
  const errors = [];

  for (const f of files) {
    if (f.size > maxBytes) {
      errors.push(`${f.name}: exceeds ${config.maxUploadMb} MB`);
      continue;
    }
    // MIME allowlist — reject HTML, JS, and anything outside the
    // safe list BEFORE writing the bytes to disk. See
    // AUDIT-REPORT.md H-1.
    if (!isAllowedMime(f.type)) {
      errors.push(`${f.name}: mime type "${f.type || 'unknown'}" is not allowed`);
      continue;
    }
    const key = storageKey(id, f.name);
    let abs;
    try { abs = safeJoin(config.uploadDir, key); }
    catch { errors.push(`${f.name}: invalid filename`); continue; }

    try { fs.mkdirSync(path.dirname(abs), { recursive: true }); }
    catch { errors.push(`${f.name}: mkdir failed`); continue; }

    try {
      const buf = Buffer.from(await f.arrayBuffer());
      fs.writeFileSync(abs, buf);
    } catch (e) {
      errors.push(`${f.name}: write failed (${e.message})`);
      continue;
    }

    try {
      const row = await prisma.programmeFile.create({
        data: {
          programmeId: id,
          category,
          type: 'UPLOAD',
          originalName: f.name,
          displayName: displayName || f.name,
          storageKey: key,
          mimeType: f.type,
          sizeBytes: f.size,
          caption: caption,
          isPublic,
          uploadedByRole,
        },
      });
      created.push(row.id);
    } catch (e) {
      errors.push(`${f.name}: db insert failed (${e.message})`);
      try { fs.unlinkSync(abs); } catch {}
    }
  }

  return { status: 201, body: { created, errors } };
}
