'use strict';

const assert = require('assert');

function purge() {
  delete require.cache[require.resolve('../services/aiAnalyticsService')];
  delete require.cache[require.resolve('../services/cognitiveDbPersistenceService')];
  delete require.cache[require.resolve('../services/cognitiveStabilityService')];
  delete require.cache[require.resolve('../services/supervisedLearningService')];
  delete require.cache[require.resolve('../services/adaptiveTuningService')];
  delete require.cache[require.resolve('../services/autonomousOptimizationService')];
  delete require.cache[require.resolve('../services/cognitiveReplayService')];
  delete require.cache[require.resolve('../services/cognitiveDriftService')];
  delete require.cache[require.resolve('../services/cognitiveSafetyRuntimeService')];
  delete require.cache[require.resolve('../services/cognitiveVotingService')];
  delete require.cache[require.resolve('../services/unifiedOrchestrator')];
  delete require.cache[require.resolve('../services/aiSecurityGateway')];
  delete require.cache[require.resolve('../services/contextIntegrityService')];
  delete require.cache[require.resolve('../services/cognitiveEventBackboneService')];
  delete require.cache[require.resolve('../services/aiSecurityGateway')];
}

async function main() {
  const env = { ...process.env };
  try {
    purge();
    process.env.IMPETUS_COGNITIVE_DASHBOARD_ENABLED = 'true';
    process.env.IMPETUS_COGNITIVE_DB_ENABLED = 'false';
    const ai = require('../services/aiAnalyticsService');
    assert.strictEqual(ai.isGovernanceDashboardEnabled(), true);

    const dash = await ai.getCognitiveGovernanceDashboard('00000000-0000-4000-8000-000000000099');
    assert.ok(dash.health);
    assert.ok(dash.memory);
    assert.ok(dash.drift);
    assert.ok(dash.autonomy);
    assert.ok(dash.strategies);
    assert.ok(dash.replay);
    assert.ok(dash.runtime);
    assert.ok(dash.consensus);
    assert.ok(dash.calibration);
    assert.ok(dash.safety);
    assert.strictEqual(typeof dash.safety.safety_blocks, 'number');
    assert.ok(dash.voting);
    assert.strictEqual(typeof dash.voting.engine_enabled, 'boolean');
    assert.ok(dash.csi);
    assert.strictEqual(typeof dash.consensus.engine_enabled, 'boolean');
    assert.strictEqual(typeof dash.calibration.engine_enabled, 'boolean');
    assert.strictEqual(typeof dash.csi.unavailable, 'boolean');
    assert.strictEqual(typeof dash.health.level, 'string');
    assert.ok(dash.unified_orchestration);
    assert.strictEqual(typeof dash.unified_orchestration.enabled, 'boolean');
    assert.strictEqual(typeof dash.unified_orchestration.legacy_paths_detected, 'number');
    assert.strictEqual(typeof dash.unified_orchestration.runtime_channels, 'number');
    assert.strictEqual(typeof dash.unified_orchestration.gateway_enforced, 'boolean');

    assert.ok(dash.context_integrity);
    assert.strictEqual(typeof dash.context_integrity.enabled, 'boolean');
    assert.strictEqual(typeof dash.context_integrity.verified_contexts, 'number');
    assert.strictEqual(typeof dash.context_integrity.status, 'string');

    assert.ok(dash.event_backbone);
    assert.strictEqual(typeof dash.event_backbone.enabled, 'boolean');
    assert.strictEqual(typeof dash.event_backbone.events_published, 'number');
    assert.strictEqual(typeof dash.event_backbone.stream_health, 'string');

    assert.ok(dash.operational_hardening);
    assert.ok(dash.operational_hardening.legacy_runtime);
    assert.strictEqual(typeof dash.operational_hardening.legacy_runtime.legacy_paths_detected, 'number');
    assert.strictEqual(typeof dash.operational_hardening.legacy_runtime.legacy_paths_last_24h, 'number');
    assert.strictEqual(typeof dash.operational_hardening.legacy_runtime.legacy_block_mode_ready, 'boolean');
    assert.ok(dash.operational_hardening.integrity_rollout_readiness);
    assert.strictEqual(typeof dash.operational_hardening.integrity_rollout_readiness.block_mode_ready, 'boolean');
    assert.ok(dash.operational_hardening.event_queue_health);
    assert.strictEqual(typeof dash.operational_hardening.event_queue_health.queue_depth, 'number');
    assert.ok(dash.operational_hardening.secure_context_bypass);
    assert.strictEqual(typeof dash.operational_hardening.secure_context_bypass.bypass_attempts, 'number');

    process.env.IMPETUS_COGNITIVE_DASHBOARD_ENABLED = 'false';
    purge();
    const ai2 = require('../services/aiAnalyticsService');
    assert.strictEqual(ai2.isGovernanceDashboardEnabled(), false);

    console.log('[GOVERNANCE_DASHBOARD_SMOKE]', 'ok');
  } finally {
    for (const k of Object.keys(env)) {
      if (env[k] === undefined) delete process.env[k];
      else process.env[k] = env[k];
    }
    purge();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
