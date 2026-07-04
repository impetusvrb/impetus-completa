'use strict';

/**
 * SEC-12 — Execution Validation flags.
 * Default OFF — dry-run only, nunca executa acções.
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

function isSecurityExecutionValidationEnabled() {
  return envBool('SECURITY_EXECUTION_VALIDATION', false);
}

/** Sempre true por defeito — SEC-12 nunca executa. */
function dryRunOnly() {
  return envBool('SECURITY_DRY_RUN_ONLY', true);
}

function evaluationIntervalMs() {
  const n = Number(process.env.SECURITY_EXECUTION_VALIDATION_EVAL_MS);
  if (!Number.isFinite(n)) return 60000;
  return Math.min(300000, Math.max(15000, Math.floor(n)));
}

module.exports = {
  envBool,
  isSecurityExecutionValidationEnabled,
  dryRunOnly,
  evaluationIntervalMs
};
