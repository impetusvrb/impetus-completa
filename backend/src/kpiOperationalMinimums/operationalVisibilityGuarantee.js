'use strict';

const flags = require('../kpiRuntimeStability/config/phaseZ6FeatureFlags');
const { ensureMinimumOperationalKpis } = require('../kpiGracefulPreservation/minimumOperationalKpiSet');
const { ensureOperationalKpiMinimums } = require('./operationalKpiMinimumsRuntime');
const { ensureExecutiveKpiMinimums } = require('./executiveKpiMinimumsRuntime');

function guaranteeOperationalVisibility(kpis = [], original = [], ctx = {}) {
  const tier = String(ctx.hierarchy_tier || 'coordination').toLowerCase();
  let result = { kpis: [...kpis], restored: [], fabricated: false };

  if (tier === 'operational') {
    result = ensureOperationalKpiMinimums(kpis, original, ctx);
  } else if (['executive', 'director'].includes(tier)) {
    result = ensureExecutiveKpiMinimums(kpis, original, ctx);
  } else if (flags.isKpiUnderdeliveryHardeningEnabled()) {
    result = ensureMinimumOperationalKpis(kpis, original, {
      ...ctx,
      denied_kpi_keys: ctx.denied_kpi_keys || []
    });
  }

  return { ...result, guarantee_applied: flags.isKpiUnderdeliveryHardeningEnabled() };
}

module.exports = { guaranteeOperationalVisibility };
