// Programme detail page (public, read-only).
// Shows the cover, metadata, and all public files (videos, photos,
// articles, resources) grouped by category.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import {
  LEVEL_LABEL, LEVEL_SHORT, LEVEL_COLOR,
  PATHWAY_LABEL, PATHWAY_COLOR,
  FILE_CATEGORY_LABEL, FILE_CATEGORY_ICON, PUBLIC_FILE_CATEGORIES,
  STATUS_COLOR,
} from '@/lib/labels';

export const dynamic = 'force-dynamic';

async function getProgramme(id) {
  return prisma.programme.findUnique({
    where: { id },
    include: {
      files: {
        where: { status: 'ACTIVE' },
        orderBy: [{ category: 'asc' }, { uploadedAt: 'desc' }],
      },
    },
  });
}

export default async function ProgrammePage({ params }) {
  const { id } = await params;
  const programme = await getProgramme(id);
  if (!programme) notFound();

  const cover = programme.files.find(f => f.category === 'COVER_IMAGE');
  const otherFiles = programme.files.filter(f => f.category !== 'COVER_IMAGE');
  const grouped = {};
  for (const cat of PUBLIC_FILE_CATEGORIES) grouped[cat] = [];
  for (const f of otherFiles) (grouped[f.category] ||= []).push(f);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div
        className="text-white"
        style={{ backgroundColor: PATHWAY_COLOR[programme.pathway] }}
      >
        <div className="max-w-5xl mx-auto px-6 py-10">
          <Link href="/" className="text-sm text-white/80 hover:text-white">← All programmes</Link>
          <div className="mt-3 flex items-center gap-2 mb-2">
            <span
              className="badge"
              style={{ backgroundColor: LEVEL_COLOR[programme.level], color: '#fff' }}
            >
              {LEVEL_SHORT[programme.level]}
            </span>
            <span className="text-sm text-white/80">{LEVEL_LABEL[programme.level]}</span>
            <span className="text-sm text-white/80">·</span>
            <span className="text-sm text-white/80">{PATHWAY_LABEL[programme.pathway]}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold">{programme.name}</h1>
          {programme.status && (
            <span className={`mt-3 inline-block text-xs px-2 py-1 rounded ${STATUS_COLOR[programme.status] || 'bg-white/20 text-white'}`}>
              {programme.status}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="md:col-span-2 space-y-6">
            {cover && (
              <div className="card overflow-hidden">
                <img src={`/api/files/${cover.id}`} alt={cover.displayName} className="w-full h-auto" />
              </div>
            )}

            {programme.description && (
              <div className="card p-6">
                <h2 className="text-lg font-bold mb-2">About this programme</h2>
                <p className="text-gray-700 whitespace-pre-line">{programme.description}</p>
              </div>
            )}

            {PUBLIC_FILE_CATEGORIES.map(cat => {
              const items = grouped[cat] || [];
              if (items.length === 0) return null;
              return (
                <div key={cat} className="card p-6">
                  <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                    <span>{FILE_CATEGORY_ICON[cat]}</span>
                    {FILE_CATEGORY_LABEL[cat]}s
                    <span className="text-sm text-gray-500 font-normal">· {items.length}</span>
                  </h2>
                  <ul className="divide-y divide-gray-100">
                    {items.map(f => (
                      <li key={f.id} className="py-3 flex items-center gap-3">
                        <span className="text-2xl">{FILE_CATEGORY_ICON[f.category]}</span>
                        <div className="flex-1 min-w-0">
                          <a
                            href={`/api/files/${f.id}`}
                            target="_blank"
                            rel="noopener"
                            className="font-medium text-blue-700 hover:underline truncate block"
                          >
                            {f.displayName}
                          </a>
                          {f.caption && <p className="text-xs text-gray-500">{f.caption}</p>}
                          <p className="text-xs text-gray-400">
                            {formatBytes(f.sizeBytes)} · {new Date(f.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <a
                          href={`/api/files/${f.id}`}
                          download
                          className="btn btn-ghost"
                        >
                          Download
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}

            {otherFiles.length === 0 && (
              <div className="card p-8 text-center text-gray-500">
                No files uploaded yet.
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="card p-5 space-y-3 text-sm">
              <Fact label="Level" value={LEVEL_LABEL[programme.level]} />
              {programme.yearLevel && <Fact label="Year Level" value={programme.yearLevel} />}
              {programme.partners && <Fact label="Partners" value={programme.partners} />}
              {programme.venue && <Fact label="Venue" value={programme.venue} />}
              {programme.dates && <Fact label="Dates" value={programme.dates} />}
              <Fact label="Status" value={programme.status} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Fact({ label, value }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500 font-bold">{label}</div>
      <div className="text-gray-900">{value}</div>
    </div>
  );
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
