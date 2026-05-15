'use strict';

/**
 * HARDENING & STABILITY PHASE (Anti-bypass, Legacy governance, Readiness rollout, Event queue).
 *
 * Executar:
 *   node src/tests/operationalHardeningScenarios.js
 */

const assert = require('assert');

function purge(servicePaths) {
  for (const p of servicePaths) {
    try {
      delete require.cache[require.resolve(p)];
    } catch (_e) {}
  }
}

function resetEnv(keys) {
  for (const k of keys) {
    delete process.env[k];
  }
}

function uuidLike() {
  return '11111111-1111-4111-8111-111111111111';
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildVerifiedIntegrityCall({ contextIntegrityService, companyId }) {
  const bundle = {
    context: 'hello integrity',
    scope: { can_chat: true, strict: false },
    permissions: ['p1', 'p2']
  };

  const hashPack = contextIntegrityService.generateContextHash({
    body: bundle.context,
    scope: bundle.scope,
    permissions: bundle.permissions,
    company_id: companyId,
    data_state: 'unknown'
  });

  const envelope = contextIntegrityService.buildContextIntegrityEnvelope({
    context_hash: hashPack.context_hash,
    company_id: companyId,
    channel: 'secure_context',
    data_state: 'unknown',
    scope: bundle.scope,
    timestamp: hashPack.generated_at
  });

  const identity = { company_id: companyId };
  const out = contextIntegrityService.validateContextIntegrity({
    contextBundle: bundle,
    envelope,
    identity,
    metadata: {}
  });

  return out;
}

async function main() {
  const servicePaths = [
    '../services/aiSecurityGateway',
    '../services/unifiedOrchestrator',
    '../services/contextIntegrityService',
    '../services/cognitiveEventBackboneService',
    '../services/aiAnalyticsService',
    '../services/ai'
  ];
  const env = { ...process.env };

  try {
    // ============================================================
    // TESTE 1 — skipSecureContext em produção (bloqueado)
    // ============================================================
    purge(servicePaths);
    resetEnv([
      'NODE_ENV',
      'RED_TEAM_SKIP_DB',
      'IMPETUS_TEST_MODE'
    ]);
    process.env.NODE_ENV = 'production';
    process.env.IMPETUS_TEST_MODE = 'false';
    delete process.env.RED_TEAM_SKIP_DB;

    const aiSecurityGateway1 = require('../services/aiSecurityGateway');
    // Alguns módulos carregam .env e podem sobrescrever NODE_ENV; garantimos o valor no momento da decisão.
    process.env.NODE_ENV = 'production';
    process.env.IMPETUS_TEST_MODE = 'false';
    delete process.env.RED_TEAM_SKIP_DB;
    const metaBlocked = aiSecurityGateway1.applySecureContextBypassPolicy(
      { skipSecureContext: true },
      't1',
      'ch1'
    );
    assert.strictEqual(metaBlocked.skipSecureContext, false, 'skipSecureContext deve ser forçado false em produção');

    const m1 = aiSecurityGateway1.getSecureContextBypassMetrics();
    assert.strictEqual(m1.bypass_attempts, 0, 'bypass_attempts deve ficar 0');
    assert.strictEqual(m1.blocked_bypass_attempts, 1, 'blocked_bypass_attempts deve ser 1');

  // ============================================================
  // TESTE 2 — skipSecureContext em test mode (permitido)
  // ============================================================
  purge(servicePaths);
  resetEnv(['NODE_ENV', 'RED_TEAM_SKIP_DB', 'IMPETUS_TEST_MODE']);
  process.env.NODE_ENV = 'production';
  process.env.IMPETUS_TEST_MODE = 'true';
  delete process.env.RED_TEAM_SKIP_DB;

  const aiSecurityGateway2 = require('../services/aiSecurityGateway');
  process.env.NODE_ENV = 'production';
  process.env.IMPETUS_TEST_MODE = 'true';
  delete process.env.RED_TEAM_SKIP_DB;
  const metaAllowed = aiSecurityGateway2.applySecureContextBypassPolicy(
    { skipSecureContext: true },
    't2',
    'ch2'
  );
  assert.strictEqual(metaAllowed.skipSecureContext, true, 'skipSecureContext deve ser permitido em IMPETUS_TEST_MODE=true');
  const m2 = aiSecurityGateway2.getSecureContextBypassMetrics();
  assert.strictEqual(m2.bypass_attempts, 1, 'bypass_attempts deve ser 1');
  assert.strictEqual(m2.blocked_bypass_attempts, 0, 'blocked_bypass_attempts deve ser 0');

  // ============================================================
  // TESTE 3 — legacy detection contabilizado
  // ============================================================
  purge(servicePaths);
  resetEnv(['IMPETUS_LEGACY_ZERO_WINDOW_HOURS', 'IMPETUS_TEST_MODE', 'NODE_ENV']);
  process.env.NODE_ENV = 'test';
  process.env.IMPETUS_LEGACY_ZERO_WINDOW_HOURS = '1';
  process.env.IMPETUS_TEST_MODE = 'true';

  const unifiedOrchestrator = require('../services/unifiedOrchestrator');
  unifiedOrchestrator._resetObservabilityCounters();

  unifiedOrchestrator.detectLegacyExecution({
    source: 'test',
    channel: 'ch-legacy',
    trace_id: 'legacy-trace-1',
    ts: new Date().toISOString()
  });

  const legacyAfter = unifiedOrchestrator.getLegacyRuntimeDashboard();
  assert.ok(legacyAfter.legacy_paths_detected >= 1, 'legacy_paths_detected deve incrementar');

  // ============================================================
  // TESTE 4 — legacy zero window readiness calculado
  // ============================================================
  purge(['../services/unifiedOrchestrator']);
  process.env.NODE_ENV = 'test';
  process.env.IMPETUS_TEST_MODE = 'true';
  process.env.IMPETUS_LEGACY_ZERO_WINDOW_HOURS = '0.00001'; // ~0.036s

  const uo = require('../services/unifiedOrchestrator');
  uo._resetObservabilityCounters();
  // Regista 1 detecção "antiga" > 24h, para last24h == 0.
  uo.detectLegacyExecution({
    source: 'test',
    channel: 'ch-legacy',
    trace_id: 'legacy-trace-2',
    ts: new Date(Date.now() - 25 * 3600000).toISOString()
  });

  // Inicialmente, pode ainda não cumprir a janela zero (precisa de tempo desde _legacyZeroWindowStartMs)
  const first = uo.getLegacyRuntimeDashboard();
  assert.strictEqual(first.legacy_paths_last_24h, 0, 'legacy_paths_last_24h deve ser 0');

  // Avança tempo interno o suficiente.
  const winMs = Number(process.env.IMPETUS_LEGACY_ZERO_WINDOW_HOURS) * 3600000;
  uo._legacyTestSetZeroWindowAgeMs(Math.ceil(winMs) + 50);

  const ready = uo.getLegacyRuntimeDashboard();
  assert.strictEqual(ready.legacy_block_mode_ready, true, 'legacy_block_mode_ready deve ficar true quando a zero-window passa');

  // ============================================================
  // TESTE 5 — integrity rollout readiness cálculo correto
  // ============================================================
  purge(servicePaths);
  process.env.NODE_ENV = 'test';
  process.env.IMPETUS_TEST_MODE = 'true';
  process.env.IMPETUS_CONTEXT_INTEGRITY_ENABLED = 'true';
  process.env.IMPETUS_INTEGRITY_ROLLOUT_MIN_VERIFIED = '10';
  process.env.IMPETUS_INTEGRITY_ROLLOUT_POISON_MAX = '0.2';
  process.env.IMPETUS_INTEGRITY_ROLLOUT_CROSS_MAX = '0.2';
  process.env.IMPETUS_INTEGRITY_ROLLOUT_OVERSIZED_MAX = '0.2';
  process.env.IMPETUS_INTEGRITY_ROLLOUT_FAIL_MAX = '0.2';

  const contextIntegrityService = require('../services/contextIntegrityService');
  contextIntegrityService._resetCounters();

  const cid = uuidLike();

  for (let i = 0; i < 10; i += 1) {
    const ok = buildVerifiedIntegrityCall({ contextIntegrityService, companyId: cid });
    assert.strictEqual(ok.ok, true, 'context integrity deve validar (caso base)');
  }

  // 1 caso com metadata proibida (poison) para criar um poison_rate controlado (0.1)
  const poisonedBundle = {
    context: 'hello integrity',
    scope: { can_chat: true, strict: false },
    permissions: ['p1', 'p2']
  };
  const poisonHashPack = contextIntegrityService.generateContextHash({
    body: poisonedBundle.context,
    scope: poisonedBundle.scope,
    permissions: poisonedBundle.permissions,
    company_id: cid,
    data_state: 'unknown'
  });
  const poisonEnvelope = contextIntegrityService.buildContextIntegrityEnvelope({
    context_hash: poisonHashPack.context_hash,
    company_id: cid,
    channel: 'secure_context',
    data_state: 'unknown',
    scope: poisonedBundle.scope,
    timestamp: poisonHashPack.generated_at
  });

  contextIntegrityService.validateContextIntegrity({
    contextBundle: poisonedBundle,
    envelope: poisonEnvelope,
    identity: { company_id: cid },
    metadata: { exec: true } // FORBIDDEN_METADATA_KEYS
  });

  const readinessOk = contextIntegrityService.evaluateIntegrityBlockReadiness({ silent_logs: true });
  assert.strictEqual(readinessOk.block_mode_ready, true, 'readiness deve ser true com rates abaixo dos limites');
  assert.ok(readinessOk.confidence >= 0 && readinessOk.confidence <= 100);

  // Caso negativo: limites extremamente baixos para poison.
  contextIntegrityService._resetCounters();
  process.env.IMPETUS_INTEGRITY_ROLLOUT_MIN_VERIFIED = '10';
  process.env.IMPETUS_INTEGRITY_ROLLOUT_POISON_MAX = '0.01';

  for (let i = 0; i < 10; i += 1) {
    const ok = buildVerifiedIntegrityCall({ contextIntegrityService, companyId: cid });
    assert.strictEqual(ok.ok, true);
  }
  // 1 poison => 0.1 > 0.01 => not ready
  contextIntegrityService.validateContextIntegrity({
    contextBundle: poisonedBundle,
    envelope: poisonEnvelope,
    identity: { company_id: cid },
    metadata: { exec: true }
  });

  const readinessNotOk = contextIntegrityService.evaluateIntegrityBlockReadiness({ silent_logs: true });
  assert.strictEqual(readinessNotOk.block_mode_ready, false, 'readiness deve ficar false quando poison_rate excede poison_max');

  // ============================================================
  // TESTE 6 — event batching: flush funciona
  // ============================================================
  purge(servicePaths);
  process.env.NODE_ENV = 'test';
  process.env.IMPETUS_TEST_MODE = 'true';
  process.env.IMPETUS_EVENT_BACKBONE_ENABLED = 'true';
  process.env.IMPETUS_EVENT_BACKBONE_PERSIST = 'false';
  process.env.IMPETUS_EVENT_QUEUE_MAX = '1000';
  process.env.IMPETUS_EVENT_BATCH_SIZE = '10';
  process.env.IMPETUS_EVENT_FLUSH_MS = '600000'; // não dependemos do timer

  const eb1 = require('../services/cognitiveEventBackboneService');
  eb1._resetForTests();

  const trace6 = 'trace-6';
  for (let i = 0; i < 25; i += 1) {
    eb1.publishCognitiveEventDeferred({
      event_type: eb1.EVENT_TYPES.LLM_EXECUTION,
      trace_id: trace6,
      company_id: cid,
      channel: 'dashboard_chat',
      runtime: 'unified',
      context_hash: 'abc',
      payload: { i },
      metadata: { priority: 'normal' }
    });
  }

  await eb1._flushDeferredQueueForTests();
  const snap6 = eb1.getDashboardSnapshot();
  assert.strictEqual(snap6.events_published, 25, 'deve publicar todos os eventos (25) após flush');

  // ============================================================
  // TESTE 7 — queue overflow: drop controlado
  // ============================================================
  purge(servicePaths);
  process.env.NODE_ENV = 'test';
  process.env.IMPETUS_TEST_MODE = 'true';
  process.env.IMPETUS_EVENT_BACKBONE_ENABLED = 'true';
  process.env.IMPETUS_EVENT_BACKBONE_PERSIST = 'false';
  process.env.IMPETUS_EVENT_QUEUE_MAX = '20';
  process.env.IMPETUS_EVENT_BATCH_SIZE = '1000';
  process.env.IMPETUS_EVENT_FLUSH_MS = '600000';

  const eb2 = require('../services/cognitiveEventBackboneService');
  eb2._resetForTests();

  const trace7 = 'trace-7';
  for (let i = 0; i < 200; i += 1) {
    eb2.publishCognitiveEventDeferred({
      event_type: eb2.EVENT_TYPES.LLM_EXECUTION,
      trace_id: trace7,
      company_id: cid,
      channel: 'dashboard_chat',
      runtime: 'unified',
      context_hash: 'abc',
      payload: { i },
      metadata: { priority: 'normal' }
    });
  }

  const health7_pre = eb2.getEventQueueHealth();
  assert.ok(health7_pre.dropped_events > 0, 'deve haver drop quando a fila enche');
  assert.ok(health7_pre.queue_depth <= 20, 'queue_depth deve ficar limitado');

  await eb2._flushDeferredQueueForTests();
  const snap7 = eb2.getDashboardSnapshot();
  assert.strictEqual(snap7.events_published, 20, 'após flush, só os últimos ~20 itens devem sobreviver');

  // ============================================================
  // TESTE 8 — eventos críticos nunca dropados
  // ============================================================
  purge(servicePaths);
  process.env.NODE_ENV = 'test';
  process.env.IMPETUS_TEST_MODE = 'true';
  process.env.IMPETUS_EVENT_BACKBONE_ENABLED = 'true';
  process.env.IMPETUS_EVENT_BACKBONE_PERSIST = 'false';
  process.env.IMPETUS_EVENT_QUEUE_MAX = '20';
  process.env.IMPETUS_EVENT_BATCH_SIZE = '1000';
  process.env.IMPETUS_EVENT_FLUSH_MS = '600000';

  const eb3 = require('../services/cognitiveEventBackboneService');
  eb3._resetForTests();

  const traceCrit = 'trace-crit';
  const traceDrop = 'trace-drop';

  // Enche com droppable.
  for (let i = 0; i < 20; i += 1) {
    eb3.publishCognitiveEventDeferred({
      event_type: eb3.EVENT_TYPES.LLM_EXECUTION,
      trace_id: traceDrop,
      company_id: cid,
      channel: 'dashboard_chat',
      runtime: 'unified',
      payload: { i },
      metadata: { priority: 'normal' }
    });
  }

  // Enfileira críticos (não devem ser perdidos).
  const criticalCount = 5;
  for (let j = 0; j < criticalCount; j += 1) {
    eb3.publishCognitiveEventDeferred({
      event_type: eb3.EVENT_TYPES.CONTEXT_INTEGRITY_FAIL,
      trace_id: traceCrit,
      company_id: cid,
      channel: 'test',
      runtime: 'context_integrity_service',
      payload: { j },
      metadata: { severity: 'critical' }
    });
  }

  await eb3._flushDeferredQueueForTests();

  const repCrit = await eb3.replayEventsByTrace(traceCrit, { limit: 50 });
  const critEvents = (repCrit.events || []).filter((e) => e.event_type === eb3.EVENT_TYPES.CONTEXT_INTEGRITY_FAIL);
  assert.strictEqual(critEvents.length, criticalCount, 'eventos críticos devem ser publicados mesmo sob overflow');

  // ============================================================
  // TESTE 9 — dashboard metrics: health correto
  // ============================================================
  purge(servicePaths);
  process.env.NODE_ENV = 'test';
  process.env.IMPETUS_TEST_MODE = 'true';
  process.env.IMPETUS_COGNITIVE_DASHBOARD_ENABLED = 'true';
  process.env.IMPETUS_COGNITIVE_DB_ENABLED = 'false';

  process.env.IMPETUS_CONTEXT_INTEGRITY_ENABLED = 'true';
  process.env.IMPETUS_INTEGRITY_ROLLOUT_MIN_VERIFIED = '2';
  process.env.IMPETUS_INTEGRITY_ROLLOUT_POISON_MAX = '0.5';
  process.env.IMPETUS_INTEGRITY_ROLLOUT_CROSS_MAX = '0.5';
  process.env.IMPETUS_INTEGRITY_ROLLOUT_OVERSIZED_MAX = '0.5';
  process.env.IMPETUS_INTEGRITY_ROLLOUT_FAIL_MAX = '0.5';

  process.env.IMPETUS_EVENT_BACKBONE_ENABLED = 'true';
  process.env.IMPETUS_EVENT_BACKBONE_PERSIST = 'false';
  process.env.IMPETUS_EVENT_QUEUE_MAX = '100';
  process.env.IMPETUS_EVENT_BATCH_SIZE = '50';
  process.env.IMPETUS_EVENT_FLUSH_MS = '600000';

  process.env.NODE_ENV = 'development';

  const aiSecurityGateway9 = require('../services/aiSecurityGateway');
  // Cria 1 bypass_attempt para dashboard.
  process.env.IMPETUS_TEST_MODE = 'true';
  aiSecurityGateway9.applySecureContextBypassPolicy(
    { skipSecureContext: true },
    't9',
    'ch9'
  );

  const unifiedOrchestrator9 = require('../services/unifiedOrchestrator');
  unifiedOrchestrator9._resetObservabilityCounters();
  unifiedOrchestrator9.detectLegacyExecution({ source: 'test', channel: 'ch', ts: new Date(Date.now() - 10000).toISOString() });

  const contextIntegrityService9 = require('../services/contextIntegrityService');
  contextIntegrityService9._resetCounters();
  buildVerifiedIntegrityCall({ contextIntegrityService: contextIntegrityService9, companyId: cid });

  const eb9 = require('../services/cognitiveEventBackboneService');
  eb9._resetForTests();
  for (let i = 0; i < 10; i += 1) {
    eb9.publishCognitiveEventDeferred({
      event_type: eb9.EVENT_TYPES.LLM_EXECUTION,
      trace_id: 'trace-9',
      company_id: cid,
      channel: 'dashboard_chat',
      runtime: 'unified',
      payload: { i },
      metadata: { priority: 'normal' }
    });
  }
  await eb9._flushDeferredQueueForTests();

  const aiAnalyticsService9 = require('../services/aiAnalyticsService');
  const dash9 = await aiAnalyticsService9.getCognitiveGovernanceDashboard(cid);

  assert.ok(dash9.operational_hardening, 'dashboard deve ter operational_hardening');
  assert.strictEqual(
    dash9.operational_hardening.secure_context_bypass.bypass_attempts,
    aiSecurityGateway9.getSecureContextBypassMetrics().bypass_attempts,
    'bypass_attempts no dashboard deve reflectir métrica do gateway'
  );
  assert.strictEqual(
    dash9.operational_hardening.legacy_runtime.legacy_paths_detected,
    unifiedOrchestrator9.getLegacyRuntimeDashboard().legacy_paths_detected,
    'legacy_paths_detected no dashboard deve reflectir o orquestrador'
  );
  assert.strictEqual(
    dash9.operational_hardening.event_queue_health.dropped_events,
    eb9.getEventQueueHealth().dropped_events,
    'dropped_events no dashboard deve reflectir a fila'
  );

  // ============================================================
  // TESTE 10 — kill switches: comportamento legacy preservado
  // ============================================================
  purge(servicePaths);
  resetEnv(['IMPETUS_UNIFIED_ORCHESTRATOR_ENABLED', 'IMPETUS_BLOCK_LEGACY_COGNITIVE_PATHS', 'IMPETUS_AI_GATEWAY_ENABLED', 'OPENAI_API_KEY']);
  process.env.IMPETUS_UNIFIED_ORCHESTRATOR_ENABLED = 'true';
  process.env.IMPETUS_BLOCK_LEGACY_COGNITIVE_PATHS = 'true';
  process.env.IMPETUS_AI_GATEWAY_ENABLED = 'false';
  process.env.OPENAI_API_KEY = '';

  const ai10 = require('../services/ai');
  const out10 = await ai10.rawChatCompletionMessages(
    [{ role: 'user', content: 'x' }],
    {}
  );
  assert.ok(String(out10).includes('bloqueada'), 'rawChatCompletionMessages deve permanecer bloqueado pelos kill switches de legacy');

    console.log('operationalHardeningScenarios: OK');
  } finally {
    for (const k of Object.keys(process.env)) {
      if (!(k in env)) delete process.env[k];
    }
    for (const [k, v] of Object.entries(env)) {
      process.env[k] = v;
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

