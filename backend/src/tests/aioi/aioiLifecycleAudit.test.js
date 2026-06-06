'use strict';

/**
 * AIOI-P1.3 — Testes automatizados da Operational Intelligence Audit Layer
 *
 * T1–T18 conforme especificação P1.3.
 * Executar: node src/tests/aioi/aioiLifecycleAudit.test.js
 */

let _passed = 0;
let _failed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}
function assertEqual(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message} — expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)}`);
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

const metrics = require(`${SERVICES_PATH}/aioiLifecycleMetrics`);
const snapshotService = require(`${SERVICES_PATH}/aioiLifecycleSnapshotService`);

const COMPANY_ID   = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const COMPANY_ID_B = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22';
const IOE_ID       = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33';
const IOE_OPEN     = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380d44';
const IOE_TRIAGED  = 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55';
const IOE_PENDING  = 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380f66';
const IOE_APPROVED = '06eebc99-9c0b-4ef8-bb6d-6bb9bd380a01';
const IOE_PROGRESS = '17eebc99-9c0b-4ef8-bb6d-6bb9bd380a02';
const IOE_RESOLVED = '28eebc99-9c0b-4ef8-bb6d-6bb9bd380a03';
const WF_ID        = 'f6eebc99-9c0b-4ef8-bb6d-6bb9bd380f66';
const USER_ID      = 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55';

function makeLearningContext() {
  return {
    company_id:     COMPANY_ID,
    machine_id:     'equip-001',
    action_type:    'aioi_workflow',
    success:        true,
    context_tag:    'failure',
    ioe_id:         IOE_RESOLVED,
    correlation_id: 'corr-resolved',
    outcome_status: 'success'
  };
}

function buildFixtureIoes() {
  const base = {
    company_id: COMPANY_ID,
    source_type: 'plc_event',
    category: 'equipment_degradation',
    priority_band: 'high',
    correlation_id: 'corr-base',
    decision_type: null,
    decision_payload: null,
    approved_by_user_id: null,
    approved_at: null,
    workflow_instance_id: null,
    execution_trace_id: null,
    created_at: '2026-06-05T08:00:00.000Z',
    updated_at: '2026-06-05T08:00:00.000Z',
    resolved_at: null
  };

  return [
    { ...base, id: IOE_OPEN, status: 'open' },
    { ...base, id: IOE_TRIAGED, status: 'triaged', decision_type: 'suggest_only',
      decision_payload: { recommendation: 'test' } },
    { ...base, id: IOE_PENDING, status: 'pending_approval', decision_type: 'workflow',
      decision_payload: { recommendation: 'test' }, correlation_id: 'corr-pending' },
    { ...base, id: IOE_APPROVED, status: 'approved', decision_type: 'workflow',
      approved_by_user_id: USER_ID, approved_at: '2026-06-05T12:00:00.000Z',
      correlation_id: 'corr-approved' },
    { ...base, id: IOE_PROGRESS, status: 'in_progress', decision_type: 'workflow',
      workflow_instance_id: WF_ID, approved_by_user_id: USER_ID,
      approved_at: '2026-06-05T12:00:00.000Z', correlation_id: 'corr-progress' },
    {
      ...base,
      id: IOE_RESOLVED,
      status: 'resolved',
      decision_type: 'workflow',
      workflow_instance_id: WF_ID,
      approved_by_user_id: USER_ID,
      approved_at: '2026-06-05T12:00:00.000Z',
      resolved_at: '2026-06-05T14:00:00.000Z',
      correlation_id: 'corr-resolved',
      decision_payload: {
        aioi_outcome_captured: true,
        aioi_outcome: {
          outcome_status: 'success',
          captured_at: '2026-06-05T14:00:00.000Z',
          learning_context: makeLearningContext()
        },
        aioi_learning_submitted: true,
        aioi_learning_processed: true,
        aioi_learning_submitted_at: '2026-06-05T15:00:00.000Z'
      }
    },
    {
      ...base,
      id: IOE_ID,
      status: 'resolved',
      decision_type: 'direct_action',
      execution_trace_id: 'a7eebc99-9c0b-4ef8-bb6d-6bb9bd380a77',
      approved_by_user_id: USER_ID,
      approved_at: '2026-06-05T11:00:00.000Z',
      resolved_at: '2026-06-05T13:00:00.000Z',
      correlation_id: 'corr-trace',
      decision_payload: {
        aioi_outcome_captured: true,
        aioi_outcome: {
          outcome_status: 'failure',
          captured_at: '2026-06-05T13:00:00.000Z',
          learning_context: { ...makeLearningContext(), success: false, outcome_status: 'failure' }
        }
      }
    }
  ];
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

function loadAuditService() {
  const modules = [
    `${SERVICES_PATH}/aioiLifecycleAuditService`,
    `${SERVICES_PATH}/aioiLifecycleSnapshotService`
  ];
  for (const mod of modules) {
    const resolved = require.resolve(mod);
    delete require.cache[resolved];
  }
  return require(`${SERVICES_PATH}/aioiLifecycleAuditService`);
}

function createAuditDbMock(ioes = buildFixtureIoes()) {
  const calls = [];
  const store = ioes.map(i => ({ ...i }));

  const client = {
    _calls: calls,
    get store() { return store; },
    async query(sql, params) {
      const s = sql.trim();
      calls.push({ sql: s, params });

      if (s.includes('set_config')) return { rows: [] };

      // Snapshot counts
      if (s.includes('COUNT(*)') && s.includes("status = 'open'")) {
        const filtered = _filterByCompany(store, params[0]);
        const count = (status, extra) => filtered.filter(i => {
          if (i.status !== status) return false;
          if (extra) return extra(i);
          return true;
        }).length;
        return {
          rows: [{
            open:               String(count('open')),
            triaged:            String(count('triaged')),
            pending_approval:   String(count('pending_approval')),
            approved:           String(count('approved')),
            rejected:           String(count('rejected')),
            in_progress:        String(count('in_progress')),
            resolved:           String(count('resolved')),
            learning_submitted: String(filtered.filter(i => i.decision_payload?.aioi_learning_submitted).length),
            learning_processed: String(filtered.filter(i => i.decision_payload?.aioi_learning_processed).length)
          }]
        };
      }

      // KPI aggregation — return mock averages
      if (s.includes('avg_time_open_to_triaged')) {
        return {
          rows: [{
            avg_time_open_to_triaged:       '3600000',
            avg_time_triaged_to_approval:   '7200000',
            avg_time_approval_to_execution: '1800000',
            avg_time_execution_to_outcome:  '5400000',
            avg_time_outcome_to_learning:   '900000',
            end_to_end_cycle_time:        '25200000'
          }]
        };
      }

      // Single IOE lifecycle
      if (s.includes('FROM industrial_operational_events') && s.includes('WHERE id = $1')) {
        const row = store.find(i => i.id === params[0] && i.company_id === params[1]);
        return { rows: row ? [row] : [] };
      }

      // Backlogs
      if (s.includes("status = 'pending_approval'")) {
        const rows = _filterByCompany(store, params[0]).filter(i => i.status === 'pending_approval');
        return { rows: rows.slice(0, params[1]) };
      }
      if (s.includes("status = 'approved'") && s.includes('execution_trace_id IS NULL')) {
        const rows = _filterByCompany(store, params[0]).filter(i =>
          i.status === 'approved' && i.approved_by_user_id && i.approved_at
            && !i.execution_trace_id && !i.workflow_instance_id
        );
        return { rows: rows.slice(0, params[1]) };
      }
      if (s.includes("status = 'in_progress'") && s.includes('aioi_outcome_captured')) {
        const rows = _filterByCompany(store, params[0]).filter(i =>
          i.status === 'in_progress'
            && (i.execution_trace_id || i.workflow_instance_id)
            && !i.decision_payload?.aioi_outcome_captured
        );
        return { rows: rows.slice(0, params[1]) };
      }
      if (s.includes("status = 'resolved'") && s.includes('learning_context')) {
        const rows = _filterByCompany(store, params[0]).filter(i =>
          i.status === 'resolved'
            && i.decision_payload?.aioi_outcome?.learning_context
            && !i.decision_payload?.aioi_learning_submitted
        );
        return { rows: rows.slice(0, params[1]) };
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

function _filterByCompany(store, companyId) {
  return store.filter(i => i.company_id === companyId);
}

function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function readServiceFiles() {
  const files = [
    'aioiLifecycleAuditService.js',
    'aioiLifecycleSnapshotService.js',
    'aioiLifecycleMetrics.js'
  ];
  return files.map(f => ({
    name: f,
    content: fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')
  }));
}

function assertNoWrites(calls) {
  for (const c of calls) {
    const s = c.sql.trim().toUpperCase();
    assert(!s.startsWith('UPDATE'), `escrita UPDATE detectada: ${c.sql.slice(0, 60)}`);
    assert(!s.startsWith('INSERT'), `escrita INSERT detectada: ${c.sql.slice(0, 60)}`);
    assert(!s.startsWith('DELETE'), `escrita DELETE detectada: ${c.sql.slice(0, 60)}`);
  }
}

async function runTests() {
  metrics.resetSessionCounters();

  // T1
  suite('T1 — lifecycle snapshot correto');
  await test('T1: getLifecycleSnapshot retorna contagens por status', async () => {
    const mock = createAuditDbMock();
    patchDb(mock);
    const audit = loadAuditService();

    const result = await audit.getLifecycleSnapshot(COMPANY_ID);

    assert(result.ok, 'ok');
    assertEqual(result.snapshot.open, 1, 'open');
    assertEqual(result.snapshot.triaged, 1, 'triaged');
    assertEqual(result.snapshot.pending_approval, 1, 'pending_approval');
    assertEqual(result.snapshot.approved, 1, 'approved');
    assertEqual(result.snapshot.in_progress, 1, 'in_progress');
    assertEqual(result.snapshot.resolved, 2, 'resolved');
    assertEqual(result.snapshot.learning_submitted, 1, 'learning_submitted');
    assertEqual(result.snapshot.learning_processed, 1, 'learning_processed');
    restoreDb();
  });

  // T2
  suite('T2 — backlog approval correto');
  await test('T2: getApprovalBacklog lista pending_approval', async () => {
    const mock = createAuditDbMock();
    patchDb(mock);
    const audit = loadAuditService();

    const result = await audit.getApprovalBacklog(COMPANY_ID);

    assert(result.ok, 'ok');
    assertEqual(result.count, 1, 'count');
    assertEqual(result.backlog[0].id, IOE_PENDING, 'ioe id');
    restoreDb();
  });

  // T3
  suite('T3 — backlog execution correto');
  await test('T3: getExecutionBacklog lista approved sem refs', async () => {
    const mock = createAuditDbMock();
    patchDb(mock);
    const audit = loadAuditService();

    const result = await audit.getExecutionBacklog(COMPANY_ID);

    assert(result.ok, 'ok');
    assertEqual(result.count, 1, 'count');
    assertEqual(result.backlog[0].id, IOE_APPROVED, 'ioe id');
    restoreDb();
  });

  // T4
  suite('T4 — backlog outcome correto');
  await test('T4: getOutcomeBacklog lista in_progress sem outcome', async () => {
    const mock = createAuditDbMock();
    patchDb(mock);
    const audit = loadAuditService();

    const result = await audit.getOutcomeBacklog(COMPANY_ID);

    assert(result.ok, 'ok');
    assertEqual(result.count, 1, 'count');
    assertEqual(result.backlog[0].id, IOE_PROGRESS, 'ioe id');
    restoreDb();
  });

  // T5
  suite('T5 — backlog learning correto');
  await test('T5: getLearningBacklog lista resolved sem learning_submitted', async () => {
    const mock = createAuditDbMock();
    patchDb(mock);
    const audit = loadAuditService();

    const result = await audit.getLearningBacklog(COMPANY_ID);

    assert(result.ok, 'ok');
    assertEqual(result.count, 1, 'count');
    assertEqual(result.backlog[0].id, IOE_ID, 'ioe id');
    restoreDb();
  });

  // T6
  suite('T6 — lifecycle trace correto');
  await test('T6: getIoeLifecycle retorna rastreabilidade completa', async () => {
    const mock = createAuditDbMock();
    patchDb(mock);
    const audit = loadAuditService();

    const result = await audit.getIoeLifecycle(IOE_RESOLVED, COMPANY_ID);

    assert(result.ok, 'ok');
    assertEqual(result.lifecycle.ioe_id, IOE_RESOLVED, 'ioe_id');
    assertEqual(result.lifecycle.status, 'resolved', 'status');
    assertEqual(result.lifecycle.outcome_status, 'success', 'outcome_status');
    assertEqual(result.lifecycle.learning_submitted, true, 'learning_submitted');
    assertEqual(result.lifecycle.learning_processed, true, 'learning_processed');
    assertEqual(result.lifecycle.workflow_instance_id, WF_ID, 'workflow_instance_id');
    restoreDb();
  });

  // T7
  suite('T7 — RLS preservado');
  await test('T7: bypass_rls sempre false', async () => {
    const mock = createAuditDbMock();
    patchDb(mock);
    const audit = loadAuditService();

    await audit.getLifecycleSnapshot(COMPANY_ID);

    const bypassCalls = mock._client._calls.filter(c => c.sql.includes('app.bypass_rls'));
    assert(bypassCalls.length >= 1, 'bypass_rls');
    for (const c of bypassCalls) assert(c.sql.includes("'false'"), "bypass_rls='false'");
    restoreDb();
  });

  // T8
  suite('T8 — multi-tenant preservado');
  await test('T8: consultas filtram por companyId', async () => {
    const ioes = buildFixtureIoes().map(i => ({ ...i, company_id: COMPANY_ID_B }));
    const mock = createAuditDbMock(ioes);
    patchDb(mock);
    const audit = loadAuditService();

    const result = await audit.getLifecycleSnapshot(COMPANY_ID_B);

    assert(result.ok, 'ok');
    assertEqual(result.snapshot.open, 1, 'open no tenant B');
    const tenantCalls = mock._client._calls.filter(c => c.sql.includes('app.current_company_id'));
    assert(tenantCalls.length >= 1, 'set_config');
    assertEqual(tenantCalls[0].params[0], COMPANY_ID_B, 'company id');
    restoreDb();
  });

  // T9
  suite('T9 — rollback inexistente (read only)');
  await test('T9: _assertReadOnlySql rejeita UPDATE', () => {
    let threw = false;
    try {
      snapshotService._assertReadOnlySql('UPDATE industrial_operational_events SET status = x');
    } catch (e) {
      threw = true;
      assert(e.message.includes('escrita proibida'), 'mensagem');
    }
    assert(threw, 'deve lançar');
  });

  // T10–T14 forbidden imports
  const forbiddenChecks = [
    { suite: 'T10', label: 'operationalDecisionEngine', pattern: 'operationalDecisionEngine' },
    { suite: 'T11', label: 'operationalLearningService', pattern: 'operationalLearningService' },
    { suite: 'T12', label: 'workflowOrchestrator', pattern: 'workflowOrchestrator' },
    { suite: 'T13', label: 'actionRuntimeOrchestrator', pattern: 'actionRuntimeOrchestrator' },
    { suite: 'T14', label: 'computePriorityScore', pattern: 'computePriorityScore' }
  ];

  for (const fc of forbiddenChecks) {
    suite(`${fc.suite} — ${fc.label} ausente`);
    await test(`${fc.suite}: arquivos P1.3 não referenciam ${fc.label}`, async () => {
      const files = readServiceFiles();
      for (const f of files) {
        const code = stripComments(f.content);
        assert(!code.includes(fc.pattern), `${f.name} contém ${fc.pattern}`);
      }
    });
  }

  // T15
  suite('T15 — métricas corretas');
  await test('T15: getSessionCounters expõe contadores de auditoria', async () => {
    metrics.resetSessionCounters();
    metrics.recordSnapshot(COMPANY_ID, { open: 1 }, 50);
    metrics.recordQuery(COMPANY_ID, 'test', 30);
    metrics.recordBacklogDetected(COMPANY_ID, 'approval', 2);
    metrics.recordAuditRequested(COMPANY_ID, IOE_ID);
    metrics.recordError(COMPANY_ID, 'ctx', 'err');

    const counters = metrics.getSessionCounters();
    assertEqual(counters.lifecycle_snapshots, 1, 'snapshots');
    assertEqual(counters.lifecycle_queries, 1, 'queries');
    assertEqual(counters.backlog_detections, 1, 'backlogs');
    assertEqual(counters.audit_requests, 1, 'audit');
    assertEqual(counters.audit_errors, 1, 'errors');
    assertEqual(counters.avg_query_latency_ms, 40, 'avg latency');
  });

  // T16
  suite('T16 — logs corretos');
  await test('T16: aioiLifecycleMetrics emite os 5 labels obrigatórios', () => {
    const src = fs.readFileSync(path.join(SERVICES_PATH, 'aioiLifecycleMetrics.js'), 'utf8');
    assert(src.includes('AIOI_LIFECYCLE_SNAPSHOT'), 'SNAPSHOT');
    assert(src.includes('AIOI_LIFECYCLE_QUERY'), 'QUERY');
    assert(src.includes('AIOI_BACKLOG_DETECTED'), 'BACKLOG');
    assert(src.includes('AIOI_AUDIT_REQUESTED'), 'AUDIT');
    assert(src.includes('AIOI_AUDIT_ERROR'), 'ERROR');
  });

  // T17
  suite('T17 — nenhuma escrita executada');
  await test('T17: todas as queries do snapshot são SELECT', async () => {
    const mock = createAuditDbMock();
    patchDb(mock);
    const audit = loadAuditService();

    await audit.getLifecycleSnapshot(COMPANY_ID);
    await audit.getCycleKpis(COMPANY_ID);
    await audit.getApprovalBacklog(COMPANY_ID);
    await audit.getIoeLifecycle(IOE_RESOLVED, COMPANY_ID);

    assertNoWrites(mock._client._calls);
    restoreDb();
  });

  // T18
  suite('T18 — nenhuma alteração de estado');
  await test('T18: fixture store inalterado após consultas', async () => {
    const mock = createAuditDbMock();
    const before = JSON.stringify(mock._client.store);
    patchDb(mock);
    const audit = loadAuditService();

    await audit.getLifecycleSnapshot(COMPANY_ID);
    await audit.getApprovalBacklog(COMPANY_ID);
    await audit.getExecutionBacklog(COMPANY_ID);
    await audit.getOutcomeBacklog(COMPANY_ID);
    await audit.getLearningBacklog(COMPANY_ID);
    await audit.getIoeLifecycle(IOE_RESOLVED, COMPANY_ID);
    await audit.getCycleKpis(COMPANY_ID);

    const after = JSON.stringify(mock._client.store);
    assertEqual(after, before, 'store inalterado');
    assertNoWrites(mock._client._calls);
    restoreDb();
  });

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  AIOI-P1.3 Operational Intelligence Audit Test Report');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Total: ${_passed + _failed} | PASS: ${_passed} | FAIL: ${_failed}`);
  console.log('');
  console.log(`  STATUS: ${_failed === 0 ? 'AIOI_P1_3_TEST_PASS' : 'AIOI_P1_3_TEST_FAIL'}`);
  console.log('');

  process.exit(_failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
