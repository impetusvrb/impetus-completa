'use strict';

/**
 * WAVE 3 — ingestão isolada de telemetria (telemetry_timeseries_v1 + industrial_telemetry_samples).
 */

const { v4: uuidv4 } = require('uuid');
const flags = require('./storageFlags');

const ALLOWED_DOMAINS = Object.freeze([
  'quality',
  'safety',
  'environment',
  'logistics',
  'platform',
  'cognitive',
  'operational'
]);

function validateSample(partial) {
  const p = partial && typeof partial === 'object' ? partial : {};
  const companyId = String(p.company_id || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(companyId)) {
    return { ok: false, reason: 'invalid_company_id' };
  }
  const domain = String(p.domain || 'platform').toLowerCase();
  if (!ALLOWED_DOMAINS.includes(domain)) {
    return { ok: false, reason: 'invalid_domain' };
  }
  const metricKey = String(p.metric_key || '').trim();
  if (!metricKey || metricKey.length > 128) {
    return { ok: false, reason: 'invalid_metric_key' };
  }
  const value = Number(p.value);
  if (!Number.isFinite(value)) {
    return { ok: false, reason: 'invalid_value' };
  }
  return {
    ok: true,
    sample: {
      company_id: companyId,
      domain,
      metric_key: metricKey,
      value,
      unit: p.unit != null ? String(p.unit).slice(0, 32) : null,
      labels: p.labels && typeof p.labels === 'object' ? p.labels : {},
      recorded_at: p.recorded_at || new Date().toISOString(),
      source: String(p.source || 'ingest').slice(0, 64)
    }
  };
}

async function ingestTimeseriesV1(sample) {
  if (!flags.isTelemetryIsolatedIngestEnabled()) {
    return { ok: false, reason: 'telemetry_ingest_disabled' };
  }
  const v = validateSample(sample);
  if (!v.ok) return v;

  try {
    const db = require('../db');
    const id = uuidv4();
    await db.query(
      `INSERT INTO telemetry_timeseries_v1
       (id, company_id, domain, metric_key, value, unit, labels, recorded_at)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7::jsonb, $8::timestamptz)`,
      [
        id,
        v.sample.company_id,
        v.sample.domain,
        v.sample.metric_key,
        v.sample.value,
        v.sample.unit,
        JSON.stringify(v.sample.labels),
        v.sample.recorded_at
      ]
    );
    return { ok: true, id, table: 'telemetry_timeseries_v1' };
  } catch (err) {
    return { ok: false, error: err.message || String(err), schema_missing: err.code === '42P01' };
  }
}

async function ingestIndustrialSample(sample) {
  if (!flags.isTelemetryIsolatedIngestEnabled()) {
    return { ok: false, reason: 'telemetry_ingest_disabled' };
  }
  const v = validateSample(sample);
  if (!v.ok) return v;

  try {
    const db = require('../db');
    const id = uuidv4();
    await db.query(
      `INSERT INTO industrial_telemetry_samples
       (id, company_id, domain, metric_key, value, unit, labels, source, recorded_at)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7::jsonb, $8, $9::timestamptz)`,
      [
        id,
        v.sample.company_id,
        v.sample.domain,
        v.sample.metric_key,
        v.sample.value,
        v.sample.unit,
        JSON.stringify(v.sample.labels),
        v.sample.source,
        v.sample.recorded_at
      ]
    );
    return { ok: true, id, table: 'industrial_telemetry_samples' };
  } catch (err) {
    return { ok: false, error: err.message || String(err), schema_missing: err.code === '42P01' };
  }
}

function getIsolationStrategy() {
  return {
    enabled: flags.isTelemetryIsolatedIngestEnabled(),
    allowed_domains: [...ALLOWED_DOMAINS],
    primary_table: 'telemetry_timeseries_v1',
    partitioned_table: 'industrial_telemetry_samples',
    legacy_table_untouched: 'system_metrics',
    dual_write_legacy: false
  };
}

module.exports = {
  ALLOWED_DOMAINS,
  validateSample,
  ingestTimeseriesV1,
  ingestIndustrialSample,
  getIsolationStrategy
};
