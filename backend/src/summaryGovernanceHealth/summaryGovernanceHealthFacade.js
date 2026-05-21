'use strict';

const flags = require('../summaryConvergence/config/phaseZ8FeatureFlags');
const { runSummaryGovernanceHealthEngine } = require('./summaryGovernanceHealthEngine');

function getSummaryGovernanceHealthStatus(ctx = {}) {
  return {
    phase: 'Z.8',
    layer: 'summary-governance-health',
    health: flags.isSummaryGovernanceHealthEnabled(),
    tenant_id: ctx.tenant_id
  };
}

function assessSummaryGovernanceHealth(pack = {}, ctx = {}) {
  return {
    status: getSummaryGovernanceHealthStatus(ctx),
    ...runSummaryGovernanceHealthEngine(pack),
    recommendation_only: true,
    narrative_fabricated: false
  };
}

module.exports = { getSummaryGovernanceHealthStatus, assessSummaryGovernanceHealth };
