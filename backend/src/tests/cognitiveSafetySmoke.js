'use strict';

const assert = require('assert');

function purge() {
  delete require.cache[require.resolve('../services/cognitiveSafetyRuntimeService')];
}

async function main() {
  const env = { ...process.env };
  try {
    delete env.IMPETUS_COGNITIVE_SAFETY_TEST_SIGNALS;

    // --- Funções puras / risco ---
    purge();
    const svc0 = require('../services/cognitiveSafetyRuntimeService');
    const safeEval = svc0.evaluateCognitiveRisk({
      csi: 100,
      consensusScore: 70,
      driftDetected: false,
      overconfidence: false
    });
    assert.strictEqual(safeEval.risk_level, 'safe');
    assert.strictEqual(safeEval.risk_score, 0);

    const warnEval = svc0.evaluateCognitiveRisk({
      csi: 60,
      consensusScore: 40,
      driftDetected: false,
      overconfidence: false
    });
    assert.strictEqual(warnEval.risk_level, 'warning');
    assert.ok(warnEval.risk_score >= 40 && warnEval.risk_score < 70);

    const critEval = svc0.evaluateCognitiveRisk({
      csi: 60,
      consensusScore: 40,
      driftDetected: true,
      overconfidence: true
    });
    assert.strictEqual(critEval.risk_level, 'critical');

    const soft = svc0.applySafetyNarrative({ text: 'Resposta base.', riskLevel: 'safe' });
    assert.strictEqual(soft, 'Resposta base.');
    const warned = svc0.applySafetyNarrative({ text: 'Resposta base.', riskLevel: 'warning' });
    assert.ok(warned.includes('limitações cognitivas temporárias'));
    assert.ok(warned.startsWith('Resposta base.'));

    assert.strictEqual(svc0.requiresHumanValidation({ riskLevel: 'critical' }), true);
    assert.strictEqual(svc0.requiresHumanValidation({ riskLevel: 'warning' }), false);

    // TEST 1 — safe: não altera texto (safety ligado, sinais padrão sem tenant)
    purge();
    process.env.IMPETUS_COGNITIVE_SAFETY_ENABLED = 'true';
    delete process.env.IMPETUS_COGNITIVE_SAFETY_TEST_SIGNALS;
    const svc1 = require('../services/cognitiveSafetyRuntimeService');
    const r1 = await svc1.applySafetyToChatText('texto íntegro', {});
    assert.strictEqual(r1.safety_blocked, false);
    assert.strictEqual(r1.text, 'texto íntegro');

    // TEST 2 — warning: narrativa cautelosa
    purge();
    process.env.IMPETUS_COGNITIVE_SAFETY_ENABLED = 'true';
    process.env.IMPETUS_COGNITIVE_SAFETY_TEST_SIGNALS = JSON.stringify({
      csi: 60,
      consensusScore: 40,
      driftDetected: false,
      overconfidence: false
    });
    const svc2 = require('../services/cognitiveSafetyRuntimeService');
    const r2 = await svc2.applySafetyToChatText('Análise operacional.', { company_id: 'x' });
    assert.strictEqual(r2.safety_blocked, false);
    assert.ok(r2.text.includes('limitações cognitivas temporárias'));
    assert.ok(r2.text.startsWith('Análise operacional.'));

    // TEST 3 — critical: bloqueio controlado (sem exceção)
    purge();
    process.env.IMPETUS_COGNITIVE_SAFETY_ENABLED = 'true';
    process.env.IMPETUS_COGNITIVE_SAFETY_TEST_SIGNALS = JSON.stringify({
      csi: 60,
      consensusScore: 40,
      driftDetected: true,
      overconfidence: true
    });
    const svc3 = require('../services/cognitiveSafetyRuntimeService');
    const r3 = await svc3.applySafetyToChatText('Não deve aparecer assertivo.', {});
    assert.strictEqual(r3.safety_blocked, true);
    assert.strictEqual(r3.reason, 'cognitive_instability_detected');
    assert.ok(r3.text.length > 0);
    assert.ok(!r3.text.includes('Não deve aparecer assertivo'));

    purge();
    process.env.IMPETUS_COGNITIVE_SAFETY_ENABLED = 'true';
    process.env.IMPETUS_COGNITIVE_SAFETY_TEST_SIGNALS = JSON.stringify({
      csi: 60,
      consensusScore: 40,
      driftDetected: true,
      overconfidence: true
    });
    const svc3b = require('../services/cognitiveSafetyRuntimeService');
    const facadeIn = {
      success: true,
      reasoning: 'Raciocínio original',
      pipeline_reply: 'Reply original',
      metadata: {}
    };
    const blocked = await svc3b.applySafetyToFacadePayload(facadeIn, { user: {} });
    assert.strictEqual(blocked.safety_blocked, true);
    assert.strictEqual(blocked.reason, 'cognitive_instability_detected');

    // TEST 4 — kill switch desligado: bypass total
    purge();
    process.env.IMPETUS_COGNITIVE_SAFETY_ENABLED = 'false';
    process.env.IMPETUS_COGNITIVE_SAFETY_TEST_SIGNALS = JSON.stringify({
      csi: 0,
      consensusScore: 0,
      driftDetected: true,
      overconfidence: true
    });
    const svc4 = require('../services/cognitiveSafetyRuntimeService');
    assert.strictEqual(svc4.isCognitiveSafetyEnabled(), false);
    const r4 = await svc4.applySafetyToChatText('deve permanecer', {});
    assert.strictEqual(r4.text, 'deve permanecer');
    assert.strictEqual(r4.safety_blocked, false);
    const passThrough = await svc4.applySafetyToFacadePayload({ ok: 1 }, { user: {} });
    assert.strictEqual(passThrough.ok, 1);

    // TEST 5 — persistência: INSERT disparado (db mock)
    const dbPath = require.resolve('../db');
    const oldDbCache = require.cache[dbPath];
    const calls = [];
    require.cache[dbPath] = {
      id: dbPath,
      filename: dbPath,
      loaded: true,
      exports: {
        query: async (sql, params) => {
          calls.push({ sql: String(sql).trim(), params });
          return { rows: [] };
        }
      }
    };
    try {
      delete require.cache[require.resolve('../services/cognitiveDbPersistenceService')];
      purge();
      process.env.IMPETUS_COGNITIVE_DB_ENABLED = 'true';
      process.env.IMPETUS_COGNITIVE_SAFETY_ENABLED = 'true';
      delete process.env.IMPETUS_COGNITIVE_SAFETY_TEST_SIGNALS;
      const cdp = require('../services/cognitiveDbPersistenceService');
      await cdp.persistSafetyEventToDb({
        companyId: null,
        risk_level: 'warning',
        risk_score: 55,
        payload: { smoke: true }
      });
      assert.ok(calls.length >= 1);
      assert.ok(calls[0].sql.includes('cognitive_safety_events'));
    } finally {
      if (oldDbCache) require.cache[dbPath] = oldDbCache;
      else delete require.cache[dbPath];
      delete require.cache[require.resolve('../services/cognitiveDbPersistenceService')];
    }

    console.log('[COGNITIVE_SAFETY_SMOKE]', 'ok');
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
