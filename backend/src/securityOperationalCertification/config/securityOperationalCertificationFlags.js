'use strict';

/**
 * SEC-19 — Operational Certification flags (OFF por defeito).
 */

function envBool(key, defaultValue = false) {
  const v = process.env[key];
  if (v === undefined || v === null || v === '') return defaultValue;
  return String(v).toLowerCase() === 'true' || v === '1';
}

function isSecurityOperationalCertificationEnabled() {
  return envBool('SECURITY_OPERATIONAL_CERTIFICATION', false);
}

function certificationMode() {
  return String(process.env.SECURITY_OPERATIONAL_CERTIFICATION_MODE || 'audit').toLowerCase();
}

function stressSimulationOnly() {
  return envBool('SECURITY_OPERATIONAL_STRESS_SIMULATED', true);
}

function evaluationIntervalMs() {
  const n = Number(process.env.SECURITY_OPERATIONAL_CERTIFICATION_EVAL_MS);
  return Number.isFinite(n) && n >= 30000 ? n : 120000;
}

module.exports = {
  isSecurityOperationalCertificationEnabled,
  certificationMode,
  stressSimulationOnly,
  evaluationIntervalMs
};
