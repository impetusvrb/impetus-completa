'use strict';

/**
 * SEC-04 — Baseline loader (read-only SECURITY-BASELINE-01).
 * Nunca altera ficheiros de baseline.
 */

const fs = require('fs');
const path = require('path');

function repoRoot() {
  return path.resolve(__dirname, '../../../..');
}

function baselineDir() {
  return path.join(repoRoot(), 'backend/docs/evidence/security-baseline-01');
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_e) {
    return null;
  }
}

function parseCriticalManifest(content) {
  const entries = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length < 4) continue;
    const hash = parts[2];
    const filePath = parts.slice(3).join(' ');
    entries.push({ mtime: parts[0], size: Number(parts[1]), hash, path: filePath });
  }
  return entries;
}

function parseBlueprintManifest(content) {
  const entries = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf('  ');
    if (idx === -1) continue;
    const hash = trimmed.slice(0, idx).trim();
    const filePath = trimmed.slice(idx + 2).trim();
    entries.push({ hash, path: filePath });
  }
  return entries;
}

function resolvePath(relOrAbs) {
  if (relOrAbs.startsWith('/')) return relOrAbs;
  return path.join(repoRoot(), relOrAbs);
}

function loadBaseline() {
  const dir = baselineDir();
  const criteria = readJsonSafe(path.join(dir, 'criteria.json'));
  const metrics = readJsonSafe(path.join(dir, 'metrics.json'));

  let criticalFiles = [];
  let blueprintFiles = [];
  let pm2Snapshot = [];
  let listeningPorts = [];
  let apiMounts = [];
  let ufwSnapshot = '';

  try {
    criticalFiles = parseCriticalManifest(
      fs.readFileSync(path.join(dir, 'critical-files.sha256.manifest'), 'utf8')
    );
  } catch (_e) {}

  try {
    blueprintFiles = parseBlueprintManifest(
      fs.readFileSync(path.join(dir, 'blueprint-volumes.sha256'), 'utf8')
    );
  } catch (_e) {}

  pm2Snapshot = readJsonSafe(path.join(dir, 'pm2-processes.snapshot.json')) || [];

  try {
    listeningPorts = fs
      .readFileSync(path.join(dir, 'listening-ports.snapshot.txt'), 'utf8')
      .split('\n')
      .filter((l) => l.includes('LISTEN'));
  } catch (_e) {}

  try {
    apiMounts = fs
      .readFileSync(path.join(dir, 'api-mount-paths.txt'), 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  } catch (_e) {}

  try {
    ufwSnapshot = fs.readFileSync(path.join(dir, 'ufw.snapshot.txt'), 'utf8');
  } catch (_e) {}

  return {
    version: criteria?.certification || 'SECURITY-BASELINE-01',
    frozenAt: criteria?.frozen_at || metrics?.collected_at || null,
    gitHead: criteria?.git_head || metrics?.git_head || null,
    evidenceDir: dir,
    criticalFiles,
    blueprintFiles,
    pm2Snapshot,
    listeningPorts,
    apiMounts,
    ufwSnapshot,
    expectedConfig: {
      listenHost: '127.0.0.1',
      backendPort: 4000,
      frontendPort: 3000,
      nodeEnv: 'production',
      securityObservatoryDefault: false,
      securityCorrelationDefault: false,
      securityThreatIntelDefault: false,
      securityRuntimeIntegrityDefault: false
    },
    expectedPublicPorts: [80, 443, 22],
    expectedLocalhostPorts: [3000, 4000]
  };
}

module.exports = {
  repoRoot,
  baselineDir,
  loadBaseline,
  parseCriticalManifest,
  parseBlueprintManifest,
  resolvePath,
  readJsonSafe
};
