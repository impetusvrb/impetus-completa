'use strict';

/**
 * PROMPT 28 — Runtime unification flags (voice/panel/text/memory/orchestration → SZ5).
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

function unificationMode() {
  return envMode('IMPETUS_RUNTIME_UNIFICATION_MODE', ['off', 'shadow', 'audit', 'on'], 'shadow');
}

function isUnificationActive() {
  return unificationMode() !== 'off' || envBool('IMPETUS_RUNTIME_UNIFICATION_ENABLED', false);
}

function isShadowMode() {
  return unificationMode() === 'shadow';
}

function isAuditMode() {
  return unificationMode() === 'audit';
}

function isOnMode() {
  return unificationMode() === 'on';
}

function shouldPersistAudit() {
  const m = unificationMode();
  return m === 'audit' || m === 'on';
}

function shouldServeUnifiedBlock() {
  return isOnMode();
}

function pilotTenants() {
  const raw =
    process.env.IMPETUS_RUNTIME_UNIFICATION_PILOT_TENANTS ||
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

function shouldApplyForTenant(companyId) {
  if (!isUnificationActive()) return false;
  return isPilotTenant(companyId);
}

module.exports = {
  unificationMode,
  isUnificationActive,
  isShadowMode,
  isAuditMode,
  isOnMode,
  shouldPersistAudit,
  shouldServeUnifiedBlock,
  pilotTenants,
  isPilotTenant,
  shouldApplyForTenant,
  envBool
};
