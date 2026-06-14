'use strict';

/**
 * AIOI-P1M — Enterprise Runtime Authorization Governance Certification
 * READ ONLY · APPROVAL BASED · sem activar runtime
 */

process.env.IMPETUS_AIOI_ENABLED = process.env.IMPETUS_AIOI_ENABLED || 'true';
process.env.IMPETUS_AIOI_DISTRIBUTED_RUNTIME_ACTIVE = 'false';
process.env.IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED = 'true';

const authGovernance = require('../src/services/aioi/runtime/aioiAuthorizationGovernanceService');
const registry = require('../src/services/aioi/runtime/aioiRuntimeAuthorizationRegistryService');
const auditSvc = require('../src/services/aioi/runtime/aioiAuthorizationAuditService');
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

  registry.resetRegistryForCert();
  auditSvc.resetAuditForCert();

  const results = {
    tag: 'P1M-RUNTIME-AUTHORIZATION',
    started_at: new Date().toISOString(),
    invariants: continuousWorker.RUNTIME_INVARIANTS
  };

  results.multi_approval = await authGovernance.certifyMultiApproval();
  results.expiration = await authGovernance.certifyAuthorizationExpiration();
  results.governance_soak = await authGovernance.runGovernanceSoak(168);
  results.certification = await authGovernance.generateAuthorizationCertification();

  assertInvariants('end');

  results.criteria = results.certification.criteria;
  results.completed_at = new Date().toISOString();
  results.verdict = results.certification.verdict;

  console.log(JSON.stringify({ phase: 'P1M', pass: results.criteria.enterprise_runtime_authorization_ready }));
  console.log('P1M_RESULTS:' + JSON.stringify(results));

  try {
    await require('../src/db').pool.end();
  } catch { /* ignore */ }

  process.exit(results.criteria.enterprise_runtime_authorization_ready ? 0 : 1);
}

main().catch(e => {
  console.error('FATAL', e.message);
  process.exit(1);
});
