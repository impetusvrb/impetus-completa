'use strict';

/**
 * AIOI-P0.2 — Testes automatizados da Adapter Layer
 *
 * Cobertura obrigatória (9 casos):
 *   T1 — Persistência de IOE
 *   T2 — Persistência de Outbox
 *   T3 — Rollback transacional em erro
 *   T4 — Idempotência (ON CONFLICT DO NOTHING)
 *   T5 — Isolamento multi-tenant
 *   T6 — Uso obrigatório do operationalPrioritizationService
 *   T7 — Proibição de duplicação de IOE
 *   T8 — Geração correta de correlation_id
 *   T9 — Inserção simultânea IOE + Outbox
 *
 * Executar:
 *   node src/tests/aioi/aioiAdapterLayer.test.js
 *
 * Meta: 100% PASS. Sem dependência de banco real (mocks de db).
 */

// ---------------------------------------------------------------------------
// Infraestrutura de testes mínima (sem Jest/Mocha — compatível com padrão do projeto)
// ---------------------------------------------------------------------------
let _passed = 0;
let _failed = 0;
const _results = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} — expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)}`);
  }
}

function assertNotNull(value, message) {
  if (value == null) {
    throw new Error(`${message} — valor é null/undefined`);
  }
}

function assertMatch(str, pattern, message) {
  if (!pattern.test(String(str))) {
    throw new Error(`${message} — "${str}" não bate com ${pattern}`);
  }
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
// Mocks de infraestrutura
// ---------------------------------------------------------------------------

/** Mock do pool de DB com suporte a transação e rastreamento de chamadas */
function createDbMock({ conflictOnIoe = false, conflictOnOutbox = false, failOnInsert = false } = {}) {
  const calls = [];
  const client = {
    _calls: calls,
    async query(sql, params) {
      calls.push({ sql: sql.trim(), params }); // SQL completo — sem truncamento

      if (failOnInsert && sql.includes('INSERT INTO industrial_operational_events')) {
        throw new Error('DB_MOCK: simulated insert failure');
      }
      if (sql.includes('INSERT INTO industrial_operational_events')) {
        return conflictOnIoe ? { rows: [] } : { rows: [{ id: 'ioe-mock-id-0001' }] };
      }
      if (sql.includes('INSERT INTO aioi_outbox')) {
        return conflictOnOutbox ? { rows: [] } : { rows: [{ id: 'outbox-mock-id-0001' }] };
      }
      return { rows: [] };
    },
    release: () => {}
  };

  return {
    pool: {
      connect: async () => client
    },
    _client: client
  };
}

// ---------------------------------------------------------------------------
// Carregamento dos módulos com mocks injetados via Module override
// ---------------------------------------------------------------------------

const path = require('path');
const Module = require('module');

const SERVICES_PATH = path.resolve(__dirname, '../../services/aioi');

/**
 * Carrega um módulo AIOI substituindo o require('../../db') pelo dbMock fornecido.
 * Evita contaminação global entre testes.
 */
function loadIngestionWithMock(dbMock) {
  // Invalidar cache para obter instância fresca
  const modPath = require.resolve(`${SERVICES_PATH}/aioiEventIngestionService.js`);
  delete require.cache[modPath];

  // Patch temporário do db para este carregamento
  const dbModPath = require.resolve('../../db');
  const originalDb = require.cache[dbModPath]?.exports;
  if (require.cache[dbModPath]) {
    require.cache[dbModPath].exports = dbMock;
  }

  const mod = require(modPath);

  // Restaurar db original
  if (originalDb && require.cache[dbModPath]) {
    require.cache[dbModPath].exports = originalDb;
  }

  return mod;
}

// Patch persistente do db para todos os testes (restaurado ao final)
const DB_MOD_PATH = (() => {
  try { return require.resolve('../../db'); } catch { return null; }
})();

let _originalDb;

function patchDb(dbMock) {
  if (DB_MOD_PATH && require.cache[DB_MOD_PATH]) {
    _originalDb = require.cache[DB_MOD_PATH].exports;
    require.cache[DB_MOD_PATH].exports = dbMock;
  }
}

function restoreDb() {
  if (DB_MOD_PATH && _originalDb && require.cache[DB_MOD_PATH]) {
    require.cache[DB_MOD_PATH].exports = _originalDb;
  }
}

// Carregamento uma vez do ingestionService (sem mock de db ainda; usado para funções puras)
const ingestion = require(`${SERVICES_PATH}/aioiEventIngestionService`);
const plcAdapter = require(`${SERVICES_PATH}/plcAioiAdapter`);
const commAdapter = require(`${SERVICES_PATH}/communicationAioiAdapter`);
const taskAdapter = require(`${SERVICES_PATH}/taskAioiAdapter`);
const mesAdapter  = require(`${SERVICES_PATH}/mesAioiAdapter`);

// ---------------------------------------------------------------------------
// Fixtures de teste
// ---------------------------------------------------------------------------

const VALID_COMPANY_ID  = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
// OTHER_COMPANY_ID reservado para testes futuros de cross-tenant
const VALID_TENANT_KEY  = 'tenant-test-01';

const validPlcEvent = {
  id:                 'plc-evt-001',
  equipment_id:       'equip-uuid-abc',
  event_type:         'EQUIPMENT_ATTENTION_REQUIRED',
  attention_score:    70,
  risk_score:         50,
  event_confidence:   80,
  pattern_confidence: 60,
  telemetry_health:   90,
  truth_state:        'telemetry_only'
};

const validCommRecord = {
  id:         'comm-001',
  type:       'incident',
  risk_level: 'critica',
  subject:    'Falha crítica detectada em linha A'
};

const validWorkOrder = {
  id:       'wo-001',
  priority: 'critical',
  status:   'open',
  type:     'maintenance',
  title:    'Substituição urgente de rolamento',
  _source:  'work_order'
};

const validMesRecord = {
  id:              'shift-001',
  line_identifier: 'linha-A',
  shift_code:      'T1',
  shift_date:      '2026-06-05',
  produced_qty:    600,
  target_qty:      1000,
  oee:             0.62
};

// ---------------------------------------------------------------------------
// Wrapper principal assíncrono (CJS não suporta top-level await)
// ---------------------------------------------------------------------------
async function runAllTests() {

// ---------------------------------------------------------------------------
// T1 — Persistência de IOE
// ---------------------------------------------------------------------------
suite('T1 — Persistência de IOE');

await test('T1.1: buildPlcIoePayload gera payload com source_type=plc_event', async () => {
  const payload = plcAdapter.buildPlcIoePayload({
    companyId:  VALID_COMPANY_ID,
    tenantKey:  VALID_TENANT_KEY,
    plcEvent:   validPlcEvent,
    sourceType: 'plc_event'
  });
  assertEqual(payload.source_type, 'plc_event', 'source_type deve ser plc_event');
  assertEqual(payload.company_id, VALID_COMPANY_ID, 'company_id deve ser preservado');
  assert(payload.idempotency_key.startsWith('plc_event:equipment:equip-uuid-abc:'), 'idempotency_key formato correto');
  assert(payload.entity_type === 'equipment', 'entity_type deve ser equipment');
});

await test('T1.2: ingestIoe persiste IOE e retorna ioe_id', async () => {
  const dbMock = createDbMock();
  patchDb(dbMock);
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiEventIngestionService.js`)];
  const ing = require(`${SERVICES_PATH}/aioiEventIngestionService`);

  const payload = plcAdapter.buildPlcIoePayload({
    companyId: VALID_COMPANY_ID,
    tenantKey: VALID_TENANT_KEY,
    plcEvent:  validPlcEvent
  });
  const result = await ing.ingestIoe(payload);

  restoreDb();
  assert(result.ok, `ingestIoe deve retornar ok=true, erro: ${result.error}`);
  assertNotNull(result.ioe_id, 'ioe_id deve ser retornado');
});

