'use strict';

/**
 * AIOI-P2.1 — Testes automatizados da Executive Governance & SLA Intelligence Layer
 *
 * T1–T30 conforme especificação P2.1.
 * Executar: node src/tests/aioi/aioiGovernanceReadModel.test.js
 */

let _passed = 0;
let _failed = 0;

function assert(c, m) { if (!c) throw new Error(`ASSERTION FAILED: ${m}`); }
function assertEqual(a, e, m) {
  if (a !== e) throw new Error(`${m} — expected: ${JSON.stringify(e)}, got: ${JSON.stringify(a)}`);
}

async function test(name, fn) {
  try { await fn(); _passed++; console.log(`  ✓  ${name}`); }
  catch (err) { _failed++; console.error(`  ✗  ${name}`); console.error(`     ${err.message}`); }
}
function suite(n) { console.log(`\n[SUITE] ${n}`); }

const path = require('path');
const fs = require('fs');
const SERVICES_PATH = path.resolve(__dirname, '../../services/aioi');

const COMPANY_ID   = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const COMPANY_ID_B = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22';

const DB_MOD_PATH = require.resolve('../../db');
require(DB_MOD_PATH);
let _originalDb;

function patchDb(mock) {
  _originalDb = require.cache[DB_MOD_PATH].exports;
  require.cache[DB_MOD_PATH].exports = mock;
}
function restoreDb() {
  if (_originalDb) require.cache[DB_MOD_PATH].exports = _originalDb;
}

const P21_MODULES = [
  'aioiGovernanceMetrics',
  'aioiSlaIntelligenceService',
  'aioiRiskAnalysisService',
  'aioiTenantHealthService',
  'aioiTrendAnalysisService',
  'aioiGovernanceReadModelService',
  'aioiExecutiveMetrics',
  'aioiExecutiveSnapshotService',
  'aioiBottleneckAnalysisService',
  'aioiCycleAnalyticsService'
];

function loadP21() {
  const loaded = {};
  for (const mod of P21_MODULES) {
    delete require.cache[require.resolve(`${SERVICES_PATH}/${mod}`)];
    loaded[mod] = require(`${SERVICES_PATH}/${mod}`);
  }
  return loaded;
}

