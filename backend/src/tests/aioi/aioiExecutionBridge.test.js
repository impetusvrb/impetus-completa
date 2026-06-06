'use strict';

/**
 * AIOI-P1.0 — Testes automatizados da Execution Bridge Layer
 *
 * T1–T17 conforme especificação P1.0.
 * Executar: node src/tests/aioi/aioiExecutionBridge.test.js
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

const payloadBuilder = require(`${SERVICES_PATH}/aioiExecutionPayloadBuilder`);
const metrics = require(`${SERVICES_PATH}/aioiExecutionMetrics`);

const COMPANY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const IOE_ID     = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33';
const USER_ID    = 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55';
const WF_INSTANCE_ID = 'f6eebc99-9c0b-4ef8-bb6d-6bb9bd380f66';
const TRACE_ID       = 'a7eebc99-9c0b-4ef8-bb6d-6bb9bd380a77';

const decisionPayload = {
  recommendation: 'Investigar equipamento',
  rationale:      'Degradação detectada',
  confidence:     90,
  source:         'operationalDecisionEngine',
  generated_at:   '2026-06-05T10:00:00.000Z'
};

function makeApprovedIoe(overrides = {}) {
  return {
    id:                  IOE_ID,
    company_id:          COMPANY_ID,
    status:              'approved',
    category:            'equipment_degradation',
    source_type:         'plc_event',
    priority_band:       'high',
    priority_score:      60,
    entity_type:         'equipment',
    entity_id:           'equip-001',
    equipment_id:        'equip-001',
    correlation_id:      'ioe-corr-exec-123',
    decision_type:       'suggest_only',
    decision_payload:    decisionPayload,
    approved_by_user_id: USER_ID,
    approved_at:         '2026-06-05T12:00:00.000Z',
    execution_trace_id:  null,
    workflow_instance_id:null,
    ...overrides
  };
}

const DB_MOD_PATH = (() => { try { return require.resolve('../../db'); } catch { return null; } })();
let _originalDb;
let _originalWorkflow;
let _originalAction;

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

function mockWorkflowOrchestrator(returnValue) {
  const wfPath = require.resolve('../../workflowEngine/orchestration/workflowOrchestrator');
  _originalWorkflow = require.cache[wfPath]?.exports;
  let called = false;
  let lastArgs = null;
  require.cache[wfPath] = {
    id: wfPath,
    filename: wfPath,
    loaded: true,
    exports: {
      startWorkflow: async (args) => {
        called = true;
        lastArgs = args;
        return returnValue || { ok: true, instance_id: WF_INSTANCE_ID, correlation_id: 'wf-corr' };
      },
      _test: { get called() { return called; }, get lastArgs() { return lastArgs; } }
    }
  };
  return () => {
    if (_originalWorkflow) require.cache[wfPath].exports = _originalWorkflow;
  };
}

function mockActionRuntimeOrchestrator(returnValue) {
  const arPath = require.resolve('../../actionRuntime/orchestration/actionRuntimeOrchestrator');
  _originalAction = require.cache[arPath]?.exports;
  let called = false;
  let lastArgs = null;
  require.cache[arPath] = {
    id: arPath,
    filename: arPath,
    loaded: true,
    exports: {
      executeToolCall: async (toolName, args, ctx) => {
        called = true;
        lastArgs = { toolName, args, ctx };
        return returnValue || { ok: true, trace_id: TRACE_ID, status: 'executed' };
      },
      _test: { get called() { return called; }, get lastArgs() { return lastArgs; } }
    }
  };
  return () => {
    if (_originalAction) require.cache[arPath].exports = _originalAction;
  };
}

function createExecutionDbMock(initialIoe = makeApprovedIoe()) {
  const calls = [];
  let ioeState = { ...initialIoe };

  const client = {
    _calls: calls,
    get state() { return ioeState; },
    async query(sql, params) {
      const s = sql.trim();
      calls.push({ sql: s, params });

      if (s.includes('DB_MOCK_FAIL') || calls._failNext) {
        calls._failNext = false;
        throw new Error('DB_MOCK: simulated failure');
      }

      if (s.includes('SELECT') && s.includes('industrial_operational_events')) {
        if (s.includes('execution_trace_id IS NULL') && s.includes('LIMIT')) {
          const eligible = ioeState.status === 'approved'
            && !ioeState.execution_trace_id
            && !ioeState.workflow_instance_id
            && ioeState.approved_by_user_id
            && ioeState.decision_type;
          return { rows: eligible ? [ioeState] : [] };
        }
        return { rows: [ioeState] };
      }

      if (s.includes('SET workflow_instance_id')) {
        if (ioeState.status === 'approved' && !ioeState.workflow_instance_id && !ioeState.execution_trace_id) {
          ioeState = { ...ioeState, workflow_instance_id: params[2], status: 'in_progress' };
          return { rows: [{ id: IOE_ID }] };
        }
        return { rows: [] };
      }

      if (s.includes('SET execution_trace_id')) {
        if (ioeState.status === 'approved' && !ioeState.execution_trace_id && !ioeState.workflow_instance_id) {
          ioeState = { ...ioeState, execution_trace_id: params[2], status: 'in_progress' };
          return { rows: [{ id: IOE_ID }] };
        }
        return { rows: [] };
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

function invalidateBridge() {
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiExecutionBridgeService.js`)];
}

async function runAllTests() {
  metrics.resetSessionCounters();

  // T1
  suite('T1 — approved → execution_requested');
  await test('T1: requestExecution registra pedido para IOE approved com HITL', async () => {
    metrics.resetSessionCounters();
    const dbMock = createExecutionDbMock(makeApprovedIoe({ decision_type: 'workflow' }));
    const restoreWf = mockWorkflowOrchestrator();
    patchDb(dbMock);
    invalidateBridge();
    const bridge = require(`${SERVICES_PATH}/aioiExecutionBridgeService`);

    const result = await bridge.requestExecution({ companyId: COMPANY_ID, ioeId: IOE_ID });

    restoreDb();
    restoreWf();
    assert(result.ok, `ok=true, erro: ${result.error}`);
    const counters = metrics.getSessionCounters();
    assert(counters.execution_requested_count >= 1, 'execution_requested deve ser incrementado');
  });

  // T2
  suite('T2 — workflow delegado corretamente');
  await test('T2: decision_type=workflow delega a workflowOrchestrator.startWorkflow', async () => {
    const dbMock = createExecutionDbMock(makeApprovedIoe({ decision_type: 'workflow' }));
    const restoreWf = mockWorkflowOrchestrator();
    patchDb(dbMock);
    invalidateBridge();
    const bridge = require(`${SERVICES_PATH}/aioiExecutionBridgeService`);

    const result = await bridge.processApprovedIoe({ companyId: COMPANY_ID, ioeId: IOE_ID });

    const wfPath = require.resolve('../../workflowEngine/orchestration/workflowOrchestrator');
    const wfCalled = require.cache[wfPath].exports._test.called;

    restoreDb();
    restoreWf();
    assert(result.ok && result.delegated, 'deve delegar workflow');
    assertEqual(result.target, 'workflow', 'target deve ser workflow');
    assert(wfCalled, 'workflowOrchestrator.startWorkflow deve ser chamado');
    assertEqual(dbMock._client.state.status, 'in_progress', 'status deve ser in_progress');
  });

  // T3
  suite('T3 — action delegado corretamente');
  await test('T3: decision_type=direct_action delega a actionRuntimeOrchestrator.executeToolCall', async () => {
    const dbMock = createExecutionDbMock(makeApprovedIoe({ decision_type: 'direct_action' }));
    const restoreAr = mockActionRuntimeOrchestrator();
    patchDb(dbMock);
    invalidateBridge();
    const bridge = require(`${SERVICES_PATH}/aioiExecutionBridgeService`);

    const result = await bridge.processApprovedIoe({ companyId: COMPANY_ID, ioeId: IOE_ID });

    const arPath = require.resolve('../../actionRuntime/orchestration/actionRuntimeOrchestrator');
    const arCalled = require.cache[arPath].exports._test.called;

    restoreDb();
    restoreAr();
    assert(result.ok && result.delegated, 'deve delegar action');
    assertEqual(result.target, 'action', 'target deve ser action');
    assert(arCalled, 'executeToolCall deve ser chamado');
    assertEqual(dbMock._client.state.status, 'in_progress', 'status in_progress');
  });

  // T4
  suite('T4 — suggest_only não executa');
  await test('T4: suggest_only retorna skipped sem alterar status', async () => {
    const dbMock = createExecutionDbMock(makeApprovedIoe({ decision_type: 'suggest_only' }));
    const restoreWf = mockWorkflowOrchestrator();
    const restoreAr = mockActionRuntimeOrchestrator();
    patchDb(dbMock);
    invalidateBridge();
    const bridge = require(`${SERVICES_PATH}/aioiExecutionBridgeService`);

    const result = await bridge.processApprovedIoe({ companyId: COMPANY_ID, ioeId: IOE_ID });

    restoreDb();
    restoreWf();
    restoreAr();
    assert(result.ok && result.skipped, 'deve ser skipped');
    assertEqual(result.reason, 'NON_EXECUTABLE_DECISION', 'reason correto');
    assertEqual(dbMock._client.state.status, 'approved', 'status permanece approved');
  });

  // T5
  suite('T5 — escalate não executa');
  await test('T5: escalate retorna skipped sem alterar status', async () => {
    const dbMock = createExecutionDbMock(makeApprovedIoe({ decision_type: 'escalate' }));
    patchDb(dbMock);
    invalidateBridge();
    const bridge = require(`${SERVICES_PATH}/aioiExecutionBridgeService`);

    const result = await bridge.processApprovedIoe({ companyId: COMPANY_ID, ioeId: IOE_ID });

    restoreDb();
    assert(result.ok && result.skipped, 'escalate skipped');
    assertEqual(dbMock._client.state.status, 'approved', 'status unchanged');
  });

  // T6
  suite('T6 — approved_by_user_id obrigatório');
  await test('T6: sem approved_by_user_id retorna HITL_REQUIRED', async () => {
    const dbMock = createExecutionDbMock(makeApprovedIoe({ approved_by_user_id: null }));
    patchDb(dbMock);
    invalidateBridge();
    const bridge = require(`${SERVICES_PATH}/aioiExecutionBridgeService`);

    const result = await bridge.requestExecution({ companyId: COMPANY_ID, ioeId: IOE_ID });

    restoreDb();
    assert(!result.ok, 'ok=false');
    assertEqual(result.error, 'HITL_REQUIRED', 'erro HITL_REQUIRED');
  });

  // T7
  suite('T7 — approved_at obrigatório');
  await test('T7: sem approved_at retorna HITL_REQUIRED', async () => {
    const dbMock = createExecutionDbMock(makeApprovedIoe({ approved_at: null }));
    patchDb(dbMock);
    invalidateBridge();
    const bridge = require(`${SERVICES_PATH}/aioiExecutionBridgeService`);

    const result = await bridge.requestExecution({ companyId: COMPANY_ID, ioeId: IOE_ID });

    restoreDb();
    assert(!result.ok, 'ok=false');
    assertEqual(result.error, 'HITL_REQUIRED', 'erro HITL_REQUIRED');
  });

  // T8
  suite('T8 — idempotência preservada');
  await test('T8: IOE já delegado retorna alreadyDelegated', async () => {
    const dbMock = createExecutionDbMock(makeApprovedIoe({
      decision_type: 'workflow',
      workflow_instance_id: WF_INSTANCE_ID
    }));
    const restoreWf = mockWorkflowOrchestrator();
    patchDb(dbMock);
    invalidateBridge();
    const bridge = require(`${SERVICES_PATH}/aioiExecutionBridgeService`);

    const result = await bridge.processApprovedIoe({ companyId: COMPANY_ID, ioeId: IOE_ID });

    const wfPath = require.resolve('../../workflowEngine/orchestration/workflowOrchestrator');
    const wfCalled = require.cache[wfPath].exports._test?.called;

    restoreDb();
    restoreWf();
    assert(result.ok && result.alreadyDelegated, 'alreadyDelegated');
    assert(!wfCalled, 'workflow NÃO deve ser chamado novamente');
  });

  // T9
  suite('T9 — workflow_instance_id preenchido');
  await test('T9: delegação workflow persiste workflow_instance_id', async () => {
    const dbMock = createExecutionDbMock(makeApprovedIoe({ decision_type: 'workflow' }));
    const restoreWf = mockWorkflowOrchestrator();
    patchDb(dbMock);
    invalidateBridge();
    const bridge = require(`${SERVICES_PATH}/aioiExecutionBridgeService`);

    await bridge.processApprovedIoe({ companyId: COMPANY_ID, ioeId: IOE_ID });

    restoreDb();
    restoreWf();
    assertEqual(dbMock._client.state.workflow_instance_id, WF_INSTANCE_ID, 'workflow_instance_id preenchido');
  });

  // T10
  suite('T10 — execution_trace_id preenchido');
  await test('T10: delegação action persiste execution_trace_id', async () => {
    const dbMock = createExecutionDbMock(makeApprovedIoe({ decision_type: 'direct_action' }));
    const restoreAr = mockActionRuntimeOrchestrator();
    patchDb(dbMock);
    invalidateBridge();
    const bridge = require(`${SERVICES_PATH}/aioiExecutionBridgeService`);

    await bridge.processApprovedIoe({ companyId: COMPANY_ID, ioeId: IOE_ID });

    restoreDb();
    restoreAr();
    assertEqual(dbMock._client.state.execution_trace_id, TRACE_ID, 'execution_trace_id preenchido');
  });

  // T11
  suite('T11 — RLS preservado');
  await test('T11: bypass_rls sempre false', async () => {
    const dbMock = createExecutionDbMock(makeApprovedIoe({ decision_type: 'workflow' }));
    const restoreWf = mockWorkflowOrchestrator();
    patchDb(dbMock);
    invalidateBridge();
    const bridge = require(`${SERVICES_PATH}/aioiExecutionBridgeService`);

    await bridge.processApprovedIoe({ companyId: COMPANY_ID, ioeId: IOE_ID });

    restoreDb();
    restoreWf();
    const bypassCalls = dbMock._client._calls.filter(c => c.sql.includes('app.bypass_rls'));
    assert(bypassCalls.length >= 1, 'bypass_rls configurado');
    for (const c of bypassCalls) assert(c.sql.includes("'false'"), "bypass_rls='false'");
  });

  // T12
  suite('T12 — multi-tenant preservado');
  await test('T12: set_config usa companyId correto', async () => {
    const dbMock = createExecutionDbMock(makeApprovedIoe({ decision_type: 'suggest_only' }));
    patchDb(dbMock);
    invalidateBridge();
    const bridge = require(`${SERVICES_PATH}/aioiExecutionBridgeService`);

    await bridge.processApprovedIoe({ companyId: COMPANY_ID, ioeId: IOE_ID });

    restoreDb();
    const setCalls = dbMock._client._calls.filter(c => c.sql.includes('app.current_company_id'));
    assert(setCalls.length >= 1, 'set_config company_id');
    for (const c of setCalls) assertEqual(c.params[0], COMPANY_ID, 'company_id correto');
  });

  // T13
  suite('T13 — rollback em erro');
  await test('T13: erro de persistência retorna ok=false', async () => {
    const dbMock = createExecutionDbMock(makeApprovedIoe({ decision_type: 'workflow' }));
    const restoreWf = mockWorkflowOrchestrator();
    const origQuery = dbMock._client.query.bind(dbMock._client);
    dbMock._client.query = async function (sql, params) {
      if (sql.trim().includes('SET workflow_instance_id')) {
        throw new Error('DB_MOCK: simulated failure');
      }
      return origQuery(sql, params);
    };
    patchDb(dbMock);
    invalidateBridge();
    const bridge = require(`${SERVICES_PATH}/aioiExecutionBridgeService`);

    const result = await bridge.processApprovedIoe({ companyId: COMPANY_ID, ioeId: IOE_ID });

    restoreDb();
    restoreWf();
    assert(!result.ok, 'ok=false em erro');
    assertNotNull(result.error, 'error retornado');
  });

  // T14
  suite('T14 — operationalDecisionEngine ausente');
  await test('T14: arquivos P1.0 não referenciam operationalDecisionEngine', () => {
    const files = [
      'aioiExecutionBridgeService.js',
      'aioiExecutionPayloadBuilder.js',
      'aioiExecutionMetrics.js'
    ];
    for (const file of files) {
      const src = fs.readFileSync(path.resolve(SERVICES_PATH, file), 'utf8');
      const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      assert(!codeOnly.includes('operationalDecisionEngine'), `${file} sem ODE`);
      assert(!codeOnly.includes('evaluateOperationalDecisions('), `${file} sem evaluateOperationalDecisions`);
    }
  });

  // T15
  suite('T15 — computePriorityScore ausente');
  await test('T15: arquivos P1.0 não referenciam computePriorityScore', () => {
    const files = ['aioiExecutionBridgeService.js', 'aioiExecutionPayloadBuilder.js'];
    for (const file of files) {
      const src = fs.readFileSync(path.resolve(SERVICES_PATH, file), 'utf8');
      const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      assert(!codeOnly.includes('computePriorityScore('), `${file} sem computePriorityScore`);
      assert(!codeOnly.includes('industrialTruthEnforcementService'), `${file} sem Truth`);
      assert(!codeOnly.includes('operationalLearningService'), `${file} sem Learning`);
    }
  });

  // T16
  suite('T16 — sem executor paralelo');
  await test('T16: bridge delega via require dos soberanos, sem funções execute/run locais', () => {
    const src = fs.readFileSync(path.resolve(SERVICES_PATH, 'aioiExecutionBridgeService.js'), 'utf8');
    const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

    assert(codeOnly.includes("require('../../workflowEngine/orchestration/workflowOrchestrator')"),
      'import workflowOrchestrator');
    assert(codeOnly.includes("require('../../actionRuntime/orchestration/actionRuntimeOrchestrator')"),
      'import actionRuntimeOrchestrator');
    assert(codeOnly.includes('workflowOrchestrator.startWorkflow'), 'delega startWorkflow');
    assert(codeOnly.includes('actionRuntimeOrchestrator.executeToolCall'), 'delega executeToolCall');

    // Sem implementação local de execução
    assert(!/async function execute\(/.test(codeOnly), 'sem execute() local');
    assert(!/async function startWorkflow\(/.test(codeOnly), 'sem startWorkflow() local');
    assert(!/async function runAction\(/.test(codeOnly), 'sem runAction() local');
  });

  // T17
  suite('T17 — logs corretos');
  await test('T17: aioiExecutionMetrics emite os 5 labels obrigatórios', () => {
    const src = fs.readFileSync(path.resolve(SERVICES_PATH, 'aioiExecutionMetrics.js'), 'utf8');
    const labels = [
      'AIOI_EXECUTION_REQUESTED',
      'AIOI_EXECUTION_DELEGATED',
      'AIOI_EXECUTION_SKIPPED',
      'AIOI_EXECUTION_ALREADY_DELEGATED',
      'AIOI_EXECUTION_ERROR'
    ];
    for (const label of labels) {
      assert(src.includes(label), `label ${label} presente`);
    }
  });

  await test('T17b: resolveExecutionTarget mapeia decision_types corretamente', () => {
    assertEqual(payloadBuilder.resolveExecutionTarget('workflow').target, 'workflow', 'workflow target');
    assertEqual(payloadBuilder.resolveExecutionTarget('direct_action').target, 'action', 'action target');
    assertEqual(payloadBuilder.resolveExecutionTarget('suggest_only').executable, false, 'suggest_only não executável');
    assertEqual(payloadBuilder.resolveExecutionTarget('escalate').executable, false, 'escalate não executável');
  });

  // Resultado
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  AIOI-P1.0 Execution Bridge Test Report');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Total: ${_passed + _failed} | PASS: ${_passed} | FAIL: ${_failed}`);

  if (_failed > 0) {
    console.log('\n  FALHAS DETECTADAS:');
    _results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`    ✗ ${r.name}`);
      console.log(`      ${r.error}`);
    });
    console.log('\n  STATUS: AIOI_P1_0_TEST_FAIL');
    process.exit(1);
  } else {
    console.log('\n  STATUS: AIOI_P1_0_TEST_PASS');
    process.exit(0);
  }
}

runAllTests().catch(err => {
  console.error('[TEST RUNNER] Erro fatal:', err.message);
  process.exit(1);
});