await test('T1.3: payload IOE contém priority_score proveniente de computePriorityScore', async () => {
  const payload = plcAdapter.buildPlcIoePayload({
    companyId: VALID_COMPANY_ID,
    tenantKey: VALID_TENANT_KEY,
    plcEvent:  validPlcEvent
  });
  assert(typeof payload.priority_score === 'number', 'priority_score deve ser numérico');
  assert(payload.priority_score >= 0 && payload.priority_score <= 100, 'priority_score deve ser 0–100');
  assert(['critical', 'high', 'medium', 'low'].includes(payload.priority_band), 'priority_band deve ser valor válido');
  // Confirma que evidence_refs contém a rastreabilidade do F47
  assert(
    payload.evidence_refs.some(e => e.type === 'priority_pack_f47'),
    'evidence_refs deve conter referência priority_pack_f47 (Contrato P-03)'
  );
});

// ---------------------------------------------------------------------------
// T2 — Persistência de Outbox
// ---------------------------------------------------------------------------
suite('T2 — Persistência de Outbox');

await test('T2.1: ingestIoe insere em aioi_outbox com consumer_type=classification', async () => {
  const dbMock = createDbMock();
  patchDb(dbMock);
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiEventIngestionService.js`)];
  const ing = require(`${SERVICES_PATH}/aioiEventIngestionService`);

  const payload = plcAdapter.buildPlcIoePayload({
    companyId: VALID_COMPANY_ID,
    tenantKey: VALID_TENANT_KEY,
    plcEvent:  validPlcEvent
  });
  const result = await ing.ingestIoe(payload);

  restoreDb();
  assert(result.ok, 'deve retornar ok=true');
  assertNotNull(result.outbox_id, 'outbox_id deve ser retornado');

  const outboxInsertCall = dbMock._client._calls.find(
    c => c.sql.includes('INSERT INTO aioi_outbox')
  );
  assertNotNull(outboxInsertCall, 'deve haver INSERT INTO aioi_outbox');
  const outboxParams = outboxInsertCall.params;
  assertEqual(outboxParams[3], 'classification', 'consumer_type deve ser classification');
  assertEqual(outboxParams[4], 'pending', 'status deve ser pending');
});

await test('T2.2: outbox_idempotency_key segue formato classification:{ioe_id}', async () => {
  const dbMock = createDbMock();
  patchDb(dbMock);
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiEventIngestionService.js`)];
  const ing = require(`${SERVICES_PATH}/aioiEventIngestionService`);

  const payload = plcAdapter.buildPlcIoePayload({
    companyId: VALID_COMPANY_ID,
    tenantKey: VALID_TENANT_KEY,
    plcEvent:  validPlcEvent
  });
  await ing.ingestIoe(payload);

  restoreDb();
  const outboxCall = dbMock._client._calls.find(c => c.sql.includes('INSERT INTO aioi_outbox'));
  assertNotNull(outboxCall, 'INSERT INTO aioi_outbox deve existir');
  const idempotencyKey = outboxCall.params[5];
  // Formato: 'classification:{ioe_id}' onde ioe_id vem do RETURNING id (qualquer string não-vazia)
  assertMatch(idempotencyKey, /^classification:.+$/, 'outbox idempotency_key deve começar com classification:');
  assert(idempotencyKey.split(':').length >= 2, 'deve ter prefixo classification seguido de ioe_id');
});

