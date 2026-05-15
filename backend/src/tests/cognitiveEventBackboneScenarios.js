'use strict';

const assert = require('assert');

function purge() {
  delete require.cache[require.resolve('../services/cognitiveEventBackboneService')];
}

async function main() {
  const env = { ...process.env };
  try {
    purge();
    process.env.IMPETUS_EVENT_BACKBONE_ENABLED = 'true';
    process.env.IMPETUS_EVENT_BACKBONE_PERSIST = 'false';
    const eb = require('../services/cognitiveEventBackboneService');
    eb._resetForTests();

    const ev = await eb.publishCognitiveEvent({
      event_type: eb.EVENT_TYPES.LLM_EXECUTION,
      trace_id: 'trace-bb-1',
      company_id: '11111111-1111-4111-8111-111111111111',
      channel: 'dashboard_chat',
      runtime: 'unified',
      context_hash: 'abc',
      payload: { x: 1 },
      metadata: {}
    });
    assert.ok(ev && ev.event_id);

    const rep = await eb.replayEventsByTrace('trace-bb-1', {
      companyId: '11111111-1111-4111-8111-111111111111',
      limit: 50
    });
    assert.ok(Array.isArray(rep.timeline));
    assert.ok(rep.events.length >= 1);

    const corr = await eb.correlateCognitiveEvents('trace-bb-1', {
      companyId: '11111111-1111-4111-8111-111111111111'
    });
    assert.ok(Array.isArray(corr.correlated_events));

    await eb.publishCognitiveEvent({
      event_type: 'safety_block',
      trace_id: 'trace-bb-1',
      company_id: '11111111-1111-4111-8111-111111111111',
      channel: 'test',
      runtime: 'gateway',
      payload: { t: 1 },
      metadata: {}
    });
    const corr2 = await eb.correlateCognitiveEvents('trace-bb-1', {
      companyId: '11111111-1111-4111-8111-111111111111'
    });
    assert.ok(corr2.correlated_events.length >= 1);

    const clean = await eb.cleanupOldEvents();
    assert.strictEqual(clean.skipped, true);

    const snap = eb.getDashboardSnapshot();
    assert.strictEqual(snap.enabled, true);
    assert.ok(snap.events_published >= 2);

    process.env.IMPETUS_EVENT_BACKBONE_ENABLED = 'false';
    purge();
    const eb2 = require('../services/cognitiveEventBackboneService');
    const ev2 = await eb2.publishCognitiveEvent({ event_type: 'llm_execution', trace_id: 'x' });
    assert.strictEqual(ev2, null);

    console.log('cognitiveEventBackboneScenarios: OK');
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
