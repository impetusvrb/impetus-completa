'use strict';

const phaseU = require('./config/phaseUFeatureFlags');
const { logPhaseU } = require('./phaseULogger');
const { detectKpiUnderdelivery } = require('../kpiRollout/kpiUnderdeliveryDetector');
const { extractKpiList } = require('../kpiRollout/kpiTargetingValidator');

function superviseKpiUnderdelivery(user, kpiPayload, ctx = {}) {
  const underdelivery = detectKpiUnderdelivery(user, kpiPayload, ctx);
  const kpis = extractKpiList(kpiPayload);
  const excess = kpis.length > (ctx.max_kpis ?? 12);

  if (underdelivery.underdelivery && phaseU.isKpiStabilizationObservabilityEnabled()) {
    logPhaseU('KPI_RUNTIME_UNDERDELIVERY_DETECTED', {
      gap: underdelivery.gap,
      tenant_id: ctx.tenant_id,
      shadow_only: true
    });
  }

  return {
    ...underdelivery,
    excess_kpis: excess,
    recommendations: [
      ...(underdelivery.underdelivery ? [`Entregar ${underdelivery.gap} KPI(s) em falta`] : []),
      ...(excess ? ['Recomendação: consolidar KPIs excessivos — sem remoção automática'] : [])
    ],
    auto_correct: false
  };
}

module.exports = { superviseKpiUnderdelivery };
