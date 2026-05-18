'use strict';

/**
 * Análise assistiva — intervalos declarados pelo integrador; sem bloqueio operacional.
 */

function evaluateExpectedRange(value, expectedRange) {
  if (expectedRange == null || typeof expectedRange !== 'object') {
    return { breached: false };
  }
  const v = Number(value);
  if (!Number.isFinite(v)) return { breached: false, reason: 'value_not_finite' };

  const minRaw = expectedRange.min;
  const maxRaw = expectedRange.max;
  const hasMin = minRaw != null && String(minRaw).trim() !== '';
  const hasMax = maxRaw != null && String(maxRaw).trim() !== '';

  const min = hasMin ? Number(minRaw) : null;
  const max = hasMax ? Number(maxRaw) : null;

  if (hasMin && !Number.isFinite(min)) return { breached: false, reason: 'invalid_min' };
  if (hasMax && !Number.isFinite(max)) return { breached: false, reason: 'invalid_max' };

  let breached = false;
  if (hasMin && v < min) breached = true;
  if (hasMax && v > max) breached = true;

  return { breached, min: hasMin ? min : null, max: hasMax ? max : null };
}

function evaluateDrift(current, baseline, toleranceRatio = 0.15) {
  const c = Number(current);
  const b = Number(baseline);
  if (!Number.isFinite(c) || !Number.isFinite(b) || b === 0) {
    return { drifted: false, reason: 'invalid_baseline' };
  }
  const delta = Math.abs(c - b) / Math.abs(b);
  const drifted = delta > toleranceRatio;
  return { drifted, delta, tolerance_ratio: toleranceRatio };
}

function computeAnomalyScore(rangeEval, driftEval) {
  let score = 0;
  if (rangeEval && rangeEval.breached) score += 0.6;
  if (driftEval && driftEval.drifted) score += 0.4;
  return Math.min(1, score);
}

module.exports = {
  evaluateExpectedRange,
  evaluateDrift,
  computeAnomalyScore
};
