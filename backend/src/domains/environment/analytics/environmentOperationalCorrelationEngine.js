'use strict';

const cross = require('./environmentCrossDomainCorrelationRuntime');

/**
 * Correla operacional: efluente, emissão, resíduo × lote × turno × máquina.
 */
function environmentalOperationalCorrelationEngine(ctx = {}) {
  const base = cross.environmentalCrossDomainCorrelationRuntime(ctx);
  const operational_links = [];

  if (ctx.effluent_ph != null && ctx.production_lot) {
    operational_links.push({ type: 'effluent_production_lot', confidence: 0.72 });
  }
  if (ctx.waste_overflow_risk) {
    operational_links.push({ type: 'waste_capacity', confidence: 0.65 });
  }
  if (ctx.carbon_scope && ctx.energy_kwh) {
    operational_links.push({ type: 'carbon_energy', confidence: 0.8 });
  }

  return {
    ...base,
    operational_links,
    predictive_risk_proxy: ctx.predictive_risk_proxy ?? null,
    audit_trail: true
  };
}

module.exports = { environmentalOperationalCorrelationEngine };
