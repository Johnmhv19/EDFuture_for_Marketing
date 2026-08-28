// =========================================
// programme-platform — seed (idempotent)
// =========================================
// Optional seed data — a small starter set of programmes to prove the
// schema works without external dependencies. The Notion-specific
// migration is in `seed-from-notion.mjs`.
//
// Run with:   npm run db:seed
// This is safe to re-run: uses upserts keyed on `name`.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STARTER = [
  {
    name: 'Example Programme A',
    level: 'L2',
    pathway: 'ROBOTICS_ENGINEERING',
    status: 'Confirmed',
    yearLevel: 'G7/Y8 – A2/Y13',
    partners: 'Example Partner',
    venue: 'Hong Kong',
    dates: 'Q1 2027',
    description: 'Starter programme. Delete or replace via admin UI.',
  },
  {
    name: 'Example Programme B',
    level: 'L3',
    pathway: 'SCIENCE_RESEARCH',
    status: 'TBD',
    yearLevel: 'AS/Y12 – A2/Y13',
    partners: '',
    venue: 'TBD',
    dates: 'TBD',
    description: 'Second starter programme.',
  },
];

async function main() {
  console.log('Seeding starter programmes…');
  for (const p of STARTER) {
    await prisma.programme.upsert({
      where: { name: p.name },
      create: p,
      update: p,
    });
    console.log('  ✓', p.name);
  }
  console.log('Done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
