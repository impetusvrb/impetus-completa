'use strict';

/**
 * SEC-21 — Snapshot completo para rollback oficial.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const sequence = require('../config/activationSequence');
const collector = require('../../securityCertificationV2/collectors/evidenceCollector');

const DOCS_ROOT = path.resolve(__dirname, '../../../docs');
const EVIDENCE_DIR = path.join(DOCS_ROOT, 'evidence/sec-21');
const REPO_ROOT = path.resolve(__dirname, '../../../../');

const FLAG_NAMES = [
  ...sequence.PRIMARY_FLAGS.map((f) => f.flag),
  'SECURITY_PRODUCTION_ACTIVATION',
  ...Object.keys(sequence.SAFE_MODE_CONSTRAINTS)
];

function hashFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function captureEnvSnapshot() {
  const env = {};
  for (const key of FLAG_NAMES) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  return env;
}

function captureModuleStates() {
  const modules = [];
  for (const entry of sequence.PRIMARY_FLAGS) {
    let enabled = false;
    let error = null;
    try {
      const mod = require(`../../${entry.module}`);
      enabled = mod.isEnabled?.() ?? false;
    } catch (e) {
      error = e.message;
    }
    modules.push({
      phase: entry.phase,
      module: entry.module,
      flag: entry.flag,
      enabled,
      error
    });
  }
  return modules;
}

function captureHashes() {
  const files = [
    'backend/src/server.js',
    'infra/nginx/impetus-hardening-locations.conf',
    'backend/docs/evidence/security-baseline-01/criteria.json',
    'backend/docs/evidence/sec-20/certification-latest.json'
  ];
  return files.map((rel) => ({
    path: rel,
    sha256: hashFile(path.join(REPO_ROOT, rel))
  }));
}

function captureBaselineRef() {
  const criteriaPath = path.join(DOCS_ROOT, 'evidence/security-baseline-01/criteria.json');
  const data = collector.readJsonIfExists(criteriaPath);
  return {
    path: 'evidence/security-baseline-01/criteria.json',
    present: !!data,
    criteria: data?.criteria || null
  };
}

function capturePm2Hint() {
  return {
    note: 'PM2 state captured at activation time — restore via rollback-env + pm2 restart --update-env',
    nodeVersion: process.version,
    pid: process.pid,
    uptimeSec: process.uptime()
  };
}

function buildSnapshot(label = 'pre-activation') {
  const id = `${label}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const snapshot = {
    snapshotId: id,
    label,
    createdAt: new Date().toISOString(),
    hostname: os.hostname(),
    env: captureEnvSnapshot(),
    modules: captureModuleStates(),
    hashes: captureHashes(),
    baseline: captureBaselineRef(),
    sec20: collector.readJsonIfExists(path.join(DOCS_ROOT, 'evidence/sec-20/certification-latest.json')),
    pm2: capturePm2Hint(),
    memory: process.memoryUsage(),
    operationalStatus: null
  };
  return snapshot;
}

function writeSnapshot(snapshot) {
  if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const file = path.join(EVIDENCE_DIR, `${snapshot.snapshotId}.json`);
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2));
  const latestPath = path.join(EVIDENCE_DIR, `snapshot-${snapshot.label}-latest.json`);
  fs.writeFileSync(latestPath, JSON.stringify(snapshot, null, 2));
  return { path: file, snapshotId: snapshot.snapshotId };
}

function writeRollbackPackage(preSnapshot) {
  if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const rollback = {
    createdAt: new Date().toISOString(),
    preSnapshotId: preSnapshot.snapshotId,
    env: preSnapshot.env,
    procedure: [
      '1. Restaurar variáveis de rollback-env.snapshot',
      '2. pm2 restart impetus-backend --update-env',
      '3. Validar GET /api/audit/security-production-activation',
      '4. Confirmar flags SECURITY_*=false conforme rollback'
    ]
  };
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'rollback-env.snapshot.json'), JSON.stringify(rollback, null, 2));
  return rollback;
}

module.exports = {
  EVIDENCE_DIR,
  buildSnapshot,
  writeSnapshot,
  writeRollbackPackage,
  captureEnvSnapshot,
  FLAG_NAMES
};
