// Centralised env config + path helpers. Read once at module load.
// Throws clearly if something required is missing.

import path from 'node:path';
import fs from 'node:fs';

function required(name) {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Copy .env.example to .env and fill in the value.`
    );
  }
  return v;
}

function optional(name, fallback) {
  const v = process.env[name];
  return (v && v.trim() !== '') ? v : fallback;
}

function resolveDir(p) {
  // Always resolve to an absolute path. Caller is expected to pass a
  // non-empty string. We don't auto-create the directory here — that's
  // the deploy/install script's job (see DEPLOY.md).
  if (!p) throw new Error('resolveDir: empty path');
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
}

export const config = {
  appBaseUrl: optional('APP_BASE_URL', 'http://localhost:3000'),
  port: parseInt(optional('PORT', '3000'), 10),

  databaseUrl: process.env.DATABASE_URL || 'file:./data/dev.db',
  databaseFile: (() => {
    const url = process.env.DATABASE_URL || 'file:./data/dev.db';
    // Strip "file:" prefix and resolve to absolute.
    const raw = url.replace(/^file:/, '');
    return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
  })(),

  uploadDir: resolveDir(optional('UPLOAD_DIR', './data/uploads')),
  maxUploadMb: parseInt(optional('MAX_UPLOAD_MB', '500'), 10),

  adminToken: required('ADMIN_TOKEN'),
  viewToken: required('VIEW_TOKEN'),

  roleCookieName: optional('ROLE_COOKIE_NAME', 'pp_role'),
};

export function ensureDataDirs() {
  // Idempotent. Safe to call on every server start.
  for (const dir of [config.databaseFile.replace(/[^/\\]+$/, ''), config.uploadDir]) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      // Already exists, or permission denied. We don't crash here;
      // the first DB write or file upload will fail loudly with a
      // real error message.
      console.warn(`[config] Could not ensure directory ${dir}:`, e.message);
    }
  }
}
