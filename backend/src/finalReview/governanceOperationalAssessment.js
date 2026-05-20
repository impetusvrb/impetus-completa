'use strict';

function assessOperationalMaturity(ctx = {}) {
  let ops = { enabled: false };
  try {
    const phaseJ = require('../governanceOperations/config/phaseJFeatureFlags');
    const svc = require('../governanceOperations/governanceOperationsService');
    ops = svc.getOperationsStatus({ force: ctx.force || phaseJ.isGovernanceOperationsEnabled() });
  } catch {
    ops = { enabled: false };
  }

  let metrics = {};
  try {
    metrics = require('../governanceOperations/governanceOperationalMetrics').computeOperationalMetrics({
      force: ctx.force
    });
  } catch {
    metrics = {};
  }

  const operational_maturity =
    metrics.governance_operational_health >= 0.8 ? 'enterprise' :
    metrics.governance_operational_health >= 0.65 ? 'maturing' : 'foundational';

  return {
    operations_layer: ops.enabled,
    operational_maturity,
    governance_operational_health: metrics.governance_operational_health,
    incident_rate: metrics.governance_incident_rate,
    explainability_maturity: ctx.explainability_enabled ? 'enabled' : 'shadow_ready',
    auto_activation: false
  };
}

module.exports = { assessOperationalMaturity };
