'use strict';

/**
 * AIOI-P1S — Enterprise Baseline Closure & Historical Archive Certification
 * READ ONLY · HISTORICAL ARCHIVE ONLY · sem activar runtime
 */

process.env.IMPETUS_AIOI_ENABLED = process.env.IMPETUS_AIOI_ENABLED || 'true';
process.env.IMPETUS_AIOI_DISTRIBUTED_RUNTIME_ACTIVE = 'false';
process.env.IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED = 'true';

const closureGovernance = require('../src/services/aioi/runtime/aioiLineP1ClosureGovernanceService');
const baselineClosure = require('../src/services/aioi/runtime/aioiBaselineClosureService');
const historicalArchive = require('../src/services/aioi/runtime/aioiHistoricalArchiveRegistryService');
const enterpriseMilestone = require('../src/services/aioi/runtime/aioiEnterpriseMilestoneService');
const closureReport = require('../src/services/aioi/runtime/aioiClosureReportService');
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
    tag: 'P1S-LINE-CLOSURE',
    started_at: new Date().toISOString(),
    invariants: continuousWorker.RUNTIME_INVARIANTS
  };

  results.archive_soak = await closureGovernance.runHistoricalPreservationSoak(4320);
  results.closure = await baselineClosure.generateClosureStatus();
  results.archive = historicalArchive.getHistoricalArchiveRegistry();
  results.milestone = await enterpriseMilestone.generateMilestoneStatus();
  results.report = await closureReport.generateClosureReport();
  results.governance = await closureGovernance.generateLineP1ClosureStatus();

  assertInvariants('end');

  results.criteria = results.governance.criteria;
  results.completed_at = new Date().toISOString();
  results.verdict = results.governance.verdict;

  console.log(JSON.stringify({
    phase: 'P1S',
    pass: results.criteria.line_p1_closed,
    verdict: results.verdict
  }));
  console.log('P1S_RESULTS:' + JSON.stringify(results));

  try {
    await require('../src/db').pool.end();
  } catch { /* ignore */ }

  process.exit(results.criteria.line_p1_closed ? 0 : 1);
}

main().catch(e => {
  console.error('FATAL', e.message);
  process.exit(1);
});
