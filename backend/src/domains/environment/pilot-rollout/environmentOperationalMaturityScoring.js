'use strict';

const MATURITY_LEVELS = Object.freeze([
  'INITIAL',
  'STABILIZING',
  'OPERATIONAL',
  'CONTEXTUAL',
  'EXECUTIVE_READY',
  'ENTERPRISE_READY'
]);

function scoreOperationalMaturity(metrics = {}) {
  const weights = [
    ['field_collection_rate', 0.18],
    ['effluent_compliance_rate', 0.16],
    ['telemetry_coverage', 0.14],
    ['evidence_capture_rate', 0.12],
    ['navigation_consistency', 0.12],
    ['esg_reporting_rate', 0.1],
    ['cognitive_interaction_health', 0.08],
    ['executive_engagement', 0.1]
  ];
  let score = 0;
  for (const [k, w] of weights) {
    const v = metrics[k] != null ? Math.max(0, Math.min(1, Number(metrics[k]))) : 0;
    score += v * w;
  }
  score = Math.max(0, Math.min(1, score));

  let level = 'INITIAL';
  if (score >= 0.88) level = 'ENTERPRISE_READY';
  else if (score >= 0.74) level = 'EXECUTIVE_READY';
  else if (score >= 0.58) level = 'CONTEXTUAL';
  else if (score >= 0.42) level = 'OPERATIONAL';
  else if (score >= 0.22) level = 'STABILIZING';

  return {
    ok: true,
    maturity_score: score,
    maturity_level: level,
    maturity_confidence: Math.min(1, 0.3 + score * 0.7),
    levels_reference: MATURITY_LEVELS,
    assistive_only: true,
    auto_promotion: false
  };
}

module.exports = { scoreOperationalMaturity, MATURITY_LEVELS };
