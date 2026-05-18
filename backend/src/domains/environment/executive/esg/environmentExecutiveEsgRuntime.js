'use strict';

const flags = require('../flags/environmentExecutiveRuntimeFlags');
const obs = require('../shared/environmentExecutiveObservability');
const { buildExecutiveExplainability } = require('../shared/environmentExecutiveExplainability');
const esgGov = require('../../governance/esg/environmentEsgGovernanceRuntime');

function environmentExecutiveEsgAnalytics(input = {}) {
  let base = esgGov.environmentEsgGovernanceRuntime(input);
  if (base.skipped) {
    const metrics = esgGov.environmentEsgMetricsEngine(input);
    const score = esgGov.environmentEsgScoringEngine(metrics);
    const readiness = esgGov.environmentEsgReadinessEngine(score, input);
    base = { ok: true, esg_score: score, metrics, readiness, executive_standalone: true };
  }
  return {
    overview: {
      esg_score: base.esg_score,
      readiness: base.readiness,
      metrics: base.metrics
    },
    performance: {
      environmental: base.metrics?.environmental,
      social_proxy: base.metrics?.social_proxy,
      governance_proxy: base.metrics?.governance_proxy
    },
    evolution: input.esg_history || [{ period: 'current', score: base.esg_score }],
    risk_indicators: base.esg_score < 60 ? ['environmental_pressure'] : []
  };
}

function environmentExecutiveEsgMaturityRuntime(analytics) {
  const band = analytics.overview?.readiness?.maturity_band || 'developing';
  return {
    maturity_band: band,
    readiness: analytics.overview?.readiness?.ready === true,
    gap: analytics.overview?.readiness?.gap
  };
}

function environmentExecutiveEsgNarrativeRuntime(analytics, maturity) {
  const score = analytics.overview?.esg_score ?? 0;
  return {
    headline: `ESG executivo — ${score}/100`,
    paragraphs: [
      `Maturidade ${maturity.maturity_band}.`,
      `Gap para meta: ${maturity.gap ?? 0} pontos.`,
      'Insight assistivo — sem enforcement de compliance.'
    ],
    audience: 'director'
  };
}

function environmentExecutiveEsgRuntime(input = {}) {
  if (!flags.isEnvironmentExecutiveEsgCockpitEnabled()) {
    return { skipped: true, code: 'ESG_COCKPIT_OFF' };
  }
  return obs.withTiming(
    'environment_executive_esg_runtime_ms',
    () => {
      const analytics = environmentExecutiveEsgAnalytics(input);
      if (analytics.skipped) return analytics;
      const maturity = environmentExecutiveEsgMaturityRuntime(analytics);
      const narrative = environmentExecutiveEsgNarrativeRuntime(analytics, maturity);
      const explainability = buildExecutiveExplainability({
        rationale: 'Consolidação ESG a partir de métricas declaradas e governança ambiental.',
        confidence: (analytics.overview?.esg_score || 0) / 100,
        maturity: maturity.maturity_band,
        evidence: analytics.risk_indicators
      });
      return {
        ok: true,
        cockpit: 'esg',
        analytics,
        maturity,
        narrative,
        explainability,
        contextual_insights: analytics.risk_indicators.map((r) => ({ type: r, level: 'watch' }))
      };
    },
    { module: 'esg' }
  );
}

module.exports = {
  environmentExecutiveEsgRuntime,
  environmentExecutiveEsgAnalytics,
  environmentExecutiveEsgNarrativeRuntime,
  environmentExecutiveEsgMaturityRuntime
};
