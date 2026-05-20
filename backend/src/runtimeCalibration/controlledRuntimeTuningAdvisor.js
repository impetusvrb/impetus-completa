'use strict';

const phaseY = require('./config/phaseYFeatureFlags');

function adviseRuntimeTuning(tenantId, stabilization, maturity, gapReport = {}, ctx = {}) {
  const recommendations = [];
  const rollout = [];
  const categories = gapReport.gaps || {};

  if (!stabilization?.stable) {
    recommendations.push('Revisar gaps consolidados antes de activar enforcement de canal');
    rollout.push('Manter shadow-first; pausar promoção de flags até estabilidade ≥ 0.75');
  }
  if ((categories.leakage || []).length) {
    recommendations.push('Calibrar targeting KPI/summary/chat por tenant — supervisão humana');
  }
  if ((categories.stale || []).length) {
    recommendations.push('Verificar conectores PLC/telemetria e freshness de enrichers');
  }
  if (maturity.composite_maturity < 0.7) {
    recommendations.push('Executar ciclo de calibração tenant: readiness E→X + validação operacional');
  }
  if (ctx.controlled_activation && !ctx.controlled_activation.readiness?.readiness_ok) {
    rollout.push('Completar readiness controlled-activation antes de próximo canal');
  }

  return {
    tenant_id: tenantId,
    tuning_recommendations: recommendations,
    calibration_recommendations: recommendations,
    rollout_recommendations: rollout,
    auto_apply: false,
    enforcement_active: phaseY.isRuntimeTuningAdvisorEnabled(),
    human_supervision_required: true
  };
}

module.exports = { adviseRuntimeTuning };
