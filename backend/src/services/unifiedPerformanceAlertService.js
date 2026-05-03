'use strict';

/**
 * Alertas só de observabilidade (log) — gargalo de latência / custo / tríade.
 * Antispam por empresa e tipo; sem ações automáticas.
 */

const IMBALANCE_RATIO = Math.max(
  2,
  parseFloat(process.env.UNIFIED_PERF_LATENCY_IMBALANCE_RATIO || '2')
);

const MIN_SAMPLES = Math.max(
  3,
  parseInt(process.env.UNIFIED_PERF_ALERT_MIN_SAMPLES || '5', 10)
);

const COG_LAT_CRITICAL_MS = Math.max(
  1000,
  parseInt(process.env.UNIFIED_PERF_COGNITIVE_LATENCY_CRITICAL_MS || '2500', 10)
);

const AVG_COST_CRITICAL = Math.max(
  0,
  parseFloat(process.env.UNIFIED_PERF_AVG_COST_CRITICAL || '0.008')
);

const TRIAD_USAGE_WARN = Math.min(
  0.99,
  Math.max(0.35, parseFloat(process.env.UNIFIED_PERF_TRIAD_USAGE_WARN || '0.65'))
);

const COOLDOWN_MS = Math.max(
  60000,
  parseInt(process.env.UNIFIED_PERF_ALERT_COOLDOWN_MS || String(10 * 60 * 1000), 10)
);

/** @type {Map<string, Map<string, number>>} */
const lastEmitByCompany = new Map();

function cidKey(companyId) {
  if (companyId == null || companyId === '') return '_global';
  return String(companyId).trim();
}

function alertsEnabled() {
  return process.env.UNIFIED_PERF_ALERTS !== 'false';
}

function tryEmit(companyKey, type, payload) {
  if (!alertsEnabled()) return;
  const ck = cidKey(companyKey);
  if (!lastEmitByCompany.has(ck)) lastEmitByCompany.set(ck, new Map());
  const inner = lastEmitByCompany.get(ck);
  const last = inner.get(type) || 0;
  const now = Date.now();
  if (now - last < COOLDOWN_MS) return;
  inner.set(type, now);
  try {
    console.warn('[UNIFIED_PERFORMANCE_ALERT]', JSON.stringify({ type, company_key: ck, ...payload }));
  } catch (_e) {}
}

/**
 * @param {object|null} stats — getPerformanceStats
 * @param {string|null|undefined} companyId
 */
function detectPerformanceIssues(stats, companyId) {
  if (!stats || typeof stats !== 'object') return;

  const ck = stats.company_key != null ? stats.company_key : cidKey(companyId);
  const n = Number(stats.sample_decisions) || 0;
  if (n < MIN_SAMPLES) return;

  const avgCog = Number(stats.avg_latency_cognitive);
  const avgGpt = Number(stats.avg_latency_gpt);
  const avgCost = Number(stats.avg_cost_per_decision);
  const triRate = Number(stats.cognitive_usage_rate);

  const cognitiveSlow = Number.isFinite(avgCog) && avgCog > COG_LAT_CRITICAL_MS;
  const costHigh = Number.isFinite(avgCost) && AVG_COST_CRITICAL > 0 && avgCost > AVG_COST_CRITICAL;

  let imbalance = false;
  if (
    Number.isFinite(avgGpt) &&
    Number.isFinite(avgCog) &&
    avgGpt >= 50 &&
    avgCog >= 50
  ) {
    const hi = Math.max(avgGpt, avgCog);
    const lo = Math.min(avgGpt, avgCog);
    if (lo > 0 && hi / lo >= IMBALANCE_RATIO) imbalance = true;
  }

  const triadHigh =
    Number.isFinite(triRate) && TRIAD_USAGE_WARN > 0 && triRate > TRIAD_USAGE_WARN;

  const critical = cognitiveSlow || costHigh;
  const warning = !critical && (imbalance || triadHigh);

  if (critical) {
    tryEmit(ck, 'PERFORMANCE_CRITICAL', {
      message: cognitiveSlow
        ? 'Latência média cognitiva elevada'
        : 'Custo médio por decisão acima do limiar observacional',
      avg_latency_cognitive: avgCog,
      avg_latency_gpt: avgGpt,
      avg_cost_per_decision: avgCost,
      cognitive_usage_rate: triRate
    });
    return;
  }

  if (warning) {
    tryEmit(ck, 'PERFORMANCE_WARNING', {
      message: imbalance
        ? 'Assimetria de latência entre pipelines (GPT vs cognitivo)'
        : 'Participação cognitiva/tríade acima do esperado para revisão',
      avg_latency_cognitive: avgCog,
      avg_latency_gpt: avgGpt,
      cognitive_usage_rate: triRate,
      latency_imbalance: imbalance,
      triad_usage_high: triadHigh
    });
  }
}

module.exports = {
  detectPerformanceIssues,
  __test: { lastEmitByCompany, COOLDOWN_MS, MIN_SAMPLES }
};
