'use strict';

/**
 * SEC-17 — Exfiltration Detection flags.
 * Default OFF — consultivo only, nunca bloqueia downloads.
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

function isSecurityExfiltrationDetectionEnabled() {
  return envBool('SECURITY_EXFILTRATION_DETECTION', false);
}

function dataProtectionMode() {
  const raw = String(process.env.SECURITY_DATA_PROTECTION_MODE || 'observe').toLowerCase();
  if (['observe', 'recommend'].includes(raw)) return raw;
  return 'observe';
}

function requireApproval() {
  return envBool('SECURITY_EXFILTRATION_REQUIRE_APPROVAL', true);
}

function evaluationIntervalMs() {
  const n = Number(process.env.SECURITY_EXFILTRATION_EVAL_MS);
  if (!Number.isFinite(n)) return 60000;
  return Math.min(300000, Math.max(15000, Math.floor(n)));
}

module.exports = {
  envBool,
  isSecurityExfiltrationDetectionEnabled,
  dataProtectionMode,
  requireApproval,
  evaluationIntervalMs
};
