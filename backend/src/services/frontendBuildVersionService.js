'use strict';

/**
 * Runtime negotiation de versão do frontend (build manifest).
 * Lê build-meta.json gerado pelo Vite no deploy.
 */

const fs = require('fs');
const path = require('path');

const META_CANDIDATES = [
  process.env.IMPETUS_FRONTEND_BUILD_META,
  path.join(__dirname, '../../../frontend/dist/build-meta.json'),
  path.join(__dirname, '../../frontend/dist/build-meta.json'),
  '/var/www/impetus-completa/frontend/dist/build-meta.json'
].filter(Boolean);

let _cached = null;
let _cachedMtime = 0;
const CACHE_MS = 5000;

function _resolveMetaPath() {
  for (const p of META_CANDIDATES) {
    try {
      if (fs.existsSync(p)) return p;
    } catch (_) {}
  }
  return null;
}

function readBuildMeta(force = false) {
  const now = Date.now();
  if (!force && _cached && now - _cachedMtime < CACHE_MS) {
    return _cached;
  }

  const metaPath = _resolveMetaPath();
  if (!metaPath) {
    _cached = {
      build_id: process.env.IMPETUS_BUILD_ID || 'unknown',
      built_at: null,
      source: 'env_fallback'
    };
    _cachedMtime = now;
    return _cached;
  }

  try {
    const stat = fs.statSync(metaPath);
    const raw = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    _cached = {
      build_id: raw.build_id || raw.buildId || 'unknown',
      built_at: raw.built_at || raw.builtAt || null,
      assets_hash: raw.assets_hash || null,
      source: 'build-meta.json',
      meta_path: metaPath,
      mtime: stat.mtime.toISOString()
    };
    _cachedMtime = now;
    return _cached;
  } catch (err) {
    _cached = {
      build_id: process.env.IMPETUS_BUILD_ID || 'unknown',
      built_at: null,
      source: 'read_error',
      error: err.message
    };
    _cachedMtime = now;
    return _cached;
  }
}

function getPublicBuildInfo() {
  const meta = readBuildMeta();
  return {
    build_id: meta.build_id,
    built_at: meta.built_at,
    server_time: new Date().toISOString()
  };
}

module.exports = {
  readBuildMeta,
  getPublicBuildInfo
};
