'use strict';

const flags = require('../flags/environmentExecutiveRuntimeFlags');
const obs = require('../shared/environmentExecutiveObservability');
const { buildExecutiveExplainability } = require('../shared/environmentExecutiveExplainability');
const sustGov = require('../../governance/sustainability/environmentSustainabilityRuntime');

function environmentSustainabilityAnalyticsRuntime(input = {}) {
  let base = sustGov.environmentSustainabilityRuntime(input);
  if (base.skipped) {
    const esg = Number(input.esg_score) || 55;
    base = {
      ok: true,
      sustainability_score: Math.round(esg * 0.9),
      maturity: { maturity_score: esg, band: esg >= 70 ? 'mature' : 'developing' },
      executive_standalone: true
    };
  }
  return {
    sustainability_score: base.sustainability_score,
    environmental_performance: base.maturity?.maturity_score,
    operational_sustainability: input.operational_score ?? 50,
    evolution: input.sustainability_history || [{ period: 'current', score: base.sustainability_score }],
    readiness: base.maturity?.band === 'mature' ? 'ready' : 'developing'
  };
}

function environmentSustainabilityMaturityRuntime(analytics) {
  return {
    maturity_score: analytics.environmental_performance ?? 50,
    readiness: analytics.readiness,
    band: (analytics.environmental_performance ?? 0) >= 70 ? 'mature' : 'developing'
  };
}

function environmentSustainabilityNarrativeRuntime(analytics) {
  return {
    headline: `Sustentabilidade industrial — score ${analytics.sustainability_score}`,
    body: `Performance ambiental ${analytics.environmental_performance}. Leitura estratégica assistiva.`,
    assistive_only: true
  };
}

function environmentSustainabilityExecutiveRuntime(input = {}) {
  if (!flags.isEnvironmentExecutiveSustainabilityEnabled()) {
    return { skipped: true, code: 'SUSTAINABILITY_OFF' };
  }
  return obs.withTiming(
    'environment_executive_runtime_ms',
    () => {
      const analytics = environmentSustainabilityAnalyticsRuntime(input);
      if (analytics.skipped) return analytics;
      const maturity = environmentSustainabilityMaturityRuntime(analytics);
      const narrative = environmentSustainabilityNarrativeRuntime(analytics);
      return {
        ok: true,
        cockpit: 'sustainability',
        analytics,
        maturity,
        narrative,
        explainability: buildExecutiveExplainability({
          rationale: 'Cockpit de sustentabilidade consolidado.',
          maturity: maturity.band,
          confidence: (analytics.sustainability_score || 0) / 100
        })
      };
    },
    { module: 'sustainability' }
  );
}

module.exports = {
  environmentSustainabilityExecutiveRuntime,
  environmentSustainabilityAnalyticsRuntime,
  environmentSustainabilityNarrativeRuntime,
  environmentSustainabilityMaturityRuntime
};
