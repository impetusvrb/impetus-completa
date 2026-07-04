'use strict';

/**
 * SEC-15 — Anti-Scanner + Anti-Enumeration flags.
 * Default OFF — observe only, nunca modifica respostas HTTP ou infra.
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

function isSecurityAntiScannerEnabled() {
  return envBool('SECURITY_ANTI_SCANNER', false);
}

function surfaceProtectionMode() {
  const raw = String(process.env.SECURITY_SURFACE_PROTECTION_MODE || 'observe').toLowerCase();
  if (['observe', 'recommend'].includes(raw)) return raw;
  return 'observe';
}

function requireApproval() {
  return envBool('SECURITY_ANTI_SCANNER_REQUIRE_APPROVAL', true);
}

function evaluationIntervalMs() {
  const n = Number(process.env.SECURITY_ANTI_SCANNER_EVAL_MS);
  if (!Number.isFinite(n)) return 60000;
  return Math.min(300000, Math.max(15000, Math.floor(n)));
}

module.exports = {
  envBool,
  isSecurityAntiScannerEnabled,
  surfaceProtectionMode,
  requireApproval,
  evaluationIntervalMs
};
