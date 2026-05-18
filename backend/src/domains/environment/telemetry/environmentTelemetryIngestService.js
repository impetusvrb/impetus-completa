'use strict';

const { v4: uuidv4 } = require('uuid');
const telemetry = require('../../../storage/telemetryIsolationService');
const storageFlags = require('../../../storage/storageFlags');
const { publishEnvironmentIndustrialEvent } = require('../events/environmentEventPublisher');
const telemetryFlags = require('./environmentTelemetryRuntimeFlags');
const { shouldPersistSample } = require('./environmentTelemetrySampling');
const { validateDimensionalBlock, mergeLabelsForIngest } = require('./environmentTelemetryDimensional');
const { normalizeEnvironmentalSample } = require('./environmentTelemetryNormalization');
const {
  evaluateExpectedRange,
  evaluateDrift,
  computeAnomalyScore
} = require('./environmentTelemetryAnomalyGate');
const correlation = require('./environmentRealtimeCorrelationRuntime');
const obs = require('./environmentTelemetryObservability');

function _coerceSampleBody(companyId, body) {
  const b = body && typeof body === 'object' ? body : {};
  const dimRes = validateDimensionalBlock(b.dimensional);
  if (!dimRes.ok) return { ok: false, reason: dimRes.reason };

  const norm = normalizeEnvironmentalSample(companyId, b);
  if (!norm.ok) return { ok: false, reason: norm.reason };

  let labels = mergeLabelsForIngest(norm.sample.labels, dimRes);
  const corr = b.correlation_id != null ? String(b.correlation_id).trim() : '';
  if (corr) labels.correlation_id = corr.slice(0, 128);
  if (b.idempotency_key != null) {
    labels.idempotency_key = String(b.idempotency_key).trim().slice(0, 128);
  }
  if (b.edge_sequence != null && String(b.edge_sequence).trim()) {
    labels.edge_sequence = String(b.edge_sequence).trim().slice(0, 64);
  }

  norm.sample.labels = labels;
  return {
    ok: true,
    sample: norm.sample,
    metadata: norm.metadata,
    expected_range: b.expected_range,
    drift_baseline: b.drift_baseline
  };
}

async function _persist(sample) {
  const mode = telemetryFlags.getEnvironmentTelemetryPrimaryPersistence();
  if (mode === 'industrial') {
    return telemetry.ingestIndustrialSample(sample);
  }
  return telemetry.ingestTimeseriesV1(sample);
}

async function _emitThresholdExceeded({ companyId, userId, sample, rangeEval, correlationId }) {
  if (!telemetryFlags.isEnvironmentTelemetryThresholdEventsEnabled()) return;
  await publishEnvironmentIndustrialEvent(
    {
      event_name: 'environment.telemetry.threshold_exceeded',
      company_id: companyId,
      correlation_id: correlationId || uuidv4(),
      payload: {
        metric_key: sample.metric_key,
        value: sample.value,
        unit: sample.unit,
        min: rangeEval.min,
        max: rangeEval.max,
        environmental_area: sample.labels?.environmental_area,
        recorded_at: sample.recorded_at,
        labels: sample.labels
      }
    },
    { origin_layer: 'operational', intended_audience: 'operator', user_id: userId }
  );
}

async function _emitDriftDetected({ companyId, userId, sample, driftEval, correlationId }) {
  if (!telemetryFlags.isEnvironmentTelemetryDriftEventsEnabled()) return;
  await publishEnvironmentIndustrialEvent(
    {
      event_name: 'environment.telemetry.drift_detected',
      company_id: companyId,
      correlation_id: correlationId || uuidv4(),
      payload: {
        metric_key: sample.metric_key,
        value: sample.value,
        delta: driftEval.delta,
        environmental_area: sample.labels?.environmental_area
      }
    },
    { origin_layer: 'operational', intended_audience: 'coordinator', user_id: userId }
  );
}

async function _emitSampleIngested({ companyId, userId, ingestResult, metricKey, correlationId, metadata }) {
  if (!telemetryFlags.isEnvironmentTelemetryBackboneEventsEnabled()) return;
  await publishEnvironmentIndustrialEvent(
    {
      event_name: 'environment.telemetry.sample_ingested',
      company_id: companyId,
      correlation_id: correlationId || uuidv4(),
      payload: {
        table: ingestResult.table,
        row_id: ingestResult.id,
        metric_key: metricKey,
        environmental_area: metadata?.environmental_area,
        telemetry_type: metadata?.telemetry_type
      }
    },
    { origin_layer: 'operational', intended_audience: 'operator', user_id: userId }
  );
}

