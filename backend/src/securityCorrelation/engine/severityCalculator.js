'use strict';

/**
 * SEC-02 — Severidade determinística.
 */

const CLASS_WEIGHT = {
  CREDENTIAL_SCAN: 4,
  GENERIC_SCANNER: 3,
  ENUMERATION: 3,
  BACKGROUND_INTERNET_NOISE: 2,
  CRAWLER: 1,
  HEALTH_CHECK: 0,
  INTERNAL_ACCESS: 0,
  OPERATIONAL_ACCESS: 0,
  UNKNOWN: 1
};

/**
 * @param {object} ctx
 * @returns {'INFO'|'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'}
 */
function computeSeverity(ctx) {
  const {
    classification = 'UNKNOWN',
    requestCount = 0,
    eventCount = 0,
    uniquePaths = 0,
    statusCodes = {},
    durationMs = 0
  } = ctx;

  const s401 = statusCodes['401'] || 0;
  const s404 = statusCodes['404'] || 0;
  const base = CLASS_WEIGHT[classification] ?? 1;

  let score = base;
  if (requestCount >= 20000) score += 5;
  else if (requestCount >= 5000) score += 4;
  else if (requestCount >= 1000) score += 3;
  else if (requestCount >= 100) score += 2;
  else if (requestCount >= 10) score += 1;

  if (s401 > 50) score += 2;
  if (s404 > 500) score += 1;
  if (uniquePaths > 50) score += 1;
  if (durationMs > 2 * 60 * 60 * 1000) score += 1;
  if (eventCount > 100) score += 1;

  if (classification === 'OPERATIONAL_ACCESS' || classification === 'INTERNAL_ACCESS') return 'INFO';
  if (classification === 'HEALTH_CHECK') return 'INFO';

  if (score >= 8) return 'CRITICAL';
  if (score >= 6) return 'HIGH';
  if (score >= 4) return 'MEDIUM';
  if (score >= 2) return 'LOW';
  return 'INFO';
}

module.exports = { computeSeverity, CLASS_WEIGHT };
