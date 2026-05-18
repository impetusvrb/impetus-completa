'use strict';

const flags = require('../flags/environmentExecutiveRuntimeFlags');
const obs = require('../shared/environmentExecutiveObservability');
const { buildExecutiveExplainability } = require('../shared/environmentExecutiveExplainability');
const EXEC = require('../events/executiveEventHints');

function environmentExecutiveNarrativeCenterRuntime(pack) {
  const parts = [];
  if (pack.esg?.narrative?.headline) parts.push(pack.esg.narrative.headline);
  if (pack.sustainability?.narrative?.headline) parts.push(pack.sustainability.narrative.headline);
  if (pack.carbon?.narrative?.headline) parts.push(pack.carbon.narrative.headline);
  if (pack.risk?.narrative?.headline) parts.push(pack.risk.narrative.headline);
  return {
    headline: 'Centro de narrativas ambientais executivas',
    narratives: parts,
    assistive_only: true,
    event_hint: EXEC.ENVIRONMENTAL_NARRATIVE_GENERATED
  };
}

function environmentExecutiveCrossDomainRuntime(input = {}) {
  const insights = [];
  if (input.production_rate && input.emissions_co2) {
    insights.push({ type: 'production_emissions', text: 'Correlação produção × emissões (assistiva).' });
  }
  if (input.logistics_carbon_index != null) {
    insights.push({ type: 'logistics_carbon', text: 'Pressão logística sobre pegada de carbono.' });
  }
  if (input.cognitive_risk_score != null) {
    insights.push({ type: 'cognitive_risk', text: `Risco cognitivo ${(input.cognitive_risk_score * 100).toFixed(0)}%.` });
  }
  return {
    insights,
    cross_domain_score: Math.min(1, insights.length * 0.25),
    event_hint: insights.length ? EXEC.CROSS_DOMAIN_INSIGHT_GENERATED : null
  };
}

function environmentExecutiveStrategicInsightsRuntime(pack, cross) {
  return {
    strategic_priority:
      pack.risk?.scoring?.severity === 'high'
        ? 'risk_mitigation'
        : pack.esg?.analytics?.overview?.esg_score < 60
          ? 'esg_improvement'
          : 'sustainability_continuity',
    cross_domain: cross.insights,
    maturity: pack.maturity,
    assistive_only: true
  };
}

function environmentExecutiveIntelligenceCenterRuntime(pack, input = {}) {
  if (!flags.isEnvironmentExecutiveIntelligenceCenterEnabled()) {
    return { skipped: true, code: 'INTELLIGENCE_CENTER_OFF' };
  }
  const cross = environmentExecutiveCrossDomainRuntime(input);
  const narratives = environmentExecutiveNarrativeCenterRuntime(pack);
  const strategic = environmentExecutiveStrategicInsightsRuntime(pack, cross);
  return {
    ok: true,
    narratives,
    cross_domain: cross,
    strategic,
    explainability_center: buildExecutiveExplainability({
      rationale: 'Centro de inteligência ambiental executiva — consolidação estratégica.',
      evidence: cross.insights.map((i) => i.type)
    })
  };
}

module.exports = {
  environmentExecutiveIntelligenceCenterRuntime,
  environmentExecutiveNarrativeCenterRuntime,
  environmentExecutiveCrossDomainRuntime,
  environmentExecutiveStrategicInsightsRuntime
};
