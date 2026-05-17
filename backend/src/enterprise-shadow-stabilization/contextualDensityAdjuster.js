'use strict';

const ux = require('../runtime-validation/enterpriseContextualUxValidator');

/**
 * Recomendações de densidade contextual (assistivo — não altera UI automaticamente).
 */
function recommendDensityAdjustments(uxValidation, domains = ['quality', 'safety', 'logistics']) {
  const results = uxValidation?.results || [];
  const recommendations = [];
  for (const r of results) {
    if (r.ux_pressure_class === 'CRITICAL' || r.ux_pressure_class === 'HIGH') {
      recommendations.push({
        band: r.band,
        action: 'reduce_menu_and_dashboard_count',
        target_pressure: 'MODERATE',
        domains
      });
    }
  }
  return {
    ok: true,
    assistive_only: true,
    auto_apply: false,
    recommendations,
    suggested_density: recommendations.length ? 'compact' : 'tactical'
  };
}

function adjustDensityProfile(band, currentMenuCount) {
  const validated = ux.validateContextualUx({ band, menu_item_count: currentMenuCount });
  const rules = ux.BAND_RULES[band] || ux.BAND_RULES.production;
  const target = Math.max(2, rules.max_menu - 2);
  return {
    band,
    current: currentMenuCount,
    recommended_max_menu: validated.acceptable ? currentMenuCount : target,
    ux_pressure: validated.ux_pressure_class
  };
}

module.exports = { recommendDensityAdjustments, adjustDensityProfile };