// ---------------------------------------------------------------------------
// T3 — Rollback transacional em erro
// ---------------------------------------------------------------------------
suite('T3 — Rollback transacional em erro');

await test('T3.1: erro no INSERT IOE causa ROLLBACK e retorna ok=false', async () => {
  const dbMock = createDbMock({ failOnInsert: true });
  patchDb(dbMock);
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiEventIngestionService.js`)];
  const ing = require(`${SERVICES_PATH}/aioiEventIngestionService`);

  const payload = plcAdapter.buildPlcIoePayload({
    companyId: VALID_COMPANY_ID,
    tenantKey: VALID_TENANT_KEY,
    plcEvent:  validPlcEvent
  });
  const result = await ing.ingestIoe(payload);

  restoreDb();
  assert(!result.ok, 'deve retornar ok=false quando há falha de INSERT');
  assertNotNull(result.error, 'deve retornar mensagem de erro');

  const rollbackCall = dbMock._client._calls.find(c => c.sql === 'ROLLBACK');
  assertNotNull(rollbackCall, 'ROLLBACK deve ter sido chamado após o erro');

  const outboxInsertCall = dbMock._client._calls.find(
    c => c.sql.includes('INSERT INTO aioi_outbox')
  );
  assert(!outboxInsertCall, 'INSERT INTO aioi_outbox NÃO deve ter sido executado após falha');
});

// ---------------------------------------------------------------------------
// T4 — Idempotência
// ---------------------------------------------------------------------------
suite('T4 — Idempotência (ON CONFLICT DO NOTHING)');

await test('T4.1: segundo INSERT com mesma idempotency_key retorna duplicate=true, ok=true', async () => {
  const dbMock = createDbMock({ conflictOnIoe: true });
  patchDb(dbMock);
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiEventIngestionService.js`)];
  const ing = require(`${SERVICES_PATH}/aioiEventIngestionService`);

  const payload = plcAdapter.buildPlcIoePayload({
    companyId: VALID_COMPANY_ID,
    tenantKey: VALID_TENANT_KEY,
    plcEvent:  validPlcEvent
  });
  const result = await ing.ingestIoe(payload);

  restoreDb();
  assert(result.ok, 'ok=true mesmo em duplicata');
  assert(result.duplicate === true, 'duplicate deve ser true');
  assert(!result.ioe_id, 'ioe_id não deve ser retornado em duplicata');
});

