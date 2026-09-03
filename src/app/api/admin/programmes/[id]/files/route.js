// File upload / link / folder for a programme — admin endpoint.
//
// Accepts two kinds of request:
//
//   1. UPLOAD (multipart/form-data) — the legacy upload path:
//        - file: one or more files
//        - category: VIDEO | PHOTO | ARTICLE | RESOURCE | COVER_IMAGE
//        - displayName (optional), caption (optional)
//        - isPublic (optional, default true for non-COVER_IMAGE, false for COVER_IMAGE)
//
//   2. LINK or FOLDER (application/json) — a URL to an external resource:
//        { "type": "LINK" | "FOLDER", "url": "...", "category": "...",
//          "displayName": "...", "caption": "...", "isPublic": true|false }
//
// The two are distinguished by Content-Type. UPLOAD is the default if
// no type is specified.
//
// The actual upload + DB write is delegated to handleProgrammeFilePost
// in src/lib/upload.js, which is shared with the viewer endpoint at
// /api/programmes/[id]/files. Behaviour differences (uploadedByRole,
// isPublic defaults) are configured by the caller.

import { NextResponse } from 'next/server';
import { handleProgrammeFilePost } from '@/lib/upload';
import { requireAdmin } from '@/lib/auth';

export async function POST(req, ctx) {
  const guard = await requireAdmin();
  if (guard) return guard;
  const { id } = await ctx.params;
  try {
    const result = await handleProgrammeFilePost({
      req,
      id,
      uploadedByRole: 'admin',
      allowIsPublicChoice: true,
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch (e) {
    console.error('[POST /api/admin/programmes/[id]/files]', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
