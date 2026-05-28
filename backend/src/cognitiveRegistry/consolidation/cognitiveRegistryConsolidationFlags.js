'use strict';

/**
 * PROMPT 26 — Cognitive Registry Consolidation flags.
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

function consolidationMode() {
  return envMode(
    'IMPETUS_COGNITIVE_REGISTRY_CONSOLIDATION_MODE',
    ['off', 'shadow', 'audit', 'on'],
    'shadow'
  );
}

function isConsolidationActive() {
  return consolidationMode() !== 'off' || envBool('IMPETUS_COGNITIVE_REGISTRY_SSOT_ENABLED', false);
}

function isShadowMode() {
  return consolidationMode() === 'shadow';
}

function isAuditMode() {
  return consolidationMode() === 'audit';
}

function allowsAuthoritativeRedirect() {
  return consolidationMode() === 'on';
}

/** Persistência em BD do audit trail (shadow = só logs estruturados). */
function shouldPersistAuditTrail() {
  const m = consolidationMode();
  return m === 'audit' || m === 'on';
}

function isOnMode() {
  return consolidationMode() === 'on';
}

function pilotTenants() {
  const raw =
    process.env.IMPETUS_COGNITIVE_REGISTRY_PILOT_TENANTS ||
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
  consolidationMode,
  isConsolidationActive,
  isShadowMode,
  isAuditMode,
  allowsAuthoritativeRedirect,
  shouldPersistAuditTrail,
  isOnMode,
  pilotTenants,
  isPilotTenant,
  envBool
};
