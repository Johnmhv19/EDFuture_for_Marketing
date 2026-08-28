// DELETE a file. Removes DB row + bytes on disk.

import { NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs';
import { prisma } from '@/lib/db';
import { config } from '@/lib/config';

function bad(msg, status = 400) { return NextResponse.json({ error: msg }, { status }); }

function safeJoin(base, rel) {
  const full = path.resolve(base, rel);
  if (!full.startsWith(path.resolve(base) + path.sep) && full !== path.resolve(base)) {
    throw new Error('Invalid path');
  }
  return full;
}

export async function DELETE(_req, ctx) {
  const { id, fileId } = await ctx.params;
  const file = await prisma.programmeFile.findUnique({ where: { id: fileId } });
  if (!file || file.programmeId !== id) return bad('File not found', 404);

  // Remove from disk (best effort)
  try {
    const abs = safeJoin(config.uploadDir, file.storageKey);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch (e) {
    console.warn(`[delete-file] could not unlink ${file.storageKey}:`, e.message);
  }

  // Hard delete (we don't need soft-delete for now)
  await prisma.programmeFile.delete({ where: { id: fileId } });
  return NextResponse.json({ ok: true });
}
