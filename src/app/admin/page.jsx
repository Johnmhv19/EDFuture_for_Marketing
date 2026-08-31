// Admin dashboard — three big "Quick actions" cards (Add / Edit / Delete)
// on top, then stats, then breakdown.
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { LEVEL_LABEL, LEVEL_SHORT, LEVEL_COLOR, LEVEL_ORDER, PATHWAY_LABEL, FILE_CATEGORY_LABEL } from '@/lib/labels';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  const programmes = await prisma.programme.findMany({
    include: { _count: { select: { files: { where: { status: 'ACTIVE' } } } } },
  });
  const byLevel = {};
  for (const lvl of LEVEL_ORDER) byLevel[lvl] = 0;
  for (const p of programmes) byLevel[p.level] = (byLevel[p.level] || 0) + 1;

  const totalFiles = await prisma.programmeFile.count({ where: { status: 'ACTIVE' } });
  const byCat = await prisma.programmeFile.groupBy({
    by: ['category'],
    where: { status: 'ACTIVE' },
    _count: { _all: true },
  });
  const byCatMap = Object.fromEntries(byCat.map(c => [c.category, c._count._all]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500">Manage programmes, files, and content for the marketing team.</p>
      </div>

      {/* ───── Quick actions ───── */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Quick actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionCard
            href="/admin/programmes/new"
            color="#16a34a"
            icon="＋"
            title="Add programme"
            description="Create a new programme from scratch — name, level, pathway, dates, status, description."
          />
          <ActionCard
            href="/admin/programmes"
            color="#2563eb"
            icon="✎"
            title="Edit programmes"
            description="Browse, search, and edit any of the 33 programmes. Update metadata, upload files, change covers."
          />
          <ActionCard
            href="/admin/programmes?view=delete"
            color="#dc2626"
            icon="🗑"
            title="Delete programmes"
            description="Browse the list with delete buttons enabled. Deletion is permanent and removes all files."
          />
        </div>
      </div>

      {/* ───── Stats ───── */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Programmes" value={programmes.length} />
          <Stat label="Active files" value={totalFiles} />
          <Stat label="Levels covered" value={Object.values(byLevel).filter(v => v > 0).length} />
          <Stat label="Pathways covered" value={Object.keys(PATHWAY_LABEL).length} />
        </div>
      </div>

      {/* ───── By level breakdown ───── */}
      <div className="card p-6">
        <h2 className="font-bold mb-4">By level</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {LEVEL_ORDER.map(lvl => (
            <Link
              key={lvl}
              href={`/admin/programmes?level=${lvl}`}
              className="block p-3 rounded border border-gray-200 hover:border-blue-400 transition"
            >
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: LEVEL_COLOR[lvl] }}>
                {LEVEL_SHORT[lvl]}
              </div>
              <div className="text-2xl font-extrabold mt-1">{byLevel[lvl] || 0}</div>
              <div className="text-xs text-gray-500">{LEVEL_LABEL[lvl]}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* ───── By file category breakdown ───── */}
      <div className="card p-6">
        <h2 className="font-bold mb-4">By file category</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(FILE_CATEGORY_LABEL).map(([k, v]) => (
            <div key={k} className="p-3 rounded border border-gray-200">
              <div className="text-2xl font-extrabold">{byCatMap[k] || 0}</div>
              <div className="text-xs text-gray-500">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActionCard({ href, color, icon, title, description }) {
  return (
    <Link
      href={href}
      className="card p-5 hover:shadow-md transition group block"
      style={{ borderTop: `4px solid ${color}` }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0"
          style={{ backgroundColor: color }}
        >
          {icon}
        </div>
        <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-700">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
      <div
        className="mt-3 text-xs font-bold uppercase tracking-wider"
        style={{ color }}
      >
        {title} →
      </div>
    </Link>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card p-4">
      <div className="text-3xl font-extrabold">{value}</div>
      <div className="text-xs uppercase tracking-wide text-gray-500 mt-1">{label}</div>
    </div>
  );
}
