'use strict';

/**
 * SEC-11 — Enterprise Adaptive Protection flags.
 * Default OFF — planos only, aprovação humana obrigatória.
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

function isSecurityAdaptiveProtectionEnabled() {
  return envBool('SECURITY_ADAPTIVE_PROTECTION', false);
}

/** observe | plan — nunca execute automático. */
function protectionMode() {
  const raw = String(process.env.SECURITY_PROTECTION_MODE || 'observe').toLowerCase();
  if (['observe', 'plan'].includes(raw)) return raw;
  return 'observe';
}

function requireApproval() {
  return envBool('SECURITY_PROTECTION_REQUIRE_APPROVAL', true);
}

function evaluationIntervalMs() {
  const n = Number(process.env.SECURITY_PROTECTION_EVAL_MS);
  if (!Number.isFinite(n)) return 60000;
  return Math.min(300000, Math.max(15000, Math.floor(n)));
}

module.exports = {
  envBool,
  isSecurityAdaptiveProtectionEnabled,
  protectionMode,
  requireApproval,
  evaluationIntervalMs
};
