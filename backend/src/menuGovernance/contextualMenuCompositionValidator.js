'use strict';

const { analyzeGovernedMenuDelivery } = require('./governedMenuDeliveryAnalyzer');
const { analyzeSharedModuleLeakage } = require('./sharedModuleLeakageAnalyzer');
const { analyzeExecutiveModuleIsolation } = require('./executiveModuleIsolationAnalyzer');
const { analyzeOperationalModuleIsolation } = require('./operationalModuleIsolationAnalyzer');

function validateContextualMenuComposition(ctx = {}) {
  const delivery = analyzeGovernedMenuDelivery(ctx);
  const shared = analyzeSharedModuleLeakage(ctx);
  const executive = analyzeExecutiveModuleIsolation(ctx);
  const operational = analyzeOperationalModuleIsolation(ctx);

  const valid =
    delivery.overdelivery_modules.length === 0 &&
    !shared.leakage_detected &&
    executive.executive_isolation_ok &&
    operational.operational_isolation_ok;

  return {
    menu_composition_valid: valid,
    delivery,
    shared,
    executive,
    operational,
    global_permissive_menu: delivery.permissive_menu,
    recommendation_only: true,
    auto_hide: false
  };
}

module.exports = { validateContextualMenuComposition };
