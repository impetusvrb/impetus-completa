'use strict';

/**
 * Etapa 4 — Industrial Telemetry Runtime (Quality).
 * Aditivo; defaults seguros (desligado).
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function envFloat(name, defaultValue) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const n = Number(String(raw).trim());
  return Number.isFinite(n) ? n : defaultValue;
}

function envInt(name, defaultValue) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const n = parseInt(String(raw).trim(), 10);
  return Number.isFinite(n) ? n : defaultValue;
}

function envStr(name, defaultValue) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  return String(raw).trim().toLowerCase();
}

function isQualityTelemetryRuntimeEnabled() {
  return envBool('IMPETUS_QUALITY_TELEMETRY_RUNTIME_ENABLED', false);
}

/** Publica marcadores de ingestão no backbone industrial (amostra/lote). */
function isQualityTelemetryBackboneEventsEnabled() {
  return isQualityTelemetryRuntimeEnabled() && envBool('IMPETUS_QUALITY_TELEMETRY_BACKBONE_EVENTS_ENABLED', false);
}

/** Quando violação de intervalo declarado pelo cliente; não é decisão autónoma. */
function isQualityTelemetryRangeEventsEnabled() {
  return isQualityTelemetryRuntimeEnabled() && envBool('IMPETUS_QUALITY_TELEMETRY_RANGE_EVENTS_ENABLED', true);
}

/**
 * 0–1: fração a aceitar para persistência (amostragem edge-side reduz carga).
 * Default 1 = sem descarte.
 */
function getQualityTelemetrySampleRatio() {
  const r = envFloat('IMPETUS_QUALITY_TELEMETRY_SAMPLE_RATIO', 1);
  if (r >= 1) return 1;
  if (r <= 0) return 0;
  return r;
}

function getQualityTelemetryBatchMax() {
  const m = envInt('IMPETUS_QUALITY_TELEMETRY_BATCH_MAX', 200);
  if (m < 1) return 1;
  if (m > 2000) return 2000;
  return m;
}

/** timeseries | industrial — alvo WAVE 3 existente. */
function getQualityTelemetryPrimaryPersistence() {
  const p = envStr('IMPETUS_QUALITY_TELEMETRY_PRIMARY_TABLE', 'timeseries');
  if (p === 'industrial') return 'industrial';
  return 'timeseries';
}

function getTelemetryRuntimeFlagSnapshot() {
  return {
    telemetry_runtime: isQualityTelemetryRuntimeEnabled(),
    backbone_events: isQualityTelemetryBackboneEventsEnabled(),
    range_events: isQualityTelemetryRangeEventsEnabled(),
    sample_ratio: getQualityTelemetrySampleRatio(),
    batch_max: getQualityTelemetryBatchMax(),
    primary_table: getQualityTelemetryPrimaryPersistence()
  };
}

module.exports = {
  isQualityTelemetryRuntimeEnabled,
  isQualityTelemetryBackboneEventsEnabled,
  isQualityTelemetryRangeEventsEnabled,
  getQualityTelemetrySampleRatio,
  getQualityTelemetryBatchMax,
  getQualityTelemetryPrimaryPersistence,
  getTelemetryRuntimeFlagSnapshot
};
