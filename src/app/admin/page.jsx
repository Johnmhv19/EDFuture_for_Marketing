// Admin dashboard — quick stats and recent activity.
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Programmes" value={programmes.length} />
        <Stat label="Active files" value={totalFiles} />
        <Stat label="Levels covered" value={Object.values(byLevel).filter(v => v > 0).length} />
        <Stat label="Pathways covered" value={Object.keys(PATHWAY_LABEL).length} />
      </div>

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

      <div>
        <Link href="/admin/programmes" className="btn btn-primary">
          Manage programmes →
        </Link>
      </div>
    </div>
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
