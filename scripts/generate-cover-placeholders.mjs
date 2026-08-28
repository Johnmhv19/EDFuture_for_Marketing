// =====================================================
// generate-cover-placeholders.mjs
// =====================================================
// One-off script: writes a 1200x600 solid-colour PNG with the programme
// name + "YCYW" footer to /workspace/program-platform/data/covers/.
// Skips any programme that already has a file.
//
// The images are placeholders only — replace them via the admin UI.
//
// Requires:   ffmpeg in PATH (uses ffmpeg to rasterize).
// Run with:    node scripts/generate-cover-placeholders.mjs

import { PrismaClient } from '@prisma/client';
import { mkdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const prisma = new PrismaClient();

const OUT_DIR = path.resolve('data/covers');
mkdirSync(OUT_DIR, { recursive: true });

const COLOUR = {
  WHOLE_SCHOOL: '0xef4444',
  ROBOTICS_ENGINEERING: '0x2563eb',
  BUSINESS_LAW: '0xf97316',
  CREATIVE_EXPERIENCE: '0xa855f7',
  HEALTH_MEDICINE: '0x16a34a',
  SCIENCE_RESEARCH: '0x0891b2',
  COMPUTER_SCIENCE_DATA_SCIENCE: '0x6b7280',
};

function safe(s) {
  return s.replace(/'/g, '').replace(/:/g, ' -').replace(/%/g, '').replace(/\\/g, '\\\\');
}

function gen(name, colour, outPath) {
  // Use ffmpeg to draw a coloured image with the name centered.
  const safeName = safe(name);
  const fs1 = 56, fs2 = 32;
  const fc =
    `color=c=${colour}:s=1200x600:d=1[bg];` +
    `[bg]drawtext=text='${safeName}':fontcolor=white:fontsize=${fs1}:x=(w-text_w)/2:y=(h-text_h)/2-30[t1];` +
    `[t1]drawtext=text='YCYW Programme':fontcolor=white@0.7:fontsize=${fs2}:x=(w-text_w)/2:y=h-90[out]`;
  const r = spawnSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'lavfi', '-i', `color=c=${colour}:s=1200x600:d=1`,
    '-filter_complex', fc,
    '-map', '[out]',
    '-frames:v', '1',
    '-q:v', '4',
    outPath,
  ]);
  if (r.status !== 0) {
    console.error('  FAIL', name, r.stderr?.toString().slice(-200));
    return false;
  }
  return true;
}

async function main() {
  const programmes = await prisma.programme.findMany({
    include: { files: { where: { category: 'COVER_IMAGE', status: 'ACTIVE' } } },
  });
  let made = 0, skipped = 0;
  for (const p of programmes) {
    if (p.files.length > 0) { skipped++; continue; }
    const colour = COLOUR[p.pathway] || '0x374151';
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const out = path.join(OUT_DIR, `${slug}.png`);
    if (existsSync(out)) { skipped++; continue; }
    if (gen(p.name, colour, out)) {
      console.log('  ✓', p.name, '→', path.relative(process.cwd(), out));
      made++;
    }
  }
  console.log(`Done: ${made} generated, ${skipped} skipped (already have cover).`);
  console.log(`Now upload these via the admin UI, or place them in the`);
  console.log(`upload dir and link them as 'COVER_IMAGE' via the database.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
