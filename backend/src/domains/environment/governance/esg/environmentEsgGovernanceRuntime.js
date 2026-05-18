'use strict';

const obs = require('../shared/environmentGovernanceObservability');
const flags = require('../environmentGovernanceRuntimeFlags');

function environmentEsgMetricsEngine(input = {}) {
  return {
    environmental: Number(input.environmental_score) || 62,
    social_proxy: Number(input.social_proxy) || 58,
    governance_proxy: Number(input.governance_proxy) || 64,
    water_intensity: input.water_intensity ?? null,
    waste_intensity: input.waste_intensity ?? null
  };
}

function environmentEsgScoringEngine(metrics) {
  const w = 0.45 * metrics.environmental + 0.25 * metrics.social_proxy + 0.3 * metrics.governance_proxy;
  return Math.round(Math.max(0, Math.min(100, w)));
}

function environmentEsgReadinessEngine(score, input = {}) {
  const targets = input.targets || { esg: 70 };
  return {
    ready: score >= (targets.esg || 70),
    gap: Math.max(0, (targets.esg || 70) - score),
    maturity_band: score >= 75 ? 'advanced' : score >= 55 ? 'developing' : 'initial'
  };
}

function environmentEsgExplainabilityRuntime(score, metrics) {
  return {
    assistive_only: true,
    no_authority: true,
    factors: [
      { id: 'environmental', weight: 0.45, value: metrics.environmental },
      { id: 'social_proxy', weight: 0.25, value: metrics.social_proxy },
      { id: 'governance_proxy', weight: 0.3, value: metrics.governance_proxy }
    ],
    narrative_hint: score < 60 ? 'reforçar indicadores ambientais operacionais' : 'manter trajectória ESG'
  };
}

function environmentEsgNarrativeRuntime(score, readiness) {
  return {
    assistive_only: true,
    headline: `Índice ESG assistivo: ${score}/100`,
    body: `Maturidade ${readiness.maturity_band}. Gap meta: ${readiness.gap} pts. Sem acção autónoma.`,
    audience: 'management'
  };
}

function environmentEsgGovernanceRuntime(input = {}) {
  if (!flags.isEnvironmentGovernanceRuntimeEnabled()) return { skipped: true, reason: 'governance_off' };
  return obs.withTiming(
    'environment_esg_runtime_ms',
    () => {
      const metrics = environmentEsgMetricsEngine(input);
      const score = environmentEsgScoringEngine(metrics);
      const readiness = environmentEsgReadinessEngine(score, input);
      obs.record('environment_esg_readiness_score', readiness.ready ? 1 : 0, {});
      return {
        ok: true,
        esg_score: score,
        metrics,
        readiness,
        explainability: environmentEsgExplainabilityRuntime(score, metrics),
        narrative: environmentEsgNarrativeRuntime(score, readiness),
        assistive_only: true
      };
    },
    { module: 'esg' }
  );
}

module.exports = {
  environmentEsgGovernanceRuntime,
  environmentEsgScoringEngine,
  environmentEsgMetricsEngine,
  environmentEsgReadinessEngine,
  environmentEsgNarrativeRuntime,
  environmentEsgExplainabilityRuntime
};
