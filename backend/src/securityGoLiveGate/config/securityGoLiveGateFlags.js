'use strict';

/**
 * SEC-21A — Go-Live Gate flags (consultivo only).
 */

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

function isSecurityGoLiveGateEnabled() {
  return envBool('SECURITY_GO_LIVE_GATE', false);
}

function integrityThreshold() {
  return envFloat('SEC21A_INTEGRITY_THRESHOLD', 0.95);
}

function fastObservation() {
  return envBool('SEC21A_FAST_OBSERVATION', false);
}

function skipInfraProbes() {
  return envBool('SEC21A_SKIP_INFRA_PROBES', false);
}

module.exports = {
  envBool,
  isSecurityGoLiveGateEnabled,
  integrityThreshold,
  fastObservation,
  skipInfraProbes
};
