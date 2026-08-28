// =====================================================
// programme-platform — seed from Notion
// =====================================================
// Pulls the 31 programmes from the Notion Programmes database
// (the same data that lived in the YCYW teamspace) and writes them
// into the local SQLite database. Idempotent — safe to re-run.
//
// Run with:   npm run db:seed:notion
// Requires:   NOTION_TOKEN env var (a Notion integration token with
//             read access to the Programmes database).
//
// Source database: 052db8b1-c3d4-42b3-bb37-fe3120adea4d

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DB_ID = '052db8b1-c3d4-42b3-bb37-fe3120adea4d';

if (!NOTION_TOKEN) {
  console.error('ERROR: NOTION_TOKEN env var is required.');
  console.error('Generate one at https://www.notion.so/my-integrations and');
  console.error('share the Programmes database with the integration.');
  process.exit(1);
}

// Level / pathway mapping from the Notion values to our DB enums.
const LEVEL_MAP = {
  'L1': 'L1',
  'L2': 'L2',
  'L3': 'L3',
  'L2 & L3': 'L2_AND_L3',
  'Whole-school': 'WHOLE_SCHOOL',
};
const PATHWAY_MAP = {
  'Whole-School': 'WHOLE_SCHOOL',
  'Robotics & Engineering': 'ROBOTICS_ENGINEERING',
  'Business / Law': 'BUSINESS_LAW',
  'Creative Experience': 'CREATIVE_EXPERIENCE',
  'Health & Medicine': 'HEALTH_MEDICINE',
  'Science Research': 'SCIENCE_RESEARCH',
  'Computer Science / Data Science': 'COMPUTER_SCIENCE_DATA_SCIENCE',
};

async function notionQuery(path, body) {
  const res = await fetch(`${NOTION_API}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Notion ${path} ${res.status}: ${txt}`);
  }
  return res.json();
}

async function fetchAllProgrammes() {
  const all = [];
  let cursor;
  do {
    const data = await notionQuery(`/databases/${DB_ID}/query`, {
      page_size: 100,
      start_cursor: cursor,
    });
    all.push(...data.results);
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);
  return all;
}

function extract(p) {
  const props = p.properties || {};
  return {
    name: (props.Name?.title?.[0]?.plain_text) || '(unnamed)',
    level: LEVEL_MAP[props.Level?.select?.name] || 'L2',
    pathway: PATHWAY_MAP[props.Pathway?.select?.name] || 'WHOLE_SCHOOL',
    status: props.Status?.select?.name || 'Confirmed',
    yearLevel: props['Year Level']?.rich_text?.[0]?.plain_text || null,
    partners: props.Partners?.rich_text?.[0]?.plain_text || null,
    venue: props.Venue?.rich_text?.[0]?.plain_text || null,
    dates: props.Dates?.rich_text?.[0]?.plain_text || null,
    description: props.Description?.rich_text?.[0]?.plain_text || null,
  };
}

async function main() {
  console.log('Fetching programmes from Notion…');
  const pages = await fetchAllProgrammes();
  console.log(`  Got ${pages.length} programmes.`);

  let created = 0, updated = 0;
  for (const page of pages) {
    const p = extract(page);
    if (!p.name || p.name === '(unnamed)') continue;
    const result = await prisma.programme.upsert({
      where: { name: p.name },
      create: p,
      update: p,
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) created++;
    else updated++;
    console.log('  ✓', p.name, '·', p.level, '·', p.pathway);
  }
  console.log(`Done: ${created} created, ${updated} updated.`);
  console.log('');
  console.log('NOTE: Cover images from Notion are NOT migrated. Add them');
  console.log('      via the admin UI by uploading a "Cover Image" file per');
  console.log('      programme, or generate placeholders with:');
  console.log('        npm run db:seed   (then upload real ones)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
