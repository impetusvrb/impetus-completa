'use strict';

/**
 * PROMPT 25 — Industrial Workflow Engine flags (shadow-first).
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

function workflowEngineMode() {
  return envMode('IMPETUS_WORKFLOW_ENGINE_MODE', ['off', 'shadow', 'audit', 'on'], 'shadow');
}

function isWorkflowEngineActive() {
  return workflowEngineMode() !== 'off';
}

function isShadowMode() {
  return workflowEngineMode() === 'shadow';
}

function isAuditMode() {
  return workflowEngineMode() === 'audit';
}

function allowsRealExecution() {
  return workflowEngineMode() === 'on';
}

function pilotTenants() {
  const raw =
    process.env.IMPETUS_WORKFLOW_ENGINE_PILOT_TENANTS ||
    process.env.IMPETUS_ACTION_RUNTIME_PILOT_TENANTS ||
    process.env.IMPETUS_INDUSTRIAL_BACKBONE_PILOT_TENANTS ||
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

function shouldUseWorkflowEngine(companyId) {
  if (!isWorkflowEngineActive()) return false;
  return isPilotTenant(companyId);
}

module.exports = {
  envBool,
  workflowEngineMode,
  isWorkflowEngineActive,
  isShadowMode,
  isAuditMode,
  allowsRealExecution,
  pilotTenants,
  isPilotTenant,
  shouldUseWorkflowEngine
};
