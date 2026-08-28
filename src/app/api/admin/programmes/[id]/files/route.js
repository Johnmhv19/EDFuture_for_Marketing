// File upload for a programme. multipart/form-data with:
//   - file: one or more files
//   - category: one of FILE_CATEGORY_LABEL keys
//   - displayName (optional)
//   - caption (optional)

import { NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { prisma } from '@/lib/db';
import { config } from '@/lib/config';
import { FILE_CATEGORY_LABEL } from '@/lib/labels';

const VALID_CATEGORIES = Object.keys(FILE_CATEGORY_LABEL);
const SAFE_NAME = /[^a-zA-Z0-9._-]/g;

function bad(msg, status = 400) { return NextResponse.json({ error: msg }, { status }); }

function safeJoin(base, rel) {
  const full = path.resolve(base, rel);
  if (!full.startsWith(path.resolve(base) + path.sep) && full !== path.resolve(base)) {
    throw new Error('Invalid path');
  }
  return full;
}

function storageKey(programmeId, originalName) {
  // Random prefix to avoid collisions; preserve original extension.
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext).replace(SAFE_NAME, '_').slice(0, 80);
  const rand = crypto.randomBytes(6).toString('hex');
  return path.join(programmeId, `${Date.now()}_${rand}_${base}${ext}`);
}

export async function POST(req, ctx) {
  const { id } = await ctx.params;

  const programme = await prisma.programme.findUnique({ where: { id } });
  if (!programme) return bad('Programme not found', 404);

  let form;
  try {
    form = await req.formData();
  } catch (e) {
    return bad('Could not parse form data');
  }

  const category = form.get('category');
  if (!category || !VALID_CATEGORIES.includes(category)) {
    return bad(`category must be one of ${VALID_CATEGORIES.join(', ')}`);
  }
  const displayName = form.get('displayName')?.toString().trim() || null;
  const caption = form.get('caption')?.toString().trim() || null;
  const files = form.getAll('file').filter(f => f && typeof f === 'object' && 'arrayBuffer' in f);

  if (files.length === 0) return bad('No files provided');

  const maxBytes = config.maxUploadMb * 1024 * 1024;
  const created = [];
  const errors = [];

  for (const f of files) {
    if (f.size > maxBytes) {
      errors.push(`${f.name}: exceeds ${config.maxUploadMb} MB`);
      continue;
    }
    const key = storageKey(id, f.name);
    let abs;
    try { abs = safeJoin(config.uploadDir, key); }
    catch { errors.push(`${f.name}: invalid filename`); continue; }

    // Ensure dir exists
    try { fs.mkdirSync(path.dirname(abs), { recursive: true }); }
    catch (e) { errors.push(`${f.name}: mkdir failed`); continue; }

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
          originalName: f.name,
          displayName: displayName || f.name,
          storageKey: key,
          mimeType: f.type || 'application/octet-stream',
          sizeBytes: f.size,
          caption: caption || null,
        },
      });
      created.push(row.id);
    } catch (e) {
      errors.push(`${f.name}: db insert failed (${e.message})`);
      // Best-effort cleanup
      try { fs.unlinkSync(abs); } catch {}
    }
  }

  return NextResponse.json({ created, errors }, { status: 201 });
}
