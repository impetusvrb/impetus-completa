'use strict';

/**
 * SEC-21 — Orquestrador de activação operacional.
 */

const sequence = require('../config/activationSequence');
const preActivationAuditor = require('./preActivationAuditor');
const snapshotBuilder = require('./snapshotBuilder');
const promotionEngine = require('./promotionEngine');
const endpointValidator = require('./endpointValidator');
const integrationValidator = require('./integrationValidator');
const validationAttackRunner = require('./validationAttackRunner');
const metrics = require('../metrics/productionActivationMetrics');
const store = require('../store/productionActivationStore');

const BOOT_MODULES = [
  'securityObservatory',
  'securityCorrelation',
  'securityThreatIntelligence',
  'securityRuntimeIntegrity',
  'securityNotification',
  'securityResponse',
  'securitySOC',
  'securityActiveDefense',
  'securityAdaptiveProtection',
  'securityExecutionValidation',
  'securityControlledExecution',
  'securityPromotionOperational',
  'securityAdaptiveBlocking',
  'securityAntiScanner',
  'securityThreatDeception',
  'securityExfiltrationDetection',
  'securityRuntimeProtection',
  'securityOperationalCertification'
];

function reinitSecModules() {
  const results = [];
  for (const name of BOOT_MODULES) {
    try {
      const mod = require(`../../${name}`);
      mod.shutdown?.();
      mod.init?.();
      results.push({ module: name, ok: true });
    } catch (e) {
      results.push({ module: name, ok: false, error: e.message });
    }
  }
  return results;
}

function runActivationPipeline(options = {}) {
  const report = {
    phase: 'SEC-21',
    version: sequence.ACTIVATION_VERSION,
    startedAt: new Date().toISOString(),
    steps: {},
    ok: false,
    operationalStatus: null
  };

  report.steps.preAudit = preActivationAuditor.runPreActivationAudit(options);
  store.setLastAudit(report.steps.preAudit);
  if (!report.steps.preAudit.canPromote && !options.force) {
    metrics.recordActivation(false);
    report.ok = false;
    report.blocked = true;
    report.finishedAt = new Date().toISOString();
    return report;
  }

  const preSnapshot = snapshotBuilder.buildSnapshot('pre-activation');
  report.steps.preSnapshot = snapshotBuilder.writeSnapshot(preSnapshot);
  store.setPreSnapshot(preSnapshot.snapshotId);
  report.steps.rollback = snapshotBuilder.writeRollbackPackage(preSnapshot);

  report.steps.promotion = promotionEngine.applyPromotion(options);
  report.steps.promotionVerify = promotionEngine.verifyPromotion();

  report.steps.moduleBoot = reinitSecModules();

  const resourceBefore = metrics.sampleResources();
  report.steps.endpoints = endpointValidator.validateAllEndpoints();
  report.steps.integration = integrationValidator.validateIntegrationChain();
  report.steps.attacks = validationAttackRunner.runValidationAttacks();
  const resourceAfter = metrics.sampleResources();

  report.steps.resources = {
    before: resourceBefore,
    after: resourceAfter,
    deltaHeapMb: Math.round((resourceAfter.heapUsedMb - resourceBefore.heapUsedMb) * 100) / 100
  };

  const postSnapshot = snapshotBuilder.buildSnapshot('post-activation');
  postSnapshot.operationalStatus = { ...sequence.OPERATIONAL_STATUS };
  report.steps.postSnapshot = snapshotBuilder.writeSnapshot(postSnapshot);

  const fs = require('fs');
  const path = require('path');
  const promotionEnv = promotionEngine.buildPromotionEnvFile();
  fs.writeFileSync(path.join(snapshotBuilder.EVIDENCE_DIR, 'promotion-target.env'), promotionEnv);

  const allOk =
    report.steps.promotionVerify.ok &&
    report.steps.endpoints.ok &&
    report.steps.integration.ok &&
    report.steps.attacks.ok;

  report.ok = allOk;
  report.operationalStatus = allOk ? { ...sequence.OPERATIONAL_STATUS } : null;
  report.finishedAt = new Date().toISOString();

  if (allOk) {
    store.markActivated(postSnapshot.snapshotId, report.operationalStatus);
    metrics.recordActivation(true);
  } else {
    metrics.recordActivation(false);
  }

  return report;
}

module.exports = {
  runActivationPipeline,
  reinitSecModules
};
