'use strict';

const phaseL = require('./config/phaseLFeatureFlags');
const { validateKpiDependencies } = require('./governedKpiDependencyValidator');
const { scoreKpiContextualPrecision } = require('./kpiContextualPrecision');

function resolvePreciseKpis(kpiPayload, user, ctx = {}) {
  const deps = validateKpiDependencies(kpiPayload, ctx);
  const contextual = scoreKpiContextualPrecision(user, ctx);
  const enforcement = phaseL.isPreciseKpiAlignmentEnabled();
  const confidence = Number(
    ((deps.dependency_score + contextual.contextual_precision_score) / 2).toFixed(4)
  );

  const denied = deps.issues.filter((i) => i.severity === 'critical');
  const allowDelivery = !enforcement || (deps.valid && contextual.kpi_context_sufficient);

  return {
    kpi_payload: allowDelivery ? kpiPayload : { ...kpiPayload, kpis: [], denied: true },
    kpi_delivery_confidence: confidence,
    governance_confidence: confidence,
    denied_kpis: denied,
    issues: deps.issues,
    contextual,
    enforcement_active: enforcement,
    shadow_only: !enforcement,
    states: !contextual.kpi_context_sufficient
      ? [{ state: 'contextual_insufficiency', message: 'Contexto insuficiente para KPIs precisos' }]
      : deps.issues.map((i) => ({ state: 'dependency_unavailable', ...i }))
  };
}

module.exports = { resolvePreciseKpis };
