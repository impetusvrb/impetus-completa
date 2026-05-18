'use strict';

const MATURITY_LEVELS = Object.freeze([
  'INITIAL',
  'STABILIZING',
  'OPERATIONAL',
  'CONTEXTUAL',
  'EXECUTIVE_READY',
  'ENTERPRISE_READY',
  'HARDENED_ENTERPRISE'
]);

function classifyEnterpriseMaturity(scores = {}) {
  const resilience = Number(scores.resilience) || 0;
  const telemetry = Number(scores.telemetry) || 0;
  const cognitive = Number(scores.cognitive) || 0;
  const continuity = Number(scores.continuity) || 0;
  const avg = (resilience + telemetry + cognitive + continuity) / 4;

  let level = 'INITIAL';
  if (avg >= 0.92 && resilience >= 0.9) level = 'HARDENED_ENTERPRISE';
  else if (avg >= 0.85) level = 'ENTERPRISE_READY';
  else if (avg >= 0.72) level = 'EXECUTIVE_READY';
  else if (avg >= 0.58) level = 'CONTEXTUAL';
  else if (avg >= 0.42) level = 'OPERATIONAL';
  else if (avg >= 0.22) level = 'STABILIZING';

  return {
    maturity_level: level,
    maturity_score: avg,
    levels_reference: MATURITY_LEVELS,
    industrial_readiness: avg >= 0.55,
    assistive_only: true,
    auto_promotion: false
  };
}

function enterpriseMaturityConsolidationRuntime(pack = {}) {
  const scores = {
    resilience: pack.runtime_resilience?.score ?? 0.5,
    telemetry: pack.telemetry?.resilience?.ok ? 0.85 : 0.4,
    cognitive: pack.cognitive?.ecmi?.enterprise_cognitive_maturity_index
      ? pack.cognitive.ecmi.enterprise_cognitive_maturity_index / 100
      : 0.5,
    continuity: pack.continuity?.publication?.ok ? 0.9 : 0.5
  };
  return {
    ecosystem: classifyEnterpriseMaturity(scores),
    telemetry_maturity: { score: scores.telemetry },
    cognitive_maturity: { score: scores.cognitive },
    operational_resilience: { score: scores.resilience },
    contextual_maturity: { score: scores.continuity }
  };
}

module.exports = { MATURITY_LEVELS, classifyEnterpriseMaturity, enterpriseMaturityConsolidationRuntime };
