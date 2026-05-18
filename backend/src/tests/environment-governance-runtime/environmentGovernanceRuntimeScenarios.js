'use strict';

process.env.IMPETUS_ENVIRONMENT_GOVERNANCE_RUNTIME_ENABLED = 'true';
process.env.IMPETUS_ENVIRONMENT_ESG_RUNTIME_ENABLED = 'true';
process.env.IMPETUS_ENVIRONMENT_COMPLIANCE_RUNTIME_ENABLED = 'true';
process.env.IMPETUS_ENVIRONMENT_CARBON_RUNTIME_ENABLED = 'true';

const flags = require('../../domains/environment/governance/environmentGovernanceRuntimeFlags');
const orchestrator = require('../../domains/environment/governance/environmentGovernanceOrchestrator');
const esg = require('../../domains/environment/governance/esg/environmentEsgGovernanceRuntime');
const validation = require('../../domains/environment/governance/validation/environmentGovernanceValidationRuntime');

let passed = 0;
let failed = 0;

function ok(label, cond) {
  if (cond) {
    console.log(`  OK ${label}`);
    passed++;
  } else {
    console.error(`  FAIL ${label}`);
    failed++;
  }
}

console.log('\nenvironment-governance-runtime (backend)\n');

ok('governance enabled', flags.isEnvironmentGovernanceRuntimeEnabled());
const esgR = esg.environmentEsgGovernanceRuntime({ environmental_score: 70 });
ok('esg score', esgR.esg_score > 0);
ok('assistive only', esgR.assistive_only === true);

const pack = orchestrator.runEnvironmentGovernancePack({
  scope1_tco2e: 10,
  scope2_tco2e: 20,
  energy_kwh: 1000
});
ok('pack ok', pack.ok === true);
ok('no auto promotion', pack.auto_promotion === false);
ok('correlation quality', !!pack.correlation?.quality);

const val = validation.runEnvironmentGovernanceRuntimeValidation({ tenant_id: 't1' });
ok('validation stable', val.stable !== false);
ok('no auto enforcement', val.behavior_validation?.no_auto_enforcement === true);

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
