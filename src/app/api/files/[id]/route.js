// Public file streaming / link route.
//
// For UPLOAD files: stream the actual bytes from UPLOAD_DIR/storageKey.
// For LINK and FOLDER: 302 redirect to the external URL.
//
// Anyone with a valid viewer or admin session can fetch these. They
// are the marketing team's public assets.

import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '@/lib/db';
import { config } from '@/lib/config';
import { requireViewer } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function safeJoin(base, rel) {
  const full = path.resolve(base, rel);
  if (!full.startsWith(path.resolve(base) + path.sep) && full !== path.resolve(base)) {
    throw new Error('Invalid path');
  }
  return full;
}

export async function GET(req, ctx) {
  const denied = await requireViewer();
  if (denied) return denied;

  const { id } = await ctx.params;
  const file = await prisma.programmeFile.findUnique({ where: { id } });
  if (!file || file.status !== 'ACTIVE') {
    return new NextResponse('Not found', { status: 404 });
  }

  // LINK / FOLDER — bounce the user to the external URL.
  if (file.type === 'LINK' || file.type === 'FOLDER') {
    if (!file.url) {
      return new NextResponse('Link missing', { status: 410 });
    }
    return NextResponse.redirect(file.url, { status: 302 });
  }

  // UPLOAD — stream the file from disk.
  if (!file.storageKey) {
    return new NextResponse('File missing on disk', { status: 410 });
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
  const webStream = new ReadableStream({
    start(controller) {
      stream.on('data', chunk => controller.enqueue(chunk));
      stream.on('end', () => controller.close());
      stream.on('error', err => controller.error(err));
    },
    cancel() { stream.destroy(); },
  });

  const filename = file.originalName || file.displayName;
  return new NextResponse(webStream, {
    headers: {
      'Content-Type': file.mimeType || 'application/octet-stream',
      'Content-Length': String(stat.size),
      'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
      'Cache-Control': 'private, max-age=300',
    },
  });
}
