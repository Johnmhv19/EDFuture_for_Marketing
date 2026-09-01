// Public file streaming / link route.
//
// For UPLOAD files: stream the actual bytes from UPLOAD_DIR/storageKey.
// For LINK and FOLDER: 302 redirect to the external URL.
//
// Auth:
//   - UPLOAD / LINK / FOLDER files with isPublic = true: any
//     authenticated viewer (or admin) can fetch.
//   - isPublic = false: admin only. Non-admins get a 404 so the
//     existence of the file is not leaked.
//   - Unauthenticated: 401.
//
// All responses include `X-Content-Type-Options: nosniff` and the
// Content-Disposition is `attachment` (force download) so the
// browser can never render the file in-place as HTML or otherwise
// sniff it. See AUDIT-REPORT.md H-1 / M-3.

import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '@/lib/db';
import { config } from '@/lib/config';
import { isAdmin, isAtLeastViewer } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function safeJoin(base, rel) {
  const full = path.resolve(base, rel);
  if (!full.startsWith(path.resolve(base) + path.sep) && full !== path.resolve(base)) {
    throw new Error('Invalid path');
  }
  return full;
}

export async function GET(req, ctx) {
  try {
    if (!(await isAtLeastViewer())) {
      return new NextResponse(JSON.stringify({ error: 'login required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' },
      });
    }

    const { id } = await ctx.params;
    const file = await prisma.programmeFile.findUnique({ where: { id } });
    if (!file || file.status !== 'ACTIVE') {
      return new NextResponse('Not found', {
        status: 404,
        headers: { 'X-Content-Type-Options': 'nosniff' },
      });
    }

    // Gate by isPublic: non-admins get a 404 (not 403) so the
    // existence of a private file is not leaked. See M-2.
    const admin = await isAdmin();
    if (!admin && !file.isPublic) {
      return new NextResponse('Not found', {
        status: 404,
        headers: { 'X-Content-Type-Options': 'nosniff' },
      });
    }

    // LINK / FOLDER — bounce the user to the external URL.
    if (file.type === 'LINK' || file.type === 'FOLDER') {
      if (!file.url) {
        return new NextResponse('Link missing', {
          status: 410,
          headers: { 'X-Content-Type-Options': 'nosniff' },
        });
      }
      return NextResponse.redirect(file.url, { status: 302 });
    }

    // UPLOAD — stream the file from disk.
    if (!file.storageKey) {
      return new NextResponse('File missing on disk', {
        status: 410,
        headers: { 'X-Content-Type-Options': 'nosniff' },
      });
    }

    let absPath;
    try {
      absPath = safeJoin(config.uploadDir, file.storageKey);
    } catch {
      return new NextResponse('Invalid path', {
        status: 400,
        headers: { 'X-Content-Type-Options': 'nosniff' },
      });
    }

    if (!fs.existsSync(absPath)) {
      return new NextResponse('File missing on disk', {
        status: 410,
        headers: { 'X-Content-Type-Options': 'nosniff' },
      });
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
        // Force download — never let the browser render the file
        // in-place. Combined with nosniff this is the XSS
        // mitigation for stored HTML / JS uploads (H-1).
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    console.error('[GET /api/files/[id]]', e);
    return new NextResponse('Internal error', {
      status: 500,
      headers: { 'X-Content-Type-Options': 'nosniff' },
    });
  }
}
