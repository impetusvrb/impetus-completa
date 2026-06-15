'use strict';

/**
 * AIOI-P1R — Enterprise Release Governance & Baseline Acceptance Certification
 * READ ONLY · RELEASE ACCEPTANCE ONLY · sem activar runtime
 */

process.env.IMPETUS_AIOI_ENABLED = process.env.IMPETUS_AIOI_ENABLED || 'true';
process.env.IMPETUS_AIOI_DISTRIBUTED_RUNTIME_ACTIVE = 'false';
process.env.IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED = 'true';

const releaseGovernance = require('../src/services/aioi/runtime/aioiReleaseGovernanceService');
const releaseAcceptance = require('../src/services/aioi/runtime/aioiReleaseAcceptanceService');
const enterpriseReleaseRegistry = require('../src/services/aioi/runtime/aioiEnterpriseReleaseRegistryService');
const changeGovernance = require('../src/services/aioi/runtime/aioiChangeGovernanceService');
const releaseReadiness = require('../src/services/aioi/runtime/aioiReleaseReadinessService');
const continuousWorker = require('../src/services/aioi/runtime/aioiContinuousWorkerService');

function assertInvariants(label) {
  const inv = continuousWorker.RUNTIME_INVARIANTS;
  if (inv.runtime_enabled || inv.runtime_active || inv.cognitive_execution_allowed) {
    throw new Error(`INVARIANT_VIOLATION at ${label}`);
  }
  if (inv.runtime_authorized) {
    throw new Error(`INVARIANT_VIOLATION runtime_authorized at ${label}`);
  }
  if (inv.auto_execute_band !== 'none') {
    throw new Error(`INVARIANT_VIOLATION auto_execute at ${label}`);
  }
}

async function main() {
  assertInvariants('start');

  const results = {
    tag: 'P1R-RELEASE-ACCEPTANCE',
    started_at: new Date().toISOString(),
    invariants: continuousWorker.RUNTIME_INVARIANTS
  };

  results.release_soak = await releaseGovernance.runReleaseAcceptanceSoak(2880);
  results.acceptance = await releaseAcceptance.generateAcceptanceStatus();
  results.registry = enterpriseReleaseRegistry.getReleaseRegistry();
  results.governance = await changeGovernance.validateChangeGovernance();
  results.readiness = await releaseReadiness.generateReleaseReadinessStatus();
  results.release = await releaseGovernance.generateReleaseGovernanceStatus();

  assertInvariants('end');

  results.criteria = results.release.criteria;
  results.completed_at = new Date().toISOString();
  results.verdict = results.release.verdict;

  console.log(JSON.stringify({
    phase: 'P1R',
    pass: results.criteria.enterprise_release_ready,
    verdict: results.verdict
  }));
  console.log('P1R_RESULTS:' + JSON.stringify(results));

  try {
    await require('../src/db').pool.end();
  } catch { /* ignore */ }

  process.exit(results.criteria.enterprise_release_ready ? 0 : 1);
}

main().catch(e => {
  console.error('FATAL', e.message);
  process.exit(1);
});
