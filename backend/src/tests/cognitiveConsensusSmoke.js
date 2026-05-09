'use strict';

const assert = require('assert');

function purge() {
  for (const m of [
    '../services/cognitiveConsensusService',
    '../services/cognitiveDbPersistenceService',
    '../services/aiAnalyticsService'
  ]) {
    try {
      delete require.cache[require.resolve(m)];
    } catch (_e) {}
  }
}

async function main() {
  const env = { ...process.env };
  try {
    purge();
    process.env.IMPETUS_COGNITIVE_CONSENSUS_ENABLED = 'true';
    const consensus = require('../services/cognitiveConsensusService');

    assert.strictEqual(consensus.isConsensusEngineEnabled(), true);

    const divSpread = consensus.detectConfidenceDivergence([72, 41]);
    assert.strictEqual(divSpread.spread, 31);
    assert.strictEqual(divSpread.divergence, true);

    const noDiv = consensus.detectConfidenceDivergence([72, 42]);
    assert.strictEqual(noDiv.spread, 30);
    assert.strictEqual(noDiv.divergence, false);

    const empty = consensus.detectConfidenceDivergence([]);
    assert.strictEqual(empty.spread, 0);
    assert.strictEqual(empty.divergence, false);

    const narr = consensus.detectNarrativeDivergence([
      'Estado critico na linha',
      'Operação estavel segundo o turno'
    ]);
    assert.ok(narr.patterns.includes('critico'));
    assert.ok(narr.patterns.includes('estavel'));
    assert.strictEqual(narr.divergence, true);

    const reportHigh = await consensus.generateConsensusReport({
      participants: [
        { engine: 'a', confidence: 82, output: 'Indicadores dentro do esperado.' },
        { engine: 'b', confidence: 85, output: 'Sem alterações relevantes.' }
      ]
    });
    assert.ok(reportHigh.consensus_score > 80, `score alto: ${reportHigh.consensus_score}`);
    assert.strictEqual(reportHigh.divergence_detected, false);

    const reportLow = await consensus.generateConsensusReport({
      participants: [
        { engine: 'a', confidence: 95, output: 'Situação critico — alto risco.' },
        { engine: 'b', confidence: 10, output: 'Baixo risco e estavel.' }
      ]
    });
    assert.ok(reportLow.consensus_score < 50, `score baixo: ${reportLow.consensus_score}`);
    assert.strictEqual(reportLow.divergence_detected, true);

    process.env.IMPETUS_COGNITIVE_DB_ENABLED = 'false';
    delete require.cache[require.resolve('../services/cognitiveDbPersistenceService')];
    const dbSvc = require('../services/cognitiveDbPersistenceService');
    await dbSvc.persistConsensusEventToDb({
      companyId: '00000000-0000-4000-8000-000000000099',
      consensus_score: 77,
      divergence_detected: true,
      payload: { smoke: true }
    });

    process.env.IMPETUS_COGNITIVE_CONSENSUS_ENABLED = 'false';
    purge();
    const consensusOff = require('../services/cognitiveConsensusService');
    assert.strictEqual(consensusOff.isConsensusEngineEnabled(), false);
    delete require.cache[require.resolve('../services/cognitiveDbPersistenceService')];
    const dbSvc2 = require('../services/cognitiveDbPersistenceService');
    process.env.IMPETUS_COGNITIVE_DB_ENABLED = 'true';
    await dbSvc2.persistConsensusEventToDb({
      companyId: '00000000-0000-4000-8000-000000000099',
      consensus_score: 50,
      divergence_detected: false,
      payload: { smoke: true, should_not_persist_consensus_off: true }
    });

    console.log('[COGNITIVE_CONSENSUS_SMOKE]', 'ok');
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
