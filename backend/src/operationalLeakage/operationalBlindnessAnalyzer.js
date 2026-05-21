'use strict';

function analyzeOperationalBlindness(delivery = {}, identity = {}) {
  const tier = identity.hierarchy_tier;
  const moduleCount = (delivery.visible_modules || delivery.modules || []).length;
  const kpiCount = (delivery.kpis || []).length;
  const blindness = [];

  const minModules = parseInt(process.env.IMPETUS_MIN_OPERATIONAL_MODULES || '2', 10);
  if (tier === 'operational' && moduleCount <= minModules) {
    blindness.push({ type: 'operational_underdelivery', module_count: moduleCount });
  }
  if (tier === 'executive' && kpiCount === 0 && /faturamento|oee/i.test(JSON.stringify(delivery))) {
    blindness.push({ type: 'executive_kpi_blindness' });
  }
  if (moduleCount > 0 && kpiCount === 0 && tier !== 'executive') {
    blindness.push({ type: 'kpi_blindness_possible', kpi_count: kpiCount });
  }

  return { blindness, count: blindness.length, observability_only: true };
}

module.exports = { analyzeOperationalBlindness };
