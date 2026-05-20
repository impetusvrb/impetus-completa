'use strict';

const flags = require('./config/runtimeTuningFeatureFlags');
const { logRuntimeTuning } = require('./runtimeTuningLogger');

function adviseDeliveryOptimization(ctx = {}) {
  const recommendations = [];

  if (ctx.kpi_governance?.leakage?.detected) {
    recommendations.push({
      area: 'targeting',
      action: 'Recalibrar targeting KPI por eixo funcional e tenant',
      priority: 'high'
    });
  }
  if (ctx.summary_governance?.leakage?.detected) {
    recommendations.push({
      area: 'targeting',
      action: 'Restringir summary aos módulos visíveis do perfil',
      priority: 'high'
    });
  }
  if (ctx.precision_delivery?.underdelivery) {
    recommendations.push({
      area: 'delivery_correction',
      action: 'Elevar densidade de sinais em precision_delivery',
      priority: 'medium'
    });
  }
  if (ctx.kpi_hierarchy_delivery_integrity && !ctx.kpi_hierarchy_delivery_integrity.stable) {
    recommendations.push({
      area: 'hierarchy_optimization',
      action: 'Revalidar hierarquia KPI→summary→chat para o tenant',
      priority: 'critical'
    });
  }
  if (ctx.contextual_delivery?.delivery_score < 0.65) {
    recommendations.push({
      area: 'delivery_correction',
      action: 'Ajustar contextual_delivery por persona/axis',
      priority: 'medium'
    });
  }

  if (recommendations.length && flags.isRuntimeTuningObservabilityEnabled()) {
    logRuntimeTuning('DELIVERY_OPTIMIZATION_REQUIRED', {
      count: recommendations.length,
      tenant_id: ctx.tenant_id,
      shadow_only: true
    });
  }

  return {
    delivery_recommendations: recommendations,
    targeting_optimization: recommendations.filter((r) => r.area === 'targeting'),
    hierarchy_optimization: recommendations.filter((r) => r.area === 'hierarchy_optimization'),
    delivery_correction: recommendations.filter((r) => r.area === 'delivery_correction'),
    auto_apply: false
  };
}

module.exports = { adviseDeliveryOptimization };
