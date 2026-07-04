'use strict';

/**
 * SEC-11 — Runtime Shield.
 * Produz runtime_protection_score — nunca altera runtime.
 */

function computeRuntimeProtectionScore(context) {
  const {
    openIncidents = [],
    integrityReport = null,
    sec07Score = null,
    threatLevel = 'LOW'
  } = context;

  let score = 1.0;

  const openCount = openIncidents.length;
  if (openCount >= 5) score -= 0.35;
  else if (openCount >= 3) score -= 0.25;
  else if (openCount >= 1) score -= 0.1;

  const maxRequests = openIncidents.reduce(
    (m, i) => Math.max(m, i.metrics?.requestCount || 0),
    0
  );
  if (maxRequests >= 20000) score -= 0.25;
  else if (maxRequests >= 5000) score -= 0.15;

  const integrity = integrityReport?.integrityStatus;
  if (integrity === 'COMPROMISED') score -= 0.4;
  else if (integrity === 'DEGRADED') score -= 0.2;

  if (typeof sec07Score === 'number') {
    score = score * 0.6 + sec07Score * 0.4;
  }

  const threatPenalty = { CRITICAL: 0.35, HIGH: 0.25, MEDIUM: 0.15, LOW: 0.05 };
  score -= threatPenalty[threatLevel] || 0;

  return {
    runtime_protection_score: Math.min(1, Math.max(0, score)),
    factors: {
      openIncidents: openCount,
      maxRequests,
      integrityStatus: integrity || 'UNKNOWN',
      sec07Score,
      threatLevel
    }
  };
}

module.exports = { computeRuntimeProtectionScore };
