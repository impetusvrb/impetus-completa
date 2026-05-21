'use strict';
const flags = require('../kpiConvergence/config/phaseZ7FeatureFlags');
const { runKpiGovernanceHealthEngine } = require('./kpiGovernanceHealthEngine');
function getKpiGovernanceHealthStatus(ctx = {}) {
  return { phase: 'Z.7', layer: 'kpi-governance-health', health: flags.isKpiGovernanceHealthEnabled(), tenant_id: ctx.tenant_id };
}
function assessKpiGovernanceHealth(pack = {}, ctx = {}) {
  return { status: getKpiGovernanceHealthStatus(ctx), ...runKpiGovernanceHealthEngine(pack), recommendation_only: !flags.isKpiGovernanceHealthEnabled(), fabricated: false };
}
module.exports = { getKpiGovernanceHealthStatus, assessKpiGovernanceHealth };
