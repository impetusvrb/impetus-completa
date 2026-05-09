'use strict';

const assert = require('assert');

function purge() {
  delete require.cache[require.resolve('../services/aiAnalyticsService')];
  delete require.cache[require.resolve('../services/cognitiveDbPersistenceService')];
  delete require.cache[require.resolve('../services/supervisedLearningService')];
  delete require.cache[require.resolve('../services/adaptiveTuningService')];
  delete require.cache[require.resolve('../services/autonomousOptimizationService')];
  delete require.cache[require.resolve('../services/cognitiveReplayService')];
  delete require.cache[require.resolve('../services/cognitiveDriftService')];
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
    assert.strictEqual(typeof dash.consensus.engine_enabled, 'boolean');
    assert.strictEqual(typeof dash.calibration.engine_enabled, 'boolean');
    assert.strictEqual(typeof dash.health.level, 'string');

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
