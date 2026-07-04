'use strict';

/**
 * SEC-20 — Colector de evidências reais (JSON, métricas, SEC-19).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const DOCS_ROOT = path.resolve(__dirname, '../../../docs');

const PHASE_EVIDENCE = Object.freeze([
  { phase: 'SECURITY-BASELINE-01', dir: 'evidence/security-baseline-01', criteria: 'criteria.json' },
  { phase: 'SEC-01', dir: 'evidence/sec-01', criteria: 'criteria.json' },
  { phase: 'SEC-02', dir: 'evidence/sec-02', criteria: 'criteria.json' },
  { phase: 'SEC-03', dir: 'evidence/sec-03', criteria: 'criteria.json' },
  { phase: 'SEC-04', dir: 'evidence/sec-04', criteria: 'criteria.json' },
  { phase: 'SEC-05', dir: 'evidence/sec-05', criteria: 'criteria.json' },
  { phase: 'SEC-06', dir: 'evidence/sec-06', criteria: 'criteria.json' },
  { phase: 'SEC-07', dir: 'evidence/sec-07', criteria: 'criteria.json' },
  { phase: 'SEC-08', dir: 'evidence/sec-08', criteria: 'criteria.json' },
  { phase: 'SEC-09', dir: 'evidence/sec-09', criteria: 'criteria.json' },
  { phase: 'SEC-10', dir: 'evidence/sec-10', criteria: 'criteria.json' },
  { phase: 'SEC-11', dir: 'evidence/sec-11', criteria: 'criteria.json' },
  { phase: 'SEC-12', dir: 'evidence/sec-12', criteria: 'criteria.json' },
  { phase: 'SEC-13', dir: 'evidence/sec-13', criteria: 'criteria.json' },
  { phase: 'SEC-13A', dir: 'evidence/sec-13a', criteria: 'criteria.json' },
  { phase: 'SEC-14', dir: 'evidence/sec-14', criteria: 'criteria.json' },
  { phase: 'SEC-15', dir: 'evidence/sec-15', criteria: 'criteria.json' },
  { phase: 'SEC-16', dir: 'evidence/sec-16', criteria: 'criteria.json' },
  { phase: 'SEC-17', dir: 'evidence/sec-17', criteria: 'criteria.json' },
  { phase: 'SEC-18', dir: 'evidence/sec-18', criteria: 'criteria.json' },
  { phase: 'SEC-19', dir: 'evidence/sec-19', criteria: 'criteria.json' }
]);

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_e) {
    return null;
  }
}

function isPhaseCertified(evidence) {
  if (!evidence) return false;
  if (evidence.failed > 0) return false;
  const c = evidence.criteria;
  if (!c || typeof c !== 'object') {
    return evidence.passed > 0 && evidence.failed === 0;
  }
  if (c.tests_passing === false) return false;
  const vals = Object.values(c);
  if (vals.length === 0) return false;
  return vals.every((v) => v === true);
}

function collectPhaseEvidence() {
  const phases = [];
  let allCertified = true;

  for (const entry of PHASE_EVIDENCE) {
    const criteriaPath = path.join(DOCS_ROOT, entry.dir, entry.criteria);
    const data = readJsonIfExists(criteriaPath);
    const certified = isPhaseCertified(data);
    if (!certified) allCertified = false;
    phases.push({
      phase: entry.phase,
      criteriaPath: criteriaPath.replace(DOCS_ROOT + path.sep, ''),
      exists: !!data,
      certified,
      passed: data?.passed ?? null,
      failed: data?.failed ?? null,
      criteria: data?.criteria || null
    });
  }

  return { phases, allCertified, collectedAt: new Date().toISOString() };
}

function collectSec08Evidence() {
  const latest = readJsonIfExists(path.join(DOCS_ROOT, 'evidence/sec-08/certification-latest.json'));
  const criteria = readJsonIfExists(path.join(DOCS_ROOT, 'evidence/sec-08/criteria.json'));
  return { latest, criteria, source: 'evidence/sec-08/' };
}

function collectSec19Evidence() {
  const criteria = readJsonIfExists(path.join(DOCS_ROOT, 'evidence/sec-19/criteria.json'));
  let operational = null;

  try {
    const sec19 = require('../../securityOperationalCertification');
    if (typeof sec19.getAuditPayload === 'function') {
      operational = sec19.getAuditPayload();
    }
  } catch (_e) {
    /* módulo opcional em runtime */
  }

  return {
    criteria,
    operational,
    attackSimulationCertified: criteria?.criteria?.attack_simulation_completed === true,
    stressCertified: criteria?.criteria?.stress_tests_completed === true,
    operationalScore: operational?.dashboard?.operationalScore ?? null,
    source: 'evidence/sec-19/ + securityOperationalCertification'
  };
}

function collectSec20Evidence() {
  const dir = path.join(DOCS_ROOT, 'evidence/sec-20');
  return {
    certificationLatest: readJsonIfExists(path.join(dir, 'certification-latest.json')),
    criteria: readJsonIfExists(path.join(dir, 'criteria.json')),
    regressionSummary: readJsonIfExists(path.join(dir, 'regression-summary.json')),
    operationalReadiness: readJsonIfExists(path.join(dir, 'operational-readiness.json'))
  };
}

function collectRuntimeMetrics() {
  const mem = process.memoryUsage();
  return {
    heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
    rssMb: Math.round(mem.rss / 1024 / 1024),
    uptimeSeconds: Math.floor(process.uptime()),
    loadAvg: os.loadavg(),
    nodeVersion: process.version,
    platform: os.platform(),
    capturedAt: new Date().toISOString()
  };
}

function collectModuleMetricsSnapshot() {
  const modules = [
    { phase: 'SEC-07', path: 'securitySOC' },
    { phase: 'SEC-14', path: 'securityAdaptiveBlocking' },
    { phase: 'SEC-17', path: 'securityExfiltrationDetection' },
    { phase: 'SEC-18', path: 'securityRuntimeProtection' },
    { phase: 'SEC-19', path: 'securityOperationalCertification' }
  ];
  const snapshots = [];

  for (const mod of modules) {
    try {
      const m = require(`../../${mod.path}`);
      const payload = typeof m.getAuditPayload === 'function' ? m.getAuditPayload() : null;
      snapshots.push({
        phase: mod.phase,
        ok: payload?.ok !== false,
        enabled: payload?.enabled,
        metrics: payload?.metrics || null
      });
    } catch (e) {
      snapshots.push({ phase: mod.phase, ok: false, error: e.message });
    }
  }

  return snapshots;
}

function collectAllEvidence() {
  return {
    phases: collectPhaseEvidence(),
    sec08: collectSec08Evidence(),
    sec19: collectSec19Evidence(),
    sec20: collectSec20Evidence(),
    runtime: collectRuntimeMetrics(),
    moduleMetrics: collectModuleMetricsSnapshot(),
    collectedAt: new Date().toISOString()
  };
}

module.exports = {
  PHASE_EVIDENCE,
  collectPhaseEvidence,
  collectSec08Evidence,
  collectSec19Evidence,
  collectSec20Evidence,
  collectRuntimeMetrics,
  collectModuleMetricsSnapshot,
  collectAllEvidence,
  isPhaseCertified,
  readJsonIfExists
};
