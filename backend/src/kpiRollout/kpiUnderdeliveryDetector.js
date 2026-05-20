'use strict';

const phaseT = require('./config/phaseTFeatureFlags');
const { logPhaseT } = require('./phaseTLogger');
const { extractKpiList } = require('./kpiTargetingValidator');

function detectKpiUnderdelivery(user, kpiPayload, ctx = {}) {
  const kpis = extractKpiList(kpiPayload);
  const expectedMin = ctx.expected_kpi_min ?? ctx.min_kpis ?? 1;
  const delivered = kpis.filter((k) => !k.denied && !k.hidden).length;
  const underdelivery = delivered < expectedMin;

  if (underdelivery && phaseT.isKpiGovernanceObservabilityEnabled()) {
    logPhaseT('KPI_UNDERDELIVERY_DETECTED', {
      delivered,
      expectedMin,
      tenant_id: ctx.tenant_id,
      shadow_only: true
    });
  }

  return {
    underdelivery,
    delivered_count: delivered,
    expected_min: expectedMin,
    gap: Math.max(0, expectedMin - delivered)
  };
}

module.exports = { detectKpiUnderdelivery };
