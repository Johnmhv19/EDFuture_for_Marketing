// Delete a programme file — canonical endpoint for both admin and
// viewer. Authorization rules:
//
//   - admin: can delete any file
//   - viewer: can delete only files where uploadedByRole === 'viewer'
//   - viewer trying to delete an admin-uploaded file: 404 (not 403,
//     so file existence is not leaked — same pattern as M-2)

import { NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs';
import { prisma } from '@/lib/db';
import { config } from '@/lib/config';
import { getRole, requireViewer } from '@/lib/auth';
import { ROLE } from '@/lib/auth';

function bad(msg, status = 400) { return NextResponse.json({ error: msg }, { status }); }

function safeJoin(base, rel) {
  const full = path.resolve(base, rel);
  if (!full.startsWith(path.resolve(base) + path.sep) && full !== path.resolve(base)) {
    throw new Error('Invalid path');
  }
  return full;
}

export async function DELETE(_req, ctx) {
  const guard = await requireViewer();
  if (guard) return guard;
  const { id, fileId } = await ctx.params;
  const role = await getRole();

  let file;
  try {
    file = await prisma.programmeFile.findUnique({ where: { id: fileId } });
  } catch (e) {
    console.error('[DELETE /api/programmes/[id]/files/[fileId]] prisma failed', e);
    return bad('internal_error', 500);
  }
  if (!file || file.programmeId !== id) {
    return bad('File not found', 404);
  }

  // Authorization: viewers can only delete their own (viewer-uploaded)
  // files. Return 404 (not 403) to avoid leaking file existence to
  // a viewer who is probing for admin-uploaded file IDs.
  if (role !== ROLE.ADMIN && file.uploadedByRole !== 'viewer') {
    return bad('File not found', 404);
  }

  // Remove from disk (best effort)
  if (file.storageKey) {
    try {
      const abs = safeJoin(config.uploadDir, file.storageKey);
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
    } catch (e) {
      console.warn(`[delete-file] could not unlink ${file.storageKey}:`, e.message);
    }
  }

  // Hard delete
  try {
    await prisma.programmeFile.delete({ where: { id: fileId } });
  } catch (e) {
    console.error('[DELETE /api/programmes/[id]/files/[fileId]] prisma delete failed', e);
    return bad('internal_error', 500);
  }
  return NextResponse.json({ ok: true });
}
