// Dedicated page for creating a new programme. Replaces the modal —
// clearer flow, full page to fill in the form, no clicking around.

import Link from 'next/link';
import NewProgrammeForm from './NewProgrammeForm';

export const dynamic = 'force-dynamic';

export default function NewProgrammePage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/admin/programmes" className="text-sm text-gray-500 hover:text-gray-900">
          ← All programmes
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Add a new programme</h1>
        <p className="text-gray-500 text-sm">Fill in the details below. You can edit anything later.</p>
      </div>

      <NewProgrammeForm />
    </div>
  );
}
