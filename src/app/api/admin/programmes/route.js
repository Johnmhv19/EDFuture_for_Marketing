// Admin CRUD for programmes. Auth enforced by middleware.
// POST = create, GET returns a quick list summary.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { LEVEL_ORDER, PATHWAY_LABEL, FILE_CATEGORY_LABEL } from '@/lib/labels';

const VALID_LEVELS = LEVEL_ORDER;
const VALID_PATHWAYS = Object.keys(PATHWAY_LABEL);
const VALID_STATUSES = ['Confirmed', 'Planned', 'TBD', 'In development'];
const VALID_CATEGORIES = Object.keys(FILE_CATEGORY_LABEL);

function bad(msg, status = 400) { return NextResponse.json({ error: msg }, { status }); }

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return bad('Invalid JSON'); }

  const { name, level, pathway, status, yearLevel, partners, venue, dates, description } = body;

  if (!name?.trim()) return bad('name is required');
  if (!VALID_LEVELS.includes(level)) return bad(`level must be one of ${VALID_LEVELS.join(', ')}`);
  if (!VALID_PATHWAYS.includes(pathway)) return bad(`pathway must be one of ${VALID_PATHWAYS.join(', ')}`);
  if (status && !VALID_STATUSES.includes(status)) return bad(`status must be one of ${VALID_STATUSES.join(', ')}`);

  const existing = await prisma.programme.findUnique({ where: { name: name.trim() } });
  if (existing) return bad('A programme with that name already exists');

  const p = await prisma.programme.create({
    data: {
      name: name.trim(),
      level,
      pathway,
      status: status || 'Confirmed',
      yearLevel: yearLevel?.trim() || null,
      partners: partners?.trim() || null,
      venue: venue?.trim() || null,
      dates: dates?.trim() || null,
      description: description?.trim() || null,
    },
  });
  return NextResponse.json({ id: p.id, ...p }, { status: 201 });
}

export async function GET() {
  const list = await prisma.programme.findMany({ orderBy: [{ level: 'asc' }, { name: 'asc' }] });
  return NextResponse.json({ programmes: list });
}
