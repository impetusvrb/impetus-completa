'use strict';

/**
 * AIOI-P2.3 — Testes automatizados da Executive Benchmark & Maturity Intelligence Layer
 *
 * T1–T40 conforme especificação P2.3.
 * Executar: node src/tests/aioi/aioiExecutiveMaturityReadModel.test.js
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

const P23_MODULES = [
  'aioiMaturityMetrics',
  'aioiMaturityAnalysisService',
  'aioiBenchmarkAnalysisService',
  'aioiOperationalStabilityService',
  'aioiGovernanceConsistencyService',
  'aioiExecutiveMaturityReadModelService',
  'aioiPredictiveMetrics',
  'aioiPredictiveGovernanceReadModelService',
  'aioiBacklogForecastService',
  'aioiSlaForecastService',
  'aioiCapacityForecastService',
  'aioiRiskForecastService',
  'aioiGovernanceMetrics',
  'aioiGovernanceReadModelService',
  'aioiSlaIntelligenceService',
  'aioiRiskAnalysisService',
  'aioiTenantHealthService',
  'aioiTrendAnalysisService',
  'aioiExecutiveMetrics',
  'aioiExecutiveSnapshotService',
  'aioiBottleneckAnalysisService',
  'aioiCycleAnalyticsService'
];

function loadP23() {
  const loaded = {};
  for (const mod of P23_MODULES) {
    delete require.cache[require.resolve(`${SERVICES_PATH}/${mod}`)];
    loaded[mod] = require(`${SERVICES_PATH}/${mod}`);
  }
  return loaded;
}

function getMatMetrics() {
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiMaturityMetrics`)];
  return require(`${SERVICES_PATH}/aioiMaturityMetrics`);
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
    { ...base, id: 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380f66', status: 'pending_approval' },
    { ...base, id: '06eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', status: 'approved',
      approved_by_user_id: 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55', approved_at: '2026-06-05T12:00:00.000Z' },
    { ...base, id: '17eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', status: 'in_progress',
      workflow_instance_id: 'f6eebc99-9c0b-4ef8-bb6d-6bb9bd380f66',
      approved_by_user_id: 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55', approved_at: '2026-06-05T12:00:00.000Z' },
    { ...base, id: '28eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', status: 'resolved',
      workflow_instance_id: 'f6eebc99-9c0b-4ef8-bb6d-6bb9bd380f66',
      approved_at: '2026-06-05T12:00:00.000Z', resolved_at: '2026-06-05T14:00:00.000Z',
      decision_payload: { aioi_outcome: { outcome_status: 'success' }, aioi_learning_submitted: true,
        aioi_learning_processed: true } },
    { ...base, id: '39eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', status: 'triaged', priority_band: 'critical' }
  ];
}

function buildSnapshots() {
  const now = Date.now();
  const recent = new Date(now - 5 * 86400000).toISOString();
  const mid = new Date(now - 15 * 86400000).toISOString();
  const old = new Date(now - 45 * 86400000).toISOString();
  return [
    { company_id: COMPANY_ID, snapshot_type: 'backlog_snapshot',
      snapshot_payload: { approval: 5, execution: 2, outcome: 1, learning: 0 }, created_at: old },
    { company_id: COMPANY_ID, snapshot_type: 'backlog_snapshot',
      snapshot_payload: { approval: 8, execution: 3, outcome: 2, learning: 1 }, created_at: mid },
    { company_id: COMPANY_ID, snapshot_type: 'backlog_snapshot',
      snapshot_payload: { approval: 10, execution: 4, outcome: 2, learning: 1 }, created_at: recent },
    { company_id: COMPANY_ID, snapshot_type: 'cycle_kpis',
      snapshot_payload: { end_to_end_cycle_ms: 30000000 }, created_at: old },
    { company_id: COMPANY_ID, snapshot_type: 'cycle_kpis',
      snapshot_payload: { end_to_end_cycle_ms: 35000000 }, created_at: mid },
    { company_id: COMPANY_ID, snapshot_type: 'cycle_kpis',
      snapshot_payload: { end_to_end_cycle_ms: 40000000 }, created_at: recent },
    { company_id: COMPANY_ID, snapshot_type: 'lifecycle_snapshot',
      snapshot_payload: { operational_success_rate: 0.7 }, created_at: old },
    { company_id: COMPANY_ID, snapshot_type: 'lifecycle_snapshot',
      snapshot_payload: { operational_success_rate: 0.85 }, created_at: recent },
    { company_id: COMPANY_ID, snapshot_type: 'throughput_snapshot',
      snapshot_payload: { daily_throughput: 5 }, created_at: mid },
    { company_id: COMPANY_ID, snapshot_type: 'throughput_snapshot',
      snapshot_payload: { daily_throughput: 6 }, created_at: recent }
  ];
}

function createMatDbMock(ioes = buildIoes(), snapshots = buildSnapshots()) {
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
      const companyId = params?.[0] || COMPANY_ID;
      const filtered = store.filter(i => i.company_id === companyId);

      if (s.includes('aioi_metrics_snapshots')) {
        let rows = snapStore.filter(x => x.company_id === companyId);
        if (params[1]) rows = rows.filter(x => x.snapshot_type === params[1]);
        return { rows };
      }

      if (s.includes('aioi_processing_history')) {
        if (s.includes('learning_processed') && s.includes('COUNT')) {
          return { rows: [{ cnt: '1' }] };
        }
        if (s.includes('GROUP BY')) {
          return { rows: [{ day: '2026-06-04', cnt: '2' }] };
        }
        return { rows: [] };
      }

      if (s.includes('approved') && s.includes('executed') && s.includes('learning_processed_ioe')) {
        const approved = filtered.filter(i => i.approved_at).length;
        const executed = filtered.filter(i => i.workflow_instance_id || i.execution_trace_id).length;
        const resolved = filtered.filter(i => i.status === 'resolved' || i.status === 'closed').length;
        const learning = filtered.filter(i => i.decision_payload?.aioi_learning_processed).length;
        return { rows: [{ approved: String(approved), executed: String(executed),
          resolved: String(resolved), learning_processed_ioe: String(learning) }] };
      }

      if (s.includes('learning_done') && s.includes('resolved')) {
        const resolved = filtered.filter(i => i.status === 'resolved' || i.status === 'closed').length;
        const learning = filtered.filter(i =>
          i.decision_payload?.aioi_learning_processed || i.decision_payload?.aioi_learning_submitted
        ).length;
        return { rows: [{ resolved: String(resolved), learning_done: String(learning) }] };
      }

      if (s.includes("status = 'resolved'") && s.includes('GROUP BY')) {
        return { rows: [{ day: '2026-06-04', cnt: '2' }, { day: '2026-06-05', cnt: '1' }] };
      }

      if (s.includes('open_to_triaged_ms')) {
        return { rows: [{ open_to_triaged_ms: '2000000', triaged_to_approval_ms: '5000000',
          approval_to_execution_ms: '2000000', execution_to_outcome_ms: '10000000',
          outcome_to_learning_ms: '3000000', end_to_end_cycle_ms: '40000000' }] };
      }

      if (s.includes('approval_backlog') && s.includes('COUNT')) {
        return { rows: [{ approval_backlog: '1', execution_backlog: '1', outcome_backlog: '0', learning_backlog: '0' }] };
      }

      if (s.includes("status = 'open'") && s.includes('critical_events')) {
        const count = st => filtered.filter(i => i.status === st).length;
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
  let matMetrics = getMatMetrics();
  matMetrics.resetSessionCounters();

  // T1-T6 Maturity
  suite('T1 — classifyMaturityLevel initial');
  await test('T1: score 15 → initial', () => {
    patchDb(createMatDbMock());
    const svc = loadP23();
    assertEqual(svc.aioiMaturityAnalysisService.classifyMaturityLevel(15), 'initial', 'initial');
    restoreDb();
  });

  suite('T2 — classifyMaturityLevel developing');
  await test('T2: score 30 → developing', () => {
    patchDb(createMatDbMock());
    const svc = loadP23();
    assertEqual(svc.aioiMaturityAnalysisService.classifyMaturityLevel(30), 'developing', 'developing');
    restoreDb();
  });

  suite('T3 — classifyMaturityLevel managed');
  await test('T3: score 50 → managed', () => {
    patchDb(createMatDbMock());
    const svc = loadP23();
    assertEqual(svc.aioiMaturityAnalysisService.classifyMaturityLevel(50), 'managed', 'managed');
    restoreDb();
  });

  suite('T4 — classifyMaturityLevel optimized');
  await test('T4: score 70 → optimized', () => {
    patchDb(createMatDbMock());
    const svc = loadP23();
    assertEqual(svc.aioiMaturityAnalysisService.classifyMaturityLevel(70), 'optimized', 'optimized');
    restoreDb();
  });

  suite('T5 — classifyMaturityLevel autonomous_ready');
  await test('T5: score 90 → autonomous_ready', () => {
    patchDb(createMatDbMock());
    const svc = loadP23();
    assertEqual(svc.aioiMaturityAnalysisService.classifyMaturityLevel(90), 'autonomous_ready', 'autonomous_ready');
    restoreDb();
  });

  suite('T6 — getOperationalMaturity ok');
  await test('T6: getOperationalMaturity retorna score e level', async () => {
    patchDb(createMatDbMock());
    const svc = loadP23();
    const r = await svc.aioiMaturityAnalysisService.getOperationalMaturity(COMPANY_ID);
    assert(r.ok, 'ok');
    assert(r.maturity.score >= 0 && r.maturity.score <= 100, 'score range');
    assert(r.maturity.level, 'level');
    restoreDb();
  });

  // T7-T12 Benchmark
  suite('T7 — variationPct');
  await test('T7: variation_pct calculada', () => {
    const svc = getMatMetrics();
    assertEqual(svc.variationPct(110, 100), 10, 'var');
  });

  suite('T8 — benchmark success_rate');
  await test('T8: benchmark success_rate current/historical', () => {
    patchDb(createMatDbMock());
    const svc = loadP23();
    const r = svc.aioiBenchmarkAnalysisService.buildBenchmarkAnalysisFromSnapshots(buildSnapshots());
    assert(r.success_rate.current != null, 'current');
    assert(r.success_rate.historical != null, 'historical');
    restoreDb();
  });

  suite('T9 — benchmark cycle_time');
  await test('T9: benchmark cycle_time', () => {
    patchDb(createMatDbMock());
    const svc = loadP23();
    const r = svc.aioiBenchmarkAnalysisService.buildBenchmarkAnalysisFromSnapshots(buildSnapshots());
    assert(r.cycle_time.current != null, 'cycle current');
    restoreDb();
  });

  suite('T10 — benchmark backlog_total');
  await test('T10: benchmark backlog_total', () => {
    patchDb(createMatDbMock());
    const svc = loadP23();
    const r = svc.aioiBenchmarkAnalysisService.buildBenchmarkAnalysisFromSnapshots(buildSnapshots());
    assert(r.backlog_total.variation_pct != null || r.backlog_total.current != null, 'backlog');
    restoreDb();
  });

  suite('T11 — getBenchmarkAnalysis ok');
  await test('T11: getBenchmarkAnalysis ok', async () => {
    patchDb(createMatDbMock());
    const svc = loadP23();
    const r = await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID);
    assert(r.ok, 'ok');
    assert(r.benchmark.success_rate, 'success');
    restoreDb();
  });

  suite('T12 — benchmark sem cross-tenant');
  await test('T12: query filtra por companyId', async () => {
    const mock = createMatDbMock();
    patchDb(mock);
    const svc = loadP23();
    await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID);
    const snapCalls = mock._client._calls.filter(c => c.sql.includes('aioi_metrics_snapshots'));
    assert(snapCalls.length >= 1, 'snapshots');
    assertEqual(snapCalls[0].params[0], COMPANY_ID, 'tenant');
    restoreDb();
  });

  // T13-T18 Stability
  suite('T13 — classifyStabilityStatus stable');
  await test('T13: score 85 → stable', () => {
    patchDb(createMatDbMock());
    const svc = loadP23();
    assertEqual(svc.aioiOperationalStabilityService.classifyStabilityStatus(85), 'stable', 'stable');
    restoreDb();
  });

  suite('T14 — classifyStabilityStatus moderate');
  await test('T14: score 60 → moderate', () => {
    patchDb(createMatDbMock());
    const svc = loadP23();
    assertEqual(svc.aioiOperationalStabilityService.classifyStabilityStatus(60), 'moderate', 'moderate');
    restoreDb();
  });

  suite('T15 — classifyStabilityStatus unstable');
  await test('T15: score 30 → unstable', () => {
    patchDb(createMatDbMock());
    const svc = loadP23();
    assertEqual(svc.aioiOperationalStabilityService.classifyStabilityStatus(30), 'unstable', 'unstable');
    restoreDb();
  });

  suite('T16 — computeStabilityFromSnapshots');
  await test('T16: stability_score 0-100', () => {
    patchDb(createMatDbMock());
    const svc = loadP23();
    const r = svc.aioiOperationalStabilityService.computeStabilityFromSnapshots(buildSnapshots());
    assert(r.stability_score >= 0 && r.stability_score <= 100, 'range');
    restoreDb();
  });

  suite('T17 — coefficientOfVariation');
  await test('T17: volatilidade calculada', () => {
    const svc = getMatMetrics();
    const cv = svc.coefficientOfVariation([10, 12, 11, 13]);
    assert(cv >= 0, 'cv');
  });

  suite('T18 — getOperationalStability ok');
  await test('T18: getOperationalStability ok', async () => {
    patchDb(createMatDbMock());
    const svc = loadP23();
    const r = await svc.aioiOperationalStabilityService.getOperationalStability(COMPANY_ID);
    assert(r.ok, 'ok');
    assert(r.stability.stability_status, 'status');
    restoreDb();
  });

  // T19-T24 Governance Consistency
  suite('T19 — classifyConsistencyStatus consistent');
  await test('T19: score 85 → consistent', () => {
    patchDb(createMatDbMock());
    const svc = loadP23();
    assertEqual(svc.aioiGovernanceConsistencyService.classifyConsistencyStatus(85), 'consistent', 'consistent');
    restoreDb();
  });

  suite('T20 — classifyConsistencyStatus attention');
  await test('T20: score 60 → attention', () => {
    patchDb(createMatDbMock());
    const svc = loadP23();
    assertEqual(svc.aioiGovernanceConsistencyService.classifyConsistencyStatus(60), 'attention', 'attention');
    restoreDb();
  });

  suite('T21 — classifyConsistencyStatus inconsistent');
  await test('T21: score 30 → inconsistent', () => {
    patchDb(createMatDbMock());
    const svc = loadP23();
    assertEqual(svc.aioiGovernanceConsistencyService.classifyConsistencyStatus(30), 'inconsistent', 'inconsistent');
    restoreDb();
  });

  suite('T22 — computeConsistencyScore');
  await test('T22: score aderência ciclo', () => {
    patchDb(createMatDbMock());
    const svc = loadP23();
    const score = svc.aioiGovernanceConsistencyService.computeConsistencyScore({
      approved: 10, executed: 8, resolved: 6, learning_processed: 5
    });
    assert(score >= 0 && score <= 100, 'range');
    restoreDb();
  });

  suite('T23 — getGovernanceConsistency ok');
  await test('T23: getGovernanceConsistency ok', async () => {
    patchDb(createMatDbMock());
    const svc = loadP23();
    const r = await svc.aioiGovernanceConsistencyService.getGovernanceConsistency(COMPANY_ID);
    assert(r.ok, 'ok');
    assert(r.governance_consistency.score != null, 'score');
    restoreDb();
  });

  suite('T24 — consistency counts');
  await test('T24: counts approved/executed/resolved', async () => {
    patchDb(createMatDbMock());
    const svc = loadP23();
    const r = await svc.aioiGovernanceConsistencyService.getGovernanceConsistency(COMPANY_ID);
    assert(r.governance_consistency.counts.approved >= 0, 'approved');
    restoreDb();
  });

  // T25-T28 Read Model
  suite('T25 — getExecutiveMaturityReadModel ok');
  await test('T25: read model agregado ok', async () => {
    patchDb(createMatDbMock());
    const svc = loadP23();
    const r = await svc.aioiExecutiveMaturityReadModelService.getExecutiveMaturityReadModel(COMPANY_ID);
    assert(r.ok, 'ok');
    assert(r.executive_maturity_read_model.governance_read_model, 'gov');
    restoreDb();
  });

  suite('T26 — read model predictive');
  await test('T26: inclui predictive_read_model', async () => {
    patchDb(createMatDbMock());
    const svc = loadP23();
    const r = await svc.aioiExecutiveMaturityReadModelService.getExecutiveMaturityReadModel(COMPANY_ID);
    assert(r.executive_maturity_read_model.predictive_read_model, 'predictive');
    restoreDb();
  });

  suite('T27 — read model maturity+benchmark');
  await test('T27: inclui maturity e benchmark', async () => {
    patchDb(createMatDbMock());
    const svc = loadP23();
    const r = await svc.aioiExecutiveMaturityReadModelService.getExecutiveMaturityReadModel(COMPANY_ID);
    assert(r.executive_maturity_read_model.maturity, 'maturity');
    assert(r.executive_maturity_read_model.benchmark, 'benchmark');
    restoreDb();
  });

  suite('T28 — read model stability+consistency');
  await test('T28: inclui stability e governance_consistency', async () => {
    patchDb(createMatDbMock());
    const svc = loadP23();
    const r = await svc.aioiExecutiveMaturityReadModelService.getExecutiveMaturityReadModel(COMPANY_ID);
    assert(r.executive_maturity_read_model.stability, 'stability');
    assert(r.executive_maturity_read_model.governance_consistency, 'consistency');
    restoreDb();
  });

  // T29-T33 Read Only
  suite('T29 — INSERT bloqueado');
  await test('T29: INSERT → READ_ONLY_LAYER_VIOLATION', () => {
    matMetrics = getMatMetrics();
    let threw = false;
    try { matMetrics.assertReadOnlySql('INSERT INTO x VALUES (1)'); } catch (e) {
      threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', 'code');
    }
    assert(threw, 'throw');
  });

  suite('T30 — UPDATE bloqueado');
  await test('T30: UPDATE bloqueado', () => {
    matMetrics = getMatMetrics();
    let threw = false;
    try { matMetrics.assertReadOnlySql('UPDATE x SET y=1'); } catch (e) { threw = true; }
    assert(threw, 'throw');
  });

  suite('T31 — DELETE bloqueado');
  await test('T31: DELETE bloqueado', () => {
    matMetrics = getMatMetrics();
    let threw = false;
    try { matMetrics.assertReadOnlySql('DELETE FROM x'); } catch (e) { threw = true; }
    assert(threw, 'throw');
  });

  suite('T32 — ALTER bloqueado');
  await test('T32: ALTER bloqueado', () => {
    matMetrics = getMatMetrics();
    let threw = false;
    try { matMetrics.assertReadOnlySql('ALTER TABLE x ADD COLUMN y int'); } catch (e) { threw = true; }
    assert(threw, 'throw');
  });

  suite('T33 — DROP bloqueado + zero writes');
  await test('T33: DROP bloqueado e queries SELECT', async () => {
    matMetrics = getMatMetrics();
    let threw = false;
    try { matMetrics.assertReadOnlySql('DROP TABLE x'); } catch (e) { threw = true; }
    assert(threw, 'drop');
    const mock = createMatDbMock();
    patchDb(mock);
    const svc = loadP23();
    await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID);
    assertNoWrites(mock._client._calls);
    restoreDb();
  });

  // T34-T35 RLS
  suite('T34 — RLS current_company_id');
  await test('T34: set_config company_id', async () => {
    const mock = createMatDbMock();
    patchDb(mock);
    const svc = loadP23();
    await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID);
    const tenant = mock._client._calls.find(c => c.sql.includes('app.current_company_id'));
    assert(tenant, 'tenant');
    assertEqual(tenant.params[0], COMPANY_ID, 'company');
    restoreDb();
  });

  suite('T35 — RLS bypass_rls false');
  await test('T35: bypass_rls=false', async () => {
    const mock = createMatDbMock();
    patchDb(mock);
    const svc = loadP23();
    await svc.aioiOperationalStabilityService.getOperationalStability(COMPANY_ID);
    const bypass = mock._client._calls.filter(c => c.sql.includes('app.bypass_rls'));
    assert(bypass.length >= 1, 'bypass');
    for (const c of bypass) assert(c.sql.includes("'false'"), 'false');
    restoreDb();
  });

  // T36-T37 Multi-tenant
  suite('T36 — Multi-tenant filtro');
  await test('T36: consultas usam tenant B', async () => {
    const mock = createMatDbMock(buildIoes().map(i => ({ ...i, company_id: COMPANY_ID_B })));
    patchDb(mock);
    const svc = loadP23();
    await svc.aioiGovernanceConsistencyService.getGovernanceConsistency(COMPANY_ID_B);
    const tenant = mock._client._calls.find(c => c.sql.includes('app.current_company_id'));
    assertEqual(tenant.params[0], COMPANY_ID_B, 'tenant B');
    restoreDb();
  });

  suite('T37 — Multi-tenant isolamento');
  await test('T37: maturity tenant B', async () => {
    const ioesB = buildIoes().map(i => ({ ...i, company_id: COMPANY_ID_B }));
    const mock = createMatDbMock(ioesB);
    patchDb(mock);
    const svc = loadP23();
    const r = await svc.aioiMaturityAnalysisService.getOperationalMaturity(COMPANY_ID_B);
    assert(r.ok, 'ok B');
    restoreDb();
  });

  // T38 Logs
  suite('T38 — Logs corretos');
  await test('T38: labels obrigatórios presentes', () => {
    const src = fs.readFileSync(path.join(SERVICES_PATH, 'aioiMaturityMetrics.js'), 'utf8');
    assert(src.includes('AIOI_MATURITY_REQUESTED'));
    assert(src.includes('AIOI_MATURITY_COMPLETED'));
    assert(src.includes('AIOI_MATURITY_ANALYZED'));
    assert(src.includes('AIOI_BENCHMARK_ANALYZED'));
    assert(src.includes('AIOI_STABILITY_ANALYZED'));
    assert(src.includes('AIOI_CONSISTENCY_ANALYZED'));
    assert(src.includes('AIOI_MATURITY_ERROR'));
  });

  // T39 Metrics
  suite('T39 — Métricas corretas');
  await test('T39: getSessionCounters', () => {
    matMetrics = getMatMetrics();
    matMetrics.resetSessionCounters();
    matMetrics.recordMaturityRequested(COMPANY_ID);
    matMetrics.recordBenchmarkAnalyzed(COMPANY_ID);
    matMetrics.recordStabilityAnalyzed(COMPANY_ID);
    matMetrics.recordConsistencyAnalyzed(COMPANY_ID);
    matMetrics.recordMaturityAnalyzed(COMPANY_ID);
    matMetrics.recordMaturityCompleted(COMPANY_ID, 120);
    const c = matMetrics.getSessionCounters();
    assertEqual(c.maturity_requests, 1, 'requests');
    assertEqual(c.benchmark_analysis_count, 1, 'benchmark');
    assertEqual(c.avg_query_latency_ms, 120, 'latency');
  });

  // T40 Soberanos
  suite('T40 — Soberanos ausentes');
  await test('T40: arquivos P2.3 não importam soberanos', () => {
    const files = [
      'aioiMaturityMetrics.js', 'aioiMaturityAnalysisService.js',
      'aioiBenchmarkAnalysisService.js', 'aioiOperationalStabilityService.js',
      'aioiGovernanceConsistencyService.js', 'aioiExecutiveMaturityReadModelService.js'
    ];
    const forbidden = [
      'operationalDecisionEngine', 'operationalLearningService',
      'workflowOrchestrator', 'actionRuntimeOrchestrator',
      'computePriorityScore', 'classificationConsumer', 'aioiOutboxConsumerService'
    ];
    for (const f of files) {
      const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8'));
      for (const term of forbidden) assert(!code.includes(term), `${f} contém ${term}`);
    }
  });

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  AIOI-P2.3 Executive Maturity Read Model Test Report');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Total: ${_passed + _failed} | PASS: ${_passed} | FAIL: ${_failed}`);
  console.log(`  STATUS: ${_failed === 0 ? 'AIOI_P2_3_TEST_PASS' : 'AIOI_P2_3_TEST_FAIL'}`);
  console.log('');

  process.exit(_failed > 0 ? 1 : 0);
}

runTests().catch(e => { console.error('Fatal:', e); process.exit(1); });
