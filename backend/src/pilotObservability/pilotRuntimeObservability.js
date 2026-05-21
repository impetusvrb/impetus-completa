'use strict';

const flags = require('../pilotMaturity/config/phaseZ4FeatureFlags');

function collectPilotRuntimeObservability(pack = {}) {
  return {
    phase: 'Z.4',
    observability_active: flags.isPilotObservabilityEnabled(),
    tenant_id: pack.tenant_id,
    maturity: pack.maturity || null,
    menu_stabilization: pack.menu_stabilization || null,
    kpi_preparation: pack.kpi_preparation || null,
    delivery_quality: pack.delivery_quality || null,
    targeting: pack.targeting || null,
    degradation_safe: pack.degradation_safe !== false,
    rollback_ready: pack.rollback_ready !== false
  };
}

module.exports = { collectPilotRuntimeObservability };
