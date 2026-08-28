// Public file streaming route. Serves the actual bytes from
// UPLOAD_DIR / storageKey. Anyone (no auth) can read these — they
// are the public marketing assets.

import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '@/lib/db';
import { config } from '@/lib/config';
import { requireViewer } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function safeJoin(base, rel) {
  // Defence-in-depth: block path traversal.
  const full = path.resolve(base, rel);
  if (!full.startsWith(path.resolve(base) + path.sep) && full !== path.resolve(base)) {
    throw new Error('Invalid path');
  }
  return full;
}

export async function GET(req, ctx) {
  // Require at least viewer (i.e. logged in). Public visitors don't
  // get files; the marketing team uses the viewer token.
  const denied = await requireViewer();
  if (denied) return denied;

  const { id } = await ctx.params;
  const file = await prisma.programmeFile.findUnique({ where: { id } });
  if (!file || file.status !== 'ACTIVE') {
    return new NextResponse('Not found', { status: 404 });
  }

  let absPath;
  try {
    absPath = safeJoin(config.uploadDir, file.storageKey);
  } catch {
    return new NextResponse('Invalid path', { status: 400 });
  }

  if (!fs.existsSync(absPath)) {
    return new NextResponse('File missing on disk', { status: 410 });
  }

  const stat = fs.statSync(absPath);
  const stream = fs.createReadStream(absPath);
  // Convert Node stream to Web ReadableStream
  const webStream = new ReadableStream({
    start(controller) {
      stream.on('data', chunk => controller.enqueue(chunk));
      stream.on('end', () => controller.close());
      stream.on('error', err => controller.error(err));
    },
    cancel() { stream.destroy(); },
  });

  return new NextResponse(webStream, {
    headers: {
      'Content-Type': file.mimeType || 'application/octet-stream',
      'Content-Length': String(stat.size),
      'Content-Disposition': `inline; filename="${encodeURIComponent(file.originalName)}"`,
      'Cache-Control': 'private, max-age=300',
    },
  });
}
