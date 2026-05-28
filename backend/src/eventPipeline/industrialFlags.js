'use strict';

/**
 * Flags WAVE 1 + WAVE 2 — backbone industrial (defaults seguros; não alteram runtime legado).
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

/** WAVE 2 master mode: off | shadow | audit | on */
function industrialBackboneMode() {
  return envMode(
    'IMPETUS_INDUSTRIAL_BACKBONE_MODE',
    ['off', 'shadow', 'audit', 'on'],
    'shadow'
  );
}

function isIndustrialBackboneActive() {
  const m = industrialBackboneMode();
  return m !== 'off';
}

function isIndustrialPartitioningEnabled() {
  return envBool('IMPETUS_INDUSTRIAL_PARTITIONING_ENABLED', false);
}

function isIndustrialArchiveEnabled() {
  return envBool('IMPETUS_INDUSTRIAL_ARCHIVE_ENABLED', false);
}

function isIndustrialStreamRecoveryEnabled() {
  return envBool('IMPETUS_INDUSTRIAL_STREAM_RECOVERY_ENABLED', true);
}

function isIndustrialBackboneSchedulerEnabled() {
  return envBool('IMPETUS_INDUSTRIAL_BACKBONE_SCHEDULER', false);
}

/** shadow | audit | on — fallback para IMPETUS_INDUSTRIAL_REPLAY_SHADOW=true */
function industrialReplayMode() {
  const explicit = process.env.IMPETUS_INDUSTRIAL_REPLAY_MODE;
  if (explicit != null && String(explicit).trim() !== '') {
    return envMode('IMPETUS_INDUSTRIAL_REPLAY_MODE', ['shadow', 'audit', 'on'], 'shadow');
  }
  return isIndustrialReplayShadow() ? 'shadow' : 'off';
}

function isReplayDryRun() {
  const mode = industrialReplayMode();
  return mode === 'shadow' || mode === 'audit';
}

/** observe | enforce — complementa IMPETUS_EVENT_THROTTLE_PER_TENANT */
function industrialBackpressureMode() {
  return envMode(
    'IMPETUS_INDUSTRIAL_BACKPRESSURE_MODE',
    ['observe', 'enforce'],
    'observe'
  );
}

function backbonePilotTenants() {
  const raw =
    process.env.IMPETUS_INDUSTRIAL_BACKBONE_PILOT_TENANTS ||
    process.env.IMPETUS_MQTT_REAL_PILOT_TENANTS ||
    process.env.IMPETUS_RLS_PILOT_TENANTS ||
    '';
  return String(raw)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function isBackbonePilotTenant(companyId) {
  const id = String(companyId || '').trim().toLowerCase();
  if (!id) return false;
  const pilots = backbonePilotTenants();
  if (pilots.length === 0) return true;
  return pilots.includes(id);
}

function isBackpressureEnforced() {
  return (
    industrialBackpressureMode() === 'enforce' ||
    isEventThrottlePerTenant()
  );
}

/** Enforce só no tenant piloto quando IMPETUS_INDUSTRIAL_BACKPRESSURE_PILOT_ONLY=true */
function isBackpressureEnforcedForTenant(companyId) {
  if (!isBackpressureEnforced()) return false;
  const pilotOnly = envBool('IMPETUS_INDUSTRIAL_BACKPRESSURE_PILOT_ONLY', true);
  if (!pilotOnly) return true;
  return isBackbonePilotTenant(companyId);
}

/** audit = dry-run (conta, não apaga); on = archive real */
function industrialArchiveMode() {
  return envMode('IMPETUS_INDUSTRIAL_ARCHIVE_MODE', ['audit', 'on'], 'on');
}

function isArchiveDryRun() {
  return isIndustrialArchiveEnabled() && industrialArchiveMode() === 'audit';
}

function streamRecoveryStaleMs() {
  const n = Number(process.env.IMPETUS_INDUSTRIAL_STREAM_RECOVERY_STALE_MS || 300000);
  return Number.isFinite(n) && n > 10000 ? Math.min(3600000, Math.floor(n)) : 300000;
}

function archiveDeliveredAfterDays() {
  const n = Number(process.env.IMPETUS_INDUSTRIAL_ARCHIVE_DELIVERED_DAYS || 7);
  return Number.isFinite(n) && n >= 1 ? Math.min(90, Math.floor(n)) : 7;
}

function globalBackpressureQueueCap() {
  const n = Number(process.env.IMPETUS_INDUSTRIAL_BACKPRESSURE_QUEUE_CAP || 15000);
  return Number.isFinite(n) && n > 100 ? Math.min(500000, Math.floor(n)) : 15000;
}

function isIndustrialEventsEnabled() {
  return envBool('IMPETUS_INDUSTRIAL_EVENTS_ENABLED', false);
}

function isIndustrialOutboxEnabled() {
  return envBool('IMPETUS_INDUSTRIAL_OUTBOX_ENABLED', false);
}

function isIndustrialDlqEnabled() {
  return envBool('IMPETUS_INDUSTRIAL_DLQ_ENABLED', false);
}

function isIndustrialReplayShadow() {
  return envBool('IMPETUS_INDUSTRIAL_REPLAY_SHADOW', true);
}

function isEventCatalogStrict() {
  return envBool('IMPETUS_EVENT_CATALOG_STRICT', false);
}

function isEventThrottlePerTenant() {
  return envBool('IMPETUS_EVENT_THROTTLE_PER_TENANT', false);
}

function maxOutboxAttempts() {
  const n = Number(process.env.IMPETUS_INDUSTRIAL_OUTBOX_MAX_ATTEMPTS || 6);
  return Number.isFinite(n) && n > 0 ? Math.min(20, Math.floor(n)) : 6;
}

function outboxDrainBatchSize() {
  const n = Number(process.env.IMPETUS_INDUSTRIAL_OUTBOX_BATCH_SIZE || 50);
  return Number.isFinite(n) && n > 0 ? Math.min(500, Math.floor(n)) : 50;
}

module.exports = {
  envBool,
  envMode,
  isIndustrialEventsEnabled,
  isIndustrialOutboxEnabled,
  isIndustrialDlqEnabled,
  isIndustrialReplayShadow,
  isEventCatalogStrict,
  isEventThrottlePerTenant,
  maxOutboxAttempts,
  outboxDrainBatchSize,
  industrialBackboneMode,
  isIndustrialBackboneActive,
  isIndustrialPartitioningEnabled,
  isIndustrialArchiveEnabled,
  isIndustrialStreamRecoveryEnabled,
  isIndustrialBackboneSchedulerEnabled,
  industrialReplayMode,
  isReplayDryRun,
  industrialBackpressureMode,
  isBackpressureEnforced,
  isBackpressureEnforcedForTenant,
  backbonePilotTenants,
  isBackbonePilotTenant,
  industrialArchiveMode,
  isArchiveDryRun,
  streamRecoveryStaleMs,
  archiveDeliveredAfterDays,
  globalBackpressureQueueCap
};
