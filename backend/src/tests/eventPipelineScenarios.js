'use strict';

/**
 * Suite event-driven IMPETUS — sem BD, sem rede, sem LLM real.
 * Executar: node src/tests/eventPipelineScenarios.js
 */

const assert = require('assert');
const path = require('path');

function clearCacheStartingWith(prefixAbs) {
  for (const k of Object.keys(require.cache)) {
    if (k.startsWith(prefixAbs)) delete require.cache[k];
  }
}

const PIPELINE_DIR = path.resolve(__dirname, '../eventPipeline');
clearCacheStartingWith(PIPELINE_DIR);

process.env.IMPETUS_EVENT_PIPELINE_ENABLED = process.env.IMPETUS_EVENT_PIPELINE_ENABLED || 'true';

async function testEnvelope() {
  const { createEvent, validateEvent } = require('../eventPipeline/envelope');
  const ev = createEvent({
    type: 'chat_message',
    source: 'system',
    user: 'u1',
    payload: { text: 'Olá, meu CPF é 123.456.789-09' },
    priority: 'high'
  });
  assert.ok(ev.id && ev.timestamp);
  assert.strictEqual(ev.priority, 'high');
  assert.throws(() => validateEvent({ ...ev, type: 'invalid' }), (e) => e.code === 'EVENT_ENVELOPE_INVALID');
  console.log('  ✓ envelope cria + valida + rejeita inválido');
}

async function testEventProcessor() {
  const { createEvent } = require('../eventPipeline/envelope');
  const { processEvent, MAX_SUMMARY } = require('../eventPipeline/processor/eventProcessor');
  const ev = createEvent({
    type: 'chat_message',
    source: 'whatsapp',
    user: 'u1',
    payload: { text: 'Contato: joao@empresa.com / CPF 123.456.789-09. Crie tarefa para máquina XPTO-12.' },
    priority: 'medium'
  });
  const out = processEvent(ev);
  assert.strictEqual(out.filtered, false);
  assert.ok(out.summary.length <= MAX_SUMMARY);
  assert.ok(out.summary.includes('[email]'), 'email anonimizado no summary');
  assert.ok(out.summary.includes('[cpf]'), 'cpf anonimizado no summary');
  assert.ok(['conversation', 'task'].includes(out.intent_pre));
  assert.ok(Array.isArray(out.entities));

  const noise = createEvent({
    type: 'chat_message',
    source: 'system',
    user: null,
    payload: { text: '   ' },
    priority: 'low'
  });
  const noiseOut = processEvent(noise);
  assert.strictEqual(noiseOut.filtered, true);
  console.log('  ✓ event processor anonimiza, classifica e filtra ruído');
}

async function testResilience() {
  const { callWithRetry } = require('../eventPipeline/resilience/aiResilience');
  let attempts = 0;
  const okAfter2 = await callWithRetry(
    async () => {
      attempts++;
      if (attempts < 2) throw new Error('flake');
      return 'ok';
    },
    { baseMs: 1, maxRetries: 3 }
  );
  assert.strictEqual(okAfter2, 'ok');
  assert.strictEqual(attempts, 2);

  let used = false;
  const fb = await callWithRetry(
    async () => {
      throw new Error('hard fail');
    },
    {
      baseMs: 1,
      maxRetries: 2,
      fallback: () => {
        used = true;
        return 'FB';
      }
    }
  );
  assert.strictEqual(fb, 'FB');
  assert.strictEqual(used, true);

  const nonRetry = new Error('no');
  nonRetry.status = 401;
  let calls = 0;
  await assert.rejects(
    callWithRetry(
      async () => {
        calls++;
        throw nonRetry;
      },
      { baseMs: 1, maxRetries: 5 }
    ),
    (e) => e.code === 'AI_RETRY_EXHAUSTED'
  );
  assert.strictEqual(calls, 1, 'não retenta em 4xx');
  console.log('  ✓ aiResilience retry + fallback + non-retriable');
}