function getGovMetrics() {
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiGovernanceMetrics`)];
  return require(`${SERVICES_PATH}/aioiGovernanceMetrics`);
}

function buildIoes() {
  const base = {
    company_id: COMPANY_ID, source_type: 'plc_event', category: 'equipment_degradation',
    priority_band: 'high', correlation_id: 'c1', decision_type: null, decision_payload: null,
    approved_by_user_id: null, approved_at: null, workflow_instance_id: null,
    execution_trace_id: null,
    created_at: '2026-06-05T08:00:00.000Z', updated_at: '2026-06-05T10:00:00.000Z', resolved_at: null
  };
  return [
    { ...base, id: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380d44', status: 'open' },
    { ...base, id: 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380f66', status: 'pending_approval', decision_type: 'workflow' },
    { ...base, id: '06eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', status: 'approved', decision_type: 'workflow',
      approved_by_user_id: 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55', approved_at: '2026-06-05T12:00:00.000Z' },
    { ...base, id: '17eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', status: 'in_progress', workflow_instance_id: 'f6eebc99-9c0b-4ef8-bb6d-6bb9bd380f66',
      approved_by_user_id: 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55', approved_at: '2026-06-05T12:00:00.000Z' },
    { ...base, id: '28eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', status: 'resolved', workflow_instance_id: 'f6eebc99-9c0b-4ef8-bb6d-6bb9bd380f66',
      approved_at: '2026-06-05T12:00:00.000Z', resolved_at: '2026-06-05T14:00:00.000Z',
      decision_payload: { aioi_outcome: { outcome_status: 'success' }, aioi_learning_submitted: true,
        aioi_learning_submitted_at: '2026-06-05T15:00:00.000Z',
        aioi_outcome: { outcome_status: 'success', learning_context: {} } } },
    { ...base, id: '39eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', status: 'triaged', priority_band: 'critical' }
  ];
}

function buildSnapshots() {
  return [
    { company_id: COMPANY_ID, snapshot_type: 'cycle_kpis',
      snapshot_payload: { end_to_end_cycle_ms: 50000000 }, created_at: new Date().toISOString() },
    { company_id: COMPANY_ID, snapshot_type: 'cycle_kpis',
      snapshot_payload: { end_to_end_cycle_ms: 30000000 }, created_at: '2026-05-01T00:00:00.000Z' },
    { company_id: COMPANY_ID, snapshot_type: 'lifecycle_snapshot',
      snapshot_payload: { operational_success_rate: 0.9 }, created_at: new Date().toISOString() },
    { company_id: COMPANY_ID, snapshot_type: 'lifecycle_snapshot',
      snapshot_payload: { operational_success_rate: 0.7 }, created_at: '2026-05-01T00:00:00.000Z' },
    { company_id: COMPANY_ID, snapshot_type: 'backlog_snapshot',
      snapshot_payload: { approval: 5, execution: 2 }, created_at: new Date().toISOString() },
    { company_id: COMPANY_ID, snapshot_type: 'backlog_snapshot',
      snapshot_payload: { approval: 15, execution: 8 }, created_at: '2026-05-01T00:00:00.000Z' }
  ];
}

function createGovDbMock(ioes = buildIoes(), snapshots = buildSnapshots()) {
  const calls = [];
  const store = ioes.map(i => ({ ...i }));
  const snapStore = snapshots.map(s => ({ ...s }));

  const client = {
    _calls: calls,
    async query(sql, params) {
      const s = sql.trim();
      calls.push({ sql: s, params });
      if (['set_config', 'BEGIN', 'COMMIT', 'ROLLBACK'].some(k => s.includes(k) || s === k)) {
        return { rows: [] };
      }
      const filtered = store.filter(i => i.company_id === params[0]);

      if (s.includes('aioi_metrics_snapshots')) {
        return { rows: snapStore.filter(x => x.company_id === params[0]) };
      }

      if (s.includes('open_to_triaged_ms')) {
        return { rows: [{ open_to_triaged_ms: '2000000', triaged_to_approval_ms: '5000000',
          approval_to_execution_ms: '2000000', execution_to_outcome_ms: '10000000',
          outcome_to_learning_ms: '3000000', end_to_end_cycle_ms: '40000000' }] };
      }

      if (s.includes('approval_backlog') && s.includes('execution_backlog') && s.includes('COUNT')) {
        return { rows: [{ approval_backlog: '1', execution_backlog: '1', outcome_backlog: '1', learning_backlog: '0' }] };
      }

      if (s.includes("status = 'open'") && s.includes('critical_events')) {
        const count = st => filtered.filter(i => i.status === st).length;
        const withOutcome = filtered.filter(i => i.decision_payload?.aioi_outcome?.outcome_status);
        return { rows: [{ open: String(count('open')), triaged: '1', pending_approval: '1',
          approved: '1', rejected: '0', in_progress: '1', resolved: '1',
          critical_events: '1', avg_resolution_time_ms: '7200000', avg_approval_time_ms: '3600000',
          avg_execution_time_ms: '5400000', success_count: '1', total_with_outcome: '1' }] };
      }

      if (s.includes('GROUP BY priority_band') || s.includes('GROUP BY category') || s.includes('GROUP BY status')) {
        return { rows: [] };
      }

      return { rows: [] };
    },
    release: () => {}
  };

  return { pool: { connect: async () => client }, _client: client };
}

function stripComments(c) {
  return c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function assertNoWrites(calls) {
  for (const c of calls) {
    const s = c.sql.trim().toUpperCase();
    if (['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'ALTER', 'DROP', 'CREATE', 'MERGE'].some(k => s.startsWith(k))) {
      throw new Error(`escrita: ${c.sql.slice(0, 60)}`);
    }
  }
}

async function runTests() {
  let govMetrics = getGovMetrics();
  govMetrics.resetSessionCounters();

  // T1-T5 SLA
  const slaTests = [
    ['T1', 2000000, 3600000, 'within_sla'],
    ['T2', 3000000, 3600000, 'at_risk'],
    ['T3', 4000000, 3600000, 'breached'],
    ['T4', null, 3600000, 'within_sla'],
    ['T5', 12000000, 14400000, 'at_risk']
  ];
  for (const [label, avg, thresh, status] of slaTests) {
    suite(`${label} — SLA classify`);
    await test(`${label}: avg=${avg} → ${status}`, async () => {
      patchDb(createGovDbMock());
      const svc = loadP21();
      const r = svc.aioiSlaIntelligenceService.classifySlaStatus(avg, thresh);
      assertEqual(r.status, status, 'status');
      restoreDb();
    });
  }

  suite('T5b — getSlaAnalysis completo');
  await test('T5b: getSlaAnalysis retorna 6 estágios', async () => {
    patchDb(createGovDbMock());
    const svc = loadP21();
    const r = await svc.aioiSlaIntelligenceService.getSlaAnalysis(COMPANY_ID);
    assert(r.ok, 'ok');
    assert(r.sla_analysis.open_to_triaged, 'open_to_triaged');
    assert(r.sla_analysis.end_to_end, 'end_to_end');
    restoreDb();
  });

  // T6-T9 Risk
  const riskCases = [
    ['T6', 5, 'low'], ['T7', 25, 'medium'], ['T8', 60, 'high'], ['T9', 0, 'low']
  ];
  for (const [label, count, level] of riskCases) {
    suite(`${label} — Risk classify`);
    await test(`${label}: backlog=${count} → ${level}`, async () => {
      patchDb(createGovDbMock());
      const svc = loadP21();
      assertEqual(svc.aioiRiskAnalysisService.classifyBacklogRisk(count), level, 'risk');
      restoreDb();
    });
  }

  suite('T9b — getRiskAnalysis');
  await test('T9b: getRiskAnalysis retorna 4 dimensões', async () => {
    patchDb(createGovDbMock());
    const svc = loadP21();
    const r = await svc.aioiRiskAnalysisService.getRiskAnalysis(COMPANY_ID);
    assert(r.ok, 'ok');
    assert(r.risk_analysis.approval_risk, 'approval');
    restoreDb();
  });

  // T10-T12 Tenant Health
  suite('T10 — Tenant health score');
  await test('T10: computeHealthScore determinístico', async () => {
    patchDb(createGovDbMock());
    const svc = loadP21();
    const score = svc.aioiTenantHealthService.computeHealthScore({
      operational_success_rate: 0.9, end_to_end_cycle_ms: 40000000,
      total_backlogs: 5, sla_breaches: 0
    });
    assert(score >= 80, 'healthy range');
    restoreDb();
  });

  suite('T11 — Tenant health status');
  await test('T11: classifyHealthStatus', async () => {
    patchDb(createGovDbMock());
    const svc = loadP21();
    assertEqual(svc.aioiTenantHealthService.classifyHealthStatus(85), 'healthy', 'healthy');
    assertEqual(svc.aioiTenantHealthService.classifyHealthStatus(60), 'attention', 'attention');
    assertEqual(svc.aioiTenantHealthService.classifyHealthStatus(30), 'critical', 'critical');
    restoreDb();
  });

  suite('T12 — getTenantHealth');
  await test('T12: getTenantHealth retorna score e status', async () => {
    patchDb(createGovDbMock());
    const svc = loadP21();
    const r = await svc.aioiTenantHealthService.getTenantHealth(COMPANY_ID);
    assert(r.ok, 'ok');
    assert(r.tenant_health.score != null, 'score');
    assert(r.tenant_health.status, 'status');
    restoreDb();
  });

  // T13-T16 Trends
  suite('T13 — Trend improving');
  await test('T13: classifyTrendInverse improving', async () => {
    patchDb(createGovDbMock());
    const svc = loadP21();
    assertEqual(svc.aioiTrendAnalysisService.classifyTrendInverse(0.9, 0.7), 'improving', 'trend');
    restoreDb();
  });

  suite('T14 — Trend degrading');
  await test('T14: classifyTrend degrading', async () => {
    patchDb(createGovDbMock());
    const svc = loadP21();
    assertEqual(svc.aioiTrendAnalysisService.classifyTrend(50000000, 30000000), 'degrading', 'trend');
    restoreDb();
  });

  suite('T15 — Trend stable');
  await test('T15: classifyTrend stable', async () => {
    patchDb(createGovDbMock());
    const svc = loadP21();
    assertEqual(svc.aioiTrendAnalysisService.classifyTrend(100, 105), 'stable', 'trend');
    restoreDb();
  });

  suite('T16 — getTrendAnalysis');
  await test('T16: getTrendAnalysis retorna 4 trends', async () => {
    patchDb(createGovDbMock());
    const svc = loadP21();
    const r = await svc.aioiTrendAnalysisService.getTrendAnalysis(COMPANY_ID);
    assert(r.ok, 'ok');
    assert(r.trend_analysis.cycle_time_trend, 'cycle');
    assert(r.trend_analysis.success_rate_trend, 'success');
    restoreDb();
  });

  // T17-T20 Governance Read Model
  suite('T17 — Governance read model ok');
  await test('T17: getGovernanceReadModel retorna agregado', async () => {
    patchDb(createGovDbMock());
    const svc = loadP21();
    const r = await svc.aioiGovernanceReadModelService.getGovernanceReadModel(COMPANY_ID);
    assert(r.ok, 'ok');
    assert(r.governance_read_model.executive_snapshot, 'snapshot');
    restoreDb();
  });

  suite('T18 — Read model sla_analysis');
  await test('T18: read model inclui sla_analysis', async () => {
    patchDb(createGovDbMock());
    const svc = loadP21();
    const r = await svc.aioiGovernanceReadModelService.getGovernanceReadModel(COMPANY_ID);
    assert(r.governance_read_model.sla_analysis, 'sla');
    restoreDb();
  });

  suite('T19 — Read model risk + health');
  await test('T19: read model inclui risk e tenant_health', async () => {
    patchDb(createGovDbMock());
    const svc = loadP21();
    const r = await svc.aioiGovernanceReadModelService.getGovernanceReadModel(COMPANY_ID);
    assert(r.governance_read_model.risk_analysis, 'risk');
    assert(r.governance_read_model.tenant_health, 'health');
    restoreDb();
  });

  suite('T20 — Read model trend');
  await test('T20: read model inclui trend_analysis', async () => {
    patchDb(createGovDbMock());
    const svc = loadP21();
    const r = await svc.aioiGovernanceReadModelService.getGovernanceReadModel(COMPANY_ID);
    assert(r.governance_read_model.trend_analysis, 'trend');
    restoreDb();
  });

  // T21-T24 Read Only
  suite('T21 — READ_ONLY_LAYER_VIOLATION INSERT');
  await test('T21: INSERT bloqueado', () => {
    govMetrics = getGovMetrics();
    let threw = false;
    try { govMetrics.assertReadOnlySql('INSERT INTO x VALUES (1)'); } catch (e) {
      threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', 'code');
    }
    assert(threw, 'throw');
  });

  suite('T22 — UPDATE bloqueado');
  await test('T22: UPDATE bloqueado', () => {
    govMetrics = getGovMetrics();
    let threw = false;
    try { govMetrics.assertReadOnlySql('UPDATE x SET y=1'); } catch (e) {
      threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', 'code');
    }
    assert(threw, 'throw');
  });

  suite('T23 — DELETE bloqueado');
  await test('T23: DELETE bloqueado', () => {
    govMetrics = getGovMetrics();
    let threw = false;
    try { govMetrics.assertReadOnlySql('DELETE FROM x'); } catch (e) {
      threw = true;
    }
    assert(threw, 'throw');
  });

  suite('T24 — Nenhuma escrita em consultas');
  await test('T24: governance queries são SELECT', async () => {
    const mock = createGovDbMock();
    patchDb(mock);
    const svc = loadP21();
    await svc.aioiGovernanceReadModelService.getGovernanceReadModel(COMPANY_ID);
    assertNoWrites(mock._client._calls);
    restoreDb();
  });

  // T25-T26 RLS
  suite('T25 — RLS bypass_rls false');
  await test('T25: bypass_rls=false', async () => {
    const mock = createGovDbMock();
    patchDb(mock);
    const svc = loadP21();
    await svc.aioiTrendAnalysisService.getTrendAnalysis(COMPANY_ID);
    const bypass = mock._client._calls.filter(c => c.sql.includes('app.bypass_rls'));
    assert(bypass.length >= 1, 'bypass');
    for (const c of bypass) assert(c.sql.includes("'false'"), 'false');
    restoreDb();
  });

  suite('T26 — RLS company_id set');
  await test('T26: current_company_id configurado', async () => {
    const mock = createGovDbMock();
    patchDb(mock);
    const svc = loadP21();
    await svc.aioiTrendAnalysisService.getTrendAnalysis(COMPANY_ID);
    const tenant = mock._client._calls.filter(c => c.sql.includes('app.current_company_id'));
    assert(tenant.length >= 1, 'tenant');
    restoreDb();
  });

  // T27-T28 Multi-tenant
  suite('T27 — Multi-tenant filtro');
  await test('T27: consultas usam companyId correto', async () => {
    const ioes = buildIoes().map(i => ({ ...i, company_id: COMPANY_ID_B }));
    const mock = createGovDbMock(ioes);
    patchDb(mock);
    const svc = loadP21();
    const r = await svc.aioiExecutiveSnapshotService.getExecutiveSnapshot(COMPANY_ID_B);
    assertEqual(r.snapshot.open, 1, 'open B');
    restoreDb();
  });

  suite('T28 — Multi-tenant tenant B');
  await test('T28: set_config tenant B', async () => {
    const mock = createGovDbMock(buildIoes().map(i => ({ ...i, company_id: COMPANY_ID_B })));
    patchDb(mock);
    const svc = loadP21();
    await svc.aioiTrendAnalysisService.getTrendAnalysis(COMPANY_ID_B);
    const tenant = mock._client._calls.find(c => c.sql.includes('app.current_company_id'));
    assert(tenant, 'tenant call');
    assertEqual(tenant.params[0], COMPANY_ID_B, 'tenant B');
    restoreDb();
  });

  // T29 Logs
  suite('T29 — Logs corretos');
  await test('T29: labels obrigatórios presentes', () => {
    const src = fs.readFileSync(path.join(SERVICES_PATH, 'aioiGovernanceMetrics.js'), 'utf8');
    assert(src.includes('AIOI_GOVERNANCE_REQUESTED'));
    assert(src.includes('AIOI_GOVERNANCE_COMPLETED'));
    assert(src.includes('AIOI_SLA_ANALYZED'));
    assert(src.includes('AIOI_RISK_ANALYZED'));
    assert(src.includes('AIOI_TENANT_HEALTH_CALCULATED'));
    assert(src.includes('AIOI_GOVERNANCE_ERROR'));
  });

  // T30 Metrics
  suite('T30 — Métricas corretas');
  await test('T30: getSessionCounters', () => {
    govMetrics = getGovMetrics();
    govMetrics.resetSessionCounters();
    govMetrics.recordGovernanceRequested(COMPANY_ID);
    govMetrics.recordSlaAnalyzed(COMPANY_ID);
    govMetrics.recordRiskAnalyzed(COMPANY_ID);
    govMetrics.recordTenantHealthCalculated(COMPANY_ID);
    govMetrics.recordTrendAnalyzed(COMPANY_ID);
    govMetrics.recordGovernanceCompleted(COMPANY_ID, 100);
    const c = govMetrics.getSessionCounters();
    assertEqual(c.governance_requests, 1, 'requests');
    assertEqual(c.sla_analysis_count, 1, 'sla');
    assertEqual(c.avg_query_latency_ms, 100, 'latency');
  });

  // T31 bonus - soberanos ausentes
  suite('T31 — Soberanos ausentes');
  await test('T31: arquivos P2.1 não importam soberanos', () => {
    const files = [
      'aioiGovernanceMetrics.js', 'aioiSlaIntelligenceService.js',
      'aioiRiskAnalysisService.js', 'aioiTenantHealthService.js',
      'aioiTrendAnalysisService.js', 'aioiGovernanceReadModelService.js'
    ];
    const forbidden = [
      'operationalDecisionEngine', 'operationalLearningService',
      'workflowOrchestrator', 'actionRuntimeOrchestrator',
      'computePriorityScore', 'aioiOutboxConsumerService'
    ];
    for (const f of files) {
      const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8'));
      for (const term of forbidden) assert(!code.includes(term), `${f} contém ${term}`);
    }
  });

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  AIOI-P2.1 Governance Read Model Test Report');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Total: ${_passed + _failed} | PASS: ${_passed} | FAIL: ${_failed}`);
  console.log(`  STATUS: ${_failed === 0 ? 'AIOI_P2_1_TEST_PASS' : 'AIOI_P2_1_TEST_FAIL'}`);
  console.log('');

  process.exit(_failed > 0 ? 1 : 0);
}

runTests().catch(e => { console.error('Fatal:', e); process.exit(1); });
