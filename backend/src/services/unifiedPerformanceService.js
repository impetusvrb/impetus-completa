'use strict';

/**
 * Observabilidade de performance e custo por pipeline (GPT vs cognitivo).
 * Memória por processo — sem BD; não altera decisões nem scoring.
 */

const MAX_ROWS = Math.min(
  800,
  Math.max(80, parseInt(process.env.UNIFIED_PERF_BUFFER_SIZE || '500', 10))
);

/** @type {Map<string, object[]>} */
const buffers = new Map();

function cidKey(companyId) {
  if (companyId == null || companyId === '') return '_global';
  return String(companyId).trim();
}

function getBuf(companyId) {
  const k = cidKey(companyId);
  if (!buffers.has(k)) buffers.set(k, []);
  return buffers.get(k);
}

function recordingEnabled() {
  return process.env.UNIFIED_PERF_RECORDING !== 'false';
}

function computeEstimatedCost(latency, tokensUsed, override) {
  const c = Number(override);
  if (Number.isFinite(c) && c >= 0) return Math.round(c * 1e9) / 1e9;
  const lat = Number(latency);
  const tok = Number(tokensUsed);
  const base =
    (Number.isFinite(tok) ? tok : 0) * 0.000002 +
    (Number.isFinite(lat) ? lat : 0) / 1_000_000;
  return Math.round(base * 1e9) / 1e9;
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * @param {object} p
 * @param {string|null|undefined} p.companyId
 * @param {'gpt'|'cognitive'} p.pipeline
 * @param {number} p.latency — ms
 * @param {number} [p.tokensUsed]
 * @param {number} [p.estimatedCost] — unidades internas; se omitido, estimado
 */
function recordPipelinePerformance(p) {
  if (!recordingEnabled()) return;

  const row = p && typeof p === 'object' ? p : {};
  const companyId = row.companyId != null ? row.companyId : row.company_id;
  const pl = String(row.pipeline || '').toLowerCase();
  const pipeline = pl === 'cognitive' ? 'cognitive' : 'gpt';
  const latency = Number(row.latency);
  const latOk = Number.isFinite(latency) && latency >= 0;
  const tokensUsed = Number(row.tokensUsed);
  const tok = Number.isFinite(tokensUsed) ? Math.max(0, tokensUsed) : 0;
  const estimatedCost = computeEstimatedCost(latOk ? latency : 0, tok, row.estimatedCost);

  const entry = {
    ts: Date.now(),
    pipeline,
    latency_ms: latOk ? latency : 0,
    tokens_used: tok,
    estimated_cost: estimatedCost
  };

  try {
    const buf = getBuf(companyId);
    buf.push(entry);
    while (buf.length > MAX_ROWS) buf.shift();
  } catch (_e) {}

  try {
    console.info(
      '[UNIFIED_PERFORMANCE]',
      JSON.stringify({
        company_key: cidKey(companyId),
        pipeline,
        latency_ms: entry.latency_ms,
        estimatedCost: estimatedCost,
        tokensUsed: tok
      })
    );
  } catch (_log) {}

  try {
    const { detectPerformanceIssues } = require('./unifiedPerformanceAlertService');
    detectPerformanceIssues(getPerformanceStats(companyId), companyId);
  } catch (_a) {}
}

/**
 * @param {string|null|undefined} companyId
 */
function getPerformanceStats(companyId) {
  const buf = getBuf(companyId);
  const gptLat = [];
  const cogLat = [];
  const costs = [];
  let nGpt = 0;
  let nCog = 0;

  for (const r of buf) {
    if (!r || typeof r !== 'object') continue;
    const ms = Number(r.latency_ms);
    const cost = Number(r.estimated_cost);
    if (r.pipeline === 'cognitive') {
      nCog += 1;
      if (Number.isFinite(ms) && ms > 0) cogLat.push(ms);
    } else {
      nGpt += 1;
      if (Number.isFinite(ms) && ms > 0) gptLat.push(ms);
    }
    if (Number.isFinite(cost)) costs.push(cost);
  }

  const total = nGpt + nCog;
  const cognitive_usage_rate =
    total > 0 ? Math.round((nCog / total) * 1000) / 1000 : 0;
  const avg_latency_gpt = gptLat.length ? Math.round(mean(gptLat)) : 0;
  const avg_latency_cognitive = cogLat.length ? Math.round(mean(cogLat)) : 0;
  const avg_cost_per_decision =
    costs.length > 0 ? Math.round(mean(costs) * 1e9) / 1e9 : 0;

  return {
    company_key: cidKey(companyId),
    avg_latency_gpt,
    avg_latency_cognitive,
    cognitive_usage_rate,
    avg_cost_per_decision,
    sample_decisions: total,
    samples_gpt: nGpt,
    samples_cognitive: nCog
  };
}

module.exports = {
  recordPipelinePerformance,
  getPerformanceStats,
  __test: { buffers, MAX_ROWS, cidKey }
};
