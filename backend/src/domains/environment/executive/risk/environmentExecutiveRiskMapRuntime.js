'use strict';

const flags = require('../flags/environmentExecutiveRuntimeFlags');
const obs = require('../shared/environmentExecutiveObservability');
const { buildExecutiveExplainability } = require('../shared/environmentExecutiveExplainability');
const EXEC = require('../events/executiveEventHints');

function environmentEnvironmentalRiskScoringRuntime(input = {}) {
  const scores = {
    environmental: Number(input.environmental_risk) || 0.35,
    esg: Number(input.esg_risk) || 0.3,
    carbon: Number(input.carbon_risk) || 0.4,
    compliance: Number(input.compliance_risk) || 0.25,
    operational: Number(input.operational_risk) || 0.3,
    emission: Number(input.emission_risk) || 0.35,
    sustainability: Number(input.sustainability_risk) || 0.28
  };
  const aggregate = Object.values(scores).reduce((s, v) => s + v, 0) / Object.keys(scores).length;
  return {
    scores,
    aggregate_risk_score: Math.min(1, aggregate),
    severity: aggregate > 0.55 ? 'high' : aggregate > 0.35 ? 'medium' : 'low'
  };
}

function environmentEnvironmentalRiskNarrativeRuntime(scoring) {
  return {
    headline: `Mapa de risco ambiental — ${scoring.severity}`,
    top_factors: Object.entries(scoring.scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => ({ domain: k, score: v })),
    assistive_only: true
  };
}

function environmentExecutiveRiskCorrelationRuntime(input = {}) {
  return {
    production_emissions: input.production_rate && input.emissions ? 'correlated' : 'unknown',
    logistics_carbon: input.logistics_index != null ? 'watch' : 'unknown',
    assistive_only: true
  };
}

function environmentExecutiveRiskMapRuntime(input = {}) {
  if (!flags.isEnvironmentExecutiveRiskMapsEnabled()) {
    return { skipped: true, code: 'RISK_MAPS_OFF' };
  }
  return obs.withTiming(
    'environment_executive_risk_runtime_ms',
    () => {
      const scoring = environmentEnvironmentalRiskScoringRuntime(input);
      const narrative = environmentEnvironmentalRiskNarrativeRuntime(scoring);
      const correlation = environmentExecutiveRiskCorrelationRuntime(input);
      const escalate = scoring.severity === 'high';
      return {
        ok: true,
        scoring,
        narrative,
        correlation,
        escalate,
        event_hint: escalate ? EXEC.ENVIRONMENTAL_RISK_ESCALATED : null,
        explainability: buildExecutiveExplainability({
          rationale: 'Mapa executivo de riscos ambientais compostos.',
          risk: scoring.severity,
          confidence: scoring.aggregate_risk_score,
          causal_chain: narrative.top_factors?.map((f) => f.domain)
        })
      };
    },
    { module: 'risk' }
  );
}

module.exports = {
  environmentExecutiveRiskMapRuntime,
  environmentEnvironmentalRiskScoringRuntime,
  environmentEnvironmentalRiskNarrativeRuntime,
  environmentExecutiveRiskCorrelationRuntime
};
