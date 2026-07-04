'use strict';

/**
 * SEC-13 — Controlled Execution flags.
 * Default OFF — auto-exec apenas LOW risk.
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

function isSecurityControlledExecutionEnabled() {
  return envBool('SECURITY_CONTROLLED_EXECUTION', false);
}

/** LOW only nesta fase — MEDIUM/HIGH/CRITICAL requerem ciclo futuro. */
function autoExecutionLevel() {
  const raw = String(process.env.SECURITY_AUTO_EXECUTION_LEVEL || 'LOW').toUpperCase();
  if (['LOW'].includes(raw)) return raw;
  return 'LOW';
}

function manualApprovalRequired() {
  return envBool('SECURITY_MANUAL_APPROVAL_REQUIRED', true);
}

function evaluationIntervalMs() {
  const n = Number(process.env.SECURITY_CONTROLLED_EXECUTION_EVAL_MS);
  if (!Number.isFinite(n)) return 120000;
  return Math.min(600000, Math.max(30000, Math.floor(n)));
}

module.exports = {
  envBool,
  isSecurityControlledExecutionEnabled,
  autoExecutionLevel,
  manualApprovalRequired,
  evaluationIntervalMs
};
