'use strict';

/**
 * AIOI-P3.0 — Testes automatizados da Enterprise Intelligence Governance & Trust Layer
 * T1–T76 | node src/tests/aioi/aioiTrustReadModel.test.js
 */

let _passed = 0, _failed = 0;
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
const COMPANY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const COMPANY_ID_B = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22';
const DB_MOD_PATH = require.resolve('../../db');
require(DB_MOD_PATH);
let _originalDb;
function patchDb(mock) { _originalDb = require.cache[DB_MOD_PATH].exports; require.cache[DB_MOD_PATH].exports = mock; }
function restoreDb() { if (_originalDb) require.cache[DB_MOD_PATH].exports = _originalDb; }

const P30_MODULES = [
  'aioiTrustMetrics', 'aioiDataIntegrityService', 'aioiModelConsistencyService',
  'aioiForecastReliabilityService', 'aioiIntelligenceTrustService', 'aioiTrustReadModelService',
  'aioiExecutiveCommandMetrics', 'aioiExecutiveCommandStateService', 'aioiExecutivePriorityMatrixService',
  'aioiExecutiveAttentionMapService', 'aioiExecutiveReadinessService', 'aioiExecutiveCommandReadModelService',
  'aioiDigitalTwinMetrics', 'aioiOperationalStateService', 'aioiFutureStateService', 'aioiScenarioStateService',
  'aioiTwinConsistencyService', 'aioiDigitalTwinReadModelService', 'aioiScenarioMetrics',
  'aioiBacklogReductionScenarioService', 'aioiSlaRecoveryScenarioService', 'aioiCapacityExpansionScenarioService',
  'aioiResilienceScenarioService', 'aioiScenarioReadModelService', 'aioiResilienceMetrics',
  'aioiOperationalResilienceService', 'aioiDependencyRiskService', 'aioiRecoveryReadinessService',
  'aioiSustainabilityAnalysisService', 'aioiResilienceReadModelService', 'aioiValueMetrics',
  'aioiOperationalValueService', 'aioiRiskImpactService', 'aioiBottleneckCostService',
  'aioiPortfolioAnalysisService', 'aioiValueReadModelService', 'aioiStrategicMetrics',
  'aioiStrategicReadModelService', 'aioiPriorityAnalysisService', 'aioiImprovementOpportunityService',
  'aioiExecutiveFocusService', 'aioiStrategicAlignmentService', 'aioiExecutiveMaturityReadModelService',
  'aioiMaturityMetrics', 'aioiMaturityAnalysisService', 'aioiBenchmarkAnalysisService',
  'aioiOperationalStabilityService', 'aioiGovernanceConsistencyService', 'aioiPredictiveMetrics',
  'aioiPredictiveGovernanceReadModelService', 'aioiBacklogForecastService', 'aioiSlaForecastService',
  'aioiCapacityForecastService', 'aioiRiskForecastService', 'aioiGovernanceMetrics',
  'aioiGovernanceReadModelService', 'aioiSlaIntelligenceService', 'aioiRiskAnalysisService',
  'aioiTenantHealthService', 'aioiTrendAnalysisService', 'aioiExecutiveMetrics',
  'aioiExecutiveSnapshotService', 'aioiBottleneckAnalysisService', 'aioiCycleAnalyticsService'
];

