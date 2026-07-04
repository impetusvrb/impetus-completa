'use strict';

/**
 * SEC-04 — Runtime Integrity flags.
 * Default OFF — observational only, zero auto-remediation.
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

function envInt(name, defaultValue, min, max) {
  const n = Number(process.env[name]);
  if (!Number.isFinite(n)) return defaultValue;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function isSecurityRuntimeIntegrityEnabled() {
  return envBool('SECURITY_RUNTIME_INTEGRITY', false);
}

function checkIntervalMs() {
  return envInt('SECURITY_INTEGRITY_CHECK_INTERVAL_MS', 300000, 60000, 3600000);
}

module.exports = {
  envBool,
  envInt,
  isSecurityRuntimeIntegrityEnabled,
  checkIntervalMs
};
