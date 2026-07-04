'use strict';

/**
 * SEC-07 — SOC Dashboard flags.
 * Default OFF — read-only visualization only.
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

function isSecuritySOCEnabled() {
  return envBool('SECURITY_SOC', false);
}

function cacheTtlMs() {
  return envInt('SECURITY_SOC_CACHE_TTL_MS', 30000, 5000, 300000);
}

module.exports = {
  envBool,
  envInt,
  isSecuritySOCEnabled,
  cacheTtlMs
};
