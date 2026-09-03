// File upload / link / folder for a programme — viewer (and admin)
// endpoint. Allows any authenticated viewer to add a file/link/folder
// to a programme. Differences from the admin endpoint
// (/api/admin/programmes/[id]/files):
//
//   - uploadedByRole is always 'viewer' (or 'admin' if called by an
//     admin — but admins should use the admin endpoint for clarity)
//   - isPublic is forced to true (viewers cannot upload private
//     files; enforced server-side, not just in the UI)
//
// The actual upload + DB write is delegated to handleProgrammeFilePost
// in src/lib/upload.js, shared with the admin endpoint.

import { NextResponse } from 'next/server';
import { handleProgrammeFilePost } from '@/lib/upload';
import { getRole, requireViewer } from '@/lib/auth';
import { ROLE } from '@/lib/auth';

export async function POST(req, ctx) {
  const guard = await requireViewer();
  if (guard) return guard;
  const { id } = await ctx.params;
  const role = await getRole();
  const uploadedByRole = role === ROLE.ADMIN ? 'admin' : 'viewer';
  try {
    const result = await handleProgrammeFilePost({
      req,
      id,
      uploadedByRole,
      // Viewers never get a choice — always public. Admins hitting
      // this endpoint also get the choice (same as the admin
      // endpoint, basically).
      allowIsPublicChoice: role === ROLE.ADMIN,
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch (e) {
    console.error('[POST /api/programmes/[id]/files]', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
