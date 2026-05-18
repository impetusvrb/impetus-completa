'use strict';

const { correlatePair, narrative } = require('../shared/correlationHelpers');

function environmentChemicalRiskCorrelation(ctx = {}) {
  return correlatePair(ctx.chemical_exposure_index, ctx.environmental_risk_score, 'quimicos_x_risco_ambiental', {
    scale: 1
  });
}

function environmentIncidentEnvironmentalCorrelation(ctx = {}) {
  return correlatePair(ctx.incident_count, ctx.spill_impact_proxy, 'incidentes_x_impacto_ambiental', { scale: 10 });
}

function environmentSafetyEnvironmentalImpactRuntime(ctx = {}) {
  const leak = correlatePair(ctx.leak_events, ctx.safety_severity, 'vazamentos_x_seguranca', { scale: 5 });
  const epi = correlatePair(ctx.epi_compliance, ctx.agent_exposure, 'epi_x_agentes', { scale: 1 });
  const apr = correlatePair(ctx.apr_count, ctx.compliance_score, 'apr_pt_x_compliance', { scale: 20 });
  const haz = correlatePair(ctx.hazmat_events, ctx.waste_hazard_index, 'residuos_perigosos_x_seguranca', { scale: 5 });
  const scores = [leak, epi, apr, haz].filter((x) => x.ok).map((x) => x.correlation_score);
  const aggregate = scores.length ? scores.reduce((s, x) => s + x, 0) / scores.length : 0;
  return {
    ok: true,
    domain_pair: 'environment_x_safety',
    correlations: { leak_safety: leak, epi_agents: epi, apr_compliance: apr, hazmat_waste: haz },
    chemical: environmentChemicalRiskCorrelation(ctx),
    incident: environmentIncidentEnvironmentalCorrelation(ctx),
    aggregate_score: aggregate,
    narratives: [narrative('safety_environmental', aggregate)],
    assistive_only: true
  };
}

function environmentSafetyCorrelationEngine(ctx = {}) {
  return environmentSafetyEnvironmentalImpactRuntime(ctx);
}

module.exports = {
  environmentSafetyCorrelationEngine,
  environmentSafetyEnvironmentalImpactRuntime,
  environmentChemicalRiskCorrelation,
  environmentIncidentEnvironmentalCorrelation
};
