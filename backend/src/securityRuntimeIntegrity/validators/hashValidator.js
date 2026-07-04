'use strict';

/**
 * SEC-04 — Hash validation against SECURITY-BASELINE-01 manifest.
 * Read-only — nunca modifica ficheiros.
 */

const crypto = require('crypto');
const fs = require('fs');
const { resolvePath } = require('../baseline/baselineLoader');

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * @param {object} baseline
 * @param {object} [ctx] — optional mock: { fileHashes: Map, missing: [] }
 */
function validateHashes(baseline, ctx = {}) {
  const findings = [];
  let matched = 0;
  let drift = 0;
  let missing = 0;

  const entries = baseline.criticalFiles || [];
  const mockHashes = ctx.fileHashes || null;
  const mockMissing = new Set(ctx.missing || []);

  for (const entry of entries) {
    const abs = resolvePath(entry.path);

    if (mockMissing.has(entry.path) || mockMissing.has(abs)) {
      missing += 1;
      findings.push({
        severity: 'CRITICAL',
        code: 'FILE_MISSING',
        path: entry.path,
        message: 'Ficheiro crítico ausente'
      });
      continue;
    }

    if (mockHashes) {
      const current = mockHashes.get(entry.path) || mockHashes.get(abs);
      if (current == null) {
        missing += 1;
        findings.push({ severity: 'CRITICAL', code: 'FILE_MISSING', path: entry.path, message: 'Ficheiro crítico ausente' });
        continue;
      }
      if (current !== entry.hash) {
        drift += 1;
        findings.push({
          severity: 'CRITICAL',
          code: 'HASH_DRIFT',
          path: entry.path,
          expected: entry.hash,
          actual: current,
          message: 'Hash SHA256 diverge da baseline'
        });
        continue;
      }
      matched += 1;
      continue;
    }

    if (!fs.existsSync(abs)) {
      missing += 1;
      findings.push({
        severity: 'CRITICAL',
        code: 'FILE_MISSING',
        path: entry.path,
        message: 'Ficheiro crítico ausente'
      });
      continue;
    }

    try {
      const current = sha256File(abs);
      if (current !== entry.hash) {
        drift += 1;
        findings.push({
          severity: 'CRITICAL',
          code: 'HASH_DRIFT',
          path: entry.path,
          expected: entry.hash,
          actual: current,
          message: 'Hash SHA256 diverge da baseline'
        });
      } else {
        matched += 1;
      }
    } catch (e) {
      findings.push({
        severity: 'WARNING',
        code: 'HASH_READ_ERROR',
        path: entry.path,
        message: e?.message || 'Erro ao ler ficheiro'
      });
    }
  }

  const total = entries.length;
  const passed = drift === 0 && missing === 0;
  const status = missing > 0 ? 'COMPROMISED' : drift > 0 ? 'DEGRADED' : passed ? 'OK' : 'UNKNOWN';

  return {
    kind: 'hash',
    status,
    passed,
    matched,
    total,
    drift,
    missing,
    findings,
    summary: passed
      ? `${matched}/${total} ficheiros críticos conformes`
      : `${drift} drift, ${missing} ausentes de ${total}`
  };
}

module.exports = { validateHashes, sha256File };
