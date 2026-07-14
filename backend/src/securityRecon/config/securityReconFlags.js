'use strict';

function envBool(name, defaultValue) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

function envInt(name, defaultValue, min, max) {
  const n = parseInt(process.env[name] || String(defaultValue), 10);
  if (Number.isNaN(n)) return defaultValue;
  return Math.max(min, Math.min(max, n));
}

function isSecurityReconCorrelationEnabled() {
  return envBool('SECURITY_RECON_CORRELATION', false);
}

function reconWindowMs() {
  return envInt('SECURITY_RECON_WINDOW_MS', 120000, 10000, 600000);
}

function reconMaxKeys() {
  return envInt('SECURITY_RECON_MAX_KEYS', 5000, 500, 50000);
}

function reconContainmentEnabled() {
  return envBool('SECURITY_RECON_CONTAINMENT', true);
}

function threatWatchIngestIntervalMs() {
  return envInt('SECURITY_RECON_THREAT_INGEST_MS', 60000, 10000, 300000);
}

module.exports = {
  isSecurityReconCorrelationEnabled,
  reconWindowMs,
  reconMaxKeys,
  reconContainmentEnabled,
  threatWatchIngestIntervalMs
};
