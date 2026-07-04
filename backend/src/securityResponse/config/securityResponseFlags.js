'use strict';

/**
 * SEC-06 — Response Orchestrator flags.
 * Default OFF — Protect nunca habilitado por defeito.
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

function isSecurityResponseOrchestratorEnabled() {
  return envBool('SECURITY_RESPONSE_ORCHESTRATOR', false);
}

/** Modo default: observe | advise | assist (nunca protect). */
function defaultResponseMode() {
  const raw = String(process.env.SECURITY_RESPONSE_DEFAULT_MODE || 'advise').toLowerCase();
  if (['observe', 'advise', 'assist'].includes(raw)) return raw;
  return 'advise';
}

/** Nível máximo executável (0–2). Protect=3 nunca auto. */
function maxExecutableLevel() {
  const n = envInt('SECURITY_RESPONSE_MAX_LEVEL', 2, 0, 2);
  return n;
}

function protectModeEnabled() {
  return envBool('SECURITY_RESPONSE_PROTECT_ENABLED', false);
}

function maxStoredResponses() {
  return envInt('SECURITY_RESPONSE_MAX_STORED', 200, 20, 2000);
}

module.exports = {
  envBool,
  envInt,
  isSecurityResponseOrchestratorEnabled,
  defaultResponseMode,
  maxExecutableLevel,
  protectModeEnabled,
  maxStoredResponses
};
