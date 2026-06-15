'use strict';

/**
 * AIOI-P1P — Enterprise Baseline Assurance & Preservation Monitoring
 * READ ONLY · OBSERVATIONAL · sem activar runtime
 */

process.env.IMPETUS_AIOI_ENABLED = process.env.IMPETUS_AIOI_ENABLED || 'true';
process.env.IMPETUS_AIOI_DISTRIBUTED_RUNTIME_ACTIVE = 'false';
process.env.IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED = 'true';

const assuranceGovernance = require('../src/services/aioi/runtime/aioiBaselineAssuranceGovernanceService');
const baselineAssurance = require('../src/services/aioi/runtime/aioiBaselineAssuranceService');
const baselinePreservation = require('../src/services/aioi/runtime/aioiBaselinePreservationService');
const baselineConsistency = require('../src/services/aioi/runtime/aioiBaselineConsistencyService');
const baselineTraceability = require('../src/services/aioi/runtime/aioiBaselineTraceabilityService');
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
    tag: 'P1P-BASELINE-ASSURANCE',
    started_at: new Date().toISOString(),
    invariants: continuousWorker.RUNTIME_INVARIANTS
  };

  results.preservation_soak = await assuranceGovernance.runPreservationSoak(1440);
  results.assurance = await baselineAssurance.generateAssuranceStatus();
  results.preservation = baselinePreservation.generatePreservationStatus();
  results.consistency = baselineConsistency.generateConsistencyStatus();
  results.traceability = baselineTraceability.generateTraceabilityStatus();
  results.governance = await assuranceGovernance.generateAssuranceGovernanceStatus();

  assertInvariants('end');

  results.criteria = results.governance.criteria;
  results.completed_at = new Date().toISOString();
  results.verdict = results.governance.verdict;

  console.log(JSON.stringify({
    phase: 'P1P',
    pass: results.criteria.enterprise_baseline_assurance_ready,
    verdict: results.verdict
  }));
  console.log('P1P_RESULTS:' + JSON.stringify(results));

  try {
    await require('../src/db').pool.end();
  } catch { /* ignore */ }

  process.exit(results.criteria.enterprise_baseline_assurance_ready ? 0 : 1);
}

main().catch(e => {
  console.error('FATAL', e.message);
  process.exit(1);
});
