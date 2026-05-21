'use strict';

const { preserveGracefulMenu } = require('../menuRuntimeStabilization/gracefulMenuPreservation');
const { guardDashboardSurvival } = require('../menuRuntimeStabilization/dashboardSurvivalGuard');
const { applyMenuFallbackProtection } = require('../menuRuntimeStabilization/menuFallbackProtection');

function applyTenantOperationalVisibility(modules = [], ctx = {}) {
  const preserved = preserveGracefulMenu(modules, ctx);
  let current = preserved.after;
  const survival = guardDashboardSurvival(current);
  current = survival.visible_modules;
  const fallback = applyMenuFallbackProtection(current, ctx);
  return {
    visible_modules: fallback.visible_modules,
    dashboard_survival: survival,
    fallback: fallback.applied,
    minimum_operational: preserved.minimum_operational
  };
}

module.exports = { applyTenantOperationalVisibility };
