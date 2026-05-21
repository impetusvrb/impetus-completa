'use strict';

function traceCockpitDelivery(input = {}, ctx = {}) {
  const blocks = input.cockpit_blocks || {};
  const operationalKeys = ['centro_operacoes', 'plc', 'turno', 'producao', 'manuia'];
  const executiveKeys = ['faturamento', 'lucro', 'oee', 'strategic'];
  const tier = ctx.hierarchy_tier || 'coordination';
  const leakage = [];

  if (tier !== 'operational' && tier !== 'supervision') {
    for (const k of operationalKeys) {
      if (blocks[k]) leakage.push({ block: k, reason: 'operational_cockpit_on_non_operational' });
    }
  }
  if (tier === 'operational' || tier === 'coordination') {
    for (const k of executiveKeys) {
      if (blocks[k]) leakage.push({ block: k, reason: 'executive_kpi_on_operational_profile' });
    }
  }

  return {
    cockpit_delivery_audit: {
      blocks_present: Object.keys(blocks),
      hierarchy_tier: tier,
      leakage_detected: leakage.length > 0,
      leakage
    },
    trace: [{ stage: 'cockpit_compose', source: 'dashboardComposer/engine_v2', execution_order: 1 }]
  };
}

module.exports = { traceCockpitDelivery };
