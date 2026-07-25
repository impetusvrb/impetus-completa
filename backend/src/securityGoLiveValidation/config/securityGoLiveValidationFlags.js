'use strict';

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

function envFloat(name, defaultValue) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) ? n : defaultValue;
}

function isSecurityGoLiveValidationEnabled() {
  return envBool('SECURITY_GO_LIVE_VALIDATION', false);
}

function integrityThreshold() {
  return envFloat('SEC21C_INTEGRITY_THRESHOLD', 0.95);
}

function skipInfraProbes() {
  return envBool('SEC21C_SKIP_INFRA_PROBES', false);
}

function fastGuard() {
  return envBool('SEC21C_FAST_GUARD', false);
}

module.exports = {
  envBool,
  isSecurityGoLiveValidationEnabled,
  integrityThreshold,
  skipInfraProbes,
  fastGuard
};