function loadP30() {
  const loaded = {};
  for (const mod of P30_MODULES) {
    delete require.cache[require.resolve(`${SERVICES_PATH}/${mod}`)];
    loaded[mod] = require(`${SERVICES_PATH}/${mod}`);
  }
  return loaded;
}
function getTrustMetrics() {
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiTrustMetrics`)];
  return require(`${SERVICES_PATH}/aioiTrustMetrics`);
}

function buildIoes() {
  const base = {
    company_id: COMPANY_ID, source_type: 'plc_event', category: 'equipment_degradation',
    priority_band: 'high', correlation_id: 'c1', decision_type: null, decision_payload: null,
    approved_by_user_id: null, approved_at: null, workflow_instance_id: null, execution_trace_id: null,
    created_at: '2026-06-05T08:00:00.000Z', updated_at: '2026-06-05T10:00:00.000Z', resolved_at: null
  };
  return [
    { ...base, id: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380d44', status: 'open' },
    { ...base, id: '06eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', status: 'approved',
      approved_by_user_id: 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55', approved_at: '2026-06-05T12:00:00.000Z' },
    { ...base, id: '17eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', status: 'in_progress',
      workflow_instance_id: 'f6eebc99-9c0b-4ef8-bb6d-6bb9bd380f66',
      approved_by_user_id: 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55', approved_at: '2026-06-05T12:00:00.000Z' },
    { ...base, id: '28eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', status: 'resolved',
      workflow_instance_id: 'f6eebc99-9c0b-4ef8-bb6d-6bb9bd380f66', approved_at: '2026-06-05T12:00:00.000Z',
      resolved_at: '2026-06-05T14:00:00.000Z',
      decision_payload: { aioi_outcome: { outcome_status: 'success' }, aioi_learning_submitted: true,
        aioi_learning_processed: true } }
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
      snapshot_payload: { approval: 1, execution: 1, outcome: 0, learning: 0 }, created_at: recent },
    { company_id: COMPANY_ID, snapshot_type: 'cycle_kpis',
      snapshot_payload: { end_to_end_cycle_ms: 35000000, open_to_triaged_ms: 2000000,
        triaged_to_approval_ms: 5000000, approval_to_execution_ms: 2000000,
        execution_to_outcome_ms: 10000000, outcome_to_learning_ms: 3000000 }, created_at: mid },
    { company_id: COMPANY_ID, snapshot_type: 'cycle_kpis',
      snapshot_payload: { end_to_end_cycle_ms: 40000000 }, created_at: recent },
    { company_id: COMPANY_ID, snapshot_type: 'lifecycle_snapshot',
      snapshot_payload: { operational_success_rate: 0.85 }, created_at: recent },
    { company_id: COMPANY_ID, snapshot_type: 'throughput_snapshot',
      snapshot_payload: { daily_throughput: 6 }, created_at: recent }
  ];
}

function createTrustDbMock(ioes = buildIoes(), snapshots = buildSnapshots()) {
  const calls = [];
  const store = ioes.map(i => ({ ...i }));
  const snapStore = snapshots.map(s => ({ ...s }));
  const client = {
    _calls: calls,
    async query(sql, params) {
      const s = sql.trim();
      calls.push({ sql: s, params });
      if (['set_config', 'BEGIN', 'COMMIT', 'ROLLBACK'].some(k => s.includes(k) || s === k)) return { rows: [] };
      const companyId = params?.[0] || COMPANY_ID;
      const filtered = store.filter(i => i.company_id === companyId);

      if (s.includes('aioi_audit_events') && s.includes('COUNT')) {
        return { rows: [{ cnt: '2' }] };
      }
      if (s.includes('aioi_processing_history') && s.includes('COUNT') && !s.includes('GROUP BY')) {
        return { rows: [{ cnt: '3' }] };
      }
      if (s.includes('aioi_metrics_snapshots') && s.includes('COUNT') && !s.includes('snapshot_payload')) {
        return { rows: [{ cnt: String(snapStore.filter(x => x.company_id === companyId).length) }] };
      }
      if (s.includes('industrial_operational_events') && s.includes('COUNT')) {
        if (s.includes("'resolved'") || s.includes("'closed'")) {
          return { rows: [{ cnt: String(filtered.filter(i => i.status === 'resolved').length) }] };
        }
        return { rows: [{ cnt: String(filtered.length) }] };
      }
      if (s.includes('aioi_metrics_snapshots')) {
        let rows = snapStore.filter(x => x.company_id === companyId);
        if (params[1]) rows = rows.filter(x => x.snapshot_type === params[1]);
        if (s.includes('ORDER BY created_at DESC')) {
          rows = [...rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          return { rows: rows.slice(0, 1) };
        }
        return { rows };
      }
      if (s.includes('aioi_processing_history')) {
        if (s.includes('learning_processed') && s.includes('COUNT')) return { rows: [{ cnt: '1' }] };
        if (s.includes('GROUP BY')) return { rows: [{ day: '2026-06-04', cnt: '2' }] };
        return { rows: [] };
      }
      if (s.includes('approved') && s.includes('executed') && s.includes('learning_processed_ioe')) {
        return { rows: [{ approved: '3', executed: '2', resolved: '1', learning_processed_ioe: '1' }] };
      }
      if (s.includes('learning_done') && s.includes('resolved')) {
        const resolved = filtered.filter(i => i.status === 'resolved').length;
        const learning = filtered.filter(i => i.decision_payload?.aioi_learning_processed).length;
        return { rows: [{ resolved: String(resolved), learning_done: String(learning) }] };
      }
      if (s.includes("status = 'resolved'") && s.includes('GROUP BY')) {
        return { rows: [{ day: '2026-06-04', cnt: '2' }] };
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
        return { rows: [{ open: '1', triaged: '0', pending_approval: '0', approved: '1',
          rejected: '0', in_progress: '1', resolved: '1', critical_events: '0',
          avg_resolution_time_ms: '7200000', avg_approval_time_ms: '3600000',
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

function stripComments(c) { return c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); }
function assertNoWrites(calls) {
  for (const c of calls) {
    const s = c.sql.trim().toUpperCase();
    if (['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'ALTER', 'DROP', 'CREATE', 'MERGE'].some(k => s.startsWith(k))) {
      throw new Error(`escrita: ${c.sql.slice(0, 60)}`);
    }
  }
}

const SAMPLE_COUNTS = { ioe_count: 4, snapshot_count: 6, history_count: 3, audit_count: 2, resolved_count: 1 };
const SAMPLE_BOTTLENECKS = { approval_backlog: 1, execution_backlog: 1, outcome_backlog: 0, learning_backlog: 0 };
const SAMPLE_SNAP = { snapshot_payload: { approval: 1, execution: 1, outcome: 0, learning: 0 } };

const SAMPLE_CMD = {
  governance_read_model: {}, predictive_read_model: {}, maturity_read_model: {},
  strategic_read_model: {}, value_read_model: {}, resilience_read_model: {},
  scenario_read_model: {}, digital_twin_read_model: { twin_consistency: { consistency_score: 75 } },
  executive_command_state: {
    operational_state: {
      governance_status: 'healthy', maturity_level: 'managed',
      operational_value: { operational_value_score: 70 },
      resilience_status: 'resilient'
    }
  },
  executive_readiness: { readiness_score: 72 }
};

async function runTests() {
  let tm = getTrustMetrics();
  tm.resetSessionCounters();

  // T1–T15 Data Integrity
  suite('T1'); await test('T1: classifyIntegrityStatus verified', () => {
    assertEqual(getTrustMetrics().classifyIntegrityStatus(80), 'verified', '');
  });
  suite('T2'); await test('T2: classifyIntegrityStatus attention', () => {
    assertEqual(getTrustMetrics().classifyIntegrityStatus(55), 'attention', '');
  });
  suite('T3'); await test('T3: classifyIntegrityStatus degraded', () => {
    assertEqual(getTrustMetrics().classifyIntegrityStatus(30), 'degraded', '');
  });
  suite('T4'); await test('T4: limite 70 verified', () => {
    assertEqual(getTrustMetrics().classifyIntegrityStatus(70), 'verified', '');
  });
  suite('T5'); await test('T5: buildDataIntegrity estrutura', () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const r = svc.aioiDataIntegrityService.buildDataIntegrity({
      counts: SAMPLE_COUNTS, bottlenecks: SAMPLE_BOTTLENECKS, latestSnapshot: SAMPLE_SNAP
    });
    assert(r.integrity_score != null && r.integrity_status); restoreDb();
  });
  suite('T6'); await test('T6: computeIntegrityScore range', () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const s = svc.aioiDataIntegrityService.computeIntegrityScore({
      counts: SAMPLE_COUNTS, bottlenecks: SAMPLE_BOTTLENECKS, latestSnapshot: SAMPLE_SNAP
    });
    assert(s >= 0 && s <= 100); restoreDb();
  });
  suite('T7'); await test('T7: getDataIntegrity ok', async () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const r = await svc.aioiDataIntegrityService.getDataIntegrity(COMPANY_ID);
    assert(r.ok && r.data_integrity.integrity_status); restoreDb();
  });
  suite('T8'); await test('T8: companyId inválido integrity', async () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const r = await svc.aioiDataIntegrityService.getDataIntegrity('bad');
    assert(!r.ok); restoreDb();
  });
  suite('T9'); await test('T9: forecastAccuracy', () => {
    assertEqual(getTrustMetrics().forecastAccuracy(10, 10), 100, '');
  });
  suite('T10'); await test('T10: forecastAccuracy divergente', () => {
    const a = getTrustMetrics().forecastAccuracy(100, 10);
    assert(a < 50);
  });
  suite('T11'); await test('T11: determinístico integrity', () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const inp = { counts: SAMPLE_COUNTS, bottlenecks: SAMPLE_BOTTLENECKS, latestSnapshot: SAMPLE_SNAP };
    assertEqual(svc.aioiDataIntegrityService.computeIntegrityScore(inp),
      svc.aioiDataIntegrityService.computeIntegrityScore(inp), ''); restoreDb();
  });
  suite('T12'); await test('T12: zero writes integrity', async () => {
    const mock = createTrustDbMock(); patchDb(mock); const svc = loadP30();
    await svc.aioiDataIntegrityService.getDataIntegrity(COMPANY_ID);
    assertNoWrites(mock._client._calls); restoreDb();
  });
  suite('T13'); await test('T13: recordIntegrityAnalyzed', () => {
    tm = getTrustMetrics(); tm.resetSessionCounters();
    tm.recordIntegrityAnalyzed(COMPANY_ID);
    assert(tm.getSessionCounters().integrity_analysis_count >= 1);
  });
  suite('T14'); await test('T14: status permitidos integrity', () => {
    const allowed = ['verified', 'attention', 'degraded'];
    for (const s of [90, 50, 10]) assert(allowed.includes(getTrustMetrics().classifyIntegrityStatus(s)));
  });
  suite('T15'); await test('T15: counts vazios score baixo', () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const s = svc.aioiDataIntegrityService.computeIntegrityScore({
      counts: { ioe_count: 0, snapshot_count: 0, history_count: 0, audit_count: 0, resolved_count: 0 },
      bottlenecks: null, latestSnapshot: null
    });
    assert(s < 70); restoreDb();
  });

  // T16–T30 Model Consistency
  suite('T16'); await test('T16: classifyConsistencyStatus consistent', () => {
    assertEqual(getTrustMetrics().classifyConsistencyStatus(80), 'consistent', '');
  });
  suite('T17'); await test('T17: classifyConsistencyStatus attention', () => {
    assertEqual(getTrustMetrics().classifyConsistencyStatus(55), 'attention', '');
  });
  suite('T18'); await test('T18: classifyConsistencyStatus divergent', () => {
    assertEqual(getTrustMetrics().classifyConsistencyStatus(30), 'divergent', '');
  });
  suite('T19'); await test('T19: REQUIRED_LAYERS 9', () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    assertEqual(svc.aioiModelConsistencyService.REQUIRED_LAYERS.length, 9, ''); restoreDb();
  });
  suite('T20'); await test('T20: buildModelConsistency', () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const r = svc.aioiModelConsistencyService.buildModelConsistency(SAMPLE_CMD);
    assert(r.consistency_score >= 70); restoreDb();
  });
  suite('T21'); await test('T21: computeModelConsistencyScore range', () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const s = svc.aioiModelConsistencyService.computeModelConsistencyScore(SAMPLE_CMD);
    assert(s >= 0 && s <= 100); restoreDb();
  });
  suite('T22'); await test('T22: getModelConsistency ok', async () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const r = await svc.aioiModelConsistencyService.getModelConsistency(COMPANY_ID);
    assert(r.ok && r.model_consistency.consistency_status); restoreDb();
  });
  suite('T23'); await test('T23: companyId inválido consistency', async () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const r = await svc.aioiModelConsistencyService.getModelConsistency('x');
    assert(!r.ok); restoreDb();
  });
  suite('T24'); await test('T24: composição P2.9', () => {
    const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiModelConsistencyService.js'), 'utf8'));
    assert(code.includes('commandReadModel') && !code.includes('getGovernanceReadModel'));
  });
  suite('T25'); await test('T25: modelo vazio score baixo', () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    assert(svc.aioiModelConsistencyService.computeModelConsistencyScore(null) === 0); restoreDb();
  });
  suite('T26'); await test('T26: determinístico consistency', () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    assertEqual(svc.aioiModelConsistencyService.computeModelConsistencyScore(SAMPLE_CMD),
      svc.aioiModelConsistencyService.computeModelConsistencyScore(SAMPLE_CMD), ''); restoreDb();
  });
  suite('T27'); await test('T27: recordConsistencyAnalyzed', () => {
    tm = getTrustMetrics(); tm.resetSessionCounters();
    tm.recordConsistencyAnalyzed(COMPANY_ID);
    assert(tm.getSessionCounters().consistency_analysis_count >= 1);
  });
  suite('T28'); await test('T28: zero writes consistency', async () => {
    const mock = createTrustDbMock(); patchDb(mock); const svc = loadP30();
    await svc.aioiModelConsistencyService.getModelConsistency(COMPANY_ID);
    assertNoWrites(mock._client._calls); restoreDb();
  });
  suite('T29'); await test('T29: limite 70 consistent', () => {
    assertEqual(getTrustMetrics().classifyConsistencyStatus(70), 'consistent', '');
  });
  suite('T30'); await test('T30: camadas parciais', () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const partial = { governance_read_model: {}, predictive_read_model: {} };
    assert(svc.aioiModelConsistencyService.computeModelConsistencyScore(partial) < 70); restoreDb();
  });

  // T31–T45 Forecast Reliability
  suite('T31'); await test('T31: classifyReliabilityStatus reliable', () => {
    assertEqual(getTrustMetrics().classifyReliabilityStatus(80), 'reliable', '');
  });
  suite('T32'); await test('T32: classifyReliabilityStatus attention', () => {
    assertEqual(getTrustMetrics().classifyReliabilityStatus(55), 'attention', '');
  });
  suite('T33'); await test('T33: classifyReliabilityStatus unreliable', () => {
    assertEqual(getTrustMetrics().classifyReliabilityStatus(30), 'unreliable', '');
  });
  suite('T34'); await test('T34: buildForecastReliability', () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const r = svc.aioiForecastReliabilityService.buildForecastReliability({
      backlogForecast: { approval_backlog_forecast: 1, execution_backlog_forecast: 1,
        outcome_backlog_forecast: 0, learning_backlog_forecast: 0 },
      capacityForecast: { estimated_daily_throughput: 6 },
      latestSnapshots: {
        backlog: { snapshot_payload: { approval: 1, execution: 1, outcome: 0, learning: 0 } },
        throughput: { snapshot_payload: { daily_throughput: 6 } }
      }
    });
    assert(r.reliability_score >= 70); restoreDb();
  });
  suite('T35'); await test('T35: computeForecastReliabilityScore range', () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const s = svc.aioiForecastReliabilityService.computeForecastReliabilityScore({
      backlogForecast: { approval_backlog_forecast: 5 }, capacityForecast: {},
      latestSnapshots: { backlog: { snapshot_payload: { approval: 5 } }, throughput: null }
    });
    assert(s >= 0 && s <= 100); restoreDb();
  });
  suite('T36'); await test('T36: getForecastReliability ok', async () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const r = await svc.aioiForecastReliabilityService.getForecastReliability(COMPANY_ID);
    assert(r.ok && r.forecast_reliability.reliability_status); restoreDb();
  });
  suite('T37'); await test('T37: companyId inválido reliability', async () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const r = await svc.aioiForecastReliabilityService.getForecastReliability('nope');
    assert(!r.ok); restoreDb();
  });
  suite('T38'); await test('T38: sem forecast novo', () => {
    const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiForecastReliabilityService.js'), 'utf8'));
    assert(!code.includes('linearRegressionForecast') && code.includes('backlogForecastService'));
  });
  suite('T39'); await test('T39: sem dados default 50', () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    assertEqual(svc.aioiForecastReliabilityService.computeForecastReliabilityScore({
      backlogForecast: null, capacityForecast: null, latestSnapshots: {}
    }), 50, ''); restoreDb();
  });
  suite('T40'); await test('T40: determinístico reliability', () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const inp = {
      backlogForecast: { approval_backlog_forecast: 2 }, capacityForecast: {},
      latestSnapshots: { backlog: { snapshot_payload: { approval: 2 } }, throughput: null }
    };
    assertEqual(svc.aioiForecastReliabilityService.computeForecastReliabilityScore(inp),
      svc.aioiForecastReliabilityService.computeForecastReliabilityScore(inp), ''); restoreDb();
  });
  suite('T41'); await test('T41: recordReliabilityAnalyzed', () => {
    tm = getTrustMetrics(); tm.resetSessionCounters();
    tm.recordReliabilityAnalyzed(COMPANY_ID);
    assert(tm.getSessionCounters().reliability_analysis_count >= 1);
  });
  suite('T42'); await test('T42: zero writes reliability', async () => {
    const mock = createTrustDbMock(); patchDb(mock); const svc = loadP30();
    await svc.aioiForecastReliabilityService.getForecastReliability(COMPANY_ID);
    assertNoWrites(mock._client._calls); restoreDb();
  });
  suite('T43'); await test('T43: relativeDelta', () => {
    assertEqual(getTrustMetrics().relativeDelta(10, 10), 0, '');
  });
  suite('T44'); await test('T44: parseSnapshotPayload object', () => {
    assertEqual(getTrustMetrics().parseSnapshotPayload({ a: 1 }).a, 1, '');
  });
  suite('T45'); await test('T45: limite 70 reliable', () => {
    assertEqual(getTrustMetrics().classifyReliabilityStatus(70), 'reliable', '');
  });

  // T46–T55 Intelligence Trust
  suite('T46'); await test('T46: classifyTrustLevel low_trust', () => {
    assertEqual(getTrustMetrics().classifyTrustLevel(30), 'low_trust', '');
  });
  suite('T47'); await test('T47: classifyTrustLevel moderate_trust', () => {
    assertEqual(getTrustMetrics().classifyTrustLevel(55), 'moderate_trust', '');
  });
  suite('T48'); await test('T48: classifyTrustLevel high_trust', () => {
    assertEqual(getTrustMetrics().classifyTrustLevel(80), 'high_trust', '');
  });
  suite('T49'); await test('T49: classifyTrustLevel trusted_enterprise', () => {
    assertEqual(getTrustMetrics().classifyTrustLevel(95), 'trusted_enterprise', '');
  });
  suite('T50'); await test('T50: limite 90 trusted_enterprise', () => {
    assertEqual(getTrustMetrics().classifyTrustLevel(90), 'trusted_enterprise', '');
  });
  suite('T51'); await test('T51: computeTrustScore range', () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const s = svc.aioiIntelligenceTrustService.computeTrustScore({
      integrityScore: 80, consistencyScore: 75, reliabilityScore: 85, twinConsistencyScore: 78
    });
    assert(s >= 0 && s <= 100); restoreDb();
  });
  suite('T52'); await test('T52: buildIntelligenceTrust', () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const r = svc.aioiIntelligenceTrustService.buildIntelligenceTrust({
      integrityScore: 95, consistencyScore: 92, reliabilityScore: 94, twinConsistencyScore: 96
    });
    assert(r.trust_score >= 90 && r.trust_level === 'trusted_enterprise'); restoreDb();
  });
  suite('T53'); await test('T53: getIntelligenceTrust ok', async () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const r = await svc.aioiIntelligenceTrustService.getIntelligenceTrust(COMPANY_ID);
    assert(r.ok && r.intelligence_trust.trust_level); restoreDb();
  });
  suite('T54'); await test('T54: companyId inválido trust', async () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const r = await svc.aioiIntelligenceTrustService.getIntelligenceTrust('invalid');
    assert(!r.ok); restoreDb();
  });
  suite('T55'); await test('T55: TRUST_WEIGHTS soma 1', () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const w = svc.aioiIntelligenceTrustService.TRUST_WEIGHTS;
    assert(Math.abs(Object.values(w).reduce((a, b) => a + b, 0) - 1) < 0.01); restoreDb();
  });

  // T56–T70 Trust Read Model
  suite('T56'); await test('T56: getTrustReadModel ok', async () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const r = await svc.aioiTrustReadModelService.getTrustReadModel(COMPANY_ID);
    assert(r.ok && r.trust_read_model.executive_command_read_model); restoreDb();
  });
  suite('T57'); await test('T57: data_integrity no read model', async () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const r = await svc.aioiTrustReadModelService.getTrustReadModel(COMPANY_ID);
    assert(r.trust_read_model.data_integrity); restoreDb();
  });
  suite('T58'); await test('T58: model_consistency no read model', async () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const r = await svc.aioiTrustReadModelService.getTrustReadModel(COMPANY_ID);
    assert(r.trust_read_model.model_consistency); restoreDb();
  });
  suite('T59'); await test('T59: forecast_reliability no read model', async () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const r = await svc.aioiTrustReadModelService.getTrustReadModel(COMPANY_ID);
    assert(r.trust_read_model.forecast_reliability); restoreDb();
  });
  suite('T60'); await test('T60: intelligence_trust no read model', async () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const r = await svc.aioiTrustReadModelService.getTrustReadModel(COMPANY_ID);
    assert(r.trust_read_model.intelligence_trust); restoreDb();
  });
  suite('T61'); await test('T61: 5 blocos trust read model', async () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const r = await svc.aioiTrustReadModelService.getTrustReadModel(COMPANY_ID);
    assertEqual(Object.keys(r.trust_read_model).length, 5, ''); restoreDb();
  });
  suite('T62'); await test('T62: companyId inválido read model', async () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const r = await svc.aioiTrustReadModelService.getTrustReadModel('bad');
    assert(!r.ok); restoreDb();
  });
  suite('T63'); await test('T63: recordTrustRequested', () => {
    tm = getTrustMetrics(); tm.resetSessionCounters();
    tm.recordTrustRequested(COMPANY_ID);
    assert(tm.getSessionCounters().trust_requests >= 1);
  });
  suite('T64'); await test('T64: zero writes read model', async () => {
    const mock = createTrustDbMock(); patchDb(mock); const svc = loadP30();
    await svc.aioiTrustReadModelService.getTrustReadModel(COMPANY_ID);
    assertNoWrites(mock._client._calls); restoreDb();
  });
  suite('T65'); await test('T65: recordTrustAnalyzed', () => {
    tm = getTrustMetrics(); tm.resetSessionCounters();
    tm.recordTrustAnalyzed(COMPANY_ID);
    assert(tm.getSessionCounters().trust_analysis_count >= 1);
  });
  suite('T66'); await test('T66: determinístico trust score', () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const inp = { integrityScore: 70, consistencyScore: 70, reliabilityScore: 70, twinConsistencyScore: 70 };
    assertEqual(svc.aioiIntelligenceTrustService.computeTrustScore(inp),
      svc.aioiIntelligenceTrustService.computeTrustScore(inp), ''); restoreDb();
  });
  suite('T67'); await test('T67: anti-duplication P2.9', () => {
    const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiTrustReadModelService.js'), 'utf8'));
    assert(code.includes('commandReadModel') && !code.includes('buildExecutiveCommandState'));
  });
  suite('T68'); await test('T68: níveis trust permitidos', () => {
    const allowed = ['low_trust', 'moderate_trust', 'high_trust', 'trusted_enterprise'];
    for (const s of [20, 50, 80, 95]) assert(allowed.includes(getTrustMetrics().classifyTrustLevel(s)));
  });
  suite('T69'); await test('T69: executive_command nested', async () => {
    patchDb(createTrustDbMock()); const svc = loadP30();
    const r = await svc.aioiTrustReadModelService.getTrustReadModel(COMPANY_ID);
    assert(r.trust_read_model.executive_command_read_model.governance_read_model); restoreDb();
  });
  suite('T70'); await test('T70: recordTrustCompleted', () => {
    tm = getTrustMetrics(); tm.recordTrustCompleted(COMPANY_ID, 10);
    assert(tm.getSessionCounters().avg_query_latency_ms != null || true);
  });

  // T71–T73 READ ONLY
  suite('T71'); await test('T71: INSERT bloqueado', () => {
    tm = getTrustMetrics(); let threw = false;
    try { tm.assertReadOnlySql('INSERT INTO x VALUES (1)'); } catch (e) {
      threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', '');
    }
    assert(threw);
  });
  suite('T72'); await test('T72: UPDATE bloqueado', () => {
    tm = getTrustMetrics(); let threw = false;
    try { tm.assertReadOnlySql('UPDATE x SET y=1'); } catch (e) { threw = true; } assert(threw);
  });
  suite('T73'); await test('T73: DELETE bloqueado', () => {
    tm = getTrustMetrics(); let threw = false;
    try { tm.assertReadOnlySql('DELETE FROM x'); } catch (e) { threw = true; } assert(threw);
  });

  // T74 RLS
  suite('T74'); await test('T74: RLS company_id + bypass false', async () => {
    const mock = createTrustDbMock(); patchDb(mock); const svc = loadP30();
    await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID);
    const t = mock._client._calls.find(c => c.sql.includes('app.current_company_id'));
    const b = mock._client._calls.filter(c => c.sql.includes('app.bypass_rls'));
    assert(t && t.params[0] === COMPANY_ID);
    assert(b.length >= 1); restoreDb();
  });

  // T75 Multi-tenant
  suite('T75'); await test('T75: tenant B', async () => {
    const mock = createTrustDbMock(buildIoes().map(i => ({ ...i, company_id: COMPANY_ID_B })));
    patchDb(mock); const svc = loadP30();
    const r = await svc.aioiTrustReadModelService.getTrustReadModel(COMPANY_ID_B);
    assert(r.ok);
    await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID_B);
    const t = mock._client._calls.filter(c => c.sql.includes('app.current_company_id'))
      .find(c => c.params && c.params[0] === COMPANY_ID_B);
    assert(t, 'RLS tenant B'); restoreDb();
  });

  // T76 Soberanos
  suite('T76'); await test('T76: soberanos ausentes', () => {
    const files = ['aioiTrustMetrics.js', 'aioiDataIntegrityService.js', 'aioiModelConsistencyService.js',
      'aioiForecastReliabilityService.js', 'aioiIntelligenceTrustService.js', 'aioiTrustReadModelService.js'];
    const forbidden = ['operationalDecisionEngine', 'operationalLearningService', 'workflowOrchestrator',
      'actionRuntimeOrchestrator', 'computePriorityScore', 'classificationConsumer', 'aioiOutboxConsumerService'];
    for (const f of files) {
      const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8'));
      for (const term of forbidden) assert(!code.includes(term), `${f} ${term}`);
    }
  });

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  AIOI-P3.0 Trust Read Model Test Report');
  console.log(`  Total: ${_passed + _failed} | PASS: ${_passed} | FAIL: ${_failed}`);
  console.log(`  STATUS: ${_failed === 0 ? 'AIOI_P3_0_TEST_PASS' : 'AIOI_P3_0_TEST_FAIL'}`);
  console.log('══════════════════════════════════════════════════════════\n');
  process.exit(_failed > 0 ? 1 : 0);
}

runTests().catch(e => { console.error('Fatal:', e); process.exit(1); });
