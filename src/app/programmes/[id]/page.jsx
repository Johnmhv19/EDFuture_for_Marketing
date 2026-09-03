// Programme detail page (public, read-only by default; admins and
// viewers can upload new files via the ViewerFileUploader).
//
// What is shown to whom:
//   - Anyone (unauth or viewer or admin): cover, metadata, public
//     files grouped by category.
//   - Admin: also sees private files (isPublic = false), the upload
//     form, and delete buttons on every file.
//   - Viewer: sees the upload form (forced public), delete buttons
//     only on files they themselves uploaded.
//
// File visibility:
//   - Public (isPublic = true): any viewer (or unauth) can see the
//     file via /api/files/[id]; the page also lists it.
//   - Private (isPublic = false): only admins see it. The public
//     page hides it; the /api/files route 404s for non-admins
//     (existence not leaked). See AUDIT-REPORT.md M-2.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import {
  LEVEL_LABEL, LEVEL_SHORT, LEVEL_COLOR,
  PATHWAY_LABEL, PATHWAY_COLOR,
  FILE_CATEGORY_LABEL, FILE_CATEGORY_ICON, PUBLIC_FILE_CATEGORIES,
  STATUS_COLOR,
  UPLOADED_BY_LABEL, UPLOADED_BY_BADGE,
} from '@/lib/labels';
import { withBase } from '@/lib/basePath';
import { getRole } from '@/lib/auth';
import { ROLE } from '@/lib/auth';
import ViewerFileUploader from './ViewerFileUploader';
import DeleteFileButton from './DeleteFileButton';

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

  const role = await getRole();
  const isAdmin = role === ROLE.ADMIN;
  const isAuthenticated = role === ROLE.ADMIN || role === ROLE.VIEWER;

  // Cover is always shown if it exists. Public viewers only see
  // the cover if its isPublic flag is true.
  const cover = programme.files.find(f => f.category === 'COVER_IMAGE');
  const visibleFiles = isAdmin ? programme.files : programme.files.filter(f => f.isPublic);
  const otherFiles = visibleFiles.filter(f => f.category !== 'COVER_IMAGE');
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
            {/* Upload form (viewers + admins only) */}
            {isAuthenticated && (
              <ViewerFileUploader programmeId={programme.id} />
            )}

            {cover && (isAdmin || cover.isPublic) && (
              <div className="card overflow-hidden">
                <img src={withBase(`/api/files/${cover.id}`)} alt={cover.displayName} className="w-full h-auto" />
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
                    {items.map(f => {
                      const isExternal = f.type === 'LINK' || f.type === 'FOLDER';
                      const href = isExternal ? f.url : withBase(`/api/files/${f.id}`);
                      const icon = f.type === 'FOLDER' ? '📁' : f.type === 'LINK' ? '🔗' : FILE_CATEGORY_ICON[f.category];
                      const meta = isExternal
                        ? shortUrl(f.url)
                        : `${formatBytes(f.sizeBytes)} · ${new Date(f.uploadedAt).toLocaleDateString()}`;
                      // Delete button visibility:
                      //   - admin: always shown
                      //   - viewer: shown only if the file was uploaded by a viewer
                      //   - unauth: never shown
                      const canDelete = isAdmin || (isAuthenticated && f.uploadedByRole === 'viewer');
                      return (
                        <li key={f.id} className="py-3 flex items-center gap-3">
                          <span className="text-2xl">{icon}</span>
                          <div className="flex-1 min-w-0">
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-blue-700 hover:underline truncate block"
                            >
                              {f.displayName}
                            </a>
                            {f.caption && <p className="text-xs text-gray-500">{f.caption}</p>}
                            <p className="text-xs text-gray-400 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                              <span>{meta}</span>
                              {!f.isPublic && (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-200 text-gray-700">
                                  Private
                                </span>
                              )}
                              {f.uploadedByRole && f.uploadedByRole !== 'admin' && (
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${UPLOADED_BY_BADGE[f.uploadedByRole] || 'bg-gray-200 text-gray-700'}`}
                                  title={UPLOADED_BY_LABEL[f.uploadedByRole] || f.uploadedByRole}
                                >
                                  {UPLOADED_BY_LABEL[f.uploadedByRole] || f.uploadedByRole}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isExternal ? (
                              <span className="text-xs text-gray-500 px-3">
                                {f.type === 'FOLDER' ? 'Folder' : 'Link'} ↗
                              </span>
                            ) : (
                              <a
                                href={withBase(`/api/files/${f.id}`)}
                                download
                                className="btn btn-ghost"
                              >
                                Download
                              </a>
                            )}
                            {canDelete && (
                              <DeleteFileButton
                                programmeId={programme.id}
                                fileId={f.id}
                                fileName={f.displayName}
                              />
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}

            {otherFiles.length === 0 && !isAuthenticated && (
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
            {!isAuthenticated && (
              <div className="card p-4 text-xs text-gray-500">
                Sign in to upload files or links to this programme.
              </div>
            )}
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
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function shortUrl(url) {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}
