'use strict';

/**
 * AIOI-P1.2 — Testes automatizados da Learning Bridge Layer
 *
 * T1–T18 conforme especificação P1.2.
 * Executar: node src/tests/aioi/aioiLearningBridge.test.js
 */

let _passed = 0;
let _failed = 0;

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
    console.log(`  ✓  ${name}`);
  } catch (err) {
    _failed++;
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

const payloadBuilder = require(`${SERVICES_PATH}/aioiLearningPayloadBuilder`);
const metrics = require(`${SERVICES_PATH}/aioiLearningMetrics`);

const COMPANY_ID     = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const COMPANY_ID_B   = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22';
const IOE_ID         = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33';
const WF_INSTANCE_ID = 'f6eebc99-9c0b-4ef8-bb6d-6bb9bd380f66';

const decisionPayload = {
  recommendation: 'Investigar equipamento',
  rationale:      'Degradação detectada',
  confidence:     90,
  source:         'operationalDecisionEngine',
  generated_at:   '2026-06-05T10:00:00.000Z'
};

function buildLearningContext(overrides = {}) {
  return {
    company_id:            COMPANY_ID,
    machine_id:            'equip-001',
    action_type:           'aioi_workflow',
    success:               true,
    context_tag:           'failure',
    ioe_id:                IOE_ID,
    correlation_id:        'ioe-corr-learning-789',
    decision_type:         'workflow',
    outcome_status:        'success',
    execution_duration_ms: 4500,
    execution_reference:   {
      type:           'workflow',
      ref_id:         WF_INSTANCE_ID,
      correlation_id: 'ioe-corr-learning-789'
    },
    evidence_refs: [],
    source:                'aioi_outcome_tracking',
    prepared_at:           '2026-06-05T14:00:00.000Z',
    ...overrides
  };
}

function makeResolvedIoe(overrides = {}) {
  const lc = buildLearningContext(overrides.learning_context || {});
  const basePayload = {
    ...decisionPayload,
    aioi_outcome_captured: true,
    aioi_outcome: {
      outcome_status:        lc.outcome_status,
      outcome_summary:       'Outcome registrado',
      execution_duration_ms: lc.execution_duration_ms,
      evidence_refs:         [],
      execution_reference:   lc.execution_reference,
      captured_at:           lc.prepared_at,
      learning_context:      lc
    }
  };
  const mergedPayload = { ...basePayload, ...(overrides.decision_payload || {}) };

  return {
    id:               IOE_ID,
    company_id:       COMPANY_ID,
    status:           'resolved',
    correlation_id:   'ioe-corr-learning-789',
    decision_type:    'workflow',
    decision_payload: mergedPayload,
    ...overrides,
    decision_payload: overrides.decision_payload !== undefined
      ? { ...basePayload, ...overrides.decision_payload }
      : mergedPayload
  };
}

const DB_MOD_PATH = (() => { try { return require.resolve('../../db'); } catch { return null; } })();
const OLS_MOD_PATH = require.resolve('../../services/operationalLearningService');
let _originalDb;
let _originalOls;
let _olsMock;

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

function mockOperationalLearningService(opts = {}) {
  _originalOls = require.cache[OLS_MOD_PATH]?.exports;
  let called = false;
  let lastArgs = null;
  const shouldThrow = opts.throwOnCall || false;

  require.cache[OLS_MOD_PATH] = {
    id: OLS_MOD_PATH,
    filename: OLS_MOD_PATH,
    loaded: true,
    exports: {
      recordOperationalOutcome: (args) => {
        if (shouldThrow) throw new Error('OLS_MOCK: simulated failure');
        called = true;
        lastArgs = args;
      },
      _test: {
        get called() { return called; },
        get lastArgs() { return lastArgs; },
        reset() { called = false; lastArgs = null; }
      }
    }
  };
  _olsMock = require.cache[OLS_MOD_PATH].exports;
  return () => {
    if (_originalOls) require.cache[OLS_MOD_PATH].exports = _originalOls;
  };
}

function loadBridgeService() {
  const svcPath = require.resolve(`${SERVICES_PATH}/aioiLearningBridgeService`);
  delete require.cache[svcPath];
  return require(svcPath);
}

function createLearningDbMock(initialIoe = makeResolvedIoe()) {
  const calls = [];
  let ioeState = JSON.parse(JSON.stringify(initialIoe));

  const client = {
    _calls: calls,
    get state() { return ioeState; },
    async query(sql, params) {
      const s = sql.trim();
      calls.push({ sql: s, params });

      if (calls._failNext) {
        calls._failNext = false;
        throw new Error('DB_MOCK: simulated failure');
      }

      if (s.includes('SELECT') && s.includes('industrial_operational_events')) {
        if (s.includes('aioi_learning_submitted') && s.includes('LIMIT')) {
          const eligible = ioeState.status === 'resolved'
            && ioeState.decision_payload?.aioi_outcome?.learning_context
            && !ioeState.decision_payload?.aioi_learning_submitted;
          return { rows: eligible ? [ioeState] : [] };
        }
        return { rows: [ioeState] };
      }

      if (s.includes('UPDATE industrial_operational_events') && s.includes('aioi_learning')) {
        const payload = typeof params[2] === 'string' ? JSON.parse(params[2]) : params[2];
        const canUpdate = ioeState.status === 'resolved'
          && ioeState.decision_payload?.aioi_outcome?.learning_context
          && !ioeState.decision_payload?.aioi_learning_submitted;

        if (canUpdate) {
          ioeState = {
            ...ioeState,
            decision_payload: payload
          };
          return { rows: [{ id: IOE_ID, correlation_id: ioeState.correlation_id }] };
        }
        return { rows: [] };
      }

      if (s.includes('COUNT(*)') && s.includes('aioi_learning')) {
        return { rows: [{ submitted_count: '0', processed_count: '0' }] };
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

function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function readServiceFiles() {
  const files = [
    'aioiLearningPayloadBuilder.js',
    'aioiLearningMetrics.js',
    'aioiLearningBridgeService.js'
  ];
  return files.map(f => ({
    name: f,
    content: fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')
  }));
}

async function runTests() {
  metrics.resetSessionCounters();

  // T1
  suite('T1 — learning enviado para operationalLearningService');
  await test('T1: submitLearning delega ao soberano e marca submitted', async () => {
    const mock = createLearningDbMock();
    const restoreOls = mockOperationalLearningService();
    patchDb(mock);
    const bridge = loadBridgeService();

    const result = await bridge.submitLearning({ companyId: COMPANY_ID, ioeId: IOE_ID });

    assert(result.ok, 'ok');
    assert(result.submitted, 'submitted');
    assert(_olsMock._test.called, 'OLS chamado');
    assert(mock._client.state.decision_payload.aioi_learning_submitted === true, 'flag submitted');
    assert(mock._client.state.decision_payload.aioi_learning_processed === true, 'flag processed');
    restoreDb();
    restoreOls();
  });

  // T2
  suite('T2 — learning_context obrigatório');
  await test('T2: sem learning_context retorna LEARNING_CONTEXT_REQUIRED', async () => {
    const ioe = makeResolvedIoe({
      decision_payload: {
        aioi_outcome_captured: true,
        aioi_outcome: { outcome_status: 'success', captured_at: '2026-06-05T14:00:00.000Z' }
      }
    });
    const mock = createLearningDbMock(ioe);
    const restoreOls = mockOperationalLearningService();
    patchDb(mock);
    const bridge = loadBridgeService();

    const result = await bridge.submitLearning({ companyId: COMPANY_ID, ioeId: IOE_ID });

    assertEqual(result.ok, false, 'ok');
    assertEqual(result.reason, 'LEARNING_CONTEXT_REQUIRED', 'reason');
    assert(!_olsMock._test.called, 'OLS não chamado');
    restoreDb();
    restoreOls();
  });

  // T3
  suite('T3 — status resolved obrigatório');
  await test('T3: status diferente de resolved retorna STATUS_NOT_RESOLVED', async () => {
    const mock = createLearningDbMock(makeResolvedIoe({ status: 'in_progress' }));
    const restoreOls = mockOperationalLearningService();
    patchDb(mock);
    const bridge = loadBridgeService();

    const result = await bridge.submitLearning({ companyId: COMPANY_ID, ioeId: IOE_ID });

    assertEqual(result.ok, false, 'ok');
    assertEqual(result.reason, 'STATUS_NOT_RESOLVED', 'reason');
    restoreDb();
    restoreOls();
  });

  // T4–T7 outcome statuses
  const statusCases = [
    { label: 'T4', status: 'success',         success: true },
    { label: 'T5', status: 'failure',         success: false },
    { label: 'T6', status: 'partial_success', success: true },
    { label: 'T7', status: 'cancelled',       success: false }
  ];

  for (const sc of statusCases) {
    suite(`${sc.label} — ${sc.status} enviado corretamente`);
    await test(`${sc.label}: outcome_status=${sc.status} → success=${sc.success}`, async () => {
      const lc = buildLearningContext({ outcome_status: sc.status, success: sc.success });
      const mock = createLearningDbMock(makeResolvedIoe({ learning_context: lc }));
      const restoreOls = mockOperationalLearningService();
      patchDb(mock);
      const bridge = loadBridgeService();

      await bridge.submitLearning({ companyId: COMPANY_ID, ioeId: IOE_ID });

      assert(_olsMock._test.called, 'OLS chamado');
      assertEqual(_olsMock._test.lastArgs.result.success, sc.success, 'success flag');
      assertEqual(_olsMock._test.lastArgs.result.outcome_status, sc.status, 'outcome_status');
      restoreDb();
      restoreOls();
    });
  }

  // T8
  suite('T8 — Idempotência preservada');
  await test('T8: learning já submetido retorna alreadySubmitted', async () => {
    const ioe = makeResolvedIoe({
      decision_payload: {
        aioi_learning_submitted: true,
        aioi_learning_processed: true
      }
    });
    const mock = createLearningDbMock(ioe);
    const restoreOls = mockOperationalLearningService();
    patchDb(mock);
    const bridge = loadBridgeService();

    const result = await bridge.submitLearning({ companyId: COMPANY_ID, ioeId: IOE_ID });

    assertEqual(result.ok, true, 'ok');
    assertEqual(result.alreadySubmitted, true, 'alreadySubmitted');
    assert(!_olsMock._test.called, 'OLS não re-chamado');
    restoreDb();
    restoreOls();
  });

  // T9
  suite('T9 — RLS preservado');
  await test('T9: bypass_rls sempre false', async () => {
    const mock = createLearningDbMock();
    const restoreOls = mockOperationalLearningService();
    patchDb(mock);
    const bridge = loadBridgeService();

    await bridge.submitLearning({ companyId: COMPANY_ID, ioeId: IOE_ID });

    const bypassCalls = mock._client._calls.filter(c => c.sql.includes('app.bypass_rls'));
    assert(bypassCalls.length >= 1, 'bypass_rls configurado');
    for (const c of bypassCalls) assert(c.sql.includes("'false'"), "bypass_rls='false'");
    restoreDb();
    restoreOls();
  });

  // T10
  suite('T10 — Multi-tenant preservado');
  await test('T10: set_config usa companyId correto', async () => {
    const mock = createLearningDbMock(makeResolvedIoe({ company_id: COMPANY_ID_B }));
    const restoreOls = mockOperationalLearningService();
    patchDb(mock);
    const bridge = loadBridgeService();

    await bridge.submitLearning({ companyId: COMPANY_ID_B, ioeId: IOE_ID });

    const tenantCalls = mock._client._calls.filter(c => c.sql.includes('app.current_company_id'));
    assert(tenantCalls.length >= 1, 'set_config company');
    assertEqual(tenantCalls[0].params[0], COMPANY_ID_B, 'company id');
    restoreDb();
    restoreOls();
  });

  // T11
  suite('T11 — Rollback em erro');
  await test('T11: erro de persistência retorna ok=false sem flag submitted', async () => {
    const mock = createLearningDbMock();
    mock._client._calls._failNext = true;
    const restoreOls = mockOperationalLearningService();
    patchDb(mock);
    const bridge = loadBridgeService();

    const result = await bridge.submitLearning({ companyId: COMPANY_ID, ioeId: IOE_ID });

    assertEqual(result.ok, false, 'ok false');
    assert(result.reason, 'reason presente');
    restoreDb();
    restoreOls();
  });

  // T12
  suite('T12 — operationalLearningService chamado');
  await test('T12: recordOperationalOutcome recebe payload correto', async () => {
    const mock = createLearningDbMock();
    const restoreOls = mockOperationalLearningService();
    patchDb(mock);
    const bridge = loadBridgeService();

    await bridge.submitLearning({ companyId: COMPANY_ID, ioeId: IOE_ID });

    assert(_olsMock._test.called, 'OLS chamado');
    const args = _olsMock._test.lastArgs;
    assertEqual(args.action.machine_id, 'equip-001', 'machine_id');
    assertEqual(args.action.action_type, 'aioi_workflow', 'action_type');
    assertEqual(args.company_id, COMPANY_ID, 'company_id');
    restoreDb();
    restoreOls();
  });

  // T13
  suite('T13 — operationalDecisionEngine ausente');
  await test('T13: arquivos P1.2 não referenciam operationalDecisionEngine', async () => {
    const files = readServiceFiles();
    for (const f of files) {
      const code = stripComments(f.content);
      assert(!code.includes('operationalDecisionEngine'), f.name);
      assert(!code.includes('industrialTruthEnforcementService'), f.name);
    }
  });

  // T14
  suite('T14 — computePriorityScore ausente');
  await test('T14: arquivos P1.2 não referenciam computePriorityScore', async () => {
    const files = readServiceFiles();
    for (const f of files) {
      const code = stripComments(f.content);
      assert(!code.includes('computePriorityScore'), f.name);
      assert(!code.includes('operationalPrioritizationService'), f.name);
      assert(!code.includes('aioiClassificationMapper'), f.name);
    }
  });

  // T15
  suite('T15 — workflowOrchestrator ausente');
  await test('T15: arquivos P1.2 não referenciam workflowOrchestrator', async () => {
    const files = readServiceFiles();
    for (const f of files) {
      const code = stripComments(f.content);
      assert(!code.includes('workflowOrchestrator'), f.name);
    }
  });

  // T16
  suite('T16 — actionRuntimeOrchestrator ausente');
  await test('T16: arquivos P1.2 não referenciam actionRuntimeOrchestrator', async () => {
    const files = readServiceFiles();
    for (const f of files) {
      const code = stripComments(f.content);
      assert(!code.includes('actionRuntimeOrchestrator'), f.name);
    }
  });

  // T17
  suite('T17 — Logs corretos');
  await test('T17: aioiLearningMetrics emite os 5 labels obrigatórios', async () => {
    metrics.resetSessionCounters();
    metrics.recordSubmitted(COMPANY_ID, IOE_ID, 'corr', 50);
    metrics.recordProcessed(COMPANY_ID, IOE_ID, 'corr');
    metrics.recordAlreadySubmitted(COMPANY_ID, IOE_ID, 'corr');
    metrics.recordSkipped(COMPANY_ID, IOE_ID, 'corr', 'TEST');
    metrics.recordError(COMPANY_ID, IOE_ID, 'corr', 'ERR');

    const src = fs.readFileSync(path.join(SERVICES_PATH, 'aioiLearningMetrics.js'), 'utf8');
    assert(src.includes('AIOI_LEARNING_SUBMITTED'), 'SUBMITTED');
    assert(src.includes('AIOI_LEARNING_PROCESSED'), 'PROCESSED');
    assert(src.includes('AIOI_LEARNING_ALREADY_SUBMITTED'), 'ALREADY_SUBMITTED');
    assert(src.includes('AIOI_LEARNING_SKIPPED'), 'SKIPPED');
    assert(src.includes('AIOI_LEARNING_ERROR'), 'ERROR');
  });

  // T18
  suite('T18 — Métricas corretas');
  await test('T18: getSessionCounters expõe métricas obrigatórias', async () => {
    metrics.resetSessionCounters();
    metrics.recordSubmitted(COMPANY_ID, IOE_ID, 'corr', 100);
    metrics.recordProcessed(COMPANY_ID, IOE_ID, 'corr');
    metrics.recordError(COMPANY_ID, IOE_ID, 'corr', 'e');

    const counters = metrics.getSessionCounters();
    assertEqual(counters.learning_submitted_count, 1, 'submitted');
    assertEqual(counters.learning_processed_count, 1, 'processed');
    assertEqual(counters.learning_error_count, 1, 'errors');
    assertEqual(counters.avg_learning_latency_ms, 100, 'latency');
  });

  await test('T18b: buildLearningPayload mapeia learning_context sem enriquecimento', () => {
    const lc = buildLearningContext();
    const payload = payloadBuilder.buildLearningPayload(lc);
    assertEqual(payload.action.machine_id, 'equip-001', 'machine');
    assertEqual(payload.result.success, true, 'success');
    assertEqual(payload.company_id, COMPANY_ID, 'company');
    assert(Object.keys(payload.action).length <= 4, 'sem campos artificiais em action');
  });

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  AIOI-P1.2 Learning Bridge Test Report');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Total: ${_passed + _failed} | PASS: ${_passed} | FAIL: ${_failed}`);
  console.log('');
  console.log(`  STATUS: ${_failed === 0 ? 'AIOI_P1_2_TEST_PASS' : 'AIOI_P1_2_TEST_FAIL'}`);
  console.log('');

  process.exit(_failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
