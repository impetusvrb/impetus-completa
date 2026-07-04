'use strict';

/**
 * SEC-03 — Threat Intelligence Engine flags.
 * Default OFF — consultative only, zero runtime interference.
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

function isSecurityThreatIntelligenceEnabled() {
  return envBool('SECURITY_THREAT_INTELLIGENCE', false);
}

/** Janela para comparação histórica (default 30 dias). */
function historicalWindowMs() {
  return envInt('SECURITY_THREAT_HISTORICAL_WINDOW_MS', 30 * 24 * 60 * 60 * 1000, 86400000, 90 * 24 * 60 * 60 * 1000);
}

function maxStoredProfiles() {
  return envInt('SECURITY_THREAT_MAX_PROFILES', 1000, 100, 10000);
}

module.exports = {
  envBool,
  envInt,
  isSecurityThreatIntelligenceEnabled,
  historicalWindowMs,
  maxStoredProfiles
};
