'use strict';

/**
 * SEC-02 — Risk Score determinístico (0.0 → 1.0).
 */

const { CLASS_WEIGHT } = require('./severityCalculator');

/**
 * @param {object} ctx
 * @returns {number}
 */
function computeRiskScore(ctx) {
  const {
    classification = 'UNKNOWN',
    requestCount = 0,
    uniquePaths = 0,
    uniqueIps = 1,
    statusCodes = {},
    durationMs = 0,
    severity = 'INFO'
  } = ctx;

  if (classification === 'OPERATIONAL_ACCESS' || classification === 'INTERNAL_ACCESS') return 0.05;
  if (classification === 'HEALTH_CHECK') return 0.02;

  const classNorm = (CLASS_WEIGHT[classification] ?? 1) / 4;
  const volumeNorm = Math.min(1, Math.log10(Math.max(1, requestCount)) / 4);
  const pathNorm = Math.min(1, uniquePaths / 100);
  const ipNorm = Math.min(1, uniqueIps / 10);
  const durationNorm = Math.min(1, durationMs / (4 * 3600000));

  const s401 = statusCodes['401'] || 0;
  const s404 = statusCodes['404'] || 0;
  const authNorm = Math.min(1, s401 / 100);
  const enumNorm = Math.min(1, s404 / 5000);

  let raw =
    classNorm * 0.3 +
    volumeNorm * 0.25 +
    pathNorm * 0.1 +
    ipNorm * 0.05 +
    durationNorm * 0.1 +
    authNorm * 0.1 +
    enumNorm * 0.1;

  const severityBoost = {
    CRITICAL: 0.15,
    HIGH: 0.1,
    MEDIUM: 0.05,
    LOW: 0,
    INFO: -0.05
  };
  raw += severityBoost[severity] || 0;

  return Math.round(Math.min(1, Math.max(0, raw)) * 1000) / 1000;
}

module.exports = { computeRiskScore };
