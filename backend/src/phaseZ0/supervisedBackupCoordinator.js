'use strict';

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.join(__dirname, '..', '..');
const REPO_ROOT = path.join(BACKEND_ROOT, '..');
const FRONTEND_ROOT = path.join(REPO_ROOT, 'frontend');

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

/**
 * Backup supervisionado — nunca sobrescreve backups anteriores; sem cleanup automático.
 */
function createSupervisedSnapshot(label = 'phase-z0') {
  const slug = `${label}-${timestampSlug()}`;
  const dest = path.join(BACKEND_ROOT, 'backups', slug);
  fs.mkdirSync(dest, { recursive: true });

  const markers = {
    label,
    created_at: new Date().toISOString(),
    rollback_safe: true,
    auto_cleanup: false,
    paths: {}
  };

  const envPath = path.join(BACKEND_ROOT, '.env');
  if (fs.existsSync(envPath)) {
    const envDest = path.join(dest, '.env.backup');
    fs.copyFileSync(envPath, envDest);
    markers.paths.backend_env = envDest;
  }

  const feEnv = path.join(FRONTEND_ROOT, '.env');
  if (fs.existsSync(feEnv)) {
    const feDest = path.join(dest, 'frontend.env.backup');
    fs.copyFileSync(feEnv, feDest);
    markers.paths.frontend_env = feDest;
  }

  const markerFile = path.join(dest, 'ROLLBACK_MARKER.json');
  fs.writeFileSync(markerFile, JSON.stringify(markers, null, 2));

  return {
    ok: true,
    backup_path: dest,
    marker_file: markerFile,
    markers,
    destructive_compression: false,
    overwrite_previous: false
  };
}

function listSupervisedBackups(limit = 20) {
  const dir = path.join(BACKEND_ROOT, 'backups');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const p = path.join(dir, d.name);
      const marker = path.join(p, 'ROLLBACK_MARKER.json');
      return {
        name: d.name,
        path: p,
        mtime: fs.statSync(p).mtimeMs,
        has_marker: fs.existsSync(marker)
      };
    })
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, limit);
}

module.exports = { createSupervisedSnapshot, listSupervisedBackups, BACKEND_ROOT, FRONTEND_ROOT };