await test('T4.2: buildIdempotencyKey gera chave estável para mesmos inputs', () => {
  const date = new Date('2026-06-05T14:30:00Z');
  const k1 = ingestion.buildIdempotencyKey('plc_event', 'equipment', 'equip-001', date);
  const k2 = ingestion.buildIdempotencyKey('plc_event', 'equipment', 'equip-001', date);
  assertEqual(k1, k2, 'idempotency_key deve ser determinístico');
  assertMatch(k1, /^plc_event:equipment:equip-001:2026-06-05T14$/, 'formato correto com bucket hora');
});

await test('T4.3: buildIdempotencyKey gera chaves distintas para entity_ids diferentes', () => {
  const date = new Date('2026-06-05T14:00:00Z');
  const k1 = ingestion.buildIdempotencyKey('plc_event', 'equipment', 'equip-001', date);
  const k2 = ingestion.buildIdempotencyKey('plc_event', 'equipment', 'equip-002', date);
  assert(k1 !== k2, 'chaves distintas para entidades distintas');
});

// ---------------------------------------------------------------------------
// T5 — Isolamento multi-tenant
// ---------------------------------------------------------------------------
suite('T5 — Isolamento multi-tenant');

await test('T5.1: ingestIoe seta app.current_company_id via set_config antes do INSERT', async () => {
  const dbMock = createDbMock();
  patchDb(dbMock);
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiEventIngestionService.js`)];
  const ing = require(`${SERVICES_PATH}/aioiEventIngestionService`);

  const payload = plcAdapter.buildPlcIoePayload({
    companyId: VALID_COMPANY_ID,
    tenantKey: VALID_TENANT_KEY,
    plcEvent:  validPlcEvent
  });
  await ing.ingestIoe(payload);

  restoreDb();
  const setConfigCall = dbMock._client._calls.find(
    c => c.sql.includes('set_config') && c.sql.includes('app.current_company_id')
  );
  assertNotNull(setConfigCall, 'set_config(app.current_company_id) deve ser chamado (RLS)');
  assertEqual(setConfigCall.params[0], VALID_COMPANY_ID, 'company_id correto no set_config');
});

await test('T5.2: ingestIoe desabilita bypass_rls (app.bypass_rls = false)', async () => {
  const dbMock = createDbMock();
  patchDb(dbMock);
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiEventIngestionService.js`)];
  const ing = require(`${SERVICES_PATH}/aioiEventIngestionService`);

  const payload = plcAdapter.buildPlcIoePayload({
    companyId: VALID_COMPANY_ID,
    tenantKey: VALID_TENANT_KEY,
    plcEvent:  validPlcEvent
  });
  await ing.ingestIoe(payload);

  restoreDb();
  const bypassCall = dbMock._client._calls.find(
    c => c.sql.includes('app.bypass_rls')
  );
  assertNotNull(bypassCall, 'app.bypass_rls deve ser configurado');
  assert(bypassCall.sql.includes("'false'"), "bypass_rls deve ser 'false'");
});

