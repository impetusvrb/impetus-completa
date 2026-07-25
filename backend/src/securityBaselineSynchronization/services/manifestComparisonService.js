'use strict';

/**
 * SEC-21B — Comparação read-only manifest SHA256 vs estado actual.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const DOCS = path.resolve(__dirname, '../../../docs');
const MANIFEST = path.join(DOCS, 'evidence/security-baseline-01/critical-files.sha256.manifest');
const GO_LIVE_LATEST = path.join(DOCS, 'evidence/sec-21a/go-live-latest.json');

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
    if (parts.length < 4) continue;
    const hash = parts[2];
    const filePath = parts.slice(3).join(' ');
    if (!filePath) continue;
    entries.push({ path: filePath, expectedSha256: hash });
  }
  return entries;
}

function resolveAbs(filePath) {
  return filePath.startsWith('/') ? filePath : path.join(REPO_ROOT, filePath);
}

function compareManifest() {
  const divergences = [];
  const synchronized = [];

  for (const entry of parseManifest()) {
    const abs = resolveAbs(entry.path);
    const current = sha256File(abs);
    if (!fs.existsSync(abs)) {
      divergences.push({
        path: entry.path,
        absPath: abs,
        issue: 'MISSING',
        expectedSha256: entry.expectedSha256,
        actualSha256: null
      });
      continue;
    }
    if (!current) {
      divergences.push({
        path: entry.path,
        absPath: abs,
        issue: 'NOT_A_FILE',
        expectedSha256: entry.expectedSha256,
        actualSha256: null
      });
      continue;
    }
    if (current !== entry.expectedSha256) {
      divergences.push({
        path: entry.path,
        absPath: abs,
        issue: 'HASH_MISMATCH',
        expectedSha256: entry.expectedSha256,
        actualSha256: current
      });
    } else {
      synchronized.push({ path: entry.path, sha256: current });
    }
  }

  return {
    manifestPath: MANIFEST,
    manifestEntries: parseManifest().length,
    divergences,
    synchronized,
    synchronizedCount: synchronized.length,
    divergenceCount: divergences.length
  };
}

function loadSec21aDivergences() {
  if (!fs.existsSync(GO_LIVE_LATEST)) return null;
  try {
    const gate = JSON.parse(fs.readFileSync(GO_LIVE_LATEST, 'utf8'));
    const fromBaseline = gate.validators?.baseline?.divergences || [];
    const fromBlocking =
      gate.blockingIssues?.find((b) => b.code === 'CRITICAL_FILE_DIVERGENCE')?.items || [];
    return { gate, fromBaseline, fromBlocking };
  } catch (_e) {
    return null;
  }
}

function loadFilesystemDrifts() {
  try {
    const eng = require('../../securityRuntimeIntegrity/engine/integrityEngine');
    const report = eng.runIntegrityCheck?.({ force: true });
    return report?.filesystemValidation?.findings?.filter((f) => f.code === 'BLUEPRINT_DRIFT') || [];
  } catch (_e) {
    return [];
  }
}

function getIntegritySnapshot() {
  try {
    const eng = require('../../securityRuntimeIntegrity/engine/integrityEngine');
    const report = eng.runIntegrityCheck?.({ force: true });
    return {
      integrityScore: report?.integrityScore ?? 0,
      integrityStatus: report?.integrityStatus ?? 'UNKNOWN',
      hashDrift: report?.hashValidation?.drift ?? 0,
      hashMissing: report?.hashValidation?.missing ?? 0,
      hashFindings: report?.hashValidation?.findings || [],
      filesystemFindings: report?.filesystemValidation?.findings || []
    };
  } catch (e) {
    return {
      integrityScore: 0,
      integrityStatus: 'ERROR',
      error: e.message,
      hashDrift: 0,
      hashMissing: 0,
      hashFindings: [],
      filesystemFindings: []
    };
  }
}

module.exports = {
  compareManifest,
  loadSec21aDivergences,
  loadFilesystemDrifts,
  getIntegritySnapshot,
  parseManifest,
  resolveAbs,
  sha256File,
  MANIFEST,
  REPO_ROOT,
  DOCS
};
