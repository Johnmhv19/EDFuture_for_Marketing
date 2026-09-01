// Single programme admin operations: PATCH = update, DELETE = remove.
//
// All input fields are type-checked and trimmed via helpers in
// src/lib/validate.js. The duplicate-name check on PATCH uses a
// try-around-create on the unique constraint instead of a
// findFirst-then-update pattern, which had a TOCTOU race in
// concurrent submissions. See AUDIT-REPORT.md H-2.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { LEVEL_ORDER, PATHWAY_LABEL } from '@/lib/labels';
import path from 'node:path';
import fs from 'node:fs';
import { config } from '@/lib/config';
import { stringOrNull, ValidationError } from '@/lib/validate';

const VALID_LEVELS = LEVEL_ORDER;
const VALID_PATHWAYS = Object.keys(PATHWAY_LABEL);
const VALID_STATUSES = ['Confirmed', 'Planned', 'TBD', 'In development'];

function bad(msg, status = 400) { return NextResponse.json({ error: msg }, { status }); }

function safeJoin(base, rel) {
  const full = path.resolve(base, rel);
  if (!full.startsWith(path.resolve(base) + path.sep) && full !== path.resolve(base)) {
    throw new Error('Invalid path');
  }
  return full;
}

export async function PATCH(req, ctx) {
  try {
    const { id } = await ctx.params;
    let body;
    try { body = await req.json(); } catch { return bad('Invalid JSON'); }

    const data = {};
    try {
      for (const k of ['name', 'yearLevel', 'partners', 'venue', 'dates', 'description']) {
        if (k in body) {
          // name is required to be a non-empty string; the other
          // string fields may be null/empty.
          if (k === 'name') {
            if (typeof body.name !== 'string') return bad('name must be a string');
            const trimmed = body.name.trim();
            if (!trimmed) return bad('name must not be empty');
            data.name = trimmed;
          } else {
            data[k] = stringOrNull(body[k]);
          }
        }
      }
    } catch (e) {
      if (e instanceof ValidationError) return bad(e.message);
      throw e;
    }
    if ('level' in body) {
      if (typeof body.level !== 'string' || !VALID_LEVELS.includes(body.level)) {
        return bad(`level must be one of ${VALID_LEVELS.join(', ')}`);
      }
      data.level = body.level;
    }
    if ('pathway' in body) {
      if (typeof body.pathway !== 'string' || !VALID_PATHWAYS.includes(body.pathway)) {
        return bad(`pathway must be one of ${VALID_PATHWAYS.join(', ')}`);
      }
      data.pathway = body.pathway;
    }
    if ('status' in body) {
      if (typeof body.status !== 'string' || !VALID_STATUSES.includes(body.status)) {
        return bad(`status must be one of ${VALID_STATUSES.join(', ')}`);
      }
      data.status = body.status;
    }

    let p;
    try {
      p = await prisma.programme.update({ where: { id }, data });
    } catch (e) {
      if (e.code === 'P2025') return bad('Programme not found', 404);
      if (e.code === 'P2002') return bad('Another programme already has that name', 409);
      throw e;
    }
    return NextResponse.json({ ok: true, programme: p });
  } catch (e) {
    console.error('[PATCH /api/admin/programmes/[id]]', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function DELETE(_req, ctx) {
  try {
    const { id } = await ctx.params;
    // Cascade in Prisma handles file rows. We still need to clean up
    // the actual files on disk.
    const files = await prisma.programmeFile.findMany({ where: { programmeId: id } });
    for (const f of files) {
      try {
        const abs = safeJoin(config.uploadDir, f.storageKey);
        if (fs.existsSync(abs)) fs.unlinkSync(abs);
      } catch (e) {
        // Log but don't fail the whole delete
        console.warn(`[delete] could not unlink ${f.storageKey}:`, e.message);
      }
    }
    try {
      await prisma.programme.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    } catch (e) {
      if (e.code === 'P2025') return bad('Programme not found', 404);
      throw e;
    }
  } catch (e) {
    console.error('[DELETE /api/admin/programmes/[id]]', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
