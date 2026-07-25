'use strict';

const fs = require('fs');
const path = require('path');
const flags = require('./config/securityGoLiveValidationFlags');
const engine = require('./engine/goLiveValidationEngine');
const store = require('./store/goLiveValidationStore');
const metrics = require('./metrics/goLiveValidationMetrics');
const { sanitizeDiagnosticPayload } = require('../securityApplication/diagnosticRedaction');

const EVIDENCE_DIR = path.resolve(__dirname, '../../docs/evidence/sec-21c');

function init() {
  if (!flags.isSecurityGoLiveValidationEnabled()) return { booted: false };
  return { booted: true, mode: 'consultive-go-live-validation' };
}

function shutdown() {
  return { shutdown: true };
}

function writeEvidencePackage(evaluation) {
  if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const safeEvaluation = sanitizeDiagnosticPayload(evaluation);
  const { decision, guard } = safeEvaluation;
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'go-live-validation-report.json'), JSON.stringify(safeEvaluation, null, 2));
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'go-live-validation-criteria.json'), JSON.stringify(decision.criteria || {}, null, 2));
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'blocking-findings.json'), JSON.stringify(decision.blockingFindings || [], null, 2));
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'go-live-validation-latest.json'), JSON.stringify(decision, null, 2));
  if (guard) {
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'go-live-guard-monitor.json'), JSON.stringify(guard, null, 2));
  }
  if (decision.activationPlan) {
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'activation-plan.json'), JSON.stringify(decision.activationPlan, null, 2));
  }
}

module.exports = {
  init,
  shutdown,
  isEnabled: flags.isSecurityGoLiveValidationEnabled,
  flags,
  store,
  metrics,
  engine,
  runValidation: engine.runGoLiveValidation,
  getAuditPayload: engine.getAuditPayload,
  writeEvidencePackage
};
