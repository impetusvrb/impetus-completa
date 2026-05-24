'use strict';

const c3 = require('../config/phaseC3FeatureFlags');

function calculateOperationalEconomicImpact(payload = {}, graph = {}, bottleneck = {}) {
  const hourly = c3.hourlyCostProxy();
  const maint = payload.maintenance_cognitive_runtime?.reliability || {};
  const qual = payload.quality_operational_metrics || {};
  const downtimeMinutes = Number(maint.downtime_minutes ?? 0) || 0;
  const ncOpen = qual.open_nc ?? qual.nc_open ?? 0;

  const downtime_hours = downtimeMinutes / 60;
  const stop_cost = Number((downtime_hours * hourly * 1.2).toFixed(2));
  const rework_cost = Number((ncOpen * hourly * 0.35).toFixed(2));
  const nc_cost = Number((ncOpen * hourly * 0.25).toFixed(2));
  const delay_cost = Number(((bottleneck.primary_bottleneck?.weight ?? 0) * hourly * 0.5).toFixed(2));
  const waste_cost = Number(((graph.nodes?.find((n) => n.node_type === 'waste')?.operational_weight ?? 0) * hourly * 0.4).toFixed(2));
  const efficiency_loss = Number(((1 - (graph.nodes?.find((n) => n.node_type === 'oee')?.operational_weight ?? 0.75)) * hourly * 2).toFixed(2));

  const estimated_loss = Number((stop_cost + rework_cost + nc_cost + delay_cost + waste_cost + efficiency_loss).toFixed(2));
  const preventive_savings = Number((estimated_loss * 0.22).toFixed(2));
  const operational_cost_pressure = Number(Math.min(1, estimated_loss / (hourly * 24)).toFixed(3));

  let economic_risk_level = 'low';
  if (operational_cost_pressure > 0.55) economic_risk_level = 'high';
  else if (operational_cost_pressure > 0.3) economic_risk_level = 'medium';

  const dataBacked = downtimeMinutes > 0 || ncOpen > 0 || payload.production_cognitive_runtime?.consolidation_applied;
  const impact_confidence = dataBacked ? 0.72 : 0.45;

  return {
    estimated_loss,
    preventive_savings,
    operational_cost_pressure,
    economic_risk_level,
    impact_confidence: Number(impact_confidence.toFixed(3)),
    breakdown: {
      stop_cost,
      rework_cost,
      nc_cost,
      delay_cost,
      waste_cost,
      efficiency_loss
    },
    erp_integrated: false,
    heuristic_model: true,
    auto_decisions: false
  };
}

module.exports = { calculateOperationalEconomicImpact };
