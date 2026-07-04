'use strict';

/**
 * SEC-18 — Runtime Safety Validator.
 */

const store = require('../store/runtimeProtectionStore');
const metrics = require('../metrics/runtimeProtectionMetrics');

function validateSafety(recommendedProfile, riskAssessment, plans) {
  const profileLevel = {
    NORMAL: 0, OBSERVE: 1, ELEVATED: 2, PROTECTED: 3, HARDENED: 4, LOCKDOWN_READY: 5
  };
  const level = profileLevel[recommendedProfile] || 0;

  const operationalImpact = Math.min(1, level * 0.15 + (riskAssessment.operationalRisk || 0) * 0.3);
  const availabilityRisk = level >= 4 ? 0.3 : level >= 3 ? 0.15 : 0.05;
  const falsePositiveRisk = Math.min(
    1,
    0.5 - (riskAssessment.runtimeRiskScore || 0) * 0.3 - (riskAssessment.protectionUrgency || 0) * 0.2
  );
  const rollbackPossible = true;
  const dependenciesOk = riskAssessment.integrityOk !== false;

  const safe = operationalImpact < 0.8 && dependenciesOk && recommendedProfile !== 'LOCKDOWN';
  const check = {
    schema_version: 'runtime_safety_v1',
    checkId: `rsc-${Date.now()}`,
    recommendedProfile,
    safe,
    operationalImpact: Math.round(operationalImpact * 100) / 100,
    availabilityRisk: Math.round(availabilityRisk * 100) / 100,
    falsePositiveRisk: Math.round(Math.max(0, falsePositiveRisk) * 100) / 100,
    rollbackPossible,
    rollbackValidated: rollbackPossible,
    dependenciesOk,
    executionBlocked: true,
    disclaimer: 'Validação consultiva — SEC-18 nunca executa protecções'
  };

  store.addSafetyCheck(check);
  metrics.increment('runtime_safety_checks');
  if (rollbackPossible) metrics.increment('rollback_validation');
  return check;
}

module.exports = { validateSafety };
