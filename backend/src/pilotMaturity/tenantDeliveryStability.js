'use strict';

const { logPhaseZ4 } = require('./phaseZ4Logger');
const flags = require('./config/phaseZ4FeatureFlags');

function assessDeliveryStability(visibleModules = [], ctx = {}) {
  const modules = Array.isArray(visibleModules) ? visibleModules : [];
  const history = ctx.visibility_history || [];
  let oscillation = false;
  if (history.length >= 2) {
    const last = history[history.length - 1];
    const prev = history[history.length - 2];
    const delta = Math.abs((last?.length || 0) - (prev?.length || 0));
    oscillation = delta >= 3;
  }

  const shared = ['dashboard', 'settings', 'biblioteca', 'ai', 'help'];
  const missingShared = shared.filter((m) => !modules.includes(m));
  const stability =
    missingShared.length === 0 && !oscillation
      ? 0.95
      : missingShared.length === 0
        ? 0.75
        : Math.max(0.35, 1 - missingShared.length * 0.15);

  if (oscillation && flags.isPilotObservabilityEnabled()) {
    logPhaseZ4('DELIVERY_STABILITY_OSCILLATION', {
      tenant_id: ctx.tenant_id,
      shadow_only: !flags.isMenuStabilityAnalysisEnabled()
    });
  }

  return {
    delivery_stability: Number(stability.toFixed(4)),
    oscillation_detected: oscillation,
    missing_shared: missingShared,
    module_count: modules.length
  };
}

module.exports = { assessDeliveryStability };
