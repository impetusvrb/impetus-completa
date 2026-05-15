'use strict';

/**
 * Cenários Unified Orchestration Layer (sem rede OpenAI quando possível).
 */

const assert = require('assert');

function purge() {
  delete require.cache[require.resolve('../services/unifiedOrchestrator')];
  delete require.cache[require.resolve('../services/ai')];
  delete require.cache[require.resolve('../services/runLlm')];
  delete require.cache[require.resolve('../services/aiSecurityGateway')];
}

async function main() {
  const env = { ...process.env };
  try {
    purge();
    const uo = require('../services/unifiedOrchestrator');
    uo._resetObservabilityCounters();

    process.env.IMPETUS_UNIFIED_ORCHESTRATOR_ENABLED = 'false';
    purge();
    const uoOff = require('../services/unifiedOrchestrator');
    assert.strictEqual(uoOff.isUnifiedOrchestratorEnabled(), false);

    process.env.IMPETUS_UNIFIED_ORCHESTRATOR_ENABLED = 'true';
    purge();
    const uoOn = require('../services/unifiedOrchestrator');
    assert.strictEqual(uoOn.isUnifiedOrchestratorEnabled(), true);

    const p1 = uoOn.resolveExecutionPath({ channel: 'dashboard_chat', metadata: {} });
    assert.strictEqual(p1.runtime, 'decisionFacade');
    const p2 = uoOn.resolveExecutionPath({ channel: 'cognitive_council', metadata: {} });
    assert.strictEqual(p2.runtime, 'council');
    const p3 = uoOn.resolveExecutionPath({ channel: 'internal_chat', metadata: {} });
    assert.strictEqual(p3.runtime, 'unified');

    const norm = uoOn.normalizeCognitiveResponse({
      content: 'Resposta de teste com confidence: 90',
      traceId: 't1',
      channel: 'dashboard_chat',
      runtime: 'decisionFacade',
      model: 'gpt-4o-mini',
      latencyMs: 12,
      safety: {},
      consensus: {}
    });
    assert.strictEqual(norm.trace_id, 't1');
    assert.strictEqual(norm.channel, 'dashboard_chat');
    assert.strictEqual(norm.runtime, 'decisionFacade');
    assert.ok(typeof norm.confidence === 'number');

    uoOn.detectLegacyExecution({ source: 'test' });
    assert.ok(uoOn.getLegacyPathCount() >= 1);

    await uoOn.runWithRequestChannel('cognitive_council', async () => {
      assert.strictEqual(uoOn.getRequestChannelOverride(), 'cognitive_council');
    });
    assert.strictEqual(uoOn.getRequestChannelOverride(), null);

    process.env.IMPETUS_AI_GATEWAY_ENABLED = 'false';
    process.env.IMPETUS_BLOCK_LEGACY_COGNITIVE_PATHS = 'false';
    process.env.OPENAI_API_KEY = '';
    purge();
    const ai = require('../services/ai');
    const uoExec = require('../services/unifiedOrchestrator');
    uoExec._resetObservabilityCounters();

    const rawLegacy = await ai.rawChatCompletionMessages(
      [{ role: 'user', content: 'x' }],
      {}
    );
    assert.ok(typeof rawLegacy === 'string');
    assert.ok(uoExec.getLegacyPathCount() >= 1);

    process.env.IMPETUS_BLOCK_LEGACY_COGNITIVE_PATHS = 'true';
    purge();
    const aiBlock = require('../services/ai');
    const uoB = require('../services/unifiedOrchestrator');
    const blocked = await aiBlock.rawChatCompletionMessages([{ role: 'user', content: 'x' }], {});
    assert.ok(String(blocked).includes('bloqueada'));

    process.env.IMPETUS_BLOCK_LEGACY_COGNITIVE_PATHS = 'false';
    process.env.IMPETUS_UNIFIED_ORCHESTRATOR_ENABLED = 'true';
    purge();
    const aiU = require('../services/ai');
    const out = await aiU.chatCompletionMessages([{ role: 'user', content: 'ping' }], {
      channel: 'dashboard_chat',
      user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', company_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
      billing: {
        userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        companyId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
      }
    });
    assert.ok(typeof out === 'string');

    console.log('unifiedOrchestratorScenarios: OK');
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
