'use strict';

/**
 * AIOI-P0.4 — Testes automatizados do Decision Bridge Layer
 *
 * Cobertura obrigatória (15 casos):
 *   T1  — decisão gerada para IOE triaged
 *   T2  — IOE sem decisão recebe payload
 *   T3  — IOE com decisão existente é ignorado
 *   T4  — operationalDecisionEngine é chamado
 *   T5  — nenhuma decisão local é criada
 *   T6  — nenhum workflow iniciado
 *   T7  — nenhum actionRuntime executado
 *   T8  — idempotência preservada
 *   T9  — multi-tenant preservado
 *   T10 — rollback em erro
 *   T11 — payload persistido corretamente
 *   T12 — approved_by_user_id continua NULL
 *   T13 — approved_at continua NULL
 *   T14 — métricas emitidas corretamente
 *   T15 — logs estruturados corretos
 *
 * Executar:
 *   node src/tests/aioi/aioiDecisionBridge.test.js
 *
 * Meta: 100% PASS.
 */

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

const path = require('path');
const fs = require('fs');
const SERVICES_PATH = path.resolve(__dirname, '../../services/aioi');

const payloadBuilder = require(`${SERVICES_PATH}/aioiDecisionPayloadBuilder`);
const metrics = require(`${SERVICES_PATH}/aioiDecisionMetrics`);

// DB mock infrastructure
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
  delete require.cache[require.resolve(`${SERVICES_PATH}/${relPath}`)];
}

// Fixtures
const COMPANY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const IOE_ID     = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33';

const validTriagedIoe = {
  id:              IOE_ID,
  company_id:      COMPANY_ID,
  status:          'triaged',
  category:        'equipment_degradation',
  source_type:     'plc_event',
  priority_band:   'high',
  priority_score:  60,
  truth_state:     'telemetry_only',
  entity_type:     'equipment',
  entity_id:       'equip-001',
  equipment_id:    'equip-001',
  classification_conf: 90,
  correlation_id:  'ioe-test-corr-abc-123',
  evidence_refs:   [{ type: 'priority_pack_f47', ref_id: 'pack-1', confidence: 60 }],
  decision_type:   null,
  decision_payload: null,
  approved_by_user_id: null,
  approved_at:     null
};

const ioeWithDecision = {
  ...validTriagedIoe,
  decision_type:    'suggest_only',
  decision_payload: {
    recommendation: 'Revisar equipamento',
    rationale:      'Degradação detectada',
    confidence:     90,
    source:         'operationalDecisionEngine',
    generated_at:   '2026-06-05T10:00:00.000Z'
  }
};

