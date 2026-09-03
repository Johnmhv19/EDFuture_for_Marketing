// Admin programme list — server-rendered, with optional ?level= filter.
// Has both Edit and Delete buttons per row. A "?view=delete" param
// draws extra attention to the Delete column for safety.

import Link from 'next/link';
import { prisma } from '@/lib/db';
import { LEVEL_LABEL, LEVEL_SHORT, LEVEL_COLOR, LEVEL_ORDER, PATHWAY_LABEL, PATHWAY_COLOR, STATUS_COLOR, formatProgrammeDate } from '@/lib/labels';
import DeleteButton from './DeleteButton';

export const dynamic = 'force-dynamic';

export default async function AdminProgrammes({ searchParams }) {
  const sp = await searchParams;
  const level = sp?.level && LEVEL_ORDER.includes(sp.level) ? sp.level : null;
  const q = sp?.q || '';
  const deleteMode = sp?.view === 'delete';

  const where = {};
  if (level) where.level = level;
  if (q) where.name = { contains: q };

  const programmes = await prisma.programme.findMany({
    where,
    orderBy: [{ level: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { files: { where: { status: 'ACTIVE' } } } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{deleteMode ? 'Delete a programme' : 'Programmes'}</h1>
          <p className="text-gray-500 text-sm">
            {deleteMode
              ? <>Click <span className="text-red-600 font-semibold">Delete</span> next to the programme you want to remove. Deletion is permanent.</>
              : <>{programmes.length} programme{programmes.length === 1 ? '' : 's'}{level ? ` · ${LEVEL_LABEL[level]}` : ''}</>
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {deleteMode && (
            <Link href="/admin/programmes" className="btn btn-ghost">Done</Link>
          )}
          <Link href="/admin/programmes/new" className="btn btn-primary">+ Add programme</Link>
        </div>
      </div>

      {deleteMode && (
        <div className="card p-4 border-l-4 border-red-500 bg-red-50">
          <div className="font-bold text-red-800">⚠ Delete mode</div>
          <p className="text-sm text-red-700 mt-1">
            Deleting a programme removes it from the database and deletes all its uploaded files.
            This action <strong>cannot be undone</strong>. Consider archiving instead if you just want to hide a programme.
          </p>
        </div>
      )}

      <form className="flex gap-2 flex-wrap" method="get">
        {level && <input type="hidden" name="level" value={level} />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name…"
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded text-sm"
        />
        <button type="submit" className="btn btn-ghost">Search</button>
      </form>

      <div className="flex gap-2 flex-wrap text-sm">
        <span className="text-gray-500">Filter by level:</span>
        <FilterPill href="/admin/programmes" label="All" active={!level} />
        {LEVEL_ORDER.map(l => (
          <FilterPill key={l} href={`/admin/programmes?level=${l}`} label={LEVEL_SHORT[l]} color={LEVEL_COLOR[l]} active={level === l} />
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-gray-600">Programme</th>
              <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-gray-600">Level</th>
              <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-gray-600">Pathway</th>
              <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-gray-600">Status</th>
              <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-gray-600 text-right">Files</th>
              <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-gray-600"></th>
            </tr>
          </thead>
          <tbody>
            {programmes.map(p => (
              <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/programmes/${p.id}`} className="font-medium text-blue-700 hover:underline">
                    {p.name}
                  </Link>
                  <div className="text-xs text-gray-500">📅 {formatProgrammeDate(p)}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="badge" style={{ backgroundColor: LEVEL_COLOR[p.level], color: '#fff' }}>
                    {LEVEL_SHORT[p.level]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PATHWAY_COLOR[p.pathway] }} />
                    {PATHWAY_LABEL[p.pathway]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLOR[p.status] || 'bg-gray-100'}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-600">{p._count.files}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link href={`/admin/programmes/${p.id}`} className="text-blue-700 hover:underline text-xs">Edit</Link>
                    <DeleteButton id={p.id} name={p.name} />
                  </div>
                </td>
              </tr>
            ))}
            {programmes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No programmes match. <Link href="/admin/programmes" className="text-blue-700 hover:underline">Clear filter</Link>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterPill({ href, label, color, active }) {
  return (
    <Link
      href={href}
      className="px-3 py-1 rounded-full text-xs font-semibold"
      style={{
        backgroundColor: active ? (color || '#374151') : '#f3f4f6',
        color: active ? '#fff' : (color || '#374151'),
      }}
    >
      {label}
    </Link>
  );
}
