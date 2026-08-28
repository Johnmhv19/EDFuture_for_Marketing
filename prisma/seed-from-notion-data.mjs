// =====================================================
// programme-platform — seed from Notion (offline data dump)
// =====================================================
// Self-contained seed of the 31 programmes from the "Seeds of the
// Future programmes for Marketing" Notion database. The data is
// hardcoded here so you don't need a Notion integration token to
// run it — just run the command and the DB populates.
//
// Source database (Notion):  052db8b1-c3d4-42b3-bb37-fe3120adea4d
// Generated on:              2026-08-28
//
// Run with:  npm run db:seed:notion-data
// Re-runs:   safe (idempotent — uses upsert by name)

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

const PROGRAMMES = [
  { name: 'Y9 Mini EE ML Workshop', level: 'L1', pathway: 'Computer Science / Data Science', status: 'In development', yearLevel: 'Y9', partners: 'Anthony (pilot teacher)', venue: 'TBD', dates: 'TBD', description: 'Pilot Mini EE-style ML workshop for Year 9 students — introduces the inquiry / investigation / reflection process of the IB Extended Essay, using machine learning as the vehicle. Designed in collaboration with Anthony.' },
  { name: 'AI Humanoid Robotics Programme', level: 'L2', pathway: 'Robotics & Engineering', status: 'Confirmed', yearLevel: 'G7/Y8 – A2/Y13', partners: 'LimX Dynamics', venue: 'Shenzhen', dates: 'Feb 2027', description: 'Hands-on programme designing, building, and programming humanoid robots with industry partner LimX Dynamics.' },
  { name: 'Business and Economics Management', level: 'L2', pathway: 'Business / Law', status: 'Confirmed', yearLevel: 'G8/Y9 – AS/Y12', partners: 'PolyU & Hotel Icon', venue: 'Hong Kong', dates: '9–12 Apr 2027', description: 'Business and economics management programme in partnership with PolyU and Hotel Icon — students experience live hospitality and business operations.' },
  { name: 'Cambridge University – Downing College', level: 'L2', pathway: null, status: 'Confirmed', yearLevel: null, partners: null, venue: 'YCIS Hong Kong', dates: 'Jun–Jul 2027', description: 'Cambridge University Downing College summer programme — students experience undergraduate life at a top global university.' },
  { name: 'ChinaOne / Another Country', level: 'L2', pathway: 'Whole-School', status: 'Confirmed', yearLevel: 'G8/Y9 – A2/Y13', partners: null, venue: 'Various', dates: 'Jul–Aug 2027', description: 'ChinaOne / Another Country international programme — students engage in cross-cultural learning and overseas service.' },
  { name: 'Cinematic Arts & Visual Effects Programme', level: 'L2', pathway: 'Creative Experience', status: 'Confirmed', yearLevel: 'G8/Y9 – A2/Y13', partners: 'China Movie Metropolis', venue: 'Qingdao', dates: '22–27 Sep 2026', description: 'Cinematic arts and visual effects programme at China Movie Metropolis — students experience film production, VFX pipelines, and storytelling.' },
  { name: 'Entrepreneur Programme', level: 'L2', pathway: 'Business / Law', status: 'Confirmed', yearLevel: null, partners: 'iD3', venue: 'Beijing', dates: '6–9 Nov 2026', description: 'Entrepreneurship immersion with iD3 — students develop a venture concept from ideation through to investor pitch.' },
  { name: 'Flight Avionics and Simulation', level: 'L2', pathway: 'Robotics & Engineering', status: 'Confirmed', yearLevel: 'G7/Y8 – A2/Y13', partners: 'China Southern Airlines', venue: 'Zhuhai', dates: '17–22 Dec 2026', description: 'Avionics and flight simulation immersion with China Southern Airlines — students experience real cockpit procedures and aerospace engineering workflows.' },
  { name: 'Global Perspectives / Law / Negotiation Programme', level: 'L2', pathway: 'Business / Law', status: 'Confirmed', yearLevel: null, partners: null, venue: 'Shanghai or Beijing', dates: 'Nov or Dec 2026', description: 'Student-led programme covering global perspectives, law, and negotiation — practice diplomacy and international affairs.' },
  { name: 'Medical Advisory Group', level: 'L2', pathway: 'Health & Medicine', status: 'Confirmed', yearLevel: null, partners: 'Various', venue: 'Online', dates: 'Monthly', description: 'Medical advisory group with various practitioners — students hear from and engage with medical professionals monthly.' },
  { name: 'Palaeontological Research Expedition Programme', level: 'L2', pathway: 'Science Research', status: 'Confirmed', yearLevel: 'G6/Y7 – G9/Y10', partners: 'CAS', venue: 'Qujing, Yunnan', dates: '25–28 Nov 2026', description: 'Field expedition with the Chinese Academy of Sciences — students participate in active palaeontological research at a real dig site.' },
  { name: 'Senior Medical Immersion Programme (CQ)', level: 'L2', pathway: 'Health & Medicine', status: 'Confirmed', yearLevel: 'G7/Y8 – A2/Y13', partners: 'Raffles Hospital (CQ)', venue: 'Chongqing', dates: '25–29 Jan 2027', description: 'Senior medical immersion at Raffles Hospital Chongqing — students shadow clinicians across multiple departments.' },
  { name: 'Smart Farm', level: 'L2', pathway: 'Business / Law', status: 'TBD', yearLevel: null, partners: 'SCAU', venue: 'TBD', dates: 'TBD', description: 'Smart agriculture programme with South China Agricultural University — students explore IoT, agritech, and food systems innovation.' },
  { name: 'TEDx', level: 'L2', pathway: 'Whole-School', status: 'Confirmed', yearLevel: null, partners: 'Various', venue: 'Lingang Campus', dates: '28–29 May 2027', description: 'TEDx event hosted at Lingang Campus — students organise and deliver talks on ideas worth spreading.' },
  { name: 'YCYW Underwater Robotics Design Challenge', level: 'L2', pathway: 'Robotics & Engineering', status: 'Confirmed', yearLevel: 'G5/Y6 – IG1/Y10', partners: 'CeHai Tech', venue: 'Lingang', dates: '11–14 Sep 2026', description: 'Underwater robotics design challenge introducing students to subsea engineering and embedded systems.' },
  { name: 'Architecture Construction Festival / Programme', level: 'L2 & L3', pathway: 'Creative Experience', status: 'Confirmed', yearLevel: 'G8/Y9 – Y11/Y12', partners: 'Tongji University', venue: 'Shanghai', dates: 'Jun 2027', description: 'Architecture construction festival with Tongji University — students design and build physical installations.' },
  { name: 'Future City Programme and Competition', level: 'L2 & L3', pathway: 'Business / Law', status: 'Confirmed', yearLevel: 'G5/Y6 – G9/Y10', partners: 'Future City Comp', venue: 'Beijing', dates: '19–20 Dec 2026', description: 'Future City competition — student teams design a sustainable city 100 years in the future, with modelling and presentation.' },
  { name: 'Planetary Science Research', level: 'L2 & L3', pathway: 'Science Research', status: 'Planned', yearLevel: null, partners: 'HKU, Beihang University', venue: 'TBD', dates: 'Planned for 2028', description: 'Planetary science research programme — students engage in original research with university partners in planetary science and astronomy.' },
  { name: 'BL4S Particle Physics Competition', level: 'L3', pathway: 'Science Research', status: 'Confirmed', yearLevel: null, partners: 'CERN', venue: 'Online / CERN / DESY', dates: 'Starts Oct 2026', description: 'Beamline for Schools particle physics competition at CERN — students design and run a real experiment using CERN/DESY beamtime.' },
  { name: 'China Academic Pentathlon', level: 'L3', pathway: 'Creative Experience', status: 'Confirmed', yearLevel: 'G6/Y7 – G8/Y9', partners: 'Webloom', venue: 'Online / Kunshan', dates: 'Feb / April 2027', description: 'China Academic Pentathlon — interdisciplinary academic competition across five subject areas.' },
  { name: 'HackChina / MIT', level: 'L3', pathway: 'Robotics & Engineering', status: 'TBD', yearLevel: 'Y10 – Y13', partners: 'China / MIT', venue: 'TBD', dates: 'TBD', description: 'Hackathon and innovation programme partnering with MIT — students prototype tech solutions to real-world challenges.' },
  { name: 'HOSA Practice and Competition', level: 'L3', pathway: 'Health & Medicine', status: 'Confirmed', yearLevel: null, partners: 'Webloom', venue: 'Online / CN / US', dates: 'Dec / Mar / Jul', description: 'HOSA practice and competition cycle — students prepare for the international Health Occupations Students of America competition.' },
  { name: 'iGEM Synthetic Biology Competition', level: 'L3', pathway: 'Health & Medicine', status: 'Confirmed', yearLevel: null, partners: 'iGEM', venue: 'Paris', dates: '11–18 Nov 2026', description: 'iGEM (International Genetically Engineered Machine) synthetic biology competition — student teams design and test original biology projects.' },
  { name: 'IMPACT Conference', level: 'L3', pathway: 'Business / Law', status: 'Confirmed', yearLevel: 'G8/Y9 – AS/Y12', partners: 'PolyU & Hotel Icon', venue: 'Hong Kong', dates: '6–8 Dec 2026', description: 'IMPACT conference at PolyU and Hotel Icon — students engage with industry leaders on impact-driven business and leadership.' },
  { name: 'MATE Underwater Robotics Competition', level: 'L3', pathway: 'Robotics & Engineering', status: 'TBD', yearLevel: null, partners: 'MATE Center', venue: 'TBD', dates: 'Apr 2027', description: 'International MATE ROV competition — student teams design and build a remotely operated vehicle to complete underwater mission tasks.' },
  { name: 'Medical Leadership Conference', level: 'L3', pathway: 'Health & Medicine', status: 'TBD', yearLevel: null, partners: 'HK Student + CityU / HKU', venue: 'HK & SH', dates: 'TBD', description: 'Medical leadership conference with HK-based student organisations and CityU / HKU — students engage with healthcare leadership and policy.' },
  { name: 'OSCAR Advanced Research Programme', level: 'L3', pathway: 'Science Research', status: 'Planned', yearLevel: null, partners: 'OSCAR', venue: 'Suzhou', dates: 'Planned for Dec 2027', description: 'Advanced research programme through OSCAR — students undertake a sustained research project under expert mentorship.' },
  { name: 'YCYW Solvay Symposium (Science Research)', level: 'L3', pathway: 'Science Research', status: 'Confirmed', yearLevel: null, partners: null, venue: 'Online, Suzhou', dates: 'End of Oct 2026', description: 'Symposium modelled on the historic Solvay Conferences — students present and discuss frontier science research papers.' },
  { name: 'ACAMIS Tech Conference', level: 'Whole-school', pathway: 'Whole-School', status: 'Confirmed', yearLevel: null, partners: null, venue: 'Keytone Academy', dates: '17–18 Oct 2026', description: 'ACAMIS Technology Conference at Keytone Academy — regional technology and innovation conference.' },
  { name: 'Makers\' Faire', level: 'Whole-school', pathway: 'Whole-School', status: 'Confirmed', yearLevel: null, partners: null, venue: 'Shanghai', dates: '31 Oct – 1 Nov 2026', description: 'Maker Faire Shanghai — student makers showcase projects alongside the international maker community.' },
  { name: 'STEM\'ed Conference', level: 'Whole-school', pathway: 'Whole-School', status: 'Confirmed', yearLevel: null, partners: 'Various', venue: 'YWIES YZ campus', dates: '15–16 Oct 2026', description: 'STEM\'ed Conference at YWIES YZ campus — whole-school STEM showcase and competition.' },
];

async function main() {
  let created = 0, updated = 0;
  for (const p of PROGRAMMES) {
    const level = LEVEL_MAP[p.level] || 'L2';
    const pathway = PATHWAY_MAP[p.pathway] || 'WHOLE_SCHOOL';
    const data = {
      name: p.name,
      level,
      pathway,
      status: p.status || 'Confirmed',
      yearLevel: p.yearLevel || null,
      partners: p.partners || null,
      venue: p.venue || null,
      dates: p.dates || null,
      description: p.description || null,
    };
    const result = await prisma.programme.upsert({
      where: { name: p.name },
      create: data,
      update: data,
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) created++;
    else updated++;
    console.log('  ✓', p.name, '·', level, '·', pathway);
  }
  console.log(`\nDone: ${created} created, ${updated} updated (${PROGRAMMES.length} total).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
