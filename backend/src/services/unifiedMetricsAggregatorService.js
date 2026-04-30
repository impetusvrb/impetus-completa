'use strict';

/**
 * Agregador em memória por empresa — janela deslizante de eventos de métricas.
 * Reversível: reinício do processo limpa o buffer. Evolução: persistir em Redis/TSDB.
 */

const DEFAULT_MAX_EVENTS = Math.min(
  1000,
  Math.max(500, parseInt(process.env.UNIFIED_METRICS_BUFFER_SIZE || '800', 10))
);

/** @type {Map<string, object[]>} */
const buffers = new Map();

function cidKey(companyId) {
  if (companyId == null || companyId === '') return '_global';
  return String(companyId).trim();
}

/**
 * @param {string|null|undefined} companyId
 * @returns {object[]}
 */
function getBuffer(companyId) {
  const k = cidKey(companyId);
  if (!buffers.has(k)) buffers.set(k, []);
  return buffers.get(k);
}

/**
 * @param {object} metric — payload normalizado (metric, pipeline, latency_ms, …)
 */
function recordMetric(metric) {
  const m = metric && typeof metric === 'object' ? { ...metric } : {};
  const companyId = m.company_id != null ? m.company_id : m.companyId;
  const k = cidKey(companyId);
  const buf = getBuffer(companyId);
  const row = {
    ...m,
    _ts: Date.now(),
    company_key: k
  };
  buf.push(row);
  while (buf.length > DEFAULT_MAX_EVENTS) buf.shift();
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * @param {string|null|undefined} companyId
 */
function getMetricsSnapshot(companyId) {
  const buf = getBuffer(companyId);
  const decisions = buf.filter((r) => r.metric === 'decision' || r.type === 'decision');
  const fallbacks = buf.filter((r) => r.metric === 'fallback' || r.fallback === true);
  const latGpt = buf
    .filter((r) => r.metric === 'latency' && (r.pipeline === 'gpt' || !r.pipeline))
    .map((r) => Number(r.latency_ms))
    .filter((n) => Number.isFinite(n));
  const latCog = buf
    .filter((r) => r.metric === 'latency' && r.pipeline === 'cognitive')
    .map((r) => Number(r.latency_ms))
    .filter((n) => Number.isFinite(n));

  const scores = decisions
    .map((r) => Number(r.decision_confidence))
    .filter((n) => Number.isFinite(n));

  const pipelineUsage = { gpt: 0, cognitive: 0 };
  for (const r of decisions) {
    const p = r.pipeline || (r.cognitive_used ? 'cognitive' : 'gpt');
    if (p === 'cognitive') pipelineUsage.cognitive += 1;
    else pipelineUsage.gpt += 1;
  }

  const totalDecisions = decisions.length;
  const fallbackRate = totalDecisions + fallbacks.length > 0
    ? fallbacks.length / Math.max(1, totalDecisions + fallbacks.length)
    : 0;

  return {
    pipeline_usage: { ...pipelineUsage },
    avg_latency: {
      gpt: latGpt.length ? Math.round(mean(latGpt)) : 0,
      cognitive: latCog.length ? Math.round(mean(latCog)) : 0
    },
    fallback_rate: Math.round(fallbackRate * 1000) / 1000,
    avg_score: scores.length ? Math.round(mean(scores) * 1000) / 1000 : 0,
    total_decisions: totalDecisions,
    buffer_size: buf.length,
    window_max: DEFAULT_MAX_EVENTS
  };
}

/**
 * % de decisões que escolheram cognitive (última janela).
 * @param {string|null|undefined} companyId
 */
function getPipelineStats(companyId) {
  const snap = getMetricsSnapshot(companyId);
  const total = snap.pipeline_usage.gpt + snap.pipeline_usage.cognitive;
  const cognitive_pct =
    total > 0 ? Math.round((snap.pipeline_usage.cognitive / total) * 1000) / 10 : 0;
  return {
    ...snap.pipeline_usage,
    cognitive_usage: cognitive_pct,
    total_routed: total
  };
}

/**
 * @param {string|null|undefined} companyId
 */
function getDecisionStats(companyId) {
  const snap = getMetricsSnapshot(companyId);
  const pipe = getPipelineStats(companyId);
  return {
    ...snap,
    cognitive_share_percent: pipe.cognitive_usage,
    total_routed: pipe.total_routed
  };
}

module.exports = {
  recordMetric,
  getMetricsSnapshot,
  getPipelineStats,
  getDecisionStats,
  __test: { cidKey, buffers }
};
