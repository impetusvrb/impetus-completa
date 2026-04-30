'use strict';

const aggregator = require('./unifiedMetricsAggregatorService');

/**
 * Métricas leves do motor unificado — apenas logs estruturados (sem BD).
 * Duplicado no agregador em memória (janela por empresa) para scoring adaptativo.
 */

function basePayload(extra) {
  return {
    timestamp: new Date().toISOString(),
    ...extra
  };
}

/**
 * @param {object} payload — pipeline, latency_ms, fallback, cognitive_used, decision_confidence, risk_level, user_id, company_id, …
 */
function recordDecisionMetric(payload) {
  const row = basePayload({ metric: 'decision', ...payload });
  console.info('[UNIFIED_METRIC]', JSON.stringify(row));
  try {
    aggregator.recordMetric(row);
  } catch (_e) {}
}

/**
 * @param {object} payload
 */
function recordLatencyMetric(payload) {
  console.info('[UNIFIED_METRIC]', JSON.stringify(basePayload({ metric: 'latency', ...payload })));
}

/**
 * @param {object} payload
 */
function recordFallbackMetric(payload) {
  const row = basePayload({ metric: 'fallback', ...payload });
  console.info('[UNIFIED_METRIC]', JSON.stringify(row));
  try {
    aggregator.recordMetric(row);
  } catch (_e) {}
}

/**
 * @param {object} payload
 */
function recordPipelineUsage(payload) {
  const row = basePayload({ metric: 'pipeline_usage', ...payload });
  console.info('[UNIFIED_METRIC]', JSON.stringify(row));
  try {
    aggregator.recordMetric(row);
  } catch (_e) {}
}

module.exports = {
  recordDecisionMetric,
  recordLatencyMetric,
  recordFallbackMetric,
  recordPipelineUsage
};
