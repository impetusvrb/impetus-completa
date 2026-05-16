'use strict';

/**
 * WAVE 1 — Industrial Event Backbone (catálogo, envelope, outbox, DLQ, replay, throttle, flags).
 */

const { v4: uuidv4 } = require('uuid');

let passed = 0;
let failed = 0;
const COMPANY_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

const savedEnv = {};

function saveEnv(keys) {
  for (const k of keys) {
    savedEnv[k] = process.env[k];
  }
}

function restoreEnv(keys) {
  for (const k of keys) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
}

function assert(label, condition) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}`);
  }
}

const ENV_KEYS = [
  'IMPETUS_INDUSTRIAL_EVENTS_ENABLED',
  'IMPETUS_INDUSTRIAL_OUTBOX_ENABLED',
  'IMPETUS_INDUSTRIAL_DLQ_ENABLED',
  'IMPETUS_INDUSTRIAL_REPLAY_SHADOW',
  'IMPETUS_EVENT_CATALOG_STRICT',
  'IMPETUS_EVENT_THROTTLE_PER_TENANT'
];

(async () => {
  console.log('\n══ WAVE 1 — INDUSTRIAL EVENT BACKBONE ══\n');
  saveEnv(ENV_KEYS);

  try {
    process.env.IMPETUS_INDUSTRIAL_EVENTS_ENABLED = 'false';
    process.env.IMPETUS_INDUSTRIAL_OUTBOX_ENABLED = 'false';
    process.env.IMPETUS_INDUSTRIAL_DLQ_ENABLED = 'false';
    process.env.IMPETUS_INDUSTRIAL_REPLAY_SHADOW = 'true';
    process.env.IMPETUS_EVENT_CATALOG_STRICT = 'false';
    process.env.IMPETUS_EVENT_THROTTLE_PER_TENANT = 'false';

    console.log('── Catálogo ──');
    const catalog = require('../eventPipeline/catalog/industrialEventCatalog');
    assert('W1.1 catálogo carregado', catalog.CATALOG_ENTRIES.length >= 10);
    assert('W1.2 padrão quality.ncr.opened', catalog.isKnownIndustrialType('quality.ncr.opened'));
    const parsed = catalog.parseIndustrialEventType('safety.loto.applied');
    assert('W1.3 parse domínio safety', parsed && parsed.domain === 'safety');

    const strictOff = catalog.validateCatalogType('quality.custom.unregistered', { strict: false });
    assert('W1.4 strict off aceita padrão válido desconhecido', strictOff.ok === true);

    const strictOn = catalog.validateCatalogType('unknown.bad.type', { strict: true });
    assert('W1.5 strict on rejeita padrão inválido', strictOn.ok === false);

    console.log('\n── Envelope industrial ──');
    const { buildIndustrialEnvelope, fromLegacyEnvelope } = require('../eventPipeline/industrialEnvelope');
    const { createEvent } = require('../eventPipeline/envelope');

    const env = buildIndustrialEnvelope({
      event_name: 'quality.ncr.opened',
      company_id: COMPANY_ID,
      correlation_id: 'corr-1',
      payload: { ncr_id: 'NCR-001' }
    });
    assert('W1.6 envelope com correlation_id', env.correlation_id === 'corr-1');
    assert('W1.7 idempotency_key gerado', env.idempotency_key.length >= 8);
    assert('W1.8 company_id preservado', env.company_id === COMPANY_ID);

    const legacy = createEvent({
      type: 'chat_message',
      source: 'dashboard_chat',
      user: 'user-1',
      payload: { company_id: COMPANY_ID, text: 'test' }
    });
    const mirrored = fromLegacyEnvelope(legacy);
    assert('W1.9 mirror from legacy', mirrored && mirrored.company_id === COMPANY_ID);

    console.log('\n── Flags default seguro ──');
    const flags = require('../eventPipeline/industrialFlags');
    assert('W1.10 events disabled por defeito', flags.isIndustrialEventsEnabled() === false);
    assert('W1.11 replay shadow default true', flags.isIndustrialReplayShadow() === true);

    console.log('\n── Publicação (enabled) ──');
    process.env.IMPETUS_INDUSTRIAL_EVENTS_ENABLED = 'true';
    delete require.cache[require.resolve('../eventPipeline/industrialFlags')];
    delete require.cache[require.resolve('../eventPipeline/industrialEventBackbone')];
    const flagsOn = require('../eventPipeline/industrialFlags');
    assert('W1.12 events enabled', flagsOn.isIndustrialEventsEnabled() === true);

    const backbone = require('../eventPipeline/industrialEventBackbone');
    const pub = await backbone.publishIndustrialEvent({
      event_name: 'operational.pipeline.stage',
      company_id: COMPANY_ID,
      correlation_id: 'pub-1',
      payload: { stage: 'test' }
    });
    assert('W1.13 publicação ok', pub.ok === true);
    assert('W1.14 outbox id devolvido', pub.outbox && pub.outbox.id);

    console.log('\n── Throttle observe ──');
    const throttle = require('../eventPipeline/throttling/tenantThrottleService');
    throttle.resetThrottleState();
    const t1 = throttle.checkTenantThrottle(COMPANY_ID, { domain: 'operational' });
    assert('W1.15 throttle observe permite', t1.allowed === true && t1.observe_only === true);

    console.log('\n── DLQ shadow ──');
    process.env.IMPETUS_INDUSTRIAL_DLQ_ENABLED = 'false';
    const dlq = require('../eventPipeline/dlq/industrialDlqService');
    const dlqR = await dlq.moveToDlq(env, { reason: 'test_shadow', attempts: 3 });
    assert('W1.16 DLQ shadow quando flag off', dlqR.shadow === true);

    console.log('\n── Replay shadow ──');
    const replay = require('../eventPipeline/replay/shadowReplayWorker');
    const replayR = await replay.runShadowReplay({ limit: 10, source: 'dlq' });
    assert('W1.17 replay shadow corre', replayR.ok === true && replayR.shadow === true);

    console.log('\n── Summarization hooks ──');
    const sum = require('../eventPipeline/summarization/summarizationHooks');
    let hookCalled = false;
    sum.registerSummarizationHook('test-hook', async () => {
      hookCalled = true;
      return { summarized: false };
    });
    const sumR = await sum.invokeSummarizationHooks(env, { trigger: 'test' });
    assert('W1.18 hook invocado', sumR.invoked >= 1 && hookCalled);
    sum.unregisterSummarizationHook('test-hook');

    console.log('\n── Outbox drain (memory) ──');
    const outbox = require('../eventPipeline/outbox/industrialOutboxService');
    const drain = await outbox.drainOutboxBatch(async () => ({ ok: true }));
    assert('W1.19 drain executa', drain && typeof drain.processed === 'number');

    console.log('\n── Health snapshot ──');
    const health = backbone.getIndustrialBackboneHealth();
    assert('W1.20 health enabled', health.enabled === true);
    assert('W1.21 health catalog entries', health.catalog.entries_count >= 10);

    console.log('\n── Feature governance ──');
    delete require.cache[require.resolve('../services/featureGovernanceService')];
    const fg = require('../services/featureGovernanceService');
    assert('W1.22 flags WAVE1 em KNOWN_FLAGS', fg.KNOWN_FLAGS.includes('IMPETUS_INDUSTRIAL_EVENTS_ENABLED'));
    process.env.IMPETUS_INDUSTRIAL_EVENTS_ENABLED = 'false';
    process.env.IMPETUS_INDUSTRIAL_OUTBOX_ENABLED = 'true';
    delete require.cache[require.resolve('../services/featureGovernanceService')];
    const fg2 = require('../services/featureGovernanceService');
    const validation = fg2.bootstrap().validation;
    assert(
      'W1.23 warn outbox sem events',
      validation.findings.some((f) => f.id === 'INDUSTRIAL_OUTBOX_WITHOUT_EVENTS')
    );

    console.log('\n── Pipeline mirror (não bloqueia) ──');
    process.env.IMPETUS_INDUSTRIAL_EVENTS_ENABLED = 'true';
    const pipeline = require('../eventPipeline/pipeline');
    assert('W1.24 pipeline exporta publishEvent', typeof pipeline.publishEvent === 'function');
  } catch (e) {
    assert('W1.X excepção: ' + (e && e.message ? e.message : e), false);
    console.error(e);
  } finally {
    restoreEnv(ENV_KEYS);
  }

  console.log(`\n══ Resultado: ${passed} passed, ${failed} failed ══\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
