'use strict';

/**
 * AIOI-P1O — Enterprise Baseline Preservation & Release Certification
 * READ ONLY · GOVERNANCE ONLY · sem activar runtime
 */

process.env.IMPETUS_AIOI_ENABLED = process.env.IMPETUS_AIOI_ENABLED || 'true';
process.env.IMPETUS_AIOI_DISTRIBUTED_RUNTIME_ACTIVE = 'false';
process.env.IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED = 'true';

const baselineGovernance = require('../src/services/aioi/runtime/aioiBaselineGovernanceService');
const baselineRegistry = require('../src/services/aioi/runtime/aioiBaselineRegistryService');
const releaseManifest = require('../src/services/aioi/runtime/aioiReleaseManifestService');
const reproducibility = require('../src/services/aioi/runtime/aioiBaselineReproducibilityService');
const baselineFreeze = require('../src/services/aioi/runtime/aioiBaselineFreezeService');
const historicalAudit = require('../src/services/aioi/runtime/aioiHistoricalAuditChainService');
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
    tag: 'P1O-BASELINE-PRESERVATION',
    started_at: new Date().toISOString(),
    invariants: continuousWorker.RUNTIME_INVARIANTS
  };

  results.baseline_registry = baselineRegistry.getBaselineRegistry();
  results.release_manifest = releaseManifest.validateManifest();
  results.reproducibility = reproducibility.generateReproducibilityStatus();
  results.freeze = baselineFreeze.generateFreezeStatus();
  results.historical_audit = historicalAudit.generateAuditChainStatus();
  results.baseline = await baselineGovernance.generateBaselineStatus();

  assertInvariants('end');

  results.criteria = results.baseline.criteria;
  results.completed_at = new Date().toISOString();
  results.verdict = results.baseline.verdict;

  console.log(JSON.stringify({
    phase: 'P1O',
    pass: results.criteria.enterprise_baseline_ready,
    verdict: results.verdict
  }));
  console.log('P1O_RESULTS:' + JSON.stringify(results));

  try {
    await require('../src/db').pool.end();
  } catch { /* ignore */ }

  process.exit(results.criteria.enterprise_baseline_ready ? 0 : 1);
}

main().catch(e => {
  console.error('FATAL', e.message);
  process.exit(1);
});
