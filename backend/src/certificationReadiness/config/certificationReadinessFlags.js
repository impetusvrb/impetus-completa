'use strict';

/**
 * PROMPT 31 — Certification readiness flags.
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function envMode(name, allowed, defaultValue) {
  const v = String(process.env[name] || defaultValue).trim().toLowerCase();
  return allowed.includes(v) ? v : defaultValue;
}

function certificationMode() {
  return envMode('IMPETUS_CERTIFICATION_READINESS_MODE', ['off', 'shadow', 'audit', 'on'], 'on');
}

function isCertificationReadinessActive() {
  return certificationMode() !== 'off' || envBool('IMPETUS_CERTIFICATION_READINESS_ENABLED', true);
}

function shouldPersistSnapshots() {
  const m = certificationMode();
  return m === 'audit' || m === 'on';
}

module.exports = {
  certificationMode,
  isCertificationReadinessActive,
  shouldPersistSnapshots,
  envBool
};
