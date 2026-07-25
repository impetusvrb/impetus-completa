'use strict';

const fs = require('fs');
const path = require('path');
const flags = require('./config/securityBaselineSynchronizationFlags');
const engine = require('./engine/baselineSynchronizationEngine');
const store = require('./store/baselineSynchronizationStore');
const metrics = require('./metrics/baselineSynchronizationMetrics');

const EVIDENCE_DIR = path.resolve(__dirname, '../../docs/evidence/sec-21b');

function init() {
  if (!flags.isSecurityBaselineSynchronizationEnabled()) return { booted: false };
  return { booted: true, mode: 'consultive-baseline-synchronization' };
}

function shutdown() {
  return { shutdown: true };
}

function writeEvidencePackage(evaluation) {
  if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const { decision, report, analysis } = evaluation;
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'synchronization-report.json'), JSON.stringify(evaluation, null, 2));
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'reconciliation-decision.json'), JSON.stringify(decision, null, 2));
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'divergence-analysis.json'), JSON.stringify(analysis.analyzed, null, 2));
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'synchronization-latest.json'), JSON.stringify(decision, null, 2));
  if (report) {
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'reconciliation-lists.json'), JSON.stringify(report.lists, null, 2));
  }
}

module.exports = {
  init,
  shutdown,
  isEnabled: flags.isSecurityBaselineSynchronizationEnabled,
  flags,
  store,
  metrics,
  engine,
  runSynchronization: engine.runBaselineSynchronization,
  getAuditPayload: engine.getAuditPayload,
  writeEvidencePackage
};
