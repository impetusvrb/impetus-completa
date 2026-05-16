'use strict';

process.env.IMPETUS_QUALITY_ROLLOUT_RUNTIME_ENABLED = 'true';
process.env.IMPETUS_QUALITY_TENANT_ROLLOUT_ENABLED = 'true';
process.env.IMPETUS_QUALITY_PLANT_ROLLOUT_ENABLED = 'true';
process.env.IMPETUS_QUALITY_WORKFLOW_ROLLOUT_ENABLED = 'true';
process.env.IMPETUS_QUALITY_MATURITY_SCORING_ENABLED = 'true';
process.env.IMPETUS_QUALITY_ADOPTION_ANALYTICS_ENABLED = 'true';
process.env.IMPETUS_QUALITY_SATURATION_PROTECTION_ENABLED = 'true';
process.env.IMPETUS_QUALITY_READINESS_ENGINE_ENABLED = 'true';
process.env.IMPETUS_QUALITY_ROLLOUT_PUBLISH_EVENTS_ENABLED = 'false';

let p = 0;
let f = 0;
function ok(label, cond) {
  if (cond) {
    p++;
    console.log('  OK', label);
  } else {
    f++;
    console.log('  FAIL', label);
  }
}

(async () => {
  console.log('\nQUALITY ROLLOUT RUNTIME (backend)\n');

  const route = require('../../routes/qualityRollout');
  ok('route load', typeof route === 'function' || (route && typeof route.use === 'function'));

  const { evaluateTenantRollout } = require('../../domains/quality/rollout/tenant/qualityTenantRolloutEngine');
  const t = evaluateTenantRollout({ current_stage: 'shadow', target_stage: 'staged', mode: 'staged', blockers: [] });
  ok('tenant rollout', t.transition_allowed === true);

  const { protectUserSaturation } = require('../../domains/quality/rollout/saturation/qualityUserSaturationProtection');
  const sat = protectUserSaturation({ insights_per_hour: 50 });
  ok('saturation', sat.saturated === true);

  const { validateCatalogType } = require('../../eventPipeline/catalog/industrialEventCatalog');
  for (const e of [
    'quality.rollout.tenant_stage_changed',
    'quality.rollout.plant_stage_changed',
    'quality.rollout.workflow_enabled',
    'quality.rollout.readiness_blocked',
    'quality.rollout.maturity_changed',
    'quality.rollout.saturation_detected',
    'quality.rollout.recommendation_suppressed',
    'quality.rollout.cognitive_ready',
    'quality.rollout.activation_approved'
  ]) {
    ok(`catalog ${e}`, validateCatalogType(e, { strict: true }).ok === true);
  }

  const contract = require('../../domains/quality/contracts/qualityDomainContract');
  ok('contract v7 rollout', contract.CONTRACT_VERSION === 7 && contract.ROLLOUT_API_PREFIX === '/api/quality-rollout');

  const { runRolloutAssessmentPack } = require('../../domains/quality/rollout/orchestration/qualityRolloutOrchestrator');
  const cid = '00000000-0000-4000-8000-000000000099';
  const pack = await runRolloutAssessmentPack(cid, 'u1', {
    maturity_metrics: { workflow_completion_rate: 0.6, telemetry_coverage: 0.5, spc_usage_rate: 0.5 },
    adoption: { active_operators: 10, shift_coverage: 0.7, workflow_completion_rate: 0.55 },
    tenant: { current_stage: 'shadow', target_stage: 'staged', mode: 'staged' },
    plants: { P1: { current: 'operational_only', target: 'telemetry' } },
    workflows: {
      telemetry: { enabled: true, previous_enabled: false },
      cognitive: { enabled: false }
    },
    saturation: { insights_per_hour: 5 }
  }, { emit_events: false });

  ok('orchestrator pack', pack.ok && !pack.skipped && pack.governance && pack.confidence);

  console.log(`\n${p} passed ${f} failed\n`);
  process.exit(f > 0 ? 1 : 0);
})();
