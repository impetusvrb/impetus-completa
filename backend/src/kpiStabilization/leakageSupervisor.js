'use strict';

const phaseU = require('./config/phaseUFeatureFlags');
const { logPhaseU } = require('./phaseULogger');
const { detectKpiLeakage } = require('../kpiRollout/kpiLeakageDetector');
const { extractKpiList } = require('../kpiRollout/kpiTargetingValidator');
const { inferKpiDomain } = require('../kpiRollout/kpiDomainRegistry');

function superviseKpiLeakage(user, kpiPayload, ctx = {}) {
  const leakage = detectKpiLeakage(user, kpiPayload, ctx);
  const kpis = extractKpiList(kpiPayload);
  const domains = [...new Set(kpis.map((k) => inferKpiDomain(k)))];
  const overlap_residual = domains.length > 3;

  if (leakage.leakage_detected && phaseU.isKpiStabilizationObservabilityEnabled()) {
    logPhaseU('KPI_RUNTIME_LEAKAGE_DETECTED', {
      count: leakage.leakage_count,
      tenant_id: ctx.tenant_id,
      shadow_only: true
    });
  }
  if (overlap_residual && phaseU.isKpiStabilizationObservabilityEnabled()) {
    logPhaseU('KPI_AUTHORITY_OVERLAP_DETECTED', { domains, shadow_only: true });
  }

  return {
    ...leakage,
    overlap_residual,
    recommendations: leakage.leakage_detected
      ? ['Recomendação: rever KPIs com leakage — sem remoção automática']
      : [],
    auto_correct: false
  };
}

module.exports = { superviseKpiLeakage };
