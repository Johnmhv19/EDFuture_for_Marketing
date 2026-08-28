// Display labels + colour helpers shared across server and client code.
// All "enum" values are plain strings (SQLite + Prisma doesn't support
// native enums). Validated at the application layer in API routes.

export const LEVEL_LABEL = {
  L1: 'L1 — Foundation',
  L2: 'L2 — Intermediate',
  L3: 'L3 — Advanced',
  L2_AND_L3: 'L2 & L3 — Dual Level',
  WHOLE_SCHOOL: 'Whole-School',
};

export const LEVEL_SHORT = {
  L1: 'L1',
  L2: 'L2',
  L3: 'L3',
  L2_AND_L3: 'L2 & L3',
  WHOLE_SCHOOL: 'Whole',
};

export const LEVEL_COLOR = {
  L1: '#2563eb',            // blue
  L2: '#16a34a',            // green
  L3: '#a855f7',            // purple
  L2_AND_L3: '#f97316',      // orange
  WHOLE_SCHOOL: '#ef4444',   // red
};

export const LEVEL_ORDER = ['L1', 'L2', 'L3', 'L2_AND_L3', 'WHOLE_SCHOOL'];

export const PATHWAY_LABEL = {
  WHOLE_SCHOOL: 'Whole-School',
  ROBOTICS_ENGINEERING: 'Robotics & Engineering',
  BUSINESS_LAW: 'Business / Law',
  CREATIVE_EXPERIENCE: 'Creative Experience',
  HEALTH_MEDICINE: 'Health & Medicine',
  SCIENCE_RESEARCH: 'Science Research',
  COMPUTER_SCIENCE_DATA_SCIENCE: 'Computer Science / Data Science',
};

export const PATHWAY_COLOR = {
  WHOLE_SCHOOL: '#ef4444',
  ROBOTICS_ENGINEERING: '#2563eb',
  BUSINESS_LAW: '#f97316',
  CREATIVE_EXPERIENCE: '#a855f7',
  HEALTH_MEDICINE: '#16a34a',
  SCIENCE_RESEARCH: '#0891b2',
  COMPUTER_SCIENCE_DATA_SCIENCE: '#6b7280',
};

export const FILE_CATEGORY_LABEL = {
  VIDEO: 'Video',
  PHOTO: 'Photo',
  ARTICLE: 'Article',
  RESOURCE: 'Resource',
  COVER_IMAGE: 'Cover Image',
};

export const FILE_CATEGORY_ICON = {
  VIDEO: '🎬',
  PHOTO: '📷',
  ARTICLE: '📄',
  RESOURCE: '📦',
  COVER_IMAGE: '🖼',
};

export const FILE_STATUS = { ACTIVE: 'ACTIVE', ARCHIVED: 'ARCHIVED' };
export const FILE_STATUS_ORDER = ['ACTIVE', 'ARCHIVED'];

// Public-visible categories (everything except COVER_IMAGE)
export const PUBLIC_FILE_CATEGORIES = ['VIDEO', 'PHOTO', 'ARTICLE', 'RESOURCE'];

export const STATUS_COLOR = {
  Confirmed: 'bg-emerald-100 text-emerald-800',
  Planned: 'bg-amber-100 text-amber-800',
  TBD: 'bg-gray-100 text-gray-800',
  'In development': 'bg-blue-100 text-blue-800',
};
