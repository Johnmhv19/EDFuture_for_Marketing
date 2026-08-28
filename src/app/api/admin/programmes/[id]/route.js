// Single programme admin operations: PATCH = update, DELETE = remove.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { LEVEL_ORDER, PATHWAY_LABEL } from '@/lib/labels';
import path from 'node:path';
import fs from 'node:fs';
import { config } from '@/lib/config';

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
  const { id } = await ctx.params;
  let body;
  try { body = await req.json(); } catch { return bad('Invalid JSON'); }

  const data = {};
  for (const k of ['name', 'yearLevel', 'partners', 'venue', 'dates', 'description']) {
    if (k in body) data[k] = body[k]?.trim() || null;
  }
  if ('level' in body) {
    if (!VALID_LEVELS.includes(body.level)) return bad(`level must be one of ${VALID_LEVELS.join(', ')}`);
    data.level = body.level;
  }
  if ('pathway' in body) {
    if (!VALID_PATHWAYS.includes(body.pathway)) return bad(`pathway must be one of ${VALID_PATHWAYS.join(', ')}`);
    data.pathway = body.pathway;
  }
  if ('status' in body) {
    if (!VALID_STATUSES.includes(body.status)) return bad(`status must be one of ${VALID_STATUSES.join(', ')}`);
    data.status = body.status;
  }

  // If name is being changed, enforce uniqueness
  if (data.name) {
    const dup = await prisma.programme.findFirst({ where: { name: data.name, NOT: { id } } });
    if (dup) return bad('Another programme already has that name');
  }

  try {
    const p = await prisma.programme.update({ where: { id }, data });
    return NextResponse.json({ ok: true, programme: p });
  } catch (e) {
    if (e.code === 'P2025') return bad('Programme not found', 404);
    return bad(e.message);
  }
}

export async function DELETE(_req, ctx) {
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
    return bad(e.message);
  }
}
