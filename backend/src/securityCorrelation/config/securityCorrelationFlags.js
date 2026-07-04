'use strict';

/**
 * SEC-02 — Security Correlation Engine flags.
 * Default OFF — observational only.
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

function envInt(name, defaultValue, min, max) {
  const n = Number(process.env[name]);
  if (!Number.isFinite(n)) return defaultValue;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function isSecurityCorrelationEngineEnabled() {
  return envBool('SECURITY_CORRELATION_ENGINE', false);
}

/** Janela máxima para agrupar eventos no mesmo incidente (default 4h). */
function correlationWindowMs() {
  return envInt('SECURITY_CORRELATION_WINDOW_MS', 4 * 60 * 60 * 1000, 600000, 24 * 60 * 60 * 1000);
}

/** Inactividade para fechar incidente (default 30 min). */
function incidentClosureMs() {
  return envInt('SECURITY_INCIDENT_CLOSURE_MS', 30 * 60 * 1000, 300000, 4 * 60 * 60 * 1000);
}

function maxOpenIncidents() {
  return envInt('SECURITY_CORRELATION_MAX_INCIDENTS', 500, 50, 5000);
}

module.exports = {
  envBool,
  envInt,
  isSecurityCorrelationEngineEnabled,
  correlationWindowMs,
  incidentClosureMs,
  maxOpenIncidents
};
