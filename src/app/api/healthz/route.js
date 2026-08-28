// GET /api/healthz — used by DEPLOY.md, uptime checks, and IT.
// Returns 200 if the process can talk to the DB. 503 otherwise.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, ts: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: 'database_unreachable', detail: e.message },
      { status: 503 },
    );
  }
}