function createDecisionDbMock({
  ioeRow = validTriagedIoe,
  ioesWithoutDecision = [validTriagedIoe],
  failOnUpdate = false,
  updateReturnsNull = false
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

      // fetchTriagedIoe / fetchTriagedIoesWithoutDecision
      if (s.includes('SELECT') && s.includes('industrial_operational_events')) {
        if (s.includes('decision_type   IS NULL')) {
          return { rows: ioesWithoutDecision };
        }
        return { rows: ioeRow ? [ioeRow] : [] };
      }

      // persistDecisionSuggestion
      if (s.includes('UPDATE industrial_operational_events') && s.includes('decision_type')) {
        if (updateReturnsNull) return { rows: [] };
        return {
          rows: [{
            id: IOE_ID,
            approved_by_user_id: null,
            approved_at: null
          }]
        };
      }

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

// Mock ODE for tests that need controlled evaluation
function mockOdeModule(evaluation) {
  const odePath = require.resolve('../../services/operationalDecisionEngine');
  const original = require.cache[odePath]?.exports;
  require.cache[odePath] = {
    id: odePath,
    filename: odePath,
    loaded: true,
    exports: {
      evaluateOperationalDecisions: () => evaluation || {
        triggers: [{ id: 'ode_immediate_1', horizon: 'immediate', reason: 'Plano inclui ação imediata com prioridade CRITICAL' }],
        alerts: [{ severity: 'high', code: 'IMMEDIATE_CRITICAL', message: 'Ação CRITICAL detectada', kind: 'suggestion_only' }],
        recommended_actions: [{ horizon: 'immediate', action: 'Investigar equipamento', reason: 'Degradação', priority: 'HIGH', source: 'operational_plan' }]
      },
      scheduleOperationalDecisionSignals: () => { throw new Error('scheduleOperationalDecisionSignals NÃO deve ser chamado em P0.4'); }
    }
  };
  return original;
}

function restoreOdeModule(original) {
  if (!original) return;
  const odePath = require.resolve('../../services/operationalDecisionEngine');
  require.cache[odePath].exports = original;
}

// ---------------------------------------------------------------------------
async function runAllTests() {

metrics.resetSessionCounters();

// ---------------------------------------------------------------------------
// T1 — decisão gerada para IOE triaged
// ---------------------------------------------------------------------------
suite('T1 — decisão gerada para IOE triaged');

await test('T1.1: processDecisionForIoe gera sugestão para IOE triaged sem decisão', async () => {
  const dbMock = createDecisionDbMock();
  const odeOrig = mockOdeModule();
  patchDb(dbMock);
  invalidate('aioiDecisionBridgeService.js');
  const bridge = require(`${SERVICES_PATH}/aioiDecisionBridgeService`);

  const result = await bridge.processDecisionForIoe({ companyId: COMPANY_ID, ioeId: IOE_ID });

  restoreDb();
  restoreOdeModule(odeOrig);
  assert(result.ok, `deve retornar ok=true, erro: ${result.error}`);
  assertNotNull(result.decision_type, 'decision_type deve ser retornado');
  assert(['suggest_only', 'escalate'].includes(result.decision_type), 'decision_type deve ser suggest_only ou escalate');
});

// ---------------------------------------------------------------------------
// T2 — IOE sem decisão recebe payload
// ---------------------------------------------------------------------------
suite('T2 — IOE sem decisão recebe payload');

await test('T2.1: persistDecisionSuggestion grava decision_type e decision_payload', async () => {
  const dbMock = createDecisionDbMock();
  patchDb(dbMock);
  invalidate('aioiDecisionBridgeService.js');
  const bridge = require(`${SERVICES_PATH}/aioiDecisionBridgeService`);

  const payload = {
    recommendation: 'Investigar equipamento',
    rationale:      'Degradação detectada via PLC',
    confidence:     90,
    source:         'operationalDecisionEngine',
    generated_at:   new Date().toISOString()
  };

  const result = await bridge.persistDecisionSuggestion({
    companyId: COMPANY_ID,
    ioeId: IOE_ID,
    decisionType: 'suggest_only',
    decisionPayload: payload
  });

  restoreDb();
  assert(result.ok, 'persistDecisionSuggestion deve retornar ok=true');
  assert(result.updated, 'updated deve ser true');

  const updateCall = dbMock._client._calls.find(
    c => c.sql.includes('UPDATE industrial_operational_events') && c.sql.includes('decision_payload')
  );
  assertNotNull(updateCall, 'UPDATE com decision_payload deve existir');
  assertEqual(updateCall.params[2], 'suggest_only', 'decision_type correto no UPDATE');
});

await test('T2.2: buildDecisionPayload produz formato canônico com 5 campos', () => {
  const evaluation = {
    alerts: [{ severity: 'high', code: 'IMMEDIATE_CRITICAL', message: 'Ação CRITICAL' }],
    triggers: [{ reason: 'Prioridade elevada' }],
    recommended_actions: [{ action: 'Investigar', reason: 'Degradação' }]
  };
  const payload = payloadBuilder.buildDecisionPayload(evaluation, validTriagedIoe);
  assert(payloadBuilder.isValidDecisionPayload(payload), 'payload deve ser válido');
  assertEqual(payload.source, 'operationalDecisionEngine', 'source deve ser operationalDecisionEngine');
  assert(typeof payload.recommendation === 'string', 'recommendation deve ser string');
  assert(typeof payload.rationale === 'string', 'rationale deve ser string');
  assert(typeof payload.confidence === 'number', 'confidence deve ser number');
  assert(typeof payload.generated_at === 'string', 'generated_at deve ser string');
});

// ---------------------------------------------------------------------------
// T3 — IOE com decisão existente é ignorado
// ---------------------------------------------------------------------------
suite('T3 — IOE com decisão existente é ignorado');

await test('T3.1: processDecisionForIoe ignora IOE que já tem decision_type e decision_payload', async () => {
  const dbMock = createDecisionDbMock({ ioeRow: ioeWithDecision });
  patchDb(dbMock);
  invalidate('aioiDecisionBridgeService.js');
  const bridge = require(`${SERVICES_PATH}/aioiDecisionBridgeService`);

  const result = await bridge.processDecisionForIoe({ companyId: COMPANY_ID, ioeId: IOE_ID });

  restoreDb();
  assert(result.ok, 'ok deve ser true');
  assert(result.skipped, 'skipped deve ser true para IOE com decisão existente');

  const updateCall = dbMock._client._calls.find(
    c => c.sql.includes('UPDATE industrial_operational_events') && c.sql.includes('decision_type')
  );
  assertNull(updateCall, 'NÃO deve haver UPDATE quando decisão já existe');
});

await test('T3.2: hasExistingDecision retorna true quando ambos campos preenchidos', () => {
  assert(payloadBuilder.hasExistingDecision(ioeWithDecision), 'deve detectar decisão existente');
  assert(!payloadBuilder.hasExistingDecision(validTriagedIoe), 'deve retornar false para IOE sem decisão');
});

// ---------------------------------------------------------------------------
// T4 — operationalDecisionEngine é chamado
// ---------------------------------------------------------------------------
suite('T4 — operationalDecisionEngine é chamado');

await test('T4.1: bridge faz require de operationalDecisionEngine e chama evaluateOperationalDecisions', () => {
  const src = fs.readFileSync(path.resolve(SERVICES_PATH, 'aioiDecisionBridgeService.js'), 'utf8');
  const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  assert(
    codeOnly.includes("require('../operationalDecisionEngine')"),
    'bridge deve importar operationalDecisionEngine'
  );
  assert(
    codeOnly.includes('evaluateOperationalDecisions('),
    'bridge deve chamar evaluateOperationalDecisions()'
  );
  assert(
    !codeOnly.includes('scheduleOperationalDecisionSignals('),
    'bridge NÃO deve chamar scheduleOperationalDecisionSignals (side-effects)'
  );
});

await test('T4.2: buildOperationalPlanFromIoe produz plano consumível pelo ODE', () => {
  const plan = payloadBuilder.buildOperationalPlanFromIoe(validTriagedIoe);
  assert(Array.isArray(plan.immediate_actions), 'immediate_actions deve ser array');
  assert(plan.immediate_actions.length >= 1, 'IOE high deve gerar immediate_actions');
  assert(plan.immediate_actions[0].priority === 'HIGH', 'prioridade deve refletir priority_band do IOE');
});

// ---------------------------------------------------------------------------
// T5 — nenhuma decisão local é criada
// ---------------------------------------------------------------------------
suite('T5 — nenhuma decisão local');

await test('T5.1: bridge não importa computePriorityScore nem serviços de scoring', () => {
  const files = ['aioiDecisionBridgeService.js', 'aioiDecisionPayloadBuilder.js'];
  for (const file of files) {
    const src = fs.readFileSync(path.resolve(SERVICES_PATH, file), 'utf8');
    const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    assert(!codeOnly.includes('computePriorityScore('), `${file} NÃO deve chamar computePriorityScore`);
    assert(!codeOnly.includes('priorityIntelligenceConfig'), `${file} NÃO deve importar priorityIntelligenceConfig`);
    assert(!codeOnly.includes('industrialTruthEnforcementService'), `${file} NÃO deve importar Truth Engine`);
    assert(!codeOnly.includes('operationalLearningService'), `${file} NÃO deve importar Learning Engine`);
  }
});

// ---------------------------------------------------------------------------
// T6 — nenhum workflow iniciado
// ---------------------------------------------------------------------------
suite('T6 — nenhum workflow iniciado');

await test('T6.1: nenhum arquivo do decision bridge referencia workflowOrchestrator no código', () => {
  const files = ['aioiDecisionBridgeService.js', 'aioiDecisionPayloadBuilder.js', 'aioiDecisionMetrics.js'];
  for (const file of files) {
    const src = fs.readFileSync(path.resolve(SERVICES_PATH, file), 'utf8');
    const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    assert(!codeOnly.includes('workflowOrchestrator'), `${file} NÃO deve referenciar workflowOrchestrator`);
    assert(!codeOnly.includes('startWorkflow('), `${file} NÃO deve chamar startWorkflow()`);
    assert(!codeOnly.includes('workflowOrchestrator.execute'), `${file} NÃO deve chamar workflowOrchestrator.execute`);
    assert(!codeOnly.includes('workflowOrchestrator.run'), `${file} NÃO deve chamar workflowOrchestrator.run`);
  }
});

// ---------------------------------------------------------------------------
// T7 — nenhum actionRuntime executado
// ---------------------------------------------------------------------------
suite('T7 — nenhum actionRuntime executado');

await test('T7.1: nenhum arquivo do decision bridge referencia actionRuntimeOrchestrator no código', () => {
  const files = ['aioiDecisionBridgeService.js', 'aioiDecisionPayloadBuilder.js', 'aioiDecisionMetrics.js'];
  for (const file of files) {
    const src = fs.readFileSync(path.resolve(SERVICES_PATH, file), 'utf8');
    const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    assert(!codeOnly.includes('actionRuntimeOrchestrator'), `${file} NÃO deve referenciar actionRuntimeOrchestrator`);
    assert(!codeOnly.includes('executeToolCall('), `${file} NÃO deve chamar executeToolCall()`);
    assert(!codeOnly.includes('proposeAction('), `${file} NÃO deve chamar proposeAction()`);
  }
});

await test('T7.2: resolveDecisionType nunca retorna direct_action ou workflow em P0.4', () => {
  const criticalEval = {
    alerts: [{ code: 'IMMEDIATE_CRITICAL', severity: 'high', message: 'CRITICAL' }],
    triggers: [], recommended_actions: []
  };
  const normalEval = {
    alerts: [{ code: 'IMMEDIATE_BACKLOG', severity: 'medium', message: 'Backlog' }],
    triggers: [], recommended_actions: []
  };
  const typeCritical = payloadBuilder.resolveDecisionType(criticalEval);
  const typeNormal   = payloadBuilder.resolveDecisionType(normalEval);
  assert(['suggest_only', 'escalate'].includes(typeCritical), 'P0.4: apenas suggest_only ou escalate');
  assertEqual(typeNormal, 'suggest_only', 'backlog deve gerar suggest_only');
  assert(typeCritical !== 'direct_action' && typeCritical !== 'workflow', 'nunca direct_action/workflow');
});

// ---------------------------------------------------------------------------
// T8 — idempotência preservada
// ---------------------------------------------------------------------------
suite('T8 — idempotência preservada');

await test('T8.1: persistDecisionSuggestion usa WHERE decision_type IS NULL AND decision_payload IS NULL', async () => {
  const dbMock = createDecisionDbMock();
  patchDb(dbMock);
  invalidate('aioiDecisionBridgeService.js');
  const bridge = require(`${SERVICES_PATH}/aioiDecisionBridgeService`);

  await bridge.persistDecisionSuggestion({
    companyId: COMPANY_ID,
    ioeId: IOE_ID,
    decisionType: 'suggest_only',
    decisionPayload: {
      recommendation: 'Test', rationale: 'Test', confidence: 80,
      source: 'operationalDecisionEngine', generated_at: new Date().toISOString()
    }
  });

  restoreDb();
  const updateCall = dbMock._client._calls.find(
    c => c.sql.includes('UPDATE industrial_operational_events') && c.sql.includes('decision_type')
  );
  assertNotNull(updateCall, 'UPDATE deve existir');
  assert(
    updateCall.sql.includes('decision_type   IS NULL') && updateCall.sql.includes('decision_payload IS NULL'),
    'UPDATE deve incluir guard de idempotência (decision_type IS NULL AND decision_payload IS NULL)'
  );
});

await test('T8.2: segunda chamada com decisão já persistida retorna skipped', async () => {
  const dbMock = createDecisionDbMock({ ioeRow: ioeWithDecision, updateReturnsNull: true });
  patchDb(dbMock);
  invalidate('aioiDecisionBridgeService.js');
  const bridge = require(`${SERVICES_PATH}/aioiDecisionBridgeService`);

  const result = await bridge.processDecisionForIoe({ companyId: COMPANY_ID, ioeId: IOE_ID });

  restoreDb();
  assert(result.ok && result.skipped, 'deve ser skipped quando decisão já existe');
});

// ---------------------------------------------------------------------------
// T9 — multi-tenant preservado
// ---------------------------------------------------------------------------
suite('T9 — multi-tenant preservado');

await test('T9.1: todas as operações setam app.current_company_id via set_config', async () => {
  const dbMock = createDecisionDbMock();
  const odeOrig = mockOdeModule();
  patchDb(dbMock);
  invalidate('aioiDecisionBridgeService.js');
  const bridge = require(`${SERVICES_PATH}/aioiDecisionBridgeService`);

  await bridge.processDecisionForIoe({ companyId: COMPANY_ID, ioeId: IOE_ID });

  restoreDb();
  restoreOdeModule(odeOrig);
  const setConfigCalls = dbMock._client._calls.filter(
    c => c.sql.includes('set_config') && c.sql.includes('app.current_company_id')
  );
  assert(setConfigCalls.length >= 2, `set_config deve ser chamado em ≥2 operações, obteve: ${setConfigCalls.length}`);
  for (const call of setConfigCalls) {
    assertEqual(call.params[0], COMPANY_ID, 'company_id correto no set_config');
  }
});

await test('T9.2: app.bypass_rls é sempre false', async () => {
  const dbMock = createDecisionDbMock();
  const odeOrig = mockOdeModule();
  patchDb(dbMock);
  invalidate('aioiDecisionBridgeService.js');
  const bridge = require(`${SERVICES_PATH}/aioiDecisionBridgeService`);

  await bridge.processDecisionForIoe({ companyId: COMPANY_ID, ioeId: IOE_ID });

  restoreDb();
  restoreOdeModule(odeOrig);
  const bypassCalls = dbMock._client._calls.filter(c => c.sql.includes('app.bypass_rls'));
  assert(bypassCalls.length >= 2, 'bypass_rls deve ser configurado');
  for (const call of bypassCalls) {
    assert(call.sql.includes("'false'"), "bypass_rls SEMPRE 'false'");
  }
});

// ---------------------------------------------------------------------------
// T10 — rollback em erro
// ---------------------------------------------------------------------------
suite('T10 — rollback em erro');

await test('T10.1: erro no UPDATE emite ROLLBACK e retorna ok=false', async () => {
  const dbMock = createDecisionDbMock({ failOnUpdate: true });
  patchDb(dbMock);
  invalidate('aioiDecisionBridgeService.js');
  const bridge = require(`${SERVICES_PATH}/aioiDecisionBridgeService`);

  const result = await bridge.persistDecisionSuggestion({
    companyId: COMPANY_ID,
    ioeId: IOE_ID,
    decisionType: 'suggest_only',
    decisionPayload: {
      recommendation: 'Test', rationale: 'Test', confidence: 80,
      source: 'operationalDecisionEngine', generated_at: new Date().toISOString()
    }
  });

  restoreDb();
  assert(!result.ok, 'ok deve ser false em falha de UPDATE');
  const rollback = dbMock._client._calls.find(c => c.sql === 'ROLLBACK');
  assertNotNull(rollback, 'ROLLBACK deve ser emitido');
});

// ---------------------------------------------------------------------------
// T11 — payload persistido corretamente
// ---------------------------------------------------------------------------
suite('T11 — payload persistido corretamente');

await test('T11.1: decision_payload no UPDATE contém apenas campos canônicos (sem SQL/scripts)', async () => {
  const dbMock = createDecisionDbMock();
  patchDb(dbMock);
  invalidate('aioiDecisionBridgeService.js');
  const bridge = require(`${SERVICES_PATH}/aioiDecisionBridgeService`);

  const payload = {
    recommendation: 'Investigar equipamento',
    rationale:      'Degradação PLC',
    confidence:     85,
    source:         'operationalDecisionEngine',
    generated_at:   '2026-06-05T12:00:00.000Z'
  };

  await bridge.persistDecisionSuggestion({
    companyId: COMPANY_ID, ioeId: IOE_ID,
    decisionType: 'suggest_only', decisionPayload: payload
  });

  restoreDb();
  const updateCall = dbMock._client._calls.find(
    c => c.sql.includes('UPDATE industrial_operational_events') && c.sql.includes('decision_payload')
  );
  const storedPayload = JSON.parse(updateCall.params[3]);
  assertEqual(Object.keys(storedPayload).length, 5, 'payload deve ter exatamente 5 campos');
  assert(!JSON.stringify(storedPayload).includes('SELECT'), 'payload NÃO deve conter SQL');
  assert(!JSON.stringify(storedPayload).includes('execute'), 'payload NÃO deve conter comandos executáveis');
});

// ---------------------------------------------------------------------------
// T12 — approved_by_user_id continua NULL
// ---------------------------------------------------------------------------
suite('T12 — approved_by_user_id continua NULL');

await test('T12.1: SET de decisão NÃO altera approved_by_user_id (HITL)', async () => {
  const dbMock = createDecisionDbMock();
  patchDb(dbMock);
  invalidate('aioiDecisionBridgeService.js');
  const bridge = require(`${SERVICES_PATH}/aioiDecisionBridgeService`);

  await bridge.persistDecisionSuggestion({
    companyId: COMPANY_ID, ioeId: IOE_ID,
    decisionType: 'suggest_only',
    decisionPayload: {
      recommendation: 'Test', rationale: 'Test', confidence: 80,
      source: 'operationalDecisionEngine', generated_at: new Date().toISOString()
    }
  });

  restoreDb();
  const updateCall = dbMock._client._calls.find(
    c => c.sql.includes('UPDATE industrial_operational_events') && c.sql.includes('decision_type')
  );
  // Verificar apenas cláusula SET (RETURNING pode incluir approved_by_user_id para verificação)
  const setMatch = updateCall.sql.match(/SET\s+([\s\S]+?)\s+WHERE/i);
  const setClause = setMatch ? setMatch[1] : '';
  assert(
    !setClause.includes('approved_by_user_id'),
    'SET NÃO deve alterar approved_by_user_id (HITL obrigatório)'
  );
});

// ---------------------------------------------------------------------------
// T13 — approved_at continua NULL
// ---------------------------------------------------------------------------
suite('T13 — approved_at continua NULL');

await test('T13.1: SET de decisão NÃO altera approved_at (HITL)', async () => {
  const dbMock = createDecisionDbMock();
  patchDb(dbMock);
  invalidate('aioiDecisionBridgeService.js');
  const bridge = require(`${SERVICES_PATH}/aioiDecisionBridgeService`);

  await bridge.persistDecisionSuggestion({
    companyId: COMPANY_ID, ioeId: IOE_ID,
    decisionType: 'escalate',
    decisionPayload: {
      recommendation: 'Escalar', rationale: 'CRITICAL', confidence: 95,
      source: 'operationalDecisionEngine', generated_at: new Date().toISOString()
    }
  });

  restoreDb();
  const updateCall = dbMock._client._calls.find(
    c => c.sql.includes('UPDATE industrial_operational_events') && c.sql.includes('decision_type')
  );
  const setMatch = updateCall.sql.match(/SET\s+([\s\S]+?)\s+WHERE/i);
  const setClause = setMatch ? setMatch[1] : '';
  assert(
    !setClause.includes('approved_at'),
    'SET NÃO deve alterar approved_at (HITL obrigatório)'
  );
});

// ---------------------------------------------------------------------------
// T14 — métricas emitidas corretamente
// ---------------------------------------------------------------------------
suite('T14 — métricas emitidas corretamente');

await test('T14.1: processDecisionForIoe incrementa contadores requested/received/persisted', async () => {
  metrics.resetSessionCounters();
  const dbMock = createDecisionDbMock();
  const odeOrig = mockOdeModule();
  patchDb(dbMock);
  invalidate('aioiDecisionBridgeService.js');
  const bridge = require(`${SERVICES_PATH}/aioiDecisionBridgeService`);

  await bridge.processDecisionForIoe({ companyId: COMPANY_ID, ioeId: IOE_ID });

  restoreDb();
  restoreOdeModule(odeOrig);
  const counters = metrics.getSessionCounters();
  assert(counters.requested >= 1, 'requested deve ser ≥ 1');
  assert(counters.received  >= 1, 'received deve ser ≥ 1');
  assert(counters.persisted  >= 1, 'persisted deve ser ≥ 1');
});

await test('T14.2: IOE ignorado incrementa skipped', async () => {
  metrics.resetSessionCounters();
  const dbMock = createDecisionDbMock({ ioeRow: ioeWithDecision });
  patchDb(dbMock);
  invalidate('aioiDecisionBridgeService.js');
  const bridge = require(`${SERVICES_PATH}/aioiDecisionBridgeService`);

  await bridge.processDecisionForIoe({ companyId: COMPANY_ID, ioeId: IOE_ID });

  restoreDb();
  const counters = metrics.getSessionCounters();
  assert(counters.skipped >= 1, 'skipped deve ser ≥ 1 para IOE com decisão existente');
});

// ---------------------------------------------------------------------------
// T15 — logs estruturados corretos
// ---------------------------------------------------------------------------
suite('T15 — logs estruturados corretos');

await test('T15.1: aioiDecisionMetrics.js emite os 5 labels obrigatórios', () => {
  const src = fs.readFileSync(path.resolve(SERVICES_PATH, 'aioiDecisionMetrics.js'), 'utf8');
  const required = [
    'AIOI_DECISION_REQUESTED',
    'AIOI_DECISION_RECEIVED',
    'AIOI_DECISION_PERSISTED',
    'AIOI_DECISION_SKIPPED',
    'AIOI_DECISION_ERROR'
  ];
  for (const label of required) {
    assert(src.includes(label), `métricas devem incluir label ${label}`);
  }
});

await test('T15.2: logs registram company_id/ioe_id/correlation_id/decision_type mas NÃO decision_payload', () => {
  const src = fs.readFileSync(path.resolve(SERVICES_PATH, 'aioiDecisionMetrics.js'), 'utf8');
  assert(src.includes('company_id'), 'logs devem incluir company_id');
  assert(src.includes('ioe_id'), 'logs devem incluir ioe_id');
  assert(src.includes('correlation_id'), 'logs devem incluir correlation_id');
  assert(src.includes('decision_type'), 'logs devem incluir decision_type');
  // recordPersisted não deve logar decision_payload
  const recordPersistedBlock = src.slice(src.indexOf('function recordPersisted'), src.indexOf('function recordSkipped'));
  assert(!recordPersistedBlock.includes('decision_payload'), 'recordPersisted NÃO deve logar decision_payload');
});

// ---------------------------------------------------------------------------
console.log('\n══════════════════════════════════════════════════════════');
console.log('  AIOI-P0.4 Decision Bridge Test Report');
console.log('══════════════════════════════════════════════════════════');
console.log(`  Total: ${_passed + _failed} | PASS: ${_passed} | FAIL: ${_failed}`);

if (_failed > 0) {
  console.log('\n  FALHAS DETECTADAS:');
  _results.filter(r => r.status === 'FAIL').forEach(r => {
    console.log(`    ✗ ${r.name}`);
    console.log(`      ${r.error}`);
  });
  console.log('\n  STATUS: AIOI_P0_4_TEST_FAIL');
  process.exit(1);
} else {
  console.log('\n  STATUS: AIOI_P0_4_TEST_PASS');
  process.exit(0);
}

} // end runAllTests

runAllTests().catch(err => {
  console.error('[TEST RUNNER] Erro fatal:', err.message);
  process.exit(1);
});
