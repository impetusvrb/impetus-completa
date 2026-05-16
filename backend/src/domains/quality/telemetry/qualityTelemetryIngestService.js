'use strict';

const { v4: uuidv4 } = require('uuid');
const telemetry = require('../../../storage/telemetryIsolationService');
const storageFlags = require('../../../storage/storageFlags');
const obs = require('../../../services/operational/enterpriseObservabilityRuntime');
const { publishQualityIndustrialEvent } = require('../events/qualityEventPublisher');
const telemetryFlags = require('./qualityTelemetryRuntimeFlags');
const { shouldPersistSample } = require('./qualityTelemetrySampling');
const { validateDimensionalBlock, mergeLabelsForIngest } = require('./qualityTelemetryDimensional');
const { evaluateExpectedRange } = require('./qualityTelemetryAnomalyGate');

function _coerceSampleBody(companyId, body) {
  const b = body && typeof body === 'object' ? body : {};
  const dimRes = validateDimensionalBlock(b.dimensional);
  if (!dimRes.ok) return { ok: false, reason: dimRes.reason };

  let labels = mergeLabelsForIngest(b.labels, dimRes);
  const corr = b.correlation_id != null ? String(b.correlation_id).trim() : '';
  if (corr) labels.correlation_id = corr.slice(0, 128);
  if (b.idempotency_key != null) {
    labels.idempotency_key = String(b.idempotency_key).trim().slice(0, 128);
  }
  if (b.edge_sequence != null && String(b.edge_sequence).trim()) {
    labels.edge_sequence = String(b.edge_sequence).trim().slice(0, 64);
  }
  if (b.station_id != null && String(b.station_id).trim()) {
    labels.station_id = String(b.station_id).trim().slice(0, 128);
  }

  const sample = {
    company_id: companyId,
    domain: 'quality',
    metric_key: b.metric_key,
    value: b.value,
    unit: b.unit,
    labels,
    recorded_at: b.recorded_at,
    source: b.source || 'quality_telemetry_runtime'
  };
  return { ok: true, sample, expected_range: b.expected_range };
}

async function _persist(sample) {
  const mode = telemetryFlags.getQualityTelemetryPrimaryPersistence();
  if (mode === 'industrial') {
    return telemetry.ingestIndustrialSample(sample);
  }
  return telemetry.ingestTimeseriesV1(sample);
}

async function _emitRangeBreach({ companyId, userId, sample, rangeEval, correlationId }) {
  if (!telemetryFlags.isQualityTelemetryRangeEventsEnabled()) return;
  await publishQualityIndustrialEvent(
    {
      event_name: 'quality.telemetry.range_breached',
      company_id: companyId,
      correlation_id: correlationId || uuidv4(),
      payload: {
        metric_key: sample.metric_key,
        value: sample.value,
        unit: sample.unit,
        min: rangeEval.min,
        max: rangeEval.max,
        recorded_at: sample.recorded_at,
        labels: sample.labels
      }
    },
    { origin_layer: 'operational', intended_audience: 'operator', user_id: userId }
  );
  obs.recordMetric('quality_telemetry_range_breach_total', 1, { company_id: String(companyId).slice(0, 8) });
}

async function _emitSampleIngested({ companyId, userId, ingestResult, metricKey, correlationId }) {
  if (!telemetryFlags.isQualityTelemetryBackboneEventsEnabled()) return;
  await publishQualityIndustrialEvent(
    {
      event_name: 'quality.telemetry.sample_ingested',
      company_id: companyId,
      correlation_id: correlationId || uuidv4(),
      payload: {
        table: ingestResult.table,
        row_id: ingestResult.id,
        metric_key: metricKey
      }
    },
    { origin_layer: 'operational', intended_audience: 'operator', user_id: userId }
  );
}

/**
 * @param {string} companyId
 * @param {string|undefined} userId
 * @param {object} body
 * @param {{ emit_sample_event?: boolean }} opts
 */
