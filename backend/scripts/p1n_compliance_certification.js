'use strict';

/**
 * AIOI-P1N — Enterprise Compliance & Operational Integrity Certification
 * READ ONLY · OBSERVATIONAL · sem activar runtime
 */

process.env.IMPETUS_AIOI_ENABLED = process.env.IMPETUS_AIOI_ENABLED || 'true';
process.env.IMPETUS_AIOI_DISTRIBUTED_RUNTIME_ACTIVE = 'false';
process.env.IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED = 'true';

const complianceGovernance = require('../src/services/aioi/runtime/aioiComplianceGovernanceService');
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
    tag: 'P1N-COMPLIANCE-INTEGRITY',
    started_at: new Date().toISOString(),
    invariants: continuousWorker.RUNTIME_INVARIANTS
  };

  results.compliance_soak = await complianceGovernance.runComplianceIntegritySoak(720);
  results.compliance = await complianceGovernance.generateComplianceStatus();

  assertInvariants('end');

  results.criteria = results.compliance.criteria;
  results.completed_at = new Date().toISOString();
  results.verdict = results.compliance.verdict;

  console.log(JSON.stringify({
    phase: 'P1N',
    pass: results.criteria.enterprise_compliance_ready,
    verdict: results.verdict
  }));
  console.log('P1N_RESULTS:' + JSON.stringify(results));

  try {
    await require('../src/db').pool.end();
  } catch { /* ignore */ }

  process.exit(results.criteria.enterprise_compliance_ready ? 0 : 1);
}

main().catch(e => {
  console.error('FATAL', e.message);
  process.exit(1);
});
