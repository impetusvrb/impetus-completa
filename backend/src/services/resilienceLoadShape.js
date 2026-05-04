'use strict';

/**
 * Load shaping preditivo: boost ao cost_score quando latência/score global está mal.
 */

function getLatencyMonitorStressBoost() {
  let boost = 0;
  try {
    const lat = require('./aiLatencyMonitor').getSnapshot();
    const thr = lat.threshold_ms || 14000;
    const early = lat.early_warning_threshold_ms || thr * 0.72;
    const maxAvg = Math.max(lat.claude_avg_ms || 0, lat.gemini_avg_ms || 0, lat.openai_avg_ms || 0);
    if (maxAvg >= early) boost += 12;
    if (maxAvg >= thr * 0.85) boost += 14;
    const maxSlope = Math.max(
      lat.claude_slope || 0,
      lat.gemini_slope || 0,
      lat.openai_slope || 0
    );
    if (maxSlope > 35) boost += 10;
    if (maxSlope > 80) boost += 8;
  } catch (_e) {
    /* ignore */
  }
  return Math.min(36, boost);
}

function getGlobalStabilityBoost() {
  try {
    const srs = require('./systemRuntimeState');
    const sc = srs.getStabilityScore();
    if (sc < 55) return 18;
    if (sc < 72) return 10;
    if (sc < 85) return 4;
  } catch (_e) {
    /* ignore */
  }
  return 0;
}

/**
 * Pontos 0–45 a somar ao cost_score do pedido (cap no middleware).
 */
function getPredictiveCostBoost() {
  const fb = (() => {
    try {
      return require('./resilienceFeedbackLoop').getAnticipationBiasPoints();
    } catch (_e) {
      return 0;
    }
  })();
  const lat = getLatencyMonitorStressBoost();
  const st = getGlobalStabilityBoost();
  return Math.min(45, fb + lat + st);
}

module.exports = {
  getPredictiveCostBoost,
  getLatencyMonitorStressBoost,
  getGlobalStabilityBoost
};
