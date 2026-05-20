'use strict';

const phaseL = require('./config/phaseLFeatureFlags');
const { logPhaseL } = require('./phaseLLogger');
const { resolveContextualModulePrecision } = require('./contextualModulePrecisionResolver');

function deliverModules(user, ctx = {}) {
  const modules = Array.isArray(ctx.visible_modules) ? ctx.visible_modules : [];
  const precision = resolveContextualModulePrecision(modules, user, ctx);
  const enforcement = phaseL.isPreciseModuleDeliveryEnabled();
  const observe = phaseL.isRuntimePrecisionObservabilityEnabled() || ctx.force_observe;

  const delivered = enforcement ? precision.eligible_modules : modules;

  if (observe && precision.ineligible.length) {
    logPhaseL('MODULE_OVERDELIVERY_DETECTED', {
      count: precision.ineligible.length,
      axis: precision.targeting?.functional_axis,
      shadow_only: !enforcement
    });
  }
  if (observe && precision.underdelivery_risk) {
    logPhaseL('MODULE_UNDERDELIVERY_RISK', { axis: precision.targeting?.functional_axis });
  }

  return {
    visible_modules: delivered,
    precise_modules: precision.eligible_modules,
    module_delivery_confidence: precision.module_delivery_confidence,
    contextual_precision_score: precision.contextual_precision_score,
    enforcement_active: enforcement,
    shadow_only: !enforcement,
    auto_filtered: false,
    precision_detail: precision
  };
}

module.exports = { deliverModules };
