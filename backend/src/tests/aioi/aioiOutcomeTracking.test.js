'use strict';

/**
 * AIOI-P1.1 — Testes automatizados da Outcome Tracking Layer
 *
 * T1–T16 conforme especificação P1.1.
 * Executar: node src/tests/aioi/aioiOutcomeTracking.test.js
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

const payloadBuilder = require(`${SERVICES_PATH}/aioiOutcomePayloadBuilder`);
const metrics = require(`${SERVICES_PATH}/aioiOutcomeMetrics`);

const COMPANY_ID     = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const COMPANY_ID_B   = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22';
const IOE_ID         = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33';
const WF_INSTANCE_ID = 'f6eebc99-9c0b-4ef8-bb6d-6bb9bd380f66';
const TRACE_ID       = 'a7eebc99-9c0b-4ef8-bb6d-6bb9bd380a77';

const decisionPayload = {
  recommendation: 'Investigar equipamento',
  rationale:      'Degradação detectada',
  confidence:     90,
  source:         'operationalDecisionEngine',
  generated_at:   '2026-06-05T10:00:00.000Z'
};

function makeInProgressIoe(overrides = {}) {
  return {
    id:                   IOE_ID,
    company_id:           COMPANY_ID,
    status:               'in_progress',
    category:             'equipment_degradation',
    source_type:          'plc_event',
    priority_band:        'high',
    priority_score:       60,
    entity_type:          'equipment',
    entity_id:            'equip-001',
    equipment_id:         'equip-001',
    correlation_id:       'ioe-corr-outcome-456',
    decision_type:        'workflow',
    decision_payload:     { ...decisionPayload },
    approved_by_user_id:  'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55',
    approved_at:          '2026-06-05T12:00:00.000Z',
    execution_trace_id:   null,
    workflow_instance_id: WF_INSTANCE_ID,
    resolved_at:          null,
    resolution_notes:     null,
    ...overrides
  };
}

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

function loadTrackingService() {
  const svcPath = require.resolve(`${SERVICES_PATH}/aioiOutcomeTrackingService`);
  delete require.cache[svcPath];
  return require(svcPath);
}

function createOutcomeDbMock(initialIoe = makeInProgressIoe()) {
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
        if (s.includes("aioi_outcome_captured' = 'true'")) {
          const captured = ioeState.decision_payload?.aioi_outcome_captured === true
            ? [ioeState]
            : [];
          return { rows: captured };
        }
        return { rows: [ioeState] };
      }

      if (s.includes('UPDATE industrial_operational_events') && s.includes('decision_payload')) {
        const payload = typeof params[2] === 'string' ? JSON.parse(params[2]) : params[2];
        const canUpdate = ioeState.status === 'in_progress'
          && (ioeState.execution_trace_id || ioeState.workflow_instance_id)
          && !ioeState.decision_payload?.aioi_outcome_captured;

        if (canUpdate) {
          ioeState = {
            ...ioeState,
            decision_payload: payload,
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            resolution_notes: params[3] || null
          };
          return { rows: [{ id: IOE_ID, correlation_id: ioeState.correlation_id, decision_payload: payload }] };
        }
        return { rows: [] };
      }

      if (s.includes('COUNT(*)') && s.includes('aioi_outcome_captured')) {
        return { rows: [{ captured_count: '0', success_count: '0', failure_count: '0' }] };
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
    'aioiOutcomePayloadBuilder.js',
    'aioiOutcomeMetrics.js',
    'aioiOutcomeTrackingService.js'
  ];
  return files.map(f => ({
    name: f,
    content: fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')
  }));
}

// ---------------------------------------------------------------------------
// T1 — Outcome registrado para workflow
// ---------------------------------------------------------------------------

async function runTests() {
  metrics.resetSessionCounters();

  suite('T1 — Outcome registrado para workflow');
  await test('T1: captureWorkflowOutcome persiste outcome para IOE com workflow_instance_id', async () => {
    const mock = createOutcomeDbMock(makeInProgressIoe({ decision_type: 'workflow' }));
    patchDb(mock);
    const svc = loadTrackingService();

    const result = await svc.captureWorkflowOutcome({
      companyId:           COMPANY_ID,
      ioeId:               IOE_ID,
      outcomeStatus:       'success',
      outcomeSummary:      'Workflow concluído com sucesso',
      evidenceRefs:        [{ type: 'workflow_log', ref_id: 'log-1' }],
      executionDurationMs: 4500
    });

    assert(result.ok, 'resultado deve ser ok');
    assert(result.captured, 'deve indicar captured');
    assertEqual(result.outcome.outcome_status, 'success', 'outcome_status');
    assertEqual(mock._client.state.status, 'resolved', 'status deve ser resolved');
    assertNotNull(mock._client.state.decision_payload.aioi_outcome, 'aioi_outcome persistido');
    restoreDb();
  });

  // T2
  suite('T2 — Outcome registrado para action');
  await test('T2: captureExecutionOutcome persiste outcome para IOE com execution_trace_id', async () => {
    const mock = createOutcomeDbMock(makeInProgressIoe({
      decision_type:        'direct_action',
      workflow_instance_id: null,
      execution_trace_id:   TRACE_ID
    }));
    patchDb(mock);
    const svc = loadTrackingService();

    const result = await svc.captureExecutionOutcome({
      companyId:           COMPANY_ID,
      ioeId:               IOE_ID,
      outcomeStatus:       'success',
      outcomeSummary:      'Ação executada',
      executionDurationMs: 1200
    });

    assert(result.ok, 'resultado ok');
    assert(result.captured, 'captured');
    assertEqual(result.outcome.execution_reference.type, 'action', 'ref type action');
    assertEqual(result.outcome.execution_reference.ref_id, TRACE_ID, 'trace id');
    restoreDb();
  });

  // T3
  suite('T3 — Execution reference obrigatória');
  await test('T3: sem execution_trace_id e workflow_instance_id retorna EXECUTION_REFERENCE_REQUIRED', async () => {
    const mock = createOutcomeDbMock(makeInProgressIoe({
      workflow_instance_id: null,
      execution_trace_id:   null
    }));
    patchDb(mock);
    const svc = loadTrackingService();

    const result = await svc.captureOutcome({
      companyId:     COMPANY_ID,
      ioeId:         IOE_ID,
      outcomeStatus: 'success'
    });

    assertEqual(result.ok, false, 'ok false');
    assertEqual(result.error, 'EXECUTION_REFERENCE_REQUIRED', 'error code');
    restoreDb();
  });

  // T4–T7 outcome statuses
  for (const status of ['success', 'failure', 'partial_success', 'cancelled']) {
    const label = { success: 'T4', failure: 'T5', partial_success: 'T6', cancelled: 'T7' }[status];
    suite(`${label} — ${status} aceito`);
    await test(`${label}: outcome_status=${status} aceito`, async () => {
      const mock = createOutcomeDbMock(makeInProgressIoe());
      patchDb(mock);
      const svc = loadTrackingService();

      const result = await svc.captureOutcome({
        companyId:     COMPANY_ID,
        ioeId:         IOE_ID,
        outcomeStatus: status,
        outcomeSummary: `Outcome ${status}`
      });

      assert(result.ok, 'ok');
      assert(result.captured, 'captured');
      assertEqual(result.outcome.outcome_status, status, 'status');
      restoreDb();
    });
  }

  // T8
  suite('T8 — Idempotência preservada');
  await test('T8: outcome duplicado retorna alreadyCaptured', async () => {
    const alreadyCaptured = makeInProgressIoe({
      decision_payload: {
        ...decisionPayload,
        aioi_outcome_captured: true,
        aioi_outcome: { outcome_status: 'success', captured_at: '2026-06-05T14:00:00.000Z' }
      }
    });
    const mock = createOutcomeDbMock(alreadyCaptured);
    patchDb(mock);
    const svc = loadTrackingService();

    const result = await svc.captureOutcome({
      companyId:     COMPANY_ID,
      ioeId:         IOE_ID,
      outcomeStatus: 'success'
    });

    assertEqual(result.ok, true, 'ok');
    assertEqual(result.alreadyCaptured, true, 'alreadyCaptured');
    restoreDb();
  });

  // T9
  suite('T9 — RLS preservado');
  await test('T9: bypass_rls sempre false em captura', async () => {
    const mock = createOutcomeDbMock(makeInProgressIoe());
    patchDb(mock);
    const svc = loadTrackingService();

    await svc.captureOutcome({
      companyId:     COMPANY_ID,
      ioeId:         IOE_ID,
      outcomeStatus: 'success'
    });

    const bypassCalls = mock._client._calls.filter(c => c.sql.includes('app.bypass_rls'));
    assert(bypassCalls.length >= 1, 'bypass_rls configurado');
    for (const c of bypassCalls) assert(c.sql.includes("'false'"), "bypass_rls='false'");
    restoreDb();
  });

  // T10
  suite('T10 — Multi-tenant preservado');
  await test('T10: set_config usa companyId correto', async () => {
    const mock = createOutcomeDbMock(makeInProgressIoe({ company_id: COMPANY_ID_B }));
    patchDb(mock);
    const svc = loadTrackingService();

    await svc.captureOutcome({
      companyId:     COMPANY_ID_B,
      ioeId:         IOE_ID,
      outcomeStatus: 'success'
    });

    const tenantCalls = mock._client._calls.filter(c =>
      c.sql.includes('app.current_company_id')
    );
    assert(tenantCalls.length >= 1, 'set_config company');
    assertEqual(tenantCalls[0].params[0], COMPANY_ID_B, 'company id');
    restoreDb();
  });

  // T11
  suite('T11 — Rollback em erro');
  await test('T11: erro de persistência retorna ok=false', async () => {
    const mock = createOutcomeDbMock(makeInProgressIoe());
    mock._client._calls._failNext = true;
    patchDb(mock);
    const svc = loadTrackingService();

    const result = await svc.captureOutcome({
      companyId:     COMPANY_ID,
      ioeId:         IOE_ID,
      outcomeStatus: 'success'
    });

    assertEqual(result.ok, false, 'ok false');
    assert(result.error, 'error presente');
    restoreDb();
  });

  // T12
  suite('T12 — operationalLearningService não chamado');
  await test('T12: arquivos P1.1 não referenciam operationalLearningService', async () => {
    const files = readServiceFiles();
    const forbidden = [
      'operationalLearningService',
      '.learn(',
      '.train(',
      'updateModel',
      'recordOperationalOutcome'
    ];
    for (const f of files) {
      const code = stripComments(f.content);
      for (const term of forbidden) {
        assert(!code.includes(term), `${f.name} não deve conter ${term}`);
      }
    }
  });

  // T13
  suite('T13 — operationalDecisionEngine ausente');
  await test('T13: arquivos P1.1 não referenciam operationalDecisionEngine', async () => {
    const files = readServiceFiles();
    for (const f of files) {
      const code = stripComments(f.content);
      assert(!code.includes('operationalDecisionEngine'), f.name);
      assert(!code.includes('industrialTruthEnforcementService'), f.name);
    }
  });

  // T14
  suite('T14 — computePriorityScore ausente');
  await test('T14: arquivos P1.1 não referenciam computePriorityScore', async () => {
    const files = readServiceFiles();
    for (const f of files) {
      const code = stripComments(f.content);
      assert(!code.includes('computePriorityScore'), f.name);
      assert(!code.includes('aioiClassificationMapper'), f.name);
    }
  });

  // T15
  suite('T15 — Logs corretos');
  await test('T15: aioiOutcomeMetrics emite os 5 labels obrigatórios', async () => {
    metrics.resetSessionCounters();
    metrics.recordCaptured(COMPANY_ID, IOE_ID, 'corr', 'success', 100);
    metrics.recordAlreadyCaptured(COMPANY_ID, IOE_ID, 'corr');
    metrics.recordSkipped(COMPANY_ID, IOE_ID, 'corr', 'TEST');
    metrics.recordError(COMPANY_ID, IOE_ID, 'corr', 'ERR');
    metrics.recordContextGenerated(COMPANY_ID, IOE_ID, 'corr');

    const src = fs.readFileSync(path.join(SERVICES_PATH, 'aioiOutcomeMetrics.js'), 'utf8');
    assert(src.includes('AIOI_OUTCOME_CAPTURED'), 'CAPTURED');
    assert(src.includes('AIOI_OUTCOME_ALREADY_CAPTURED'), 'ALREADY_CAPTURED');
    assert(src.includes('AIOI_OUTCOME_SKIPPED'), 'SKIPPED');
    assert(src.includes('AIOI_OUTCOME_ERROR'), 'ERROR');
    assert(src.includes('AIOI_OUTCOME_CONTEXT_GENERATED'), 'CONTEXT_GENERATED');

    const counters = metrics.getSessionCounters();
    assert(counters.outcome_captured_count >= 1, 'captured count');
    assert(counters.context_generated_count >= 1, 'context count');
  });

  // T16
  suite('T16 — learning_context gerado');
  await test('T16: buildOutcomePayload gera learning_context compatível', async () => {
    const ioe = makeInProgressIoe({ decision_type: 'direct_action', execution_trace_id: TRACE_ID, workflow_instance_id: null });
    const outcome = payloadBuilder.buildOutcomePayload(ioe, {
      outcomeStatus:       'success',
      outcomeSummary:      'Teste',
      executionDurationMs: 500
    });

    assertNotNull(outcome.learning_context, 'learning_context');
    assertEqual(outcome.learning_context.company_id, COMPANY_ID, 'company_id');
    assertEqual(outcome.learning_context.ioe_id, IOE_ID, 'ioe_id');
    assertEqual(outcome.learning_context.source, 'aioi_outcome_tracking', 'source');
    assert(typeof outcome.learning_context.success === 'boolean', 'success boolean');
    assertNotNull(outcome.captured_at, 'captured_at');
    assertNotNull(outcome.execution_reference, 'execution_reference');
  });

  await test('T16b: validateOutcomePayload rejeita status inválido', () => {
    const v = payloadBuilder.validateOutcomePayload({ outcomeStatus: 'invalid' });
    assertEqual(v.ok, false, 'invalid status');
    assertEqual(v.error, 'INVALID_OUTCOME_STATUS', 'error code');
  });

  // Report
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  AIOI-P1.1 Outcome Tracking Test Report');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Total: ${_passed + _failed} | PASS: ${_passed} | FAIL: ${_failed}`);
  console.log('');
  console.log(`  STATUS: ${_failed === 0 ? 'AIOI_P1_1_TEST_PASS' : 'AIOI_P1_1_TEST_FAIL'}`);
  console.log('');

  process.exit(_failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