async function _emitNormalizationFailed({ companyId, userId, reason, correlationId }) {
  if (!telemetryFlags.isEnvironmentTelemetryBackboneEventsEnabled()) return;
  try {
    await publishEnvironmentIndustrialEvent(
      {
        event_name: 'environment.telemetry.normalization_failed',
        company_id: companyId,
        correlation_id: correlationId || uuidv4(),
        payload: { reason: String(reason).slice(0, 256) }
      },
      { origin_layer: 'operational', intended_audience: 'engineering', user_id: userId }
    );
  } catch {
    /* assistive */
  }
}

async function ingestSingle(companyId, userId, body, opts = {}) {
  const emitSampleEvent = opts.emit_sample_event !== false;
  const t0 = Date.now();

  if (!storageFlags.isTelemetryIsolatedIngestEnabled()) {
    return { ok: false, code: 'W3_TELEMETRY_INGEST_OFF', reason: 'telemetry_ingest_disabled' };
  }

  const coerced = _coerceSampleBody(companyId, body);
  if (!coerced.ok) {
    await _emitNormalizationFailed({ companyId, userId, reason: coerced.reason, correlationId: body?.correlation_id });
    obs.record('environment_telemetry_normalization_ms', Date.now() - t0, { ok: '0' });
    return { ok: false, code: 'INVALID_PAYLOAD', reason: coerced.reason };
  }

  obs.record('environment_telemetry_normalization_ms', Date.now() - t0, { ok: '1' });

  const correlationId =
    (coerced.sample.labels && coerced.sample.labels.correlation_id) || body.correlation_id || uuidv4();

  correlation.registerSample(companyId, coerced.sample, correlationId);

  if (!shouldPersistSample()) {
    obs.record('environment_telemetry_sampled_out_total', 1, {});
    return {
      ok: true,
      skipped: true,
      reason: 'sampled_out',
      correlation_id: correlationId
    };
  }

  const rangeEval = evaluateExpectedRange(coerced.sample.value, coerced.expected_range);
  const driftEval = coerced.drift_baseline != null
    ? evaluateDrift(coerced.sample.value, coerced.drift_baseline)
    : { drifted: false };
  const anomalyScore = computeAnomalyScore(rangeEval, driftEval);
  obs.record('environment_environmental_anomaly_score', anomalyScore, {
    area: coerced.metadata?.environmental_area || 'unknown'
  });

  const ingestResult = await _persist(coerced.sample);

  if (!ingestResult.ok) {
    obs.record('environment_telemetry_ingest_fail_total', 1, {});
    return {
      ok: false,
      code: 'INGEST_FAILED',
      correlation_id: correlationId,
      ...ingestResult
    };
  }

  obs.record('environment_telemetry_ingest_ok_total', 1, {});
  obs.record('environment_telemetry_runtime_ms', Date.now() - t0, {});
  obs.record('environment_realtime_density_score', 1, { metric: coerced.sample.metric_key?.slice(0, 32) || 'unknown' });

  try {
    if (rangeEval.breached) {
      await _emitThresholdExceeded({
        companyId,
        userId,
        sample: coerced.sample,
        rangeEval,
        correlationId
      });
      if (anomalyScore >= 0.5) {
        await publishEnvironmentIndustrialEvent(
          {
            event_name: 'environment.telemetry.anomaly_detected',
            company_id: companyId,
            correlation_id: correlationId,
            payload: {
              metric_key: coerced.sample.metric_key,
              anomaly_score: anomalyScore,
              assistive_only: true
            }
          },
          { origin_layer: 'operational', intended_audience: 'coordinator', user_id: userId }
        );
      }
    }
    if (driftEval.drifted) {
      await _emitDriftDetected({ companyId, userId, sample: coerced.sample, driftEval, correlationId });
    }
    if (emitSampleEvent) {
      await _emitSampleIngested({
        companyId,
        userId,
        ingestResult,
        metricKey: coerced.sample.metric_key,
        correlationId,
        metadata: coerced.metadata
      });
    }
  } catch {
    obs.record('environment_telemetry_publish_fail_total', 1, {});
  }

  return {
    ok: true,
    correlation_id: correlationId,
    ingest: ingestResult,
    range_evaluation: rangeEval,
    drift_evaluation: driftEval,
    anomaly_score: anomalyScore,
    explainability: {
      assistive_only: true,
      blocks_operation: false,
      environmental_area: coerced.metadata?.environmental_area,
      telemetry_type: coerced.metadata?.telemetry_type
    }
  };
}

async function ingestBatch(companyId, userId, items) {
  const max = telemetryFlags.getEnvironmentTelemetryBatchMax();
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

  return {
    ok: failCount === 0 || okCount > 0,
    summary: { accepted: okCount, failed: failCount, skipped_sampled: skippedCount, batch_size: arr.length },
    results
  };
}

function getIngestDependencySnapshot() {
  const isolation = require('./environmentTelemetryIsolationRuntime');
  return isolation.getIsolationSnapshot();
}

module.exports = {
  ingestSingle,
  ingestBatch,
  getIngestDependencySnapshot
};
