'use strict';

const fs = require('fs');
const path = require('path');
const flags = require('./config/securityGoLiveGateFlags');
const engine = require('./engine/goLiveGateEngine');
const store = require('./store/goLiveGateStore');
const metrics = require('./metrics/goLiveGateMetrics');

const EVIDENCE_DIR = path.resolve(__dirname, '../../docs/evidence/sec-21a');

function init() {
  if (!flags.isSecurityGoLiveGateEnabled()) return { booted: false };
  return { booted: true, mode: 'consultive-go-live-gate' };
}

function shutdown() {
  return { shutdown: true };
}

function writeEvidencePackage(evaluation) {
  if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const gate = evaluation.gate;
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'go-live-report.json'), JSON.stringify(evaluation, null, 2));
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'go-live-criteria.json'), JSON.stringify(gate.criteria || {}, null, 2));
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'go-live-runtime.json'), JSON.stringify(evaluation.validators?.runtime || {}, null, 2));
  if (evaluation.observation) {
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'post-activation-monitor.json'), JSON.stringify(evaluation.observation, null, 2));
  }
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'blocking-findings.json'), JSON.stringify(gate.blockingIssues || [], null, 2));
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'go-live-latest.json'), JSON.stringify(gate, null, 2));
}

module.exports = {
  init,
  shutdown,
  isEnabled: flags.isSecurityGoLiveGateEnabled,
  flags,
  store,
  metrics,
  engine,
  runEvaluation: engine.runGoLiveEvaluation,
  getAuditPayload: engine.getAuditPayload,
  writeEvidencePackage
};
