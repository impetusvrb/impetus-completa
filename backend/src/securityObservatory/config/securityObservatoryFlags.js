'use strict';

/**
 * SEC-01 — Enterprise Security Observatory flags.
 * Default OFF — observational only, zero runtime interference when disabled.
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

function isSecurityObservatoryEnabled() {
  return envBool('SECURITY_OBSERVATORY', false);
}

/** Janela de agregação em ms (default 60s — evita armazenar cada request). */
function aggregationWindowMs() {
  return envInt('SECURITY_OBSERVATORY_WINDOW_MS', 60000, 10000, 300000);
}

/** Máximo de buckets activos em memória. */
function maxAggregationBuckets() {
  return envInt('SECURITY_OBSERVATORY_MAX_BUCKETS', 5000, 500, 50000);
}

/** Máximo entradas timeline. */
function maxTimelineEntries() {
  return envInt('SECURITY_OBSERVATORY_MAX_TIMELINE', 500, 50, 5000);
}

/** IPs internos / operadores (comma-separated). */
function trustedOperatorCidrs() {
  const raw = process.env.SECURITY_OBSERVATORY_TRUSTED_CIDRS || '170.246.0.0/16,186.225.0.0/16,127.0.0.1';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

module.exports = {
  envBool,
  envInt,
  isSecurityObservatoryEnabled,
  aggregationWindowMs,
  maxAggregationBuckets,
  maxTimelineEntries,
  trustedOperatorCidrs
};
