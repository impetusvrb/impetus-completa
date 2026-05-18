'use strict';

const orchestrator = require('../../enterprise-ecosystem-consolidation/enterpriseEcosystemConsolidationOrchestrator');
const runtimeVal = require('../../enterprise-ecosystem-consolidation/enterpriseEcosystemRuntimeValidator');
const cognitive = require('../../enterprise-ecosystem-consolidation/enterpriseCognitiveMaturityIndex');
const governance = require('../../enterprise-ecosystem-consolidation/enterpriseGovernanceValidator');
const environment = require('../../enterprise-ecosystem-consolidation/environmentDevelopmentReadinessEngine');
const soak = require('../../enterprise-ecosystem-consolidation/enterpriseStabilitySoakEngine');

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

console.log('\nenterprise-ecosystem-consolidation (backend)\n');

const rt = runtimeVal.validateEcosystemRuntime({ tenant_id: 'consolidation-tenant' });
ok('runtime three domains', rt.domains?.length === 3);
ok('runtime stable', rt.stable === true);
ok('publication bounded', rt.publication?.bounded_publication !== false);

const cog = cognitive.computeEnterpriseCognitiveMaturityIndex({});
ok('ecmi in range', cog.enterprise_cognitive_maturity_index >= 0 && cog.enterprise_cognitive_maturity_index <= 100);
ok('ecmi acceptable default', cog.acceptable_for_environment === true);

const gov = governance.validateEnterpriseGovernance({ tenant_id: 't1' });
ok('governance ok', gov.ok === true);
ok('no auto promotion', gov.rollout_governance?.auto_promotion === false);

const pack = orchestrator.runEcosystemFinalConsolidation({
  tenant_id: 'consolidation-tenant',
  run_soak: false
});
ok('pack framework', pack.framework === 'enterprise_ecosystem_final_consolidation');
ok('environment decision present', !!pack.environment_decision?.decision);
ok(
  'decision is gate enum',
  ['BLOCK_ENVIRONMENT', 'ENVIRONMENT_READY'].includes(pack.environment_decision.decision)
);
ok('no full rollout flag', pack.environment_decision?.prerequisites_met?.no_full_rollout === true);

const blocked = environment.decideEnvironmentReadiness({
  ecosystem_runtime: { stable: false },
  stability_soak: { stable: true },
  cognitive_maturity_index: { acceptable_for_environment: true, enterprise_cognitive_maturity_index: 80 },
  governance_validation: { ok: true }
});
ok('blocks unstable runtime', blocked.decision === 'BLOCK_ENVIRONMENT');

const drySoak = soak.runEnterpriseStabilitySoak({ dry_run: true });
ok('soak dry run', drySoak.ok === true && drySoak.passed >= 5);

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
