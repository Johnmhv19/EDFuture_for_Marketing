// Admin CRUD for programmes. Auth enforced by middleware.
// POST = create, GET returns a quick list summary.
//
// All input fields are type-checked and trimmed via helpers in
// src/lib/validate.js. The duplicate-name check uses a
// try-around-create on the unique constraint instead of a
// findUnique-then-create pattern, which had a TOCTOU race in
// concurrent submissions. See AUDIT-REPORT.md H-2.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { LEVEL_ORDER, PATHWAY_LABEL } from '@/lib/labels';
import { requireString, stringOrNull, ValidationError } from '@/lib/validate';

const VALID_LEVELS = LEVEL_ORDER;
const VALID_PATHWAYS = Object.keys(PATHWAY_LABEL);
const VALID_STATUSES = ['Confirmed', 'Planned', 'TBD', 'In development'];

function bad(msg, status = 400) { return NextResponse.json({ error: msg }, { status }); }

export async function POST(req) {
  try {
    let body;
    try { body = await req.json(); } catch { return bad('Invalid JSON'); }

    let name, level, pathway, status, yearLevel, partners, venue, dates, description;
    try {
      name = requireString(body.name, 'name');
      level = requireString(body.level, 'level');
      pathway = requireString(body.pathway, 'pathway');
      status = body.status === undefined || body.status === null ? 'Confirmed' : requireString(body.status, 'status');
      yearLevel = stringOrNull(body.yearLevel);
      partners = stringOrNull(body.partners);
      venue = stringOrNull(body.venue);
      dates = stringOrNull(body.dates);
      description = stringOrNull(body.description);
    } catch (e) {
      if (e instanceof ValidationError) return bad(e.message);
      throw e;
    }

    if (!VALID_LEVELS.includes(level)) return bad(`level must be one of ${VALID_LEVELS.join(', ')}`);
    if (!VALID_PATHWAYS.includes(pathway)) return bad(`pathway must be one of ${VALID_PATHWAYS.join(', ')}`);
    if (!VALID_STATUSES.includes(status)) return bad(`status must be one of ${VALID_STATUSES.join(', ')}`);

    // Rely on the DB unique constraint rather than a
    // find-then-create check. If two requests race, one wins and
    // the other gets a P2002 which we translate to 409.
    let p;
    try {
      p = await prisma.programme.create({
        data: {
          name, level, pathway, status,
          yearLevel, partners, venue, dates, description,
        },
      });
    } catch (e) {
      if (e.code === 'P2002') {
        return bad('A programme with that name already exists', 409);
      }
      throw e;
    }
    return NextResponse.json({ id: p.id, ...p }, { status: 201 });
  } catch (e) {
    console.error('[POST /api/admin/programmes]', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const list = await prisma.programme.findMany({ orderBy: [{ level: 'asc' }, { name: 'asc' }] });
    return NextResponse.json({ programmes: list });
  } catch (e) {
    console.error('[GET /api/admin/programmes]', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
