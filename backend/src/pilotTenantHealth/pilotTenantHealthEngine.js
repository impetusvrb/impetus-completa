'use strict';

const flags = require('../productionRuntimeActivation/config/phaseZ12FeatureFlags');
const { isPilotTenant } = require('../pilotTenants/pilotTenantRegistry');
const { assessPilotOperationalIntegrity } = require('./pilotOperationalIntegrity');
const { assessPilotGovernanceReliability } = require('./pilotGovernanceReliability');
const { assessPilotRuntimeConfidence } = require('./pilotRuntimeConfidence');

function runPilotTenantHealthEngine(tenantId, pack = {}) {
  if (!isPilotTenant(tenantId) && !pack.force) {
    return { pilot: false, reason: 'not_pilot_tenant' };
  }

  const integrity = assessPilotOperationalIntegrity(pack);
  const governance = assessPilotGovernanceReliability({
    maturity: pack.z10?.tenant_governance_maturity,
    sustainability: pack.z10?.runtime_sustainability
  });
  const health_score = Math.min(1, integrity.integrity_score * 0.4 + governance.reliability_score * 0.6);
  const confidence = assessPilotRuntimeConfidence({ health_score, activation_safety: pack.activation_safety });

  return {
    phase: 'Z.12',
    pilot: true,
    tenant_id: tenantId,
    enabled: flags.isPilotHealthSupervisionEnabled(),
    health_score,
    integrity,
    governance,
    confidence,
    rollout_sustainable: pack.z11?.runtime_scaling_readiness?.governance_sustainable !== false,
    graceful_degradation: true,
    auto_remediate: false
  };
}

module.exports = { runPilotTenantHealthEngine };
