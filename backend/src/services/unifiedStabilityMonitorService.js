'use strict';

/**
 * Monitor de estabilidade do score decisório (janela em memória por empresa).
 * Flag: UNIFIED_STABILITY_MONITOR (OFF = neutro, sem histórico obrigatório).
 */

const WINDOW = Math.min(
  40,
  Math.max(5, parseInt(process.env.UNIFIED_STABILITY_SCORE_WINDOW || '14', 10))
);

/** @type {Map<string, number[]>} */
const scoreHistoryByCompany = new Map();

function cidKey(companyId) {
  if (companyId == null || companyId === '') return '_global';
  return String(companyId).trim();
}

/**
 * @param {object} params
 * @param {string|null|undefined} [params.companyId]
 * @param {number} [params.currentScore]
 * @param {object|null} [params.metricsSnapshot]
 * @returns {{
 *   is_stable: boolean,
 *   volatility: number,
 *   trend: 'up'|'down'|'stable',
 *   anomaly_detected: boolean,
 *   sample?: number,
 *   skipped?: boolean
 * }}
 */
function evaluateScoreStability({ companyId, currentScore, metricsSnapshot }) {
  const neutral = {
    is_stable: true,
    volatility: 0,
    trend: 'stable',
    anomaly_detected: false,
    skipped: true
  };
  if (process.env.UNIFIED_STABILITY_MONITOR !== 'true') {
    return neutral;
  }

  const k = cidKey(companyId);
  let arr = scoreHistoryByCompany.get(k) || [];
  const cs = Number(currentScore);
  if (Number.isFinite(cs)) {
    arr = [...arr, cs].slice(-WINDOW);
    scoreHistoryByCompany.set(k, arr);
  }

  const m = metricsSnapshot && typeof metricsSnapshot === 'object' ? metricsSnapshot : null;
  const extraScores = Array.isArray(m?.recent_scores_hint) ? m.recent_scores_hint : [];
  const series =
    arr.length >= 3
      ? arr
      : extraScores.length
        ? extraScores.map((x) => Number(x)).filter((n) => Number.isFinite(n)).slice(-WINDOW)
        : arr;

  if (series.length < 3) {
    const out = {
      is_stable: true,
      volatility: 0,
      trend: 'stable',
      anomaly_detected: false,
      sample: series.length
    };
    try {
      console.info('[UNIFIED_SCORE_STABILITY]', JSON.stringify(out));
    } catch (_e) {}
    return out;
  }

  const mean = series.reduce((a, b) => a + b, 0) / series.length;
  const variance =
    series.reduce((s, x) => {
      const d = x - mean;
      return s + d * d;
    }, 0) / series.length;
  const volatility = Math.round(Math.sqrt(variance) * 1000) / 1000;

  const third = Math.max(1, Math.floor(series.length / 3));
  const head = series.slice(0, third);
  const tail = series.slice(-third);
  const mHead = head.reduce((a, b) => a + b, 0) / head.length;
  const mTail = tail.reduce((a, b) => a + b, 0) / tail.length;
  const slope = mTail - mHead;

  let trend = 'stable';
  if (slope > 0.1) trend = 'up';
  else if (slope < -0.1) trend = 'down';

  const lastJump =
    series.length >= 2 ? Math.abs(series[series.length - 1] - series[series.length - 2]) : 0;

  const volThr =
    parseFloat(process.env.UNIFIED_STABILITY_VOLATILITY_MAX || '0.16') || 0.16;
  const jumpThr =
    parseFloat(process.env.UNIFIED_STABILITY_JUMP_MAX || '0.32') || 0.32;

  const anomaly_detected = volatility > volThr || lastJump > jumpThr;
  const is_stable = !anomaly_detected && volatility <= volThr * 0.75 && trend === 'stable';

  const out = {
    is_stable,
    volatility,
    trend,
    anomaly_detected,
    sample: series.length
  };
  try {
    console.info('[UNIFIED_SCORE_STABILITY]', JSON.stringify(out));
  } catch (_e) {}
  return out;
}

module.exports = {
  evaluateScoreStability,
  __test: { scoreHistoryByCompany, cidKey, WINDOW }
};
