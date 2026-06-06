'use strict';

/**
 * AIOI-P2.0 — Testes automatizados da Executive Intelligence Read Model Layer
 *
 * T1–T26 conforme especificação P2.0.
 * Executar: node src/tests/aioi/aioiExecutiveReadModel.test.js
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

function getExecMetrics() {
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiExecutiveMetrics`)];
  return require(`${SERVICES_PATH}/aioiExecutiveMetrics`);
}

const COMPANY_ID   = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const COMPANY_ID_B = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22';
const IOE_OPEN     = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380d44';
const IOE_TRIAGED  = 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55';
const IOE_PENDING  = 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380f66';
const IOE_APPROVED = '06eebc99-9c0b-4ef8-bb6d-6bb9bd380a01';
const IOE_PROGRESS = '17eebc99-9c0b-4ef8-bb6d-6bb9bd380a02';
const IOE_RESOLVED = '28eebc99-9c0b-4ef8-bb6d-6bb9bd380a03';
const IOE_CRITICAL = '39eebc99-9c0b-4ef8-bb6d-6bb9bd380a04';
const WF_ID        = 'f6eebc99-9c0b-4ef8-bb6d-6bb9bd380f66';
const USER_ID      = 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55';

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
    updated_at: '2026-06-05T10:00:00.000Z',
    resolved_at: null
  };

  return [
    { ...base, id: IOE_OPEN, status: 'open', priority_band: 'medium' },
    { ...base, id: IOE_TRIAGED, status: 'triaged', decision_type: 'suggest_only',
      decision_payload: { recommendation: 'test' } },
    { ...base, id: IOE_PENDING, status: 'pending_approval', decision_type: 'workflow',
      decision_payload: { recommendation: 'test' } },
    { ...base, id: IOE_APPROVED, status: 'approved', decision_type: 'workflow',
      approved_by_user_id: USER_ID, approved_at: '2026-06-05T12:00:00.000Z' },
    { ...base, id: IOE_PROGRESS, status: 'in_progress', decision_type: 'workflow',
      workflow_instance_id: WF_ID, approved_by_user_id: USER_ID,
      approved_at: '2026-06-05T12:00:00.000Z' },
    {
      ...base, id: IOE_RESOLVED, status: 'resolved', category: 'equipment_failure',
      workflow_instance_id: WF_ID, approved_by_user_id: USER_ID,
      approved_at: '2026-06-05T12:00:00.000Z',
      resolved_at: '2026-06-05T14:00:00.000Z',
      decision_payload: {
        aioi_outcome_captured: true,
        aioi_outcome: { outcome_status: 'success', captured_at: '2026-06-05T14:00:00.000Z',
          learning_context: { company_id: COMPANY_ID, machine_id: 'm1' } },
        aioi_learning_submitted: true,
        aioi_learning_submitted_at: '2026-06-05T15:00:00.000Z'
      }
    },
    {
      ...base, id: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33', status: 'resolved',
      category: 'quality_issue', priority_band: 'low',
      execution_trace_id: 'a7eebc99-9c0b-4ef8-bb6d-6bb9bd380a77',
      approved_by_user_id: USER_ID, approved_at: '2026-06-05T11:00:00.000Z',
      resolved_at: '2026-06-05T13:00:00.000Z',
      decision_payload: {
        aioi_outcome_captured: true,
        aioi_outcome: { outcome_status: 'failure', captured_at: '2026-06-05T13:00:00.000Z',
          learning_context: { company_id: COMPANY_ID } }
      }
    },
    { ...base, id: IOE_CRITICAL, status: 'triaged', priority_band: 'critical',
      category: 'safety_incident' }
  ];
}

const DB_MOD_PATH = require.resolve('../../db');
require(DB_MOD_PATH);
let _originalDb;

function patchDb(mock) {
  _originalDb = require.cache[DB_MOD_PATH].exports;
  require.cache[DB_MOD_PATH].exports = mock;
}
function restoreDb() {
  if (_originalDb && require.cache[DB_MOD_PATH]) {
    require.cache[DB_MOD_PATH].exports = _originalDb;
  }
}

const P2_MODULES = [
  'aioiExecutiveMetrics',
  'aioiExecutiveSnapshotService',
  'aioiBottleneckAnalysisService',
  'aioiCycleAnalyticsService',
  'aioiOperationalViewService',
  'aioiExecutiveReadModelService'
];

function loadP2Services() {
  const loaded = {};
  for (const mod of P2_MODULES) {
    delete require.cache[require.resolve(`${SERVICES_PATH}/${mod}`)];
    loaded[mod] = require(`${SERVICES_PATH}/${mod}`);
  }
  return loaded;
}

function _filterIoes(store, companyId) {
  return store.filter(i => i.company_id === companyId);
}

function createExecutiveDbMock(ioes = buildFixtureIoes()) {
  const calls = [];
  const store = ioes.map(i => ({ ...i }));

  const client = {
    _calls: calls,
    get store() { return store; },
    async query(sql, params) {
      const s = sql.trim();
      calls.push({ sql: s, params });
      if (s.includes('set_config') || s === 'BEGIN' || s === 'COMMIT' || s === 'ROLLBACK') {
        return { rows: [] };
      }

      const filtered = _filterIoes(store, params[0]);

      // Executive snapshot / counts
      if (s.includes("status = 'open'") && s.includes('critical_events')) {
        const count = (st) => filtered.filter(i => i.status === st).length;
        const critical = filtered.filter(i =>
          i.priority_band === 'critical'
            && !['closed', 'auto_closed', 'rejected'].includes(i.status)
        ).length;
        const withOutcome = filtered.filter(i => i.decision_payload?.aioi_outcome?.outcome_status);
        const success = withOutcome.filter(i =>
          ['success', 'partial_success'].includes(i.decision_payload.aioi_outcome.outcome_status)
        ).length;
        return {
          rows: [{
            open: String(count('open')),
            triaged: String(count('triaged')),
            pending_approval: String(count('pending_approval')),
            approved: String(count('approved')),
            rejected: String(count('rejected')),
            in_progress: String(count('in_progress')),
            resolved: String(count('resolved')),
            critical_events: String(critical),
            avg_resolution_time_ms: '7200000',
            avg_approval_time_ms: '3600000',
            avg_execution_time_ms: '5400000',
            success_count: String(success),
            total_with_outcome: String(withOutcome.length)
          }]
        };
      }

      // Critical only
      if (s.includes("priority_band = 'critical'") && s.includes('COUNT(*) AS critical_events')) {
        const critical = filtered.filter(i =>
          i.priority_band === 'critical'
            && !['closed', 'auto_closed', 'rejected'].includes(i.status)
        ).length;
        return { rows: [{ critical_events: String(critical) }] };
      }

      // Success rate only
      if (s.includes('total_with_outcome') && !s.includes("status = 'open'")) {
        const withOutcome = filtered.filter(i => i.decision_payload?.aioi_outcome?.outcome_status);
        const success = withOutcome.filter(i =>
          ['success', 'partial_success'].includes(i.decision_payload.aioi_outcome.outcome_status)
        ).length;
        return { rows: [{ success_count: String(success), total_with_outcome: String(withOutcome.length) }] };
      }

      // Bottleneck summary
      if (s.includes('approval_backlog') && s.includes('execution_backlog')) {
        return {
          rows: [{
            approval_backlog:  String(filtered.filter(i => i.status === 'pending_approval').length),
            execution_backlog: String(filtered.filter(i =>
              i.status === 'approved' && i.approved_by_user_id && !i.execution_trace_id && !i.workflow_instance_id
            ).length),
            outcome_backlog:   String(filtered.filter(i =>
              i.status === 'in_progress' && (i.execution_trace_id || i.workflow_instance_id)
                && !i.decision_payload?.aioi_outcome_captured
            ).length),
            learning_backlog:  String(filtered.filter(i =>
              i.status === 'resolved' && i.decision_payload?.aioi_outcome?.learning_context
                && !i.decision_payload?.aioi_learning_submitted
            ).length)
          }]
        };
      }

      // Cycle KPIs
      if (s.includes('open_to_triaged_ms')) {
        return {
          rows: [{
            open_to_triaged_ms: '3600000',
            triaged_to_approval_ms: '7200000',
            approval_to_execution_ms: '1800000',
            execution_to_outcome_ms: '5400000',
            outcome_to_learning_ms: '900000',
            end_to_end_cycle_ms: '25200000'
          }]
        };
      }

      // Backlog lists
      if (s.includes("status = 'pending_approval'") && s.includes('ORDER BY')) {
        return { rows: filtered.filter(i => i.status === 'pending_approval').slice(0, params[1]) };
      }
      if (s.includes("status = 'approved'") && s.includes('execution_trace_id IS NULL') && s.includes('ORDER BY')) {
        return { rows: filtered.filter(i =>
          i.status === 'approved' && i.approved_by_user_id && !i.execution_trace_id && !i.workflow_instance_id
        ).slice(0, params[1]) };
      }
      if (s.includes("status = 'in_progress'") && s.includes('aioi_outcome_captured') && s.includes('ORDER BY')) {
        return { rows: filtered.filter(i =>
          i.status === 'in_progress' && (i.execution_trace_id || i.workflow_instance_id)
            && !i.decision_payload?.aioi_outcome_captured
        ).slice(0, params[1]) };
      }
      if (s.includes("status = 'resolved'") && s.includes('learning_context') && s.includes('ORDER BY')) {
        return { rows: filtered.filter(i =>
          i.status === 'resolved' && i.decision_payload?.aioi_outcome?.learning_context
            && !i.decision_payload?.aioi_learning_submitted
        ).slice(0, params[1]) };
      }

      // Distributions
      if (s.includes('GROUP BY priority_band')) {
        const map = {};
        filtered.forEach(i => { map[i.priority_band] = (map[i.priority_band] || 0) + 1; });
        return { rows: Object.entries(map).map(([priority_band, count]) => ({ priority_band, count: String(count) })) };
      }
      if (s.includes('GROUP BY category')) {
        const map = {};
        filtered.forEach(i => { map[i.category] = (map[i.category] || 0) + 1; });
        return { rows: Object.entries(map).map(([category, count]) => ({ category, count: String(count) })) };
      }
      if (s.includes('GROUP BY status')) {
        const map = {};
        filtered.forEach(i => { map[i.status] = (map[i.status] || 0) + 1; });
        return { rows: Object.entries(map).map(([status, count]) => ({ status, count: String(count) })) };
      }

      return { rows: [] };
    },
    release: () => {}
  };

  return { pool: { connect: async () => client }, query: async (s, p) => client.query(s, p), _client: client };
}

function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function readP2Files() {
  return [
    'aioiExecutiveMetrics.js',
    'aioiExecutiveSnapshotService.js',
    'aioiBottleneckAnalysisService.js',
    'aioiCycleAnalyticsService.js',
    'aioiOperationalViewService.js',
    'aioiExecutiveReadModelService.js'
  ].map(f => ({ name: f, content: fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8') }));
}

function assertNoWrites(calls) {
  for (const c of calls) {
    const s = c.sql.trim().toUpperCase();
    if (['UPDATE', 'INSERT', 'DELETE', 'TRUNCATE', 'ALTER', 'DROP', 'MERGE'].some(k => s.startsWith(k))) {
      throw new Error(`escrita detectada: ${c.sql.slice(0, 60)}`);
    }
    if (s.includes('ON CONFLICT')) throw new Error('UPSERT detectado');
  }
}

async function runTests() {
  let execMetrics = getExecMetrics();
  execMetrics.resetSessionCounters();

  // T1
  suite('T1 — Executive snapshot correto');
  await test('T1: getExecutiveSnapshot retorna visão consolidada', async () => {
    patchDb(createExecutiveDbMock());
    const svc = loadP2Services();
    const r = await svc.aioiExecutiveSnapshotService.getExecutiveSnapshot(COMPANY_ID);
    assert(r.ok, 'ok');
    assertEqual(r.snapshot.open, 1, 'open');
    assertEqual(r.snapshot.resolved, 2, 'resolved');
    assertEqual(r.snapshot.critical_events, 1, 'critical');
    restoreDb();
  });

  // T2
  suite('T2 — Critical events correto');
  await test('T2: getCriticalEventsSummary', async () => {
    patchDb(createExecutiveDbMock());
    const svc = loadP2Services();
    const r = await svc.aioiExecutiveSnapshotService.getCriticalEventsSummary(COMPANY_ID);
    assertEqual(r.critical_events, 1, 'critical');
    restoreDb();
  });

  // T3
  suite('T3 — Success rate correto');
  await test('T3: getOperationalSuccessRate', async () => {
    patchDb(createExecutiveDbMock());
    const svc = loadP2Services();
    const r = await svc.aioiExecutiveSnapshotService.getOperationalSuccessRate(COMPANY_ID);
    assertEqual(r.operational_success_rate, 0.5, 'rate 1/2');
    restoreDb();
  });

  // T4–T7 backlogs
  const backlogTests = [
    { t: 'T4', fn: 'getApprovalBacklog', id: IOE_PENDING },
    { t: 'T5', fn: 'getExecutionBacklog', id: IOE_APPROVED },
    { t: 'T6', fn: 'getOutcomeBacklog', id: IOE_PROGRESS },
    { t: 'T7', fn: 'getLearningBacklog', id: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33' }
  ];
  for (const bt of backlogTests) {
    suite(`${bt.t} — ${bt.fn}`);
    await test(`${bt.t}: ${bt.fn} retorna backlog`, async () => {
      patchDb(createExecutiveDbMock());
      const svc = loadP2Services();
      const r = await svc.aioiBottleneckAnalysisService[bt.fn](COMPANY_ID);
      assert(r.ok, 'ok');
      assertEqual(r.count, 1, 'count');
      assertEqual(r.backlog[0].id, bt.id, 'ioe id');
      restoreDb();
    });
  }

  // T8
  suite('T8 — Largest bottleneck correto');
  await test('T8: getBottleneckSummary identifica maior gargalo', async () => {
    patchDb(createExecutiveDbMock());
    const svc = loadP2Services();
    const r = await svc.aioiBottleneckAnalysisService.getBottleneckSummary(COMPANY_ID);
    assert(r.ok, 'ok');
    assertEqual(r.bottlenecks.approval_backlog, 1, 'approval');
    assertEqual(r.bottlenecks.largest_bottleneck, 'approval', 'largest');
    restoreDb();
  });

  // T9–T15 cycle analytics
  suite('T9 — Lifecycle analytics correto');
  await test('T9: getLifecycleAnalytics retorna todas as métricas', async () => {
    patchDb(createExecutiveDbMock());
    const svc = loadP2Services();
    const r = await svc.aioiCycleAnalyticsService.getLifecycleAnalytics(COMPANY_ID);
    assert(r.ok, 'ok');
    assert(r.analytics.open_to_triaged_ms != null, 'open_to_triaged');
    assert(r.analytics.end_to_end_cycle_ms != null, 'e2e');
    restoreDb();
  });

  const cycleFields = [
    ['T10', 'open_to_triaged_ms', 3600000],
    ['T11', 'triaged_to_approval_ms', 7200000],
    ['T12', 'approval_to_execution_ms', 1800000],
    ['T13', 'execution_to_outcome_ms', 5400000],
    ['T14', 'outcome_to_learning_ms', 900000],
    ['T15', 'end_to_end_cycle_ms', 25200000]
  ];
  for (const [label, field, val] of cycleFields) {
    suite(`${label} — ${field}`);
    await test(`${label}: ${field} correto`, async () => {
      patchDb(createExecutiveDbMock());
      const svc = loadP2Services();
      const r = await svc.aioiCycleAnalyticsService.getCycleKpis(COMPANY_ID);
      assertEqual(r.kpis[field], val, field);
      restoreDb();
    });
  }

  // T16–T19 operational view
  suite('T16 — Operational view correto');
  await test('T16: getOperationalView agrega distribuições', async () => {
    patchDb(createExecutiveDbMock());
    const svc = loadP2Services();
    const r = await svc.aioiOperationalViewService.getOperationalView(COMPANY_ID);
    assert(r.ok, 'ok');
    assert(r.operational_view.priorities.length >= 1, 'priorities');
    assert(r.operational_view.categories.length >= 1, 'categories');
    assert(r.operational_view.statuses.length >= 1, 'statuses');
    restoreDb();
  });

  suite('T17 — Priority distribution');
  await test('T17: getPriorityDistribution', async () => {
    patchDb(createExecutiveDbMock());
    const svc = loadP2Services();
    const r = await svc.aioiOperationalViewService.getPriorityDistribution(COMPANY_ID);
    assert(r.priorities.some(p => p.priority_band === 'critical'), 'critical band');
    restoreDb();
  });

  suite('T18 — Category distribution');
  await test('T18: getCategoryDistribution', async () => {
    patchDb(createExecutiveDbMock());
    const svc = loadP2Services();
    const r = await svc.aioiOperationalViewService.getCategoryDistribution(COMPANY_ID);
    assert(r.categories.some(c => c.category === 'equipment_degradation'), 'category');
    restoreDb();
  });

  suite('T19 — Status distribution');
  await test('T19: getStatusDistribution', async () => {
    patchDb(createExecutiveDbMock());
    const svc = loadP2Services();
    const r = await svc.aioiOperationalViewService.getStatusDistribution(COMPANY_ID);
    assert(r.statuses.some(s => s.status === 'resolved'), 'resolved');
    restoreDb();
  });

  // T20
  suite('T20 — Read model agregado correto');
  await test('T20: getExecutiveReadModel consolida todas as visões', async () => {
    patchDb(createExecutiveDbMock());
    const svc = loadP2Services();
    const r = await svc.aioiExecutiveReadModelService.getExecutiveReadModel(COMPANY_ID);
    assert(r.ok, 'ok');
    assert(r.read_model.executive_snapshot, 'snapshot');
    assert(r.read_model.bottlenecks, 'bottlenecks');
    assert(r.read_model.cycle_analytics, 'cycle');
    assert(r.read_model.operational_view, 'view');
    restoreDb();
  });

  // T21
  suite('T21 — RLS preservado');
  await test('T21: bypass_rls sempre false', async () => {
    const mock = createExecutiveDbMock();
    patchDb(mock);
    const svc = loadP2Services();
    await svc.aioiExecutiveSnapshotService.getExecutiveSnapshot(COMPANY_ID);
    const bypass = mock._client._calls.filter(c => c.sql.includes('app.bypass_rls'));
    assert(bypass.length >= 1, 'bypass');
    for (const c of bypass) assert(c.sql.includes("'false'"), "false");
    restoreDb();
  });

  // T22
  suite('T22 — Multi-tenant preservado');
  await test('T22: consultas filtram por companyId', async () => {
    const ioes = buildFixtureIoes().map(i => ({ ...i, company_id: COMPANY_ID_B }));
    const mock = createExecutiveDbMock(ioes);
    patchDb(mock);
    const svc = loadP2Services();
    const r = await svc.aioiExecutiveSnapshotService.getExecutiveSnapshot(COMPANY_ID_B);
    assertEqual(r.snapshot.open, 1, 'open tenant B');
    const tenant = mock._client._calls.filter(c => c.sql.includes('app.current_company_id'));
    assertEqual(tenant[0].params[0], COMPANY_ID_B, 'tenant');
    restoreDb();
  });

  // T23
  suite('T23 — Nenhuma escrita executada');
  await test('T23: todas as queries são SELECT', async () => {
    const mock = createExecutiveDbMock();
    patchDb(mock);
    const svc = loadP2Services();
    await svc.aioiExecutiveReadModelService.getExecutiveReadModel(COMPANY_ID);
    assertNoWrites(mock._client._calls);
    restoreDb();
  });

  // T24
  suite('T24 — Nenhum soberano funcional importado');
  await test('T24: arquivos P2.0 não importam soberanos', () => {
    const forbidden = [
      'operationalDecisionEngine', 'operationalLearningService',
      'workflowOrchestrator', 'actionRuntimeOrchestrator',
      'operationalPrioritizationService', 'industrialTruthEnforcementService'
    ];
    for (const f of readP2Files()) {
      const code = stripComments(f.content);
      for (const term of forbidden) assert(!code.includes(term), `${f.name} contém ${term}`);
    }
  });

  // T25
  suite('T25 — Logs corretos');
  await test('T25: labels obrigatórios presentes', () => {
    const src = fs.readFileSync(path.join(SERVICES_PATH, 'aioiExecutiveMetrics.js'), 'utf8');
    assert(src.includes('AIOI_EXECUTIVE_SNAPSHOT_REQUESTED'));
    assert(src.includes('AIOI_OPERATIONAL_VIEW_REQUESTED'));
    assert(src.includes('AIOI_BOTTLENECK_ANALYSIS_REQUESTED'));
    assert(src.includes('AIOI_CYCLE_ANALYTICS_REQUESTED'));
    assert(src.includes('AIOI_EXECUTIVE_QUERY_ERROR'));
  });

  // T26
  suite('T26 — Métricas corretas');
  await test('T26: getSessionCounters expõe contadores', () => {
    execMetrics = getExecMetrics();
    execMetrics.resetSessionCounters();
    execMetrics.recordSnapshotRequested(COMPANY_ID, 100);
    execMetrics.recordOperationalViewRequested(COMPANY_ID, 50);
    execMetrics.recordBottleneckAnalysisRequested(COMPANY_ID, 30);
    execMetrics.recordCycleAnalyticsRequested(COMPANY_ID, 20);
    execMetrics.recordError(COMPANY_ID, 'ctx', 'err');
    const c = execMetrics.getSessionCounters();
    assertEqual(c.executive_snapshot_requests, 1, 'snapshot');
    assertEqual(c.executive_query_errors, 1, 'errors');
  });

  // T27 bonus - READ_ONLY_LAYER_VIOLATION
  suite('T27 — assertReadOnlySql bloqueia escrita');
  await test('T27: INSERT lança READ_ONLY_LAYER_VIOLATION', () => {
    execMetrics = getExecMetrics();
    let threw = false;
    try { execMetrics.assertReadOnlySql('INSERT INTO foo VALUES (1)'); } catch (e) {
      threw = true;
      assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', 'error code');
    }
    assert(threw, 'deve lançar');
  });

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  AIOI-P2.0 Executive Intelligence Read Model Test Report');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Total: ${_passed + _failed} | PASS: ${_passed} | FAIL: ${_failed}`);
  console.log('');
  console.log(`  STATUS: ${_failed === 0 ? 'AIOI_P2_0_TEST_PASS' : 'AIOI_P2_0_TEST_FAIL'}`);
  console.log('');

  process.exit(_failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
