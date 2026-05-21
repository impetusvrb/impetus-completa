'use strict';

const flags = require('../phaseZ0/config/phaseZ0FeatureFlags');
const { logPhaseZ0 } = require('../phaseZ0/phaseZ0Logger');

function analyzeGovernedMenuDelivery(ctx = {}) {
  const modules = ctx.visible_modules || [];
  const governed = ctx.authority_registry?.governed_visible_modules || ctx.governed_visible_modules || [];
  const overdelivery = modules.filter((m) => !governed.includes(m) && m !== 'dashboard' && m !== 'settings');
  const underdelivery = governed.filter((m) => !modules.includes(m));

  if (modules.length > 10) {
    overdelivery.push('__meta__:excessive_module_count');
  }

  if ((overdelivery.length || underdelivery.length) && flags.isRuntimeObservationObservabilityEnabled()) {
    logPhaseZ0('MENU_DELIVERY_ANALYZED', {
      over: overdelivery.length,
      under: underdelivery.length,
      tenant_id: ctx.tenant_id,
      shadow_only: true
    });
  }

  return {
    delivered_count: modules.length,
    governed_count: governed.length,
    overdelivery_modules: overdelivery.filter((m) => typeof m === 'string'),
    underdelivery_modules: underdelivery,
    permissive_menu: modules.length > governed.length + 3,
    auto_hide: false,
    recommendation_only: true
  };
}

module.exports = { analyzeGovernedMenuDelivery };