await test('T5.3: company_id está presente em todos os payloads dos adapters', () => {
  const plcPayload  = plcAdapter.buildPlcIoePayload({ companyId: VALID_COMPANY_ID, tenantKey: VALID_TENANT_KEY, plcEvent: validPlcEvent });
  const commPayload = commAdapter.buildCommIoePayload({ companyId: VALID_COMPANY_ID, tenantKey: VALID_TENANT_KEY, communication: validCommRecord });
  const taskPayload = taskAdapter.buildTaskIoePayload({ companyId: VALID_COMPANY_ID, tenantKey: VALID_TENANT_KEY, record: validWorkOrder });
  const mesPayload  = mesAdapter.buildMesIoePayload({ companyId: VALID_COMPANY_ID, tenantKey: VALID_TENANT_KEY, mesRecord: validMesRecord });

  for (const [name, p] of [['plc', plcPayload], ['comm', commPayload], ['task', taskPayload], ['mes', mesPayload]]) {
    assertEqual(p.company_id, VALID_COMPANY_ID, `company_id incorreto no adapter ${name}`);
    assertNotNull(p.tenant_key, `tenant_key ausente no adapter ${name}`);
  }
});

// ---------------------------------------------------------------------------
// T6 — Uso obrigatório do operationalPrioritizationService
// ---------------------------------------------------------------------------
suite('T6 — Uso obrigatório de operationalPrioritizationService');

await test('T6.1: plcAioiAdapter importa e usa computePriorityScore do serviço soberano', () => {
  // Verificação via análise de código-fonte (require binding é fixo — mock pós-load não alcança)
  const fs = require('fs');
  const src = fs.readFileSync(path.resolve(SERVICES_PATH, 'plcAioiAdapter.js'), 'utf8');

  // Verifica que o módulo soberano está importado via require
  assert(
    src.includes("require('../operationalPrioritizationService')"),
    'plcAioiAdapter deve importar operationalPrioritizationService (Contrato P-02)'
  );
  // Verifica que computePriorityScore está desestruturado do import
  assert(
    src.includes('computePriorityScore'),
    'computePriorityScore deve estar presente (Contrato P-01)'
  );
  // Verifica que computePriorityScore é chamado com os components (não apenas importado)
  assert(
    src.includes('computePriorityScore(components)'),
    'computePriorityScore(components) deve ser chamado — não apenas importado (Contrato P-04)'
  );

  // Verifica que o resultado é usado para definir priority_score (não sobrescrito)
  assert(
    src.includes('priorityResult.priority_score'),
    'priority_score deve vir de priorityResult.priority_score (resultado de computePriorityScore)'
  );

  // Verifica evidence_refs via execução real
  const payload = plcAdapter.buildPlcIoePayload({
    companyId: VALID_COMPANY_ID,
    tenantKey: VALID_TENANT_KEY,
    plcEvent:  validPlcEvent
  });
  assert(
    payload.evidence_refs.some(e => e.type === 'priority_pack_f47'),
    'evidence_refs deve ter entry priority_pack_f47 (Contrato P-03)'
  );
});

await test('T6.2: plcAioiAdapter não contém algoritmo local de scoring (Contrato P-04)', () => {
  const fs = require('fs');
  const src = fs.readFileSync(path.resolve(SERVICES_PATH, 'plcAioiAdapter.js'), 'utf8');

  // Padrões que indicam cálculo local de score (fórmulas aritméticas de prioridade)
  // O padrão busca atribuição direta à variável (não como propriedade de objeto com :)
  // Exemplos proibidos: `let priority_score = a * w1 + b * w2`
  const FORBIDDEN = [
    // Variável local recebendo fórmula de score — atenção: objeto literal usa ':', não '='
    /\blet\s+priority_score\s*=/,
    /\bconst\s+priority_score\s*=\s*[^r]/, // const priority_score = algo que não começa com 'r' (resultadoXxx)
    /\battention\s*\*.*\+.*risk\s*\*/,      // fórmula explícita attention * w + risk * w
    /score\s*=\s*Math\.round\([^)]+\*[^)]+\+[^)]+\*/ // weighted sum manual
  ];

  for (const pattern of FORBIDDEN) {
    if (pattern.test(src)) {
      throw new Error(`plcAioiAdapter contém cálculo local proibido (Contrato P-04): ${pattern.source}`);
    }
  }

  // Garantir que buildPriorityEvidence é usado (Contrato P-03)
  assert(src.includes('buildPriorityEvidence'), 'buildPriorityEvidence deve ser invocado (P-03)');
  // Garantir ausência de pesos manuais (w1, w2, etc.)
  assert(!(/\bw[1-5]\b/.test(src)), 'plcAioiAdapter não deve definir pesos w1–w5 (esses pertencem a priorityIntelligenceConfig)');
});

