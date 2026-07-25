'use strict';

/**
 * SEC-21C — Baseline + SEC-21B + integridade (read-only).
 */

const fs = require('fs');
const path = require('path');
const flags = require('../config/securityGoLiveValidationFlags');

const DOCS = path.resolve(__dirname, '../../../docs');
const SEC21B_LATEST = path.join(DOCS, 'evidence/sec-21b/synchronization-latest.json');

function validateProductionReadiness() {
  const threshold = flags.integrityThreshold();
  const blocking = [];
  const checks = {};

  let sec21bApproved = false;
  let sec21bDecision = null;
  if (fs.existsSync(SEC21B_LATEST)) {
    try {
      const sec21b = JSON.parse(fs.readFileSync(SEC21B_LATEST, 'utf8'));
      sec21bDecision = sec21b.reconciliationDecision;
      sec21bApproved = sec21bDecision === 'BASELINE_SYNCHRONIZATION_APPROVED';
    } catch (e) {
      blocking.push({ code: 'SEC21B_EVIDENCE_INVALID', message: e.message });
    }
  } else {
    blocking.push({ code: 'SEC21B_EVIDENCE_MISSING', message: 'Executar SEC_21B_BASELINE_SYNCHRONIZATION.test.js' });
  }
  checks.sec21bApproved = sec21bApproved;
  checks.sec21bDecision = sec21bDecision;

  let integrityScore = 0;
  let integrityStatus = 'UNKNOWN';
  let hashDrift = 0;
  let criticalDivergences = [];

  try {
    const manifestSvc = require('../../securityBaselineSynchronization/services/manifestComparisonService');
    const comparison = manifestSvc.compareManifest();
    criticalDivergences = comparison.divergences.filter((d) =>
      /server\.js|nginx|hardening|integrity-check|ecosystem|\.env\.example/.test(d.path)
    );
    checks.manifestDivergences = comparison.divergenceCount;
    checks.criticalDivergences = criticalDivergences.length;

    const integrity = manifestSvc.getIntegritySnapshot();
    integrityScore = integrity.integrityScore;
    integrityStatus = integrity.integrityStatus;
    hashDrift = integrity.hashDrift;
  } catch (e) {
    blocking.push({ code: 'INTEGRITY_CHECK_ERROR', message: e.message });
  }

  const baselineSynchronized = criticalDivergences.length === 0 && hashDrift === 0;
  const integrityValid = integrityScore >= threshold;

  checks.baselineSynchronized = baselineSynchronized;
  checks.integrityValid = integrityValid;
  checks.integrityScore = integrityScore;
  checks.integrityThreshold = threshold;

  if (!sec21bApproved) {
    blocking.push({ code: 'SEC21B_NOT_APPROVED', message: `Decisão: ${sec21bDecision || 'MISSING'}` });
  }
  if (!baselineSynchronized) {
    blocking.push({
      code: 'BASELINE_NOT_SYNCHRONIZED',
      message: `${criticalDivergences.length} divergências críticas; executar integrity-check.sh --baseline`
    });
  }
  if (!integrityValid) {
    blocking.push({ code: 'INTEGRITY_BELOW_THRESHOLD', message: `Score ${integrityScore} < ${threshold}` });
  }

  const scoreParts = [
    sec21bApproved,
    baselineSynchronized,
    integrityValid,
    blocking.length === 0
  ];
  const productionReadinessScore = Math.round((scoreParts.filter(Boolean).length / scoreParts.length) * 1000) / 1000;

  return {
    ok: blocking.length === 0,
    blocking: blocking.length > 0,
    productionReadinessScore,
    integrityScore,
    integrityStatus,
    baselineSynchronized,
    sec21bApproved,
    checks,
    blockingFindings: blocking
  };
}

module.exports = { validateProductionReadiness };
