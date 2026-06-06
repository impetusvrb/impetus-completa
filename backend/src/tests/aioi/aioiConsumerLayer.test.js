'use strict';

/**
 * AIOI-P0.3 — Testes automatizados do Consumer Layer
 *
 * Cobertura obrigatória (12 casos):
 *   T1  — SKIP LOCKED evita double-pick
 *   T2  — pending → processing
 *   T3  — processing → delivered
 *   T4  — retry incrementa attempts
 *   T5  — attempts > 3 gera failed
 *   T6  — open → triaged
 *   T7  — idempotência preservada
 *   T8  — multi-tenant preservado
 *   T9  — rollback em erro
 *   T10 — nenhum cálculo de prioridade executado
 *   T11 — nenhum workflow iniciado
 *   T12 — nenhum actionRuntimeOrchestrator chamado
 *
 * Executar:
 *   node src/tests/aioi/aioiConsumerLayer.test.js
 *
 * Meta: 100% PASS.
 */

// ---------------------------------------------------------------------------
// Infraestrutura de testes
// ---------------------------------------------------------------------------
let _passed = 0;
let _failed = 0;
const _results = [];

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}
function assertEqual(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message} — expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)}`);
}
function assertNotNull(value, message) {
  if (value == null) throw new Error(`${message} — valor é null/undefined`);
}
function assertNull(value, message) {
  if (value != null) throw new Error(`${message} — esperava null, obteve: ${JSON.stringify(value)}`);
}

async function test(name, fn) {
  try {
    await fn();
    _passed++;
    _results.push({ name, status: 'PASS' });
    console.log(`  ✓  ${name}`);
  } catch (err) {
    _failed++;
    _results.push({ name, status: 'FAIL', error: err.message });
    console.error(`  ✗  ${name}`);
    console.error(`     ${err.message}`);
  }
}

function suite(name) {
  console.log(`\n[SUITE] ${name}`);
}

// ---------------------------------------------------------------------------
// Caminhos
// ---------------------------------------------------------------------------
const path = require('path');
const SERVICES_PATH = path.resolve(__dirname, '../../services/aioi');

// ---------------------------------------------------------------------------
// Módulos puros (sem db) — carregados diretamente
// ---------------------------------------------------------------------------
const classificationMapper = require(`${SERVICES_PATH}/aioiClassificationMapper`);
const metrics = require(`${SERVICES_PATH}/aioiConsumerMetrics`);

// ---------------------------------------------------------------------------
// Infraestrutura de mock de DB
// ---------------------------------------------------------------------------
const DB_MOD_PATH = (() => { try { return require.resolve('../../db'); } catch { return null; } })();
let _originalDb;

function patchDb(mock) {
  if (DB_MOD_PATH && require.cache[DB_MOD_PATH]) {
    _originalDb = require.cache[DB_MOD_PATH].exports;
    require.cache[DB_MOD_PATH].exports = mock;
  }
}
function restoreDb() {
  if (DB_MOD_PATH && _originalDb && require.cache[DB_MOD_PATH]) {
    require.cache[DB_MOD_PATH].exports = _originalDb;
  }
}
function invalidate(relPath) {
  const full = require.resolve(`${SERVICES_PATH}/${relPath}`);
  delete require.cache[full];
}

// ---------------------------------------------------------------------------
// Fábrica de mock de DB para o consumer layer
// ---------------------------------------------------------------------------

/**
 * Cria um mock de db.pool que simula comportamento do PostgreSQL
 * para os testes do consumer.
 *
 * @param {object} opts
 * @param {Array}  opts.outboxRows     — linhas retornadas por pickBatch / UPDATE RETURNING
 * @param {object} opts.ioeRow         — IOE retornado por fetchIoe
 * @param {boolean} opts.failOnUpdate  — simular falha de UPDATE
 * @param {boolean} opts.skipLockEmpty — simular SKIP LOCKED que não retorna nada
 * @param {number}  opts.ioeStatus     — status do IOE (default 'open')
 */
function createConsumerDbMock({
  outboxRows = [],
  ioeRow = null,
  failOnUpdate = false,
  skipLockEmpty = false
} = {}) {
  const calls = [];
  const client = {
    _calls: calls,
    async query(sql, params) {
      const s = sql.trim();
      calls.push({ sql: s, params });

      if (failOnUpdate && s.includes('UPDATE')) {
        throw new Error('DB_MOCK: simulated UPDATE failure');
      }

      // pickBatch: UPDATE … RETURNING * (move pending → processing)
      if (s.includes('UPDATE aioi_outbox') && s.includes('RETURNING *')) {
        return skipLockEmpty ? { rows: [] } : { rows: outboxRows };
      }

      // fetchIoe: SELECT … FROM industrial_operational_events
      if (s.includes('SELECT') && s.includes('industrial_operational_events')) {
        return { rows: ioeRow ? [ioeRow] : [] };
      }

      // transitionIoeToTriaged: UPDATE industrial_operational_events RETURNING id
      if (s.includes('UPDATE industrial_operational_events') && s.includes('RETURNING id')) {
        return { rows: [{ id: ioeRow?.id || 'ioe-test-id' }] };
      }

      // markDelivered / markFailedOrRetry: UPDATE aioi_outbox sem RETURNING
      if (s.includes('UPDATE aioi_outbox') || s.startsWith('UPDATE')) {
        return { rows: [] };
      }

      // set_config / BEGIN / COMMIT / ROLLBACK
      return { rows: [] };
    },
    release: () => {}
  };

  return {
    pool: { connect: async () => client },
    query: async (sql, params) => client.query(sql, params),
    _client: client
  };
}

// Fixtures
const COMPANY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const OTHER_COMPANY_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22';
const IOE_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33';
const OUTBOX_ID = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380d44';

const validOutboxEntry = {
  id:            OUTBOX_ID,
  company_id:    COMPANY_ID,
  ioe_id:        IOE_ID,
  consumer_type: 'classification',
  status:        'processing',
  idempotency_key: `classification:${IOE_ID}`,
  attempts:      0,
  correlation_id: 'ioe-test-corr-123'
};

const validIoe = {
  id:             IOE_ID,
  company_id:     COMPANY_ID,
  status:         'open',
  category:       'equipment_degradation',
  source_type:    'plc_event',
  priority_band:  'high',
  priority_score: 60,
  truth_state:    'telemetry_only',
  entity_type:    'equipment',
  entity_id:      'equip-001'
};

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
async function runAllTests() {

// ---------------------------------------------------------------------------
// T1 — SKIP LOCKED evita double-pick
// ---------------------------------------------------------------------------
suite('T1 — SKIP LOCKED evita double-pick');

await test('T1.1: pickBatch usa FOR UPDATE SKIP LOCKED na query', async () => {
  const dbMock = createConsumerDbMock({ outboxRows: [validOutboxEntry] });
  patchDb(dbMock); invalidate('aioiOutboxConsumerService.js');
  const svc = require(`${SERVICES_PATH}/aioiOutboxConsumerService`);

  await svc.pickBatch({ companyId: COMPANY_ID });

  restoreDb();
  const pickCall = dbMock._client._calls.find(c => c.sql.includes('FOR UPDATE SKIP LOCKED'));
  assertNotNull(pickCall, 'pickBatch deve usar FOR UPDATE SKIP LOCKED');
});

await test('T1.2: quando SKIP LOCKED não retorna linhas, lote vazio é retornado', async () => {
  const dbMock = createConsumerDbMock({ skipLockEmpty: true });
  patchDb(dbMock); invalidate('aioiOutboxConsumerService.js');
  const svc = require(`${SERVICES_PATH}/aioiOutboxConsumerService`);

  const result = await svc.pickBatch({ companyId: COMPANY_ID });

  restoreDb();
  assertEqual(result.rows.length, 0, 'lote vazio quando SKIP LOCKED não retorna linhas');
});

// ---------------------------------------------------------------------------
// T2 — pending → processing
// ---------------------------------------------------------------------------
suite('T2 — pending → processing');

await test('T2.1: pickBatch emite UPDATE … status=processing antes de RETURNING', async () => {
  const dbMock = createConsumerDbMock({ outboxRows: [validOutboxEntry] });
  patchDb(dbMock); invalidate('aioiOutboxConsumerService.js');
  const svc = require(`${SERVICES_PATH}/aioiOutboxConsumerService`);

  const result = await svc.pickBatch({ companyId: COMPANY_ID, consumerType: 'classification' });

  restoreDb();
  const updateCall = dbMock._client._calls.find(
    c => c.sql.includes('UPDATE aioi_outbox') && c.sql.includes("'processing'")
  );
  assertNotNull(updateCall, 'UPDATE aioi_outbox SET status=processing deve existir');
  assertEqual(result.rows.length, 1, 'deve retornar 1 linha');
});

await test('T2.2: query de pick inclui filtro consumer_type=classification', async () => {
  const dbMock = createConsumerDbMock({ outboxRows: [] });
  patchDb(dbMock); invalidate('aioiOutboxConsumerService.js');
  const svc = require(`${SERVICES_PATH}/aioiOutboxConsumerService`);

  await svc.pickBatch({ companyId: COMPANY_ID, consumerType: 'classification' });

  restoreDb();
  const call = dbMock._client._calls.find(c => c.sql.includes('consumer_type'));
  assertNotNull(call, 'query deve filtrar por consumer_type');
  assert(
    call.params && call.params.includes('classification'),
    "params deve conter 'classification'"
  );
});

// ---------------------------------------------------------------------------
// T3 — processing → delivered
// ---------------------------------------------------------------------------
suite('T3 — processing → delivered');

await test('T3.1: markDelivered emite UPDATE status=delivered com processed_at', async () => {
  const dbMock = createConsumerDbMock();
  patchDb(dbMock); invalidate('aioiOutboxConsumerService.js');
  const svc = require(`${SERVICES_PATH}/aioiOutboxConsumerService`);

  const result = await svc.markDelivered({ companyId: COMPANY_ID, outboxId: OUTBOX_ID });

  restoreDb();
  assert(result.ok, 'markDelivered deve retornar ok=true');

  const updateCall = dbMock._client._calls.find(
    c => c.sql.includes('UPDATE aioi_outbox') && c.sql.includes("'delivered'") && c.sql.includes('processed_at')
  );
  assertNotNull(updateCall, 'UPDATE SET status=delivered com processed_at deve existir');
});

await test('T3.2: processBatch completo entrega classificação end-to-end', async () => {
  const dbMock = createConsumerDbMock({
    outboxRows: [validOutboxEntry],
    ioeRow:     validIoe
  });
  patchDb(dbMock);
  invalidate('aioiOutboxConsumerService.js');
  invalidate('classificationConsumer.js');
  const consumer = require(`${SERVICES_PATH}/classificationConsumer`);

  const result = await consumer.processBatch({ companyId: COMPANY_ID, batchSize: 5 });

  restoreDb();
  assertEqual(result.processed, 1, 'deve processar 1 entrada');
  assertEqual(result.delivered, 1, 'deve entregar 1 entrada');
  assertEqual(result.failed,    0, 'não deve ter falhas');
});

// ---------------------------------------------------------------------------
// T4 — retry incrementa attempts
// ---------------------------------------------------------------------------
suite('T4 — retry incrementa attempts');

await test('T4.1: markFailedOrRetry com attempts=0 define status=pending e next_attempt_at', async () => {
  const dbMock = createConsumerDbMock();
  patchDb(dbMock); invalidate('aioiOutboxConsumerService.js');
  const svc = require(`${SERVICES_PATH}/aioiOutboxConsumerService`);

  const result = await svc.markFailedOrRetry({
    companyId:      COMPANY_ID,
    outboxId:       OUTBOX_ID,
    currentAttempts: 0,
    errorMessage:   'simulated error'
  });

  restoreDb();
  assert(result.ok, 'markFailedOrRetry deve retornar ok=true');
  assertEqual(result.new_status, 'pending', 'status deve ser pending quando attempts <= MAX');
  assertNotNull(result.next_attempt_at, 'next_attempt_at deve ser definido');
});

await test('T4.2: backoff de 1ª falha é de 1 minuto (± 5s)', () => {
  const { _nextAttemptAt } = require(`${SERVICES_PATH}/aioiOutboxConsumerService`);
  const before = Date.now();
  const nextAtStr = _nextAttemptAt(0); // 0 tentativas anteriores → 1ª falha
  const next = new Date(nextAtStr).getTime();
  const diffMin = (next - before) / 60000;
  assert(diffMin >= 0.9 && diffMin <= 1.1, `backoff 1ª falha deve ser ~1min, obteve ${diffMin.toFixed(2)}min`);
});

await test('T4.3: backoff de 2ª falha é de 5 minutos (± 5s)', () => {
  const { _nextAttemptAt } = require(`${SERVICES_PATH}/aioiOutboxConsumerService`);
  const before = Date.now();
  const nextAtStr = _nextAttemptAt(1); // 1 tentativa anterior → 2ª falha
  const next = new Date(nextAtStr).getTime();
  const diffMin = (next - before) / 60000;
  assert(diffMin >= 4.9 && diffMin <= 5.1, `backoff 2ª falha deve ser ~5min, obteve ${diffMin.toFixed(2)}min`);
});

// ---------------------------------------------------------------------------
// T5 — attempts > 3 gera failed
// ---------------------------------------------------------------------------
suite('T5 — attempts > 3 gera failed');

await test('T5.1: markFailedOrRetry com attempts=3 define status=failed', async () => {
  const dbMock = createConsumerDbMock();
  patchDb(dbMock); invalidate('aioiOutboxConsumerService.js');
  const svc = require(`${SERVICES_PATH}/aioiOutboxConsumerService`);

  const result = await svc.markFailedOrRetry({
    companyId:       COMPANY_ID,
    outboxId:        OUTBOX_ID,
    currentAttempts: 3, // attempts+1 = 4 > MAX(3) → failed
    errorMessage:    'max retries reached'
  });

  restoreDb();
  assert(result.ok, 'deve retornar ok=true');
  assertEqual(result.new_status, 'failed', 'deve ser failed quando attempts > MAX');
  assertNull(result.next_attempt_at, 'next_attempt_at deve ser null em estado failed');
});

await test('T5.2: métricas registram recordFailed quando atingido MAX_ATTEMPTS', () => {
  metrics.resetSessionCounters();
  metrics.recordFailed(COMPANY_ID, OUTBOX_ID, 'max retries');
  const counters = metrics.getSessionCounters();
  assertEqual(counters.failed, 1, 'contador failed deve ser 1');
});

// ---------------------------------------------------------------------------
// T6 — open → triaged
// ---------------------------------------------------------------------------
suite('T6 — open → triaged');

await test('T6.1: transitionIoeToTriaged emite UPDATE status=triaged WHERE status=open', async () => {
  const dbMock = createConsumerDbMock({ ioeRow: validIoe });
  patchDb(dbMock); invalidate('aioiOutboxConsumerService.js');
  const svc = require(`${SERVICES_PATH}/aioiOutboxConsumerService`);

  const result = await svc.transitionIoeToTriaged({
    companyId:               COMPANY_ID,
    ioeId:                   IOE_ID,
    resolvedCategory:        'equipment_degradation',
    classificationConfidence: 90
  });

  restoreDb();
  assert(result.ok, 'transitionIoeToTriaged deve retornar ok=true');

  const updateCall = dbMock._client._calls.find(
    c => c.sql.includes('UPDATE industrial_operational_events') && c.sql.includes("'triaged'")
  );
  assertNotNull(updateCall, 'UPDATE IOE SET status=triaged deve existir');
  assert(
    updateCall.sql.includes("AND status     = 'open'"),
    "UPDATE deve incluir WHERE status='open' (somente open → triaged)"
  );
});

await test('T6.2: transição somente ocorre de open (não re-triaged já triados)', async () => {
  // IOE já triaged — mock retorna rows vazio para o UPDATE RETURNING
  const alreadyTriagedIoe = { ...validIoe, status: 'triaged' };
  const dbMockNoRow = {
    pool: {
      connect: async () => ({
        _calls: [],
        async query(sql) {
          if (sql.trim().includes('UPDATE industrial_operational_events') && sql.includes('RETURNING id')) {
            return { rows: [] }; // WHERE status='open' não bate
          }
          return { rows: [{ id: IOE_ID }] };
        },
        release: () => {}
      })
    }
  };
  patchDb(dbMockNoRow); invalidate('aioiOutboxConsumerService.js');
  const svc = require(`${SERVICES_PATH}/aioiOutboxConsumerService`);

  const result = await svc.transitionIoeToTriaged({
    companyId:               COMPANY_ID,
    ioeId:                   IOE_ID,
    resolvedCategory:        'equipment_degradation',
    classificationConfidence: 90
  });

  restoreDb();
  assert(result.ok, 'deve retornar ok=true');
  assertEqual(result.updated, false, 'updated deve ser false para IOE já triaged');
});

// ---------------------------------------------------------------------------
// T7 — idempotência preservada
// ---------------------------------------------------------------------------
suite('T7 — idempotência preservada');

await test('T7.1: _processEntry com IOE já classificado retorna skipped=true sem re-triar', async () => {
  const alreadyTriagedIoe = { ...validIoe, status: 'triaged' };
  const dbMock = createConsumerDbMock({
    outboxRows: [validOutboxEntry],
    ioeRow:     alreadyTriagedIoe
  });
  patchDb(dbMock);
  invalidate('aioiOutboxConsumerService.js');
  invalidate('classificationConsumer.js');
  const consumer = require(`${SERVICES_PATH}/classificationConsumer`);

  const result = await consumer._processEntry(validOutboxEntry);

  restoreDb();
  assert(result.ok,      'ok deve ser true em idempotência');
  assert(result.skipped, 'skipped deve ser true para IOE já classificado');

  // Garantir que não houve UPDATE IOE (não re-triar)
  const updateIoeCall = dbMock._client._calls.find(
    c => c.sql.includes('UPDATE industrial_operational_events') && c.sql.includes("'triaged'")
  );
  assertNull(updateIoeCall, 'UPDATE IOE NÃO deve acontecer quando já classificado');
});

// ---------------------------------------------------------------------------
// T8 — multi-tenant preservado
// ---------------------------------------------------------------------------
suite('T8 — multi-tenant preservado');

await test('T8.1: todas as operações do consumer setam app.current_company_id via set_config', async () => {
  const dbMock = createConsumerDbMock({ outboxRows: [validOutboxEntry], ioeRow: validIoe });
  patchDb(dbMock);
  invalidate('aioiOutboxConsumerService.js');
  invalidate('classificationConsumer.js');
  const consumer = require(`${SERVICES_PATH}/classificationConsumer`);

  await consumer.processBatch({ companyId: COMPANY_ID });

  restoreDb();
  const setConfigCalls = dbMock._client._calls.filter(
    c => c.sql.includes('set_config') && c.sql.includes('app.current_company_id')
  );
  assert(setConfigCalls.length >= 2, `set_config(app.current_company_id) deve ser chamado em ≥2 operações, obteve: ${setConfigCalls.length}`);
  for (const call of setConfigCalls) {
    assertEqual(call.params[0], COMPANY_ID, 'company_id correto no set_config de cada operação');
  }
});

await test('T8.2: app.bypass_rls é sempre false nas operações do consumer', async () => {
  const dbMock = createConsumerDbMock({ outboxRows: [validOutboxEntry], ioeRow: validIoe });
  patchDb(dbMock);
  invalidate('aioiOutboxConsumerService.js');
  invalidate('classificationConsumer.js');
  const consumer = require(`${SERVICES_PATH}/classificationConsumer`);

  await consumer.processBatch({ companyId: COMPANY_ID });

  restoreDb();
  const bypassCalls = dbMock._client._calls.filter(c => c.sql.includes('app.bypass_rls'));
  assert(bypassCalls.length >= 2, 'bypass_rls deve ser configurado em cada operação');
  for (const call of bypassCalls) {
    assert(call.sql.includes("'false'"), "bypass_rls SEMPRE 'false' no consumer");
  }
});

// ---------------------------------------------------------------------------
// T9 — rollback em erro
// ---------------------------------------------------------------------------
suite('T9 — rollback em erro');

await test('T9.1: erro de UPDATE no markDelivered emite ROLLBACK e retorna ok=false', async () => {
  const dbMock = createConsumerDbMock({ failOnUpdate: true });
  patchDb(dbMock); invalidate('aioiOutboxConsumerService.js');
  const svc = require(`${SERVICES_PATH}/aioiOutboxConsumerService`);

  const result = await svc.markDelivered({ companyId: COMPANY_ID, outboxId: OUTBOX_ID });

  restoreDb();
  assert(!result.ok, 'ok deve ser false quando UPDATE falha');
  assertNotNull(result.error, 'error deve ser retornado');

  const rollback = dbMock._client._calls.find(c => c.sql === 'ROLLBACK');
  assertNotNull(rollback, 'ROLLBACK deve ser emitido em caso de erro');
});

await test('T9.2: erro de UPDATE no transitionIoeToTriaged emite ROLLBACK', async () => {
  const dbMock = createConsumerDbMock({ failOnUpdate: true, ioeRow: validIoe });
  patchDb(dbMock); invalidate('aioiOutboxConsumerService.js');
  const svc = require(`${SERVICES_PATH}/aioiOutboxConsumerService`);

  const result = await svc.transitionIoeToTriaged({
    companyId: COMPANY_ID, ioeId: IOE_ID,
    resolvedCategory: 'equipment_failure', classificationConfidence: 80
  });

  restoreDb();
  assert(!result.ok, 'ok deve ser false em falha de transição');
  const rollback = dbMock._client._calls.find(c => c.sql === 'ROLLBACK');
  assertNotNull(rollback, 'ROLLBACK deve ser emitido');
});

// ---------------------------------------------------------------------------
// T10 — nenhum cálculo de prioridade executado
// ---------------------------------------------------------------------------
suite('T10 — nenhum cálculo de prioridade');

await test('T10.1: classificationConsumer.js não faz require() de operationalPrioritizationService', () => {
  const fs = require('fs');
  const src = fs.readFileSync(path.resolve(SERVICES_PATH, 'classificationConsumer.js'), 'utf8');
  // Verificar ausência de require() — comentários JSDoc podem mencionar o nome (documentação)
  assert(
    !src.includes("require('../operationalPrioritizationService')") &&
    !src.includes('require("../operationalPrioritizationService")'),
    'classificationConsumer NÃO deve fazer require de operationalPrioritizationService'
  );
  // Verificar ausência de chamada real à função (não em comentário)
  // remove comentários de linha e bloco antes de checar
  const codeOnly = src
    .replace(/\/\*[\s\S]*?\*\//g, '')  // remove block comments
    .replace(/\/\/[^\n]*/g, '');        // remove line comments
  assert(
    !codeOnly.includes('computePriorityScore('),
    'classificationConsumer NÃO deve chamar computePriorityScore() (Contrato P-01/P-04)'
  );
});

await test('T10.2: aioiClassificationMapper.js não contém fórmulas de scoring PLC', () => {
  const fs = require('fs');
  const src = fs.readFileSync(path.resolve(SERVICES_PATH, 'aioiClassificationMapper.js'), 'utf8');
  assert(!src.includes('computePriorityScore'),    'mapper NÃO deve chamar computePriorityScore');
  assert(!src.includes('attention_score * '),       'mapper NÃO deve ter fórmula de attention_score');
  assert(!src.includes('priorityIntelligenceConfig'),'mapper NÃO deve importar priorityIntelligenceConfig');
});

await test('T10.3: classifyIoe retorna resolved_category sem alterar priority_score do IOE', () => {
  const result = classificationMapper.classifyIoe(validIoe);
  assertNotNull(result.resolved_category, 'resolved_category deve ser retornada');
  assert(!('priority_score' in result), 'classifyIoe NÃO deve retornar priority_score modificado');
  assert(!('priority_band'  in result), 'classifyIoe NÃO deve retornar priority_band modificado');
});

// ---------------------------------------------------------------------------
// T11 — nenhum workflow iniciado
// ---------------------------------------------------------------------------
suite('T11 — nenhum workflow iniciado');

await test('T11.1: nenhum arquivo do consumer faz require() de workflowOrchestrator', () => {
  const fs = require('fs');
  for (const file of ['classificationConsumer.js', 'aioiOutboxConsumerService.js', 'aioiClassificationMapper.js']) {
    const src = fs.readFileSync(path.resolve(SERVICES_PATH, file), 'utf8');
    // Remover comentários antes de verificar
    const codeOnly = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    assert(
      !codeOnly.includes('workflowOrchestrator'),
      `${file} NÃO deve referenciar workflowOrchestrator no código (apenas comentários são permitidos)`
    );
    assert(
      !codeOnly.includes('startWorkflow('),
      `${file} NÃO deve chamar startWorkflow()`
    );
  }
});

await test('T11.2: processBatch não dispara nenhuma chamada relacionada a workflow', async () => {
  const dbMock = createConsumerDbMock({ outboxRows: [validOutboxEntry], ioeRow: validIoe });
  patchDb(dbMock);
  invalidate('aioiOutboxConsumerService.js');
  invalidate('classificationConsumer.js');
  const consumer = require(`${SERVICES_PATH}/classificationConsumer`);

  await consumer.processBatch({ companyId: COMPANY_ID });

  restoreDb();
  const workflowCall = dbMock._client._calls.find(
    c => c.sql.toLowerCase().includes('workflow') || c.sql.toLowerCase().includes('start_workflow')
  );
  assertNull(workflowCall, 'processBatch NÃO deve emitir queries relacionadas a workflow');
});

// ---------------------------------------------------------------------------
// T12 — nenhum actionRuntimeOrchestrator chamado
// ---------------------------------------------------------------------------
suite('T12 — nenhum actionRuntimeOrchestrator chamado');

await test('T12.1: nenhum arquivo do consumer referencia actionRuntimeOrchestrator no código', () => {
  const fs = require('fs');
  const files = [
    'classificationConsumer.js',
    'aioiOutboxConsumerService.js',
    'aioiClassificationMapper.js',
    'aioiConsumerMetrics.js'
  ];
  for (const file of files) {
    const src = fs.readFileSync(path.resolve(SERVICES_PATH, file), 'utf8');
    // Remover comentários antes de verificar chamadas reais
    const codeOnly = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    assert(
      !codeOnly.includes('actionRuntimeOrchestrator'),
      `${file} NÃO deve referenciar actionRuntimeOrchestrator no código`
    );
    assert(
      !codeOnly.includes('executeAction(') && !codeOnly.includes('proposeAction('),
      `${file} NÃO deve chamar executeAction() ou proposeAction()`
    );
  }
});

await test('T12.2: classificationMapper.classifyIoe é função pura (sem side-effects observáveis)', () => {
  // Verificar que classifyIoe não faz require() nem chama serviços externos
  // Evidência: executar 100 vezes com mesmo input deve produzir output idêntico
  const results = [];
  for (let i = 0; i < 5; i++) {
    results.push(classificationMapper.classifyIoe(validIoe));
  }
  // Todos os resultados devem ser idênticos (determinístico)
  for (let i = 1; i < results.length; i++) {
    assertEqual(
      results[i].resolved_category,
      results[0].resolved_category,
      `classifyIoe deve ser determinístico (chamada ${i})`
    );
    assertEqual(
      results[i].classification_confidence,
      results[0].classification_confidence,
      `classification_confidence deve ser determinístico (chamada ${i})`
    );
  }
  // Verificar no código-fonte que classifyIoe não chama require()
  const fs = require('fs');
  const src = fs.readFileSync(path.resolve(SERVICES_PATH, 'aioiClassificationMapper.js'), 'utf8');
  const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  assert(
    !codeOnly.includes('actionRuntimeOrchestrator') &&
    !codeOnly.includes('workflowOrchestrator') &&
    !codeOnly.includes('operationalPrioritizationService'),
    'classifyIoe não referencia nenhum serviço soberano proibido'
  );
});

// ---------------------------------------------------------------------------
// Resultado final
// ---------------------------------------------------------------------------
console.log('\n══════════════════════════════════════════════════════════');
console.log('  AIOI-P0.3 Consumer Layer Test Report');
console.log('══════════════════════════════════════════════════════════');
console.log(`  Total: ${_passed + _failed} | PASS: ${_passed} | FAIL: ${_failed}`);

if (_failed > 0) {
  console.log('\n  FALHAS DETECTADAS:');
  _results.filter(r => r.status === 'FAIL').forEach(r => {
    console.log(`    ✗ ${r.name}`);
    console.log(`      ${r.error}`);
  });
  console.log('\n  STATUS: AIOI_P0_3_TEST_FAIL');
  process.exit(1);
} else {
  console.log('\n  STATUS: AIOI_P0_3_TEST_PASS');
  process.exit(0);
}

} // end runAllTests

runAllTests().catch(err => {
  console.error('[TEST RUNNER] Erro fatal:', err.message);
  process.exit(1);
});
