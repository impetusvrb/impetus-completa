'use strict';

/**
 * Flags WAVE 1 — backbone industrial (defaults seguros; não alteram runtime legado).
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
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
  isIndustrialEventsEnabled,
  isIndustrialOutboxEnabled,
  isIndustrialDlqEnabled,
  isIndustrialReplayShadow,
  isEventCatalogStrict,
  isEventThrottlePerTenant,
  maxOutboxAttempts,
  outboxDrainBatchSize
};
