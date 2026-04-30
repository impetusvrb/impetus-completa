'use strict';

/**
 * Avalia elegibilidade para autonomia futura — apenas sinal em meta, sem execução.
 * Flag: UNIFIED_AUTONOMY_SUPERVISION
 */

/**
 * @param {object} params
 * @param {number} [params.score]
 * @param {number} [params.confidence]
 * @param {string} [params.risk] — LOW | MEDIUM | HIGH
 */
function evaluateAutonomyEligibility({ score, confidence, risk }) {
  const noop = { eligible: false, skipped: true };
  if (process.env.UNIFIED_AUTONOMY_SUPERVISION !== 'true') {
    return noop;
  }

  const s = Number(score);
  const c = Number(confidence);
  const r = risk != null ? String(risk).toUpperCase() : '';

  const eligible =
    Number.isFinite(s) &&
    s > 0.75 &&
    Number.isFinite(c) &&
    c > 0.7 &&
    r !== 'HIGH';

  const out = { eligible, skipped: false, score: s, confidence: c, risk: r || null };

  if (eligible) {
    try {
      console.info('[UNIFIED_AUTONOMY_CANDIDATE]', JSON.stringify(out));
    } catch (_e) {}
  }

  return out;
}

module.exports = {
  evaluateAutonomyEligibility
};
