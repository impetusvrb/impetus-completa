'use strict';

/**
 * PROMPT 27 — Legacy deprecation governance flags.
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

function deprecationMode() {
  return envMode('IMPETUS_LEGACY_DEPRECATION_MODE', ['off', 'shadow', 'audit', 'on'], 'shadow');
}

function isDeprecationGovernanceActive() {
  return deprecationMode() !== 'off' || envBool('IMPETUS_LEGACY_DEPRECATION_ENABLED', false);
}

function isShadowMode() {
  return deprecationMode() === 'shadow';
}

function isAuditMode() {
  return deprecationMode() === 'audit';
}

function allowsEnforcement() {
  return deprecationMode() === 'on';
}

function shouldPersistAudit() {
  const m = deprecationMode();
  return m === 'audit' || m === 'on';
}

function pilotTenants() {
  const raw =
    process.env.IMPETUS_LEGACY_DEPRECATION_PILOT_TENANTS ||
    process.env.IMPETUS_ACTION_RUNTIME_PILOT_TENANTS ||
    '';
  return String(raw)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function isPilotTenant(companyId) {
  const pilots = pilotTenants();
  if (pilots.length === 0) return true;
  return pilots.includes(String(companyId || '').trim().toLowerCase());
}

module.exports = {
  deprecationMode,
  isDeprecationGovernanceActive,
  isShadowMode,
  isAuditMode,
  allowsEnforcement,
  shouldPersistAudit,
  pilotTenants,
  isPilotTenant,
  envBool
};
