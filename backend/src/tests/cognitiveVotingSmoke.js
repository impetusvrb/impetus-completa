'use strict';

const assert = require('assert');

function purge() {
  delete require.cache[require.resolve('../services/cognitiveVotingService')];
  delete require.cache[require.resolve('../services/aiAnalyticsService')];
}

async function main() {
  const env = { ...process.env };
  try {
    purge();
    process.env.IMPETUS_WEIGHTED_VOTING_ENABLED = 'true';
    delete process.env.IMPETUS_WEIGHTED_VOTING_WEIGHTS;
    const v = require('../services/cognitiveVotingService');

    // TEST 1 — consenso ponderado
    const weights = { gpt: 1, claude: 1.2, gemini: 0.9 };
    const w1 = v.calculateWeightedConsensus({
      participants: [
        { engine: 'gpt', confidence: 80 },
        { engine: 'claude', confidence: 60 }
      ],
      weights
    });
    assert.strictEqual(w1, 69);

    // TEST 2 — dominância (peso >= 2 na configuração)
    const d1 = v.detectDominance({
      participants: [],
      weights: { gpt: 1, claude: 2.1, gemini: 0.9 }
    });
    assert.strictEqual(d1.dominance_detected, true);
    assert.strictEqual(d1.dominant_engine, 'claude');
    const d0 = v.detectDominance({
      participants: [],
      weights: { gpt: 1, claude: 1.2, gemini: 0.9 }
    });
    assert.strictEqual(d0.dominance_detected, false);
    assert.strictEqual(d0.dominant_engine, null);

    // Relatório async
    const rep = await v.generateWeightedVotingReport({
      participants: [
        { engine: 'gpt', confidence: 0.9 },
        { engine: 'gemini', confidence: 50 }
      ]
    });
    assert.ok(rep.weighted_consensus != null);
    assert.ok(typeof rep.dominance.dominance_detected === 'boolean');

    // TEST 3 — kill switch
    purge();
    process.env.IMPETUS_WEIGHTED_VOTING_ENABLED = 'false';
    const vOff = require('../services/cognitiveVotingService');
    assert.strictEqual(vOff.isWeightedVotingEnabled(), false);
    const repOff = await vOff.generateWeightedVotingReport({
      participants: [{ engine: 'gpt', confidence: 99 }]
    });
    assert.strictEqual(repOff.weighted_consensus, null);
    assert.strictEqual(repOff.observation, 'weighted_voting_disabled');

    // TEST 4 — dashboard inclui voting
    purge();
    process.env.IMPETUS_COGNITIVE_DASHBOARD_ENABLED = 'true';
    process.env.IMPETUS_COGNITIVE_DB_ENABLED = 'false';
    process.env.IMPETUS_WEIGHTED_VOTING_ENABLED = 'true';
    const ai = require('../services/aiAnalyticsService');
    const dash = await ai.getCognitiveGovernanceDashboard('00000000-0000-4000-8000-000000000099');
    assert.ok(dash.voting);
    assert.strictEqual(typeof dash.voting.engine_enabled, 'boolean');
    assert.ok('weighted_consensus' in dash.voting);
    assert.ok('dominant_engine' in dash.voting);
    assert.strictEqual(typeof dash.runtime.weighted_voting, 'boolean');

    console.log('[COGNITIVE_VOTING_SMOKE]', 'ok');
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