async function testOrchestratorRoutes() {
  const { wireOrchestrator, routeRefinedEvent } = require('../eventPipeline/orchestrator/eventOrchestrator');
  const claudeJobQueue = require('../eventPipeline/orchestrator/claudeJobQueue');
  const calls = { chat: 0, task: 0, ext: 0, claude: 0 };
  wireOrchestrator({
    send_to_chatgpt: async () => {
      calls.chat++;
      return { ok: true, channel: 'chatgpt', content: 'r' };
    },
    execute_task: async () => {
      calls.task++;
      return { ok: true, channel: 'task' };
    },
    call_external_api: async () => {
      calls.ext++;
      return { ok: true, channel: 'external_api', data: { rate: 5 } };
    },
    claude_handler: async () => {
      calls.claude++;
      return {
        status: 'ok',
        kpis: [],
        alerts: [],
        recommendations: [],
        generated_at: new Date().toISOString()
      };
    }
  });

  const processed = {
    event_id: 'e1',
    event_type: 'chat_message',
    intent_pre: 'conversation',
    summary: 's',
    entities: [],
    priority: 'medium',
    requires_ai: true,
    filtered: false,
    anonymized_payload: {}
  };

  const conv = await routeRefinedEvent(processed, {
    intent: 'conversation',
    confidence: 0.7,
    entities: [],
    priority: 'medium'
  });
  assert.strictEqual(conv.channel, 'chatgpt');

  const task = await routeRefinedEvent(processed, {
    intent: 'task',
    confidence: 0.7,
    entities: [],
    priority: 'medium'
  });
  assert.strictEqual(task.channel, 'task');

  const ext = await routeRefinedEvent(processed, {
    intent: 'external_data',
    confidence: 0.8,
    entities: [],
    priority: 'medium'
  });
  assert.strictEqual(ext.channel, 'external_then_chatgpt');

  const ana = await routeRefinedEvent(processed, {
    intent: 'analysis',
    confidence: 0.9,
    entities: [],
    priority: 'low'
  });
  assert.strictEqual(ana.channel, 'claude_background');
  assert.strictEqual(ana.output.status, 'ok');

  assert.strictEqual(calls.chat, 2, 'chatgpt usado em conversation e external_then_chatgpt');
  assert.strictEqual(calls.task, 1);
  assert.strictEqual(calls.ext, 1);
  assert.strictEqual(calls.claude, 1);
  assert.strictEqual(claudeJobQueue.stats().pending, 0);
  console.log('  ✓ orchestrator roteia conversation/task/external_data/analysis');
}

async function testSystemHealth() {
  const { buildSnapshotPayload } = require('../eventPipeline/health/systemHealthSnapshotService');
  const p = buildSnapshotPayload({ falhas: 2, tarefas_atrasadas: 1 });
  assert.ok(['ok', 'warning', 'critical'].includes(p.summary.status));
  assert.ok(typeof p.summary.cpu === 'number');
  assert.ok(typeof p.summary.memoria === 'number');
  assert.strictEqual(p.summary.falhas, 2);
  assert.strictEqual(p.summary.tarefas_atrasadas, 1);
  console.log('  ✓ system_health snapshot com summary obrigatório');
}

async function testEndToEndPipeline() {
  const { createInMemoryAdapter } = require('../eventPipeline/eventBus/inMemoryAdapter');
  const { __setEventBusForTests } = require('../eventPipeline/eventBus');
  const bus = createInMemoryAdapter();
  __setEventBusForTests(bus);

  const { wireOrchestrator } = require('../eventPipeline/orchestrator/eventOrchestrator');
  let chatCount = 0;
  wireOrchestrator({
    send_to_chatgpt: async () => {
      chatCount++;
      return { ok: true, channel: 'chatgpt', content: 'reply' };
    }
  });

  const { processAndRouteEvent } = require('../eventPipeline/pipeline');
  const r = await processAndRouteEvent({
    type: 'chat_message',
    source: 'system',
    user: 'u1',
    priority: 'high',
    payload: { text: 'Bom dia' }
  });
  assert.ok(r.processed && r.refined && r.route);
  assert.strictEqual(r.route.ok, true);
  assert.ok(['chatgpt', 'external_then_chatgpt', 'claude_background', 'task'].includes(r.route.channel));
  assert.ok(chatCount >= 1 || r.route.channel !== 'chatgpt');
  await bus._flushAndStop();
  console.log('  ✓ pipeline end-to-end (sem IA real) executou e roteou');
}

(async () => {
  console.log('eventPipelineScenarios:');
  try {
    await testEnvelope();
    await testEventProcessor();
    await testResilience();
    await testOrchestratorRoutes();
    await testSystemHealth();
    await testEndToEndPipeline();
    console.log('eventPipelineScenarios: OK');
  } catch (e) {
    console.error('eventPipelineScenarios: FAIL', e);
    process.exitCode = 1;
  }
})();