// ---------------------------------------------------------------------------
// T7 — Proibição de duplicação de IOE
// ---------------------------------------------------------------------------
suite('T7 — Proibição de duplicação de IOE');

await test('T7.1: INSERT IOE usa ON CONFLICT(company_id, idempotency_key) DO NOTHING', async () => {
  const dbMock = createDbMock();
  patchDb(dbMock);
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiEventIngestionService.js`)];
  const ing = require(`${SERVICES_PATH}/aioiEventIngestionService`);

  const payload = plcAdapter.buildPlcIoePayload({
    companyId: VALID_COMPANY_ID,
    tenantKey: VALID_TENANT_KEY,
    plcEvent:  validPlcEvent
  });
  await ing.ingestIoe(payload);

  restoreDb();
  const ioeInsertCall = dbMock._client._calls.find(
    c => c.sql.includes('INSERT INTO industrial_operational_events')
  );
  assertNotNull(ioeInsertCall, 'INSERT INTO industrial_operational_events deve existir');
  assert(
    ioeInsertCall.sql.includes('ON CONFLICT') && ioeInsertCall.sql.includes('DO NOTHING'),
    'INSERT IOE deve usar ON CONFLICT ... DO NOTHING'
  );
});

await test('T7.2: INSERT aioi_outbox usa ON CONFLICT(idempotency_key) DO NOTHING', async () => {
  const dbMock = createDbMock();
  patchDb(dbMock);
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiEventIngestionService.js`)];
  const ing = require(`${SERVICES_PATH}/aioiEventIngestionService`);

  const payload = plcAdapter.buildPlcIoePayload({
    companyId: VALID_COMPANY_ID,
    tenantKey: VALID_TENANT_KEY,
    plcEvent:  validPlcEvent
  });
  await ing.ingestIoe(payload);

  restoreDb();
  const outboxCall = dbMock._client._calls.find(
    c => c.sql.includes('INSERT INTO aioi_outbox')
  );
  assertNotNull(outboxCall, 'INSERT INTO aioi_outbox deve existir');
  assert(
    outboxCall.sql.includes('ON CONFLICT') && outboxCall.sql.includes('DO NOTHING'),
    'INSERT OUTBOX deve usar ON CONFLICT ... DO NOTHING'
  );
});

// ---------------------------------------------------------------------------
// T8 — Geração correta de correlation_id
// ---------------------------------------------------------------------------
suite('T8 — Geração de correlation_id');

await test('T8.1: generateCorrelationId retorna string no formato ioe-{uuid}', () => {
  const corrId = ingestion.generateCorrelationId();
  assertMatch(corrId, /^ioe-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, 'formato ioe-{uuid}');
});

await test('T8.2: generateCorrelationId gera valores únicos (sem colisão)', () => {
  const ids = new Set(Array.from({ length: 100 }, () => ingestion.generateCorrelationId()));
  assertEqual(ids.size, 100, '100 correlation_ids únicos');
});

await test('T8.3: correlation_id heredado pelo caller é preservado no payload', () => {
  const inheritedCorrId = 'inherited-correlation-abc-123';
  const payload = plcAdapter.buildPlcIoePayload({
    companyId:     VALID_COMPANY_ID,
    tenantKey:     VALID_TENANT_KEY,
    plcEvent:      validPlcEvent,
    correlationId: inheritedCorrId
  });
  assertEqual(payload.correlation_id, inheritedCorrId, 'correlation_id herdado deve ser preservado');
});

await test('T8.4: se correlationId não for fornecido, um novo é gerado automaticamente', () => {
  const payload = plcAdapter.buildPlcIoePayload({
    companyId: VALID_COMPANY_ID,
    tenantKey: VALID_TENANT_KEY,
    plcEvent:  validPlcEvent
    // correlationId: omitido
  });
  assertNotNull(payload.correlation_id, 'correlation_id deve ser gerado mesmo quando omitido');
  assertMatch(payload.correlation_id, /^ioe-[0-9a-f\-]{36}$/, 'correlation_id gerado no formato correto');
});

