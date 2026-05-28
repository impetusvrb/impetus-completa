'use strict';

/**
 * PROMPT 24 — Action Runtime flags (shadow-first, HITL obrigatório para mutações).
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

function actionRuntimeMode() {
  return envMode('IMPETUS_ACTION_RUNTIME_MODE', ['off', 'shadow', 'audit', 'on'], 'shadow');
}

function isActionRuntimeActive() {
  return actionRuntimeMode() !== 'off';
}

function isActionRuntimeEnabled() {
  if (envBool('IMPETUS_ACTION_RUNTIME_ENABLED', false)) return true;
  return isActionRuntimeActive();
}

function isShadowMode() {
  const m = actionRuntimeMode();
  return m === 'shadow';
}

function isAuditMode() {
  const m = actionRuntimeMode();
  return m === 'audit';
}

function isOnMode() {
  return actionRuntimeMode() === 'on';
}

function allowsRealExecution() {
  return isOnMode();
}

function pilotTenants() {
  const raw =
    process.env.IMPETUS_ACTION_RUNTIME_PILOT_TENANTS ||
    process.env.IMPETUS_INDUSTRIAL_BACKBONE_PILOT_TENANTS ||
    process.env.IMPETUS_MQTT_REAL_PILOT_TENANTS ||
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

function legacyToolCallingEnabled() {
  return envBool('OPERATIONAL_TOOL_CALLING_ENABLED', false);
}

function shouldUseActionRuntime(companyId) {
  if (!isActionRuntimeEnabled()) return false;
  if (!legacyToolCallingEnabled() && !envBool('IMPETUS_ACTION_RUNTIME_STANDALONE', false)) {
    return false;
  }
  return isPilotTenant(companyId);
}

module.exports = {
  envBool,
  actionRuntimeMode,
  isActionRuntimeActive,
  isActionRuntimeEnabled,
  isShadowMode,
  isAuditMode,
  isOnMode,
  allowsRealExecution,
  pilotTenants,
  isPilotTenant,
  legacyToolCallingEnabled,
  shouldUseActionRuntime
};
