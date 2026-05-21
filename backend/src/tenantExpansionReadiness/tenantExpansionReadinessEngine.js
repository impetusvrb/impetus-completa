'use strict';

const flags = require('../runtimeGovernanceConsolidation/config/phaseZ10FeatureFlags');
const { validateTenantExpansionReadiness } = require('./tenantReadinessValidator');
const { assessOperationalExpansionRisk } = require('./operationalExpansionRisk');
const { adviseRolloutExpansion } = require('./rolloutExpansionAdvisor');

function runTenantExpansionReadinessEngine(tenantId, pack = {}) {
  const readiness = validateTenantExpansionReadiness(tenantId, pack);
  const risk = assessOperationalExpansionRisk(pack);
  const advisor = adviseRolloutExpansion(readiness, risk);

  return {
    phase: 'Z.10',
    tenant_id: tenantId,
    enabled: flags.isExpansionReadinessValidationEnabled(),
    readiness,
    risk,
    advisor,
    may_expand: readiness.ready && !risk.expansion_risky,
    auto_expand: false,
    recommendation_only: true
  };
}

module.exports = { runTenantExpansionReadinessEngine };
