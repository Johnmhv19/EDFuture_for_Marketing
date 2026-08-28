// Admin edit page for a single programme.
// Renders the metadata form (save via JSON PATCH), the file list with
// delete buttons, and a drop-zone / file picker for new uploads.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { LEVEL_LABEL, LEVEL_SHORT, LEVEL_ORDER, PATHWAY_LABEL, FILE_CATEGORY_LABEL, FILE_CATEGORY_ICON, PATHWAY_COLOR, STATUS_COLOR } from '@/lib/labels';
import EditProgrammeForm from './EditProgrammeForm';
import FilesManager from './FilesManager';

export const dynamic = 'force-dynamic';

export default async function EditProgrammePage({ params }) {
  const { id } = await params;
  const programme = await prisma.programme.findUnique({
    where: { id },
    include: { files: { where: { status: 'ACTIVE' }, orderBy: [{ category: 'asc' }, { uploadedAt: 'desc' }] } },
  });
  if (!programme) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/programmes" className="text-sm text-gray-500 hover:text-gray-900">← All programmes</Link>
        <h1 className="mt-2 text-2xl font-bold">{programme.name}</h1>
        <p className="text-sm text-gray-500">{LEVEL_SHORT[programme.level]} · {PATHWAY_LABEL[programme.pathway]}</p>
      </div>

      <EditProgrammeForm programme={programme} />

      <FilesManager programmeId={programme.id} files={programme.files} />
    </div>
  );
}
