'use strict';

/**
 * WAVE 3 — flags de storage temporal (defaults seguros).
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function envStr(name, defaultValue = 'none') {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  return String(raw).trim().toLowerCase();
}

function isStorageV3Enabled() {
  return envBool('IMPETUS_STORAGE_V3_ENABLED', false);
}

function isTimescaleEnabled() {
  return isStorageV3Enabled() && envBool('IMPETUS_TIMESCALE_ENABLED', false);
}

function isTimescalePrepareExtension() {
  return isStorageV3Enabled() && envBool('IMPETUS_TIMESCALE_PREPARE_EXTENSION', false);
}

function partitioningStrategy() {
  const s = envStr('IMPETUS_PARTITIONING_STRATEGY', 'none');
  if (['none', 'weekly', 'monthly'].includes(s)) return s;
  return 'none';
}

function isColdStorageEnabled() {
  return isStorageV3Enabled() && envBool('IMPETUS_COLD_STORAGE_ENABLED', false);
}

function retentionProfile() {
  return envStr('IMPETUS_RETENTION_PROFILE', 'default');
}

function isTelemetryIsolatedIngestEnabled() {
  return isStorageV3Enabled() && envBool('IMPETUS_TELEMETRY_ISOLATED_INGEST_ENABLED', false);
}

function isPartitionMaintenanceEnabled() {
  return isStorageV3Enabled() && envBool('IMPETUS_PARTITION_MAINTENANCE_ENABLED', false);
}

module.exports = {
  envBool,
  isStorageV3Enabled,
  isTimescaleEnabled,
  isTimescalePrepareExtension,
  partitioningStrategy,
  isColdStorageEnabled,
  retentionProfile,
  isTelemetryIsolatedIngestEnabled,
  isPartitionMaintenanceEnabled
};
