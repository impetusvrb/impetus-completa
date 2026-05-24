'use strict';

const flags = require('../config/phaseSZ1FeatureFlags');
const { resolveStageForTenant, reportStage, isShadowOnly, isZPrimary } = require('../promotion/zPromotionRuntime');
const { bootstrapSovereign } = require('../bootstrap/zBootstrapRuntime');
const { buildHydrationPlan } = require('../hydration/zHydrationRuntime');
const { ensureContinuity } = require('../resilience/zResilienceRuntime');
const { compareLegacyVsSovereign } = require('../shadow/zShadowDiffRuntime');
const { evaluateGovernance } = require('../governance/zSovereigntyGovernanceRuntime');
const {
  emitSZ1,
  recordAssemblyLatency,
  setMetric,
  incrementRequests,
  snapshot
} = require('../observability/zSovereignObservability');

/**
 * applySovereignZRuntime — orquestrador soberano aditivo.
 *
 * Entrada:
 *   user             : req.user
 *   legacyPayload    : `legacyResponse` actual da rota /dashboard/me
 *   ctx              : { hierarchy_scope, profile, force_stage, ... }
 *
 * Saída:
 *   payload          : payload original com bloco `runtime_z_sovereign`
 *                      adicionado e (quando stage Z_PRIMARY+) sobreposto
 *                      pelo payload Z. Quando shadow, apenas observa.
 */
async function applySovereignZRuntime(user = {}, legacyPayload = {}, ctx = {}) {
  if (!flags.isSovereigntyEnabled()) {
    return {
      payload: legacyPayload,
      runtime_z_sovereign: null,
      skipped: true,
      reason: 'sovereignty_disabled'
    };
  }

  incrementRequests();
  const t0 = Date.now();
  const stageInfo = reportStage(resolveStageForTenant(user, ctx));

  let bootstrapOut = null;
  let shadowDiff = null;
  let hydration = null;
  let resilience = null;

  try {
    bootstrapOut = await bootstrapSovereign(user, { ...ctx, legacy_payload: legacyPayload });
  } catch (err) {
    emitSZ1('BOOTSTRAP_FAILED', { error: err?.message || String(err) });
    bootstrapOut = { payload: null, error: err?.message || String(err) };
  }

  if (bootstrapOut?.payload) {
    try {
      shadowDiff = compareLegacyVsSovereign(legacyPayload, bootstrapOut.payload);
    } catch (err) {
      shadowDiff = { error: err?.message || String(err) };
    }
  }

  if (bootstrapOut?.payload) {
    try {
      hydration = buildHydrationPlan(
        { ...legacyPayload, ...bootstrapOut.payload },
        ctx
      );
    } catch (err) {
      hydration = { error: err?.message || String(err) };
    }
  }

  const governance = evaluateGovernance(
    stageInfo,
    shadowDiff || {},
    bootstrapOut?.validation || {},
    bootstrapOut?.compatibility || {}
  );

  let finalPayload = legacyPayload;
  let primary_runtime = 'motor_a';
  let fallback_runtime = 'runtime_z';

  if (isZPrimary(stageInfo.stage) && bootstrapOut?.payload && bootstrapOut?.validation?.bootstrap_safe) {
    finalPayload = { ...legacyPayload, ...bootstrapOut.payload };
    primary_runtime = 'runtime_z';
    fallback_runtime = 'motor_a';
  }

  const resOut = ensureContinuity(user, finalPayload, ctx);
  if (resOut?.payload) finalPayload = resOut.payload;
  resilience = resOut;

  const assembly_ms = Date.now() - t0;
  recordAssemblyLatency(assembly_ms);

  const sovereignty_score = shadowDiff?.sovereignty_score ?? 0;
  setMetric('z_sovereignty_score', sovereignty_score);
  setMetric('z_runtime_continuity_score', resilience?.continuity_score ?? 0);
  setMetric('z_compatibility_score', shadowDiff?.compatibility_score ?? 0);
  setMetric('z_contextual_accuracy_score', bootstrapOut?.validation?.safety_score ?? 0);

  const runtime_z_sovereign = {
    phase: 'SZ1',
    stage: stageInfo.stage,
    stage_reason: stageInfo.reason,
    primary_runtime,
    fallback_runtime,
    shadow_first: isShadowOnly(stageInfo.stage),
    bootstrap: bootstrapOut
      ? {
          delegated_to: bootstrapOut.delegated_to,
          sub_runtimes: bootstrapOut.sub_runtimes,
          latency_ms: bootstrapOut.latency_ms,
          validation: bootstrapOut.validation,
          compatibility: bootstrapOut.compatibility
        }
      : null,
    shadow_diff: shadowDiff,
    hydration_plan_summary: hydration
      ? {
          total_widgets: hydration.plan?.length || 0,
          tiers_used: hydration.tiers_used,
          hydration_ms: hydration.hydration_ms
        }
      : null,
    resilience: resilience
      ? {
          continuity_score: resilience.continuity_score,
          blank_screen_prevented: resilience.blank_screen_prevented,
          checks: resilience.checks
        }
      : null,
    governance,
    metrics: snapshot(),
    assembly_ms,
    invariants: flags.invariants,
    auto_remediation: false,
    auto_promotion: false,
    motor_a_removed: false,
    engine_v2_removed: false
  };

  emitSZ1('SOVEREIGNTY_APPLIED', {
    tenant_id: user?.company_id,
    stage: stageInfo.stage,
    sovereignty_score,
    assembly_ms
  });

  return {
    payload: { ...finalPayload, runtime_z_sovereign },
    runtime_z_sovereign,
    report: {
      stage: stageInfo,
      bootstrap: bootstrapOut,
      shadow_diff: shadowDiff,
      hydration,
      resilience,
      governance
    }
  };
}

module.exports = { applySovereignZRuntime };