async function ingestSingle(companyId, userId, body, opts = {}) {
  const emitSampleEvent = opts.emit_sample_event !== false;
  if (!storageFlags.isTelemetryIsolatedIngestEnabled()) {
    return { ok: false, code: 'W3_TELEMETRY_INGEST_OFF', reason: 'telemetry_ingest_disabled' };
  }

  const coerced = _coerceSampleBody(companyId, body);
  if (!coerced.ok) {
    return { ok: false, code: 'INVALID_PAYLOAD', reason: coerced.reason };
  }

  const correlationId =
    (coerced.sample.labels && coerced.sample.labels.correlation_id) || body.correlation_id || uuidv4();

  if (!shouldPersistSample()) {
    obs.recordMetric('quality_telemetry_sampled_out_total', 1, {});
    return {
      ok: true,
      skipped: true,
      reason: 'sampled_out',
      correlation_id: correlationId
    };
  }

  const rangeEval = evaluateExpectedRange(coerced.sample.value, coerced.expected_range);
  const ingestResult = await _persist(coerced.sample);

  if (!ingestResult.ok) {
    obs.recordMetric('quality_telemetry_ingest_fail_total', 1, { reason: String(ingestResult.reason || 'error') });
    return {
      ok: false,
      code: 'INGEST_FAILED',
      correlation_id: correlationId,
      ...ingestResult
    };
  }

  obs.recordMetric('quality_telemetry_ingest_ok_total', 1, {
    table: String(ingestResult.table || '')
  });

  try {
    if (rangeEval.breached) {
      await _emitRangeBreach({
        companyId,
        userId,
        sample: coerced.sample,
        rangeEval,
        correlationId
      });
    }
    if (emitSampleEvent) {
      await _emitSampleIngested({
        companyId,
        userId,
        ingestResult,
        metricKey: coerced.sample.metric_key,
        correlationId
      });
    }
  } catch (pubErr) {
    obs.recordMetric('quality_telemetry_publish_fail_total', 1, {});
  }

  return {
    ok: true,
    correlation_id: correlationId,
    ingest: ingestResult,
    range_evaluation: rangeEval
  };
}

/**
 * @param {string} companyId
 * @param {string|undefined} userId
 * @param {object[]} items
 */
async function ingestBatch(companyId, userId, items) {
  const max = telemetryFlags.getQualityTelemetryBatchMax();
  const arr = Array.isArray(items) ? items.slice(0, max) : [];
  const results = [];
  let okCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  for (const it of arr) {
    const r = await ingestSingle(companyId, userId, it, { emit_sample_event: false });
    results.push(r);
    if (r.skipped) skippedCount++;
    else if (r.ok) okCount++;
    else failCount++;
  }

  let batchEvent = null;
  if (
    telemetryFlags.isQualityTelemetryBackboneEventsEnabled() &&
    okCount > 0 &&
    storageFlags.isTelemetryIsolatedIngestEnabled()
  ) {
    try {
      batchEvent = await publishQualityIndustrialEvent(
        {
          event_name: 'quality.telemetry.batch_ingested',
          company_id: companyId,
          correlation_id: uuidv4(),
          payload: {
            accepted: okCount,
            failed: failCount,
            skipped_sampled: skippedCount,
            batch_size: arr.length
          }
        },
        { origin_layer: 'operational', intended_audience: 'operator', user_id: userId }
      );
    } catch (_e) {
      obs.recordMetric('quality_telemetry_publish_fail_total', 1, { scope: 'batch' });
    }
  }

  return {
    ok: failCount === 0 || okCount > 0,
    summary: { accepted: okCount, failed: failCount, skipped_sampled: skippedCount, batch_size: arr.length },
    results,
    backbone: batchEvent ? { published: true } : { published: false }
  };
}

function getIngestDependencySnapshot() {
  return {
    w3_telemetry_ingest: storageFlags.isTelemetryIsolatedIngestEnabled(),
    isolation: telemetry.getIsolationStrategy()
  };
}

module.exports = {
  ingestSingle,
  ingestBatch,
  getIngestDependencySnapshot
};
