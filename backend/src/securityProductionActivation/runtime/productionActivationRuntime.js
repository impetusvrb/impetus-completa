'use strict';

const flags = require('../config/securityProductionActivationFlags');
const orchestrator = require('../engine/activationOrchestrator');
const store = require('../store/productionActivationStore');
const metrics = require('../metrics/productionActivationMetrics');
const sequence = require('../config/activationSequence');
const preActivationAuditor = require('../engine/preActivationAuditor');
const snapshotBuilder = require('../engine/snapshotBuilder');
const path = require('path');
const fs = require('fs');

function init() {
  if (!flags.isSecurityProductionActivationEnabled()) return { booted: false };
  return { booted: true, mode: 'operational-tracking' };
}

function shutdown() {
  return { shutdown: true };
}

function buildDashboard() {
  const state = store.getState();
  const metricSnap = metrics.getSnapshot();
  const lastAudit = state.lastAudit || preActivationAuditor.runPreActivationAudit({ skipInfra: true });

  return {
    phase: 'SEC-21',
    version: sequence.ACTIVATION_VERSION,
    enabled: flags.isSecurityProductionActivationEnabled(),
    auto_execute: sequence.AUTO_EXECUTE,
    operationalStatus: state.operationalStatus,
    activatedAt: state.activatedAt,
    promotionApplied: state.promotionApplied,
    rollbackAvailable: state.rollbackAvailable,
    preSnapshotId: state.preSnapshotId,
    postSnapshotId: state.postSnapshotId,
    lastPreAudit: lastAudit,
    metrics: metricSnap,
    safeModes: sequence.SAFE_MODE_CONSTRAINTS,
    forbiddenAutoActions: sequence.FORBIDDEN_AUTO_ACTIONS,
    flagsActive: sequence.PRIMARY_FLAGS.map((f) => ({
      phase: f.phase,
      flag: f.flag,
      on: process.env[f.flag] === 'true'
    }))
  };
}

function getAuditPayload() {
  const evidenceDir = snapshotBuilder.EVIDENCE_DIR;
  const criteria = fs.existsSync(path.join(evidenceDir, 'criteria.json'))
    ? JSON.parse(fs.readFileSync(path.join(evidenceDir, 'criteria.json'), 'utf8'))
    : null;
  const activationLatest = fs.existsSync(path.join(evidenceDir, 'activation-latest.json'))
    ? JSON.parse(fs.readFileSync(path.join(evidenceDir, 'activation-latest.json'), 'utf8'))
    : null;

  return {
    ok: true,
    phase: 'SEC-21',
    read_only: false,
    enabled: flags.isSecurityProductionActivationEnabled(),
    dashboard: buildDashboard(),
    evidence: {
      criteria,
      activationLatest,
      rollback: fs.existsSync(path.join(evidenceDir, 'rollback-env.snapshot.json')),
      promotionTarget: fs.existsSync(path.join(evidenceDir, 'promotion-target.env'))
    },
    disclaimer:
      'SEC-21 — activação operacional controlada; auto_execute=false; rollback via snapshot sec-21'
  };
}

function writeEvidencePackage(data) {
  const dir = snapshotBuilder.EVIDENCE_DIR;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'activation-latest.json'), JSON.stringify(data, null, 2));
  fs.writeFileSync(
    path.join(dir, `activation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`),
    JSON.stringify(data, null, 2)
  );
  if (data.criteria) {
    fs.writeFileSync(path.join(dir, 'criteria.json'), JSON.stringify(data.criteria, null, 2));
  }
}

module.exports = {
  init,
  shutdown,
  isEnabled: flags.isSecurityProductionActivationEnabled,
  flags,
  store,
  metrics,
  orchestrator,
  getAuditPayload,
  buildDashboard,
  writeEvidencePackage,
  runActivation: orchestrator.runActivationPipeline
};