// ---------------------------------------------------------------------------
// T9 — Inserção simultânea IOE + Outbox na mesma transação
// ---------------------------------------------------------------------------
suite('T9 — Inserção simultânea IOE + Outbox');

await test('T9.1: IOE e Outbox inseridos dentro do mesmo BEGIN/COMMIT', async () => {
  const dbMock = createDbMock();
  patchDb(dbMock);
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiEventIngestionService.js`)];
  const ing = require(`${SERVICES_PATH}/aioiEventIngestionService`);

  const payload = plcAdapter.buildPlcIoePayload({
    companyId: VALID_COMPANY_ID,
    tenantKey: VALID_TENANT_KEY,
    plcEvent:  validPlcEvent
  });
  const result = await ing.ingestIoe(payload);

  restoreDb();
  assert(result.ok, 'ingestIoe deve ter sucesso');

  const calls = dbMock._client._calls.map(c => c.sql);
  const beginIdx  = calls.findIndex(s => s === 'BEGIN');
  const ioeIdx    = calls.findIndex(s => s.includes('INSERT INTO industrial_operational_events'));
  const outboxIdx = calls.findIndex(s => s.includes('INSERT INTO aioi_outbox'));
  const commitIdx = calls.findIndex(s => s === 'COMMIT');

  assert(beginIdx >= 0,  'BEGIN deve estar presente');
  assert(ioeIdx >= 0,    'INSERT IOE deve estar presente');
  assert(outboxIdx >= 0, 'INSERT OUTBOX deve estar presente');
  assert(commitIdx >= 0, 'COMMIT deve estar presente');

  // Ordem obrigatória: BEGIN < IOE < OUTBOX < COMMIT
  assert(beginIdx < ioeIdx,    'BEGIN deve preceder INSERT IOE');
  assert(ioeIdx   < outboxIdx, 'INSERT IOE deve preceder INSERT OUTBOX');
  assert(outboxIdx < commitIdx,'INSERT OUTBOX deve preceder COMMIT');
});

await test('T9.2: todos os 4 adapters produzem payload válido (validação mínima)', () => {
  const payloads = [
    plcAdapter.buildPlcIoePayload({ companyId: VALID_COMPANY_ID, tenantKey: VALID_TENANT_KEY, plcEvent: validPlcEvent }),
    commAdapter.buildCommIoePayload({ companyId: VALID_COMPANY_ID, tenantKey: VALID_TENANT_KEY, communication: validCommRecord }),
    taskAdapter.buildTaskIoePayload({ companyId: VALID_COMPANY_ID, tenantKey: VALID_TENANT_KEY, record: validWorkOrder }),
    mesAdapter.buildMesIoePayload({ companyId: VALID_COMPANY_ID, tenantKey: VALID_TENANT_KEY, mesRecord: validMesRecord })
  ];

  const REQUIRED = ['company_id', 'tenant_key', 'idempotency_key', 'correlation_id',
                    'source_type', 'category', 'entity_type'];

  for (const [i, p] of payloads.entries()) {
    for (const field of REQUIRED) {
      assert(p[field] != null && p[field] !== '', `Adapter[${i}]: campo obrigatório "${field}" ausente`);
    }
    assert(
      p.priority_score >= 0 && p.priority_score <= 100,
      `Adapter[${i}]: priority_score fora do range 0-100`
    );
  }
});

// ---------------------------------------------------------------------------
// Resultado final
// ---------------------------------------------------------------------------

console.log('\n══════════════════════════════════════════════════════════');
console.log('  AIOI-P0.2 Adapter Layer Test Report');
console.log('══════════════════════════════════════════════════════════');
console.log(`  Total: ${_passed + _failed} | PASS: ${_passed} | FAIL: ${_failed}`);

if (_failed > 0) {
  console.log('\n  FALHAS DETECTADAS:');
  _results.filter(r => r.status === 'FAIL').forEach(r => {
    console.log(`    ✗ ${r.name}`);
    console.log(`      ${r.error}`);
  });
  console.log('\n  STATUS: AIOI_P0_2_TEST_FAIL');
  process.exit(1);
} else {
  console.log('\n  STATUS: AIOI_P0_2_TEST_PASS');
  process.exit(0);
}
} // end runAllTests

runAllTests().catch(err => {
  console.error('[TEST RUNNER] Erro fatal:', err.message);
  process.exit(1);
});
