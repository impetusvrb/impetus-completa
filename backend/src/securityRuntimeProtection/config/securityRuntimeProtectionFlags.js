'use strict';

/**
 * SEC-18 — Runtime Protection flags.
 * Default OFF — planos operacionais only, nunca executa lockdown.
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

function isSecurityRuntimeProtectionEnabled() {
  return envBool('SECURITY_RUNTIME_PROTECTION', false);
}

function runtimeProtectionMode() {
  const raw = String(process.env.SECURITY_RUNTIME_PROTECTION_MODE || 'observe').toLowerCase();
  if (['observe', 'recommend'].includes(raw)) return raw;
  return 'observe';
}

function requireApproval() {
  return envBool('SECURITY_RUNTIME_REQUIRE_APPROVAL', true);
}

function evaluationIntervalMs() {
  const n = Number(process.env.SECURITY_RUNTIME_PROTECTION_EVAL_MS);
  if (!Number.isFinite(n)) return 60000;
  return Math.min(300000, Math.max(15000, Math.floor(n)));
}

module.exports = {
  envBool,
  isSecurityRuntimeProtectionEnabled,
  runtimeProtectionMode,
  requireApproval,
  evaluationIntervalMs
};
