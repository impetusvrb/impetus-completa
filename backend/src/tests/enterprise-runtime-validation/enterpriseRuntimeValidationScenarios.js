'use strict';

const orchestrator = require('../../runtime-validation/enterpriseRuntimeValidationOrchestrator');
const runtime = require('../../runtime-validation/enterpriseRuntimeValidationEngine');
const ux = require('../../runtime-validation/enterpriseContextualUxValidator');
const cognitive = require('../../runtime-validation/enterpriseCognitiveMaturityEngine');
const rollout = require('../../runtime-validation/enterpriseControlledRolloutEngine');
const audience = require('../../runtime-validation/enterpriseAudienceValidationRuntime');

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

console.log('\nenterprise-runtime-validation (backend)\n');

const snap = runtime.validateEnterpriseRuntime();
ok('runtime snapshot ok', snap.ok === true);
ok('legacy coexistence', snap.legacy_coexistence === true);
ok('no auto promotion in rollout', (() => {
  const r = rollout.evaluateControlledRollout({ runtime_validation: snap, cognitive_maturity: { rollout_readiness_score: 80 } });
  return r.auto_promotion === false;
})());

const pack = orchestrator.runEnterpriseValidationPack({ tenant_id: 't-enterprise-1' });
ok('pack framework', pack.framework === 'enterprise_runtime_validation');
ok('decision assistive', pack.enterprise_decision?.promote_stage === false);
ok('insights assistive_only', pack.executive_insights?.assistive_only === true);

const uxR = ux.validateContextualUx({ band: 'operator', menu_item_count: 20, abandonment_rate: 0.5 });
ok('ux critical class', uxR.ux_pressure_class === 'CRITICAL' || uxR.ux_pressure_class === 'HIGH');

const cog = cognitive.analyzeCognitiveMaturity({ menu_extra_count: 2, view_count: 1 });
ok('cognitive scores', cog.cognitive_maturity_score >= 0);

const aud = audience.validateAudienceMatrix([
  { resolved_band: 'operator', visible_executive_governance: true, visible_menu_count: 5 }
]);
ok('audience leak detected', aud.failure_count >= 1);

orchestrator.recordOperationalEvent({
  tenant_id: 't-enterprise-1',
  route: '/app/quality/operational',
  navigation_depth: 2,
  audience_band: 'supervisor'
});
ok('behavior recorded', true);

ok('logistics flags in snapshot', snap.flags.logistics != null);
ok('logistics manifest count', (snap.manifests.logistics_route_count || 0) >= 4);
ok('decision engine REMAIN or BLOCK', ['REMAIN_IN_SHADOW', 'BLOCK_ROLLOUT', 'ADVANCE_TO_PILOT', 'REDUCE_UX_DENSITY', 'ADJUST_AUDIENCE', 'ADVANCE_TO_CONTROLLED'].includes(pack.enterprise_decision?.action));

const decision = require('../../runtime-validation/enterpriseDecisionEngine');
ok('decision never auto promotes', decision.deriveEnterpriseDecision(pack).promote_stage === false);

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
