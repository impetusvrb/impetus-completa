'use strict';

/**
 * Integridade do aprendizado — sinais de correlação inconsistente (sem efeitos externos).
 * Flag: UNIFIED_LEARNING_INTEGRITY (default OFF).
 */

const learningFeedback = require('./unifiedLearningFeedbackService');

/**
 * @param {object} params
 * @param {{ good_rate?: number, bad_rate?: number, neutral_rate?: number, n?: number }|null} [params.learningStats]
 * @param {object|null} [params.metricsSnapshot]
 * @param {string|null|undefined} [params.companyId]
 */
function evaluateLearningIntegrity({ learningStats, metricsSnapshot, companyId }) {
  const off = {
    learning_valid: true,
    anomaly: false,
    reason: '',
    skipped: true
  };
  if (process.env.UNIFIED_LEARNING_INTEGRITY !== 'true') {
    return off;
  }

  const ls = learningStats && typeof learningStats === 'object' ? learningStats : {};
  const n = Number(ls.n) || 0;
  const badRate = Number(ls.bad_rate) || 0;
  const goodRate = Number(ls.good_rate) || 0;

  const m = metricsSnapshot && typeof metricsSnapshot === 'object' ? metricsSnapshot : {};
  const avgScore = Number(m.avg_score);

  let learning_valid = true;
  let anomaly = false;
  const reasons = [];

  let split;
  try {
    split = learningFeedback.getLearningBadTrendSplit(companyId);
  } catch (_e) {
    split = { sufficient: false, first_bad_rate: 0, second_bad_rate: 0, n: 0 };
  }

  const trendDelta =
    split.sufficient ? Number(split.second_bad_rate) - Number(split.first_bad_rate) : 0;
  const minTrendN =
    parseInt(process.env.UNIFIED_LEARNING_TREND_MIN_N || '10', 10) || 10;
  if (split.sufficient && n >= minTrendN && trendDelta > 0.12) {
    learning_valid = false;
    anomaly = true;
    reasons.push('bad_rate_rising_window');
  }

  if (n >= 12 && goodRate > 0.2 && goodRate < 0.55 && badRate > 0.35) {
    learning_valid = false;
    anomaly = true;
    reasons.push('good_rate_inconsistent_with_bad');
  }

  const hiScoreThr =
    parseFloat(process.env.UNIFIED_LEARNING_HIGH_SCORE_THRESHOLD || '0.62') || 0.62;
  let recentBad;
  try {
    recentBad = learningFeedback.getRecentBadShare(companyId, 20);
  } catch (_e) {
    recentBad = { n: 0, bad_share: 0 };
  }
  if (
    Number.isFinite(avgScore) &&
    avgScore >= hiScoreThr &&
    badRate > 0.28 &&
    n >= 10 &&
    recentBad.n >= 8 &&
    recentBad.bad_share > 0.33
  ) {
    learning_valid = false;
    anomaly = true;
    reasons.push('high_operational_score_vs_poor_outcomes');
  }

  if (goodRate > 0.85 && badRate > 0.12 && n >= 15) {
    learning_valid = false;
    anomaly = true;
    reasons.push('label_mix_conflict');
  }

  const reason = reasons.join(';') || (anomaly ? 'unspecified' : 'ok');

  const out = {
    learning_valid,
    anomaly,
    reason,
    trend_delta: split.sufficient ? Math.round(trendDelta * 1000) / 1000 : null
  };

  try {
    if (anomaly) {
      console.warn('[UNIFIED_LEARNING_INTEGRITY_ALERT]', JSON.stringify(out));
    }
  } catch (_e) {}
  return out;
}

module.exports = {
  evaluateLearningIntegrity
};
