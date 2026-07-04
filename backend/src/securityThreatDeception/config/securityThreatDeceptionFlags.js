'use strict';

/**
 * SEC-16 — Threat Deception flags.
 * Default OFF — planos certificados only, nunca expõe honeypots reais.
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

function isSecurityThreatDeceptionEnabled() {
  return envBool('SECURITY_THREAT_DECEPTION', false);
}

function deceptionMode() {
  const raw = String(process.env.SECURITY_DECEPTION_MODE || 'observe').toLowerCase();
  if (['observe', 'recommend'].includes(raw)) return raw;
  return 'observe';
}

function requireApproval() {
  return envBool('SECURITY_DECEPTION_REQUIRE_APPROVAL', true);
}

function evaluationIntervalMs() {
  const n = Number(process.env.SECURITY_THREAT_DECEPTION_EVAL_MS);
  if (!Number.isFinite(n)) return 60000;
  return Math.min(300000, Math.max(15000, Math.floor(n)));
}

module.exports = {
  envBool,
  isSecurityThreatDeceptionEnabled,
  deceptionMode,
  requireApproval,
  evaluationIntervalMs
};
