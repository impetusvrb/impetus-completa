'use strict';

/**
 * AIOI-P1Q — Enterprise Baseline Recovery & Continuity Certification
 * READ ONLY · RECOVERY CERTIFICATION ONLY · sem activar runtime
 */

process.env.IMPETUS_AIOI_ENABLED = process.env.IMPETUS_AIOI_ENABLED || 'true';
process.env.IMPETUS_AIOI_DISTRIBUTED_RUNTIME_ACTIVE = 'false';
process.env.IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED = 'true';

const recoveryGovernance = require('../src/services/aioi/runtime/aioiBaselineRecoveryGovernanceService');
const baselineRecovery = require('../src/services/aioi/runtime/aioiBaselineRecoveryService');
const recoveryChain = require('../src/services/aioi/runtime/aioiRecoveryChainService');
const certificationRebuild = require('../src/services/aioi/runtime/aioiCertificationRebuildService');
const baselineContinuity = require('../src/services/aioi/runtime/aioiBaselineContinuityService');
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
    tag: 'P1Q-BASELINE-RECOVERY',
    started_at: new Date().toISOString(),
    invariants: continuousWorker.RUNTIME_INVARIANTS
  };

  results.recovery_soak = await recoveryGovernance.runRecoverySoak(2160);
  results.recovery = await baselineRecovery.generateRecoveryStatus();
  results.chain = recoveryChain.generateRecoveryChainStatus();
  results.rebuild = certificationRebuild.generateRebuildStatus();
  results.continuity = await baselineContinuity.generateContinuityStatus();
  results.governance = await recoveryGovernance.generateRecoveryGovernanceStatus();

  assertInvariants('end');

  results.criteria = results.governance.criteria;
  results.completed_at = new Date().toISOString();
  results.verdict = results.governance.verdict;

  console.log(JSON.stringify({
    phase: 'P1Q',
    pass: results.criteria.enterprise_recovery_ready,
    verdict: results.verdict
  }));
  console.log('P1Q_RESULTS:' + JSON.stringify(results));

  try {
    await require('../src/db').pool.end();
  } catch { /* ignore */ }

  process.exit(results.criteria.enterprise_recovery_ready ? 0 : 1);
}

main().catch(e => {
  console.error('FATAL', e.message);
  process.exit(1);
});
