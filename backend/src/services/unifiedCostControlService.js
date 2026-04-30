'use strict';

/**
 * Janela móvel de chamadas cognitivas (tríade / pipeline cognitive) por empresa.
 * Controlo de custo pressionado — apenas sinaliza overload; não bloqueia rede.
 */

const WINDOW_MS = 60_000;

const DEFAULT_CPM_MAX = Math.max(
  5,
  parseInt(process.env.UNIFIED_COGNITIVE_CPM_MAX || '32', 10)
);

/** @type {Map<string, number[]>} */
const cognitiveTimestamps = new Map();
/** @type {Map<string, number[]>} */
const cognitiveLatencies = new Map();

function cidKey(companyId) {
  if (companyId == null || companyId === '') return '_global';
  return String(companyId).trim();
}

function prune(tsArr, now) {
  const cutoff = now - WINDOW_MS;
  while (tsArr.length && tsArr[0] < cutoff) tsArr.shift();
}

/**
 * @param {object} payload
 * @param {string|null} [payload.companyId]
 * @param {number} [payload.tokensUsed]
 * @param {number} [payload.latency]
 */
function trackCognitiveUsage(payload) {
  const p = payload && typeof payload === 'object' ? payload : {};
  const companyId = p.companyId != null ? p.companyId : null;
  const k = cidKey(companyId);
  const now = Date.now();
  if (!cognitiveTimestamps.has(k)) cognitiveTimestamps.set(k, []);
  const arr = cognitiveTimestamps.get(k);
  arr.push(now);
  prune(arr, now);

  const lat = Number(p.latency);
  if (Number.isFinite(lat) && lat > 0) {
    if (!cognitiveLatencies.has(k)) cognitiveLatencies.set(k, []);
    const la = cognitiveLatencies.get(k);
    la.push(lat);
    while (la.length > 120) la.shift();
  }

  const tokens = Number(p.tokensUsed);
  const est =
    (Number.isFinite(tokens) ? tokens : 0) * 0.000002 +
    (Number.isFinite(lat) ? lat / 1_000_000 : 0);

  try {
    console.info(
      '[UNIFIED_COST_CONTROL]',
      JSON.stringify({
        company_id: companyId,
        calls_last_minute: arr.length,
        tokens_used: Number.isFinite(tokens) ? tokens : 0,
        latency_ms: Number.isFinite(lat) ? lat : null,
        estimated_units: Math.round(est * 1e6) / 1e6
      })
    );
  } catch (_e) {
    /* log opcional */
  }
}

function meanTail(arr, n) {
  if (!arr.length) return 0;
  const slice = arr.slice(-n);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

/**
 * @param {string|null|undefined} companyId
 * @returns {{
 *   calls_per_minute: number,
 *   avg_latency_ms: number,
 *   estimated_cost_units: number,
 *   threshold_cpm: number
 * }}
 */
function getCostStats(companyId) {
  const k = cidKey(companyId);
  const now = Date.now();
  if (!cognitiveTimestamps.has(k)) cognitiveTimestamps.set(k, []);
  const arr = cognitiveTimestamps.get(k);
  prune(arr, now);

  const lats = cognitiveLatencies.get(k) || [];
  const avgLat = Math.round(meanTail(lats, 60));

  const tokensProxy = arr.length * 1500;
  const estimated_cost_units =
    Math.round((tokensProxy * 0.000002 + avgLat / 1_000_000) * 1e6) / 1e6;

  return {
    calls_per_minute: arr.length,
    avg_latency_ms: avgLat,
    estimated_cost_units,
    threshold_cpm: DEFAULT_CPM_MAX
  };
}

/**
 * @param {string|null|undefined} companyId
 * @returns {boolean}
 */
function shouldForceDisableCognitiveForCost(companyId) {
  const st = getCostStats(companyId);
  return st.calls_per_minute > st.threshold_cpm;
}

/**
 * Extrapolação simples de custo/pressão na janela de 2–5 min (flag UNIFIED_COST_PREDICTION).
 * @param {string|null|undefined} companyId
 * @returns {{ should_prevent_cognitive: boolean, predicted_cost_units_5m: number, skipped: boolean }}
 */
function predictNearFutureCost(companyId) {
  const skipped = process.env.UNIFIED_COST_PREDICTION !== 'true';
  const noop = {
    should_prevent_cognitive: false,
    predicted_cost_units_5m: 0,
    skipped
  };
  if (skipped) return noop;

  const st = getCostStats(companyId);
  const stress = Math.min(3, 1 + st.calls_per_minute / Math.max(1, st.threshold_cpm));
  const horizonFactor = 5;
  const predicted =
    Math.round(st.estimated_cost_units * stress * horizonFactor * 1e6) / 1e6;
  const maxUnits = parseFloat(process.env.UNIFIED_COST_PREDICT_MAX_UNITS || '0.35') || 0.35;
  const should_prevent_cognitive = predicted > maxUnits;
  const out = {
    should_prevent_cognitive,
    predicted_cost_units_5m: predicted,
    skipped: false,
    calls_per_minute: st.calls_per_minute,
    threshold_cpm: st.threshold_cpm
  };
  try {
    console.info('[UNIFIED_COST_PREDICTION]', JSON.stringify(out));
  } catch (_e) {}
  return out;
}

module.exports = {
  trackCognitiveUsage,
  getCostStats,
  shouldForceDisableCognitiveForCost,
  predictNearFutureCost,
  __test: { cognitiveTimestamps, WINDOW_MS, DEFAULT_CPM_MAX }
};
