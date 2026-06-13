'use strict';

/**
 * AIOI-P1J.3 — Operational Risk Assessment
 * READ ONLY · observação · sem mitigação automática.
 */

const continuousWorker = require('./aioiContinuousWorkerService');
const clusterHealth = require('./aioiClusterHealthService');
const distributedCapacity = require('./aioiDistributedCapacityService');
const distributedRuntime = require('./aioiDistributedRuntimeService');
const certificationRegistry = require('./aioiCertificationRegistryService');

const LAYER = 'AIOI_OPERATIONAL_RISK';

function _riskFromStatus(status) {
  const map = {
    NORMAL: 'LOW',
    WARNING: 'MEDIUM',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL'
  };
  return map[status] || 'LOW';
}

function _maxRisk(...levels) {
  const order = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
  return levels.reduce((max, l) => (order[l] > order[max] ? l : max), 'LOW');
}

async function assessOperationalRisk() {
  const inv = continuousWorker.RUNTIME_INVARIANTS;
  const health = await clusterHealth.evaluateClusterHealth();
  const capacity = await distributedCapacity.calculateDistributedCapacity();
  const registry = certificationRegistry.getCertificationStatus();
  const soak = distributedRuntime.getDistributedSoakMetrics();

  let runtimeRisk = 'LOW';
  if (inv.runtime_enabled || inv.cognitive_execution_allowed) runtimeRisk = 'CRITICAL';
  else if (inv.auto_execute_band !== 'none') runtimeRisk = 'CRITICAL';
  else if (health.factors?.ownership_coverage?.status === 'CRITICAL') runtimeRisk = 'HIGH';

  const capacityRisk = _maxRisk(
    _riskFromStatus(capacity.headroom_status)
  );

  let recoveryRisk = 'LOW';
  if (soak.ownership_conflicts > 0) recoveryRisk = 'HIGH';
  if (soak.lease_conflicts > 0) recoveryRisk = 'MEDIUM';
  if (soak.lost > 0) recoveryRisk = 'CRITICAL';

  let governanceRisk = 'LOW';
  if (!registry.registry_ready) governanceRisk = 'HIGH';
  if (!registry.dependency_chain_valid) governanceRisk = 'CRITICAL';

  const overall = _maxRisk(runtimeRisk, capacityRisk, recoveryRisk, governanceRisk);

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    auto_mitigation: false,
    runtime_risk: runtimeRisk,
    capacity_risk: capacityRisk,
    recovery_risk: recoveryRisk,
    governance_risk: governanceRisk,
    overall_risk: overall,
    invariants: inv,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  assessOperationalRisk,
  LAYER
};
