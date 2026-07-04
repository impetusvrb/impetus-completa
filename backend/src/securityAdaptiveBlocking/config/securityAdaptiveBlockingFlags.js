'use strict';

/**
 * SEC-14 — Adaptive Blocking flags.
 * Default OFF — observe only, nunca bloqueia IP.
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

function isSecurityAdaptiveBlockingEnabled() {
  return envBool('SECURITY_ADAPTIVE_BLOCKING', false);
}

function blockingMode() {
  const raw = String(process.env.SECURITY_BLOCKING_MODE || 'observe').toLowerCase();
  if (['observe', 'recommend'].includes(raw)) return raw;
  return 'observe';
}

function requireApproval() {
  return envBool('SECURITY_BLOCKING_REQUIRE_APPROVAL', true);
}

function evaluationIntervalMs() {
  const n = Number(process.env.SECURITY_ADAPTIVE_BLOCKING_EVAL_MS);
  if (!Number.isFinite(n)) return 60000;
  return Math.min(300000, Math.max(15000, Math.floor(n)));
}

module.exports = {
  envBool,
  isSecurityAdaptiveBlockingEnabled,
  blockingMode,
  requireApproval,
  evaluationIntervalMs
};
