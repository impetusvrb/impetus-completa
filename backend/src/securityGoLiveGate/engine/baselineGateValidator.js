'use strict';

/**
 * SEC-21A — Baseline gate (SECURITY-BASELINE-01 + critical hashes).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const DOCS = path.resolve(__dirname, '../../../docs');
const MANIFEST = path.join(DOCS, 'evidence/security-baseline-01/critical-files.sha256.manifest');

function sha256File(absPath) {
  if (!fs.existsSync(absPath)) return null;
  const stat = fs.statSync(absPath);
  if (!stat.isFile()) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
}

function parseManifest() {
  if (!fs.existsSync(MANIFEST)) return [];
  const lines = fs.readFileSync(MANIFEST, 'utf8').split('\n');
  const entries = [];
  for (const line of lines) {
    if (!line.trim() || line.startsWith('#')) continue;
    const parts = line.trim().split(/\s+/);
    // Formato: mtime size sha256 path
    if (parts.length < 4) continue;
    const hash = parts[2];
    const filePath = parts.slice(3).join(' ');
    if (!filePath) continue;
    entries.push({ path: filePath, expectedSha256: hash });
  }
  return entries;
}

function validateBaselineGate() {
  const criteriaPath = path.join(DOCS, 'evidence/security-baseline-01/criteria.json');
  const hardeningDoc = path.join(DOCS, 'HARDENING-01_REPORT.md');
  const baselineOk = fs.existsSync(criteriaPath);
  const hardeningOk = fs.existsSync(hardeningDoc);

  const divergences = [];
  for (const entry of parseManifest()) {
    const abs = entry.path.startsWith('/') ? entry.path : path.join(REPO_ROOT, entry.path);
    if (!fs.existsSync(abs)) {
      divergences.push({ path: entry.path, issue: 'MISSING' });
      continue;
    }
    if (!fs.statSync(abs).isFile()) {
      divergences.push({ path: entry.path, issue: 'NOT_A_FILE' });
      continue;
    }
    const current = sha256File(abs);
    if (current && current !== entry.expectedSha256) {
      divergences.push({ path: entry.path, issue: 'HASH_MISMATCH', expected: entry.expectedSha256.slice(0, 12), actual: current.slice(0, 12) });
    }
  }

  const criticalDivergences = divergences.filter((d) =>
    /server\.js|nginx|hardening|integrity-check|ecosystem/.test(d.path)
  );

  return {
    ok: baselineOk && hardeningOk && criticalDivergences.length === 0,
    baselineOk,
    hardeningOk,
    synchronized: divergences.length === 0,
    divergences,
    criticalDivergences,
    blocking: criticalDivergences.length > 0,
    manifestEntries: parseManifest().length
  };
}

module.exports = { validateBaselineGate };
