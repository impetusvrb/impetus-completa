'use strict';

/**
 * AIOI-P2.8 — Testes automatizados da Enterprise Digital Twin Intelligence Layer
 * T1–T66 | node src/tests/aioi/aioiDigitalTwinReadModel.test.js
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

const P28_MODULES = [
  'aioiDigitalTwinMetrics', 'aioiOperationalStateService', 'aioiFutureStateService',
  'aioiScenarioStateService', 'aioiTwinConsistencyService', 'aioiDigitalTwinReadModelService',
  'aioiScenarioMetrics', 'aioiBacklogReductionScenarioService', 'aioiSlaRecoveryScenarioService',
  'aioiCapacityExpansionScenarioService', 'aioiResilienceScenarioService', 'aioiScenarioReadModelService',
  'aioiResilienceMetrics', 'aioiOperationalResilienceService', 'aioiDependencyRiskService',
  'aioiRecoveryReadinessService', 'aioiSustainabilityAnalysisService', 'aioiResilienceReadModelService',
  'aioiValueMetrics', 'aioiOperationalValueService', 'aioiRiskImpactService', 'aioiBottleneckCostService',
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

function loadP28() {
  const loaded = {};
  for (const mod of P28_MODULES) {
    delete require.cache[require.resolve(`${SERVICES_PATH}/${mod}`)];
    loaded[mod] = require(`${SERVICES_PATH}/${mod}`);
  }
  return loaded;
}
function getTwinMetrics() {
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiDigitalTwinMetrics`)];
  return require(`${SERVICES_PATH}/aioiDigitalTwinMetrics`);
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
      snapshot_payload: { approval: 10, execution: 4, outcome: 2, learning: 1 }, created_at: recent },
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

function createTwinDbMock(ioes = buildIoes(), snapshots = buildSnapshots()) {
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
      if (s.includes('aioi_metrics_snapshots')) {
        let rows = snapStore.filter(x => x.company_id === companyId);
        if (params[1]) rows = rows.filter(x => x.snapshot_type === params[1]);
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

const SAMPLE_OP_STATE = {
  executive_snapshot: { open: 1, resolved: 1 },
  governance_status: 'healthy',
  maturity_level: 'managed',
  strategic_alignment: { score: 70, status: 'aligned' },
  operational_value: { operational_value_score: 65, value_status: 'medium_value' },
  resilience_status: 'resilient'
};

const SAMPLE_FUTURE = {
  backlog_forecast: { approval_backlog_forecast: 2, execution_backlog_forecast: 1,
    outcome_backlog_forecast: 0, learning_backlog_forecast: 0 },
  sla_forecast: { end_to_end: { forecast_status: 'within_sla' } },
  capacity_forecast: { estimated_daily_throughput: 5, trend: 'stable' },
  risk_forecast: { approval_risk_forecast: 'low', execution_risk_forecast: 'low',
    outcome_risk_forecast: 'low', learning_risk_forecast: 'low' }
};

const SAMPLE_SCENARIO = {
  backlog_scenarios: { current_backlog: 2, reduced_backlog_10: 2, reduced_backlog_25: 2, reduced_backlog_50: 1 },
  sla_scenarios: { current_sla_status: { status: 'within_sla', breach_count: 0 },
    recovery_50pct: { status: 'within_sla', breach_count: 0 } },
  capacity_scenarios: { current_capacity: 5, expanded_50pct: 8 },
  resilience_scenarios: { current_resilience: { resilience_score: 55, resilience_status: 'resilient' },
    improved_50pct: { resilience_score: 83, resilience_status: 'highly_resilient' } }
};

async function runTests() {
  let tm = getTwinMetrics();
  tm.resetSessionCounters();

  // T1–T15 Operational State
  suite('T1'); await test('T1: buildOperationalState estrutura', () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = svc.aioiOperationalStateService.buildOperationalState({
      snapshot: { open: 1 }, tenantHealth: { status: 'healthy' },
      maturity: { level: 'managed', score: 55 }, strategicAlignment: { score: 70 },
      operationalValue: { operational_value_score: 60 }, operationalResilience: { resilience_status: 'resilient' }
    });
    assert(r.executive_snapshot && r.governance_status === 'healthy'); restoreDb();
  });
  suite('T2'); await test('T2: maturity_level', () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = svc.aioiOperationalStateService.buildOperationalState({
      snapshot: {}, tenantHealth: { status: 'attention' }, maturity: { level: 'developing' },
      strategicAlignment: {}, operationalValue: {}, operationalResilience: { resilience_status: 'fragile' }
    });
    assertEqual(r.maturity_level, 'developing', ''); restoreDb();
  });
  suite('T3'); await test('T3: resilience_status', () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = svc.aioiOperationalStateService.buildOperationalState({
      snapshot: {}, tenantHealth: { status: 'healthy' }, maturity: { level: 'optimized' },
      strategicAlignment: {}, operationalValue: {}, operationalResilience: { resilience_status: 'highly_resilient' }
    });
    assertEqual(r.resilience_status, 'highly_resilient', ''); restoreDb();
  });
  suite('T4'); await test('T4: strategic_alignment presente', () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = svc.aioiOperationalStateService.buildOperationalState({
      snapshot: {}, tenantHealth: { status: 'healthy' }, maturity: { level: 'managed' },
      strategicAlignment: { score: 80, status: 'aligned' }, operationalValue: {},
      operationalResilience: { resilience_status: 'resilient' }
    });
    assert(r.strategic_alignment.score === 80); restoreDb();
  });
  suite('T5'); await test('T5: operational_value presente', () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = svc.aioiOperationalStateService.buildOperationalState({
      snapshot: {}, tenantHealth: { status: 'healthy' }, maturity: { level: 'managed' },
      strategicAlignment: {}, operationalValue: { operational_value_score: 72, value_status: 'high_value' },
      operationalResilience: { resilience_status: 'resilient' }
    });
    assertEqual(r.operational_value.value_status, 'high_value', ''); restoreDb();
  });
  suite('T6'); await test('T6: getOperationalState ok', async () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = await svc.aioiOperationalStateService.getOperationalState(COMPANY_ID);
    assert(r.ok && r.operational_state.executive_snapshot); restoreDb();
  });
  suite('T7'); await test('T7: governance_status do tenant health', async () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = await svc.aioiOperationalStateService.getOperationalState(COMPANY_ID);
    assert(['healthy', 'attention', 'critical'].includes(r.operational_state.governance_status)); restoreDb();
  });
  suite('T8'); await test('T8: companyId inválido operational', async () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = await svc.aioiOperationalStateService.getOperationalState('bad');
    assert(!r.ok); restoreDb();
  });
  suite('T9'); await test('T9: 6 campos obrigatórios', () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = svc.aioiOperationalStateService.buildOperationalState({
      snapshot: {}, tenantHealth: { status: 'healthy' }, maturity: { level: 'managed' },
      strategicAlignment: {}, operationalValue: {}, operationalResilience: { resilience_status: 'resilient' }
    });
    assert(Object.keys(r).length === 6); restoreDb();
  });
  suite('T10'); await test('T10: composição P2.x sem reimplementar', () => {
    const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiOperationalStateService.js'), 'utf8'));
    assert(!code.includes('computeMaturityScore') && code.includes('maturityService')); 
  });
  suite('T11'); await test('T11: executive_snapshot campos', async () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = await svc.aioiOperationalStateService.getOperationalState(COMPANY_ID);
    assert(r.operational_state.executive_snapshot.resolved != null); restoreDb();
  });
  suite('T12'); await test('T12: determinístico operational', () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const a = svc.aioiOperationalStateService.buildOperationalState({
      snapshot: { x: 1 }, tenantHealth: { status: 'healthy' }, maturity: { level: 'managed' },
      strategicAlignment: { s: 1 }, operationalValue: { v: 1 },
      operationalResilience: { resilience_status: 'resilient' }
    });
    const b = svc.aioiOperationalStateService.buildOperationalState({
      snapshot: { x: 1 }, tenantHealth: { status: 'healthy' }, maturity: { level: 'managed' },
      strategicAlignment: { s: 1 }, operationalValue: { v: 1 },
      operationalResilience: { resilience_status: 'resilient' }
    });
    assertEqual(JSON.stringify(a), JSON.stringify(b), ''); restoreDb();
  });
  suite('T13'); await test('T13: maturity levels válidos', async () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = await svc.aioiOperationalStateService.getOperationalState(COMPANY_ID);
    const allowed = ['initial', 'developing', 'managed', 'optimized', 'autonomous_ready'];
    assert(allowed.includes(r.operational_state.maturity_level)); restoreDb();
  });
  suite('T14'); await test('T14: zero side effects operational', async () => {
    const mock = createTwinDbMock(); patchDb(mock); const svc = loadP28();
    await svc.aioiOperationalStateService.getOperationalState(COMPANY_ID);
    assertNoWrites(mock._client._calls); restoreDb();
  });
  suite('T15'); await test('T15: recordOperationalStateAnalyzed', () => {
    tm = getTwinMetrics(); tm.resetSessionCounters();
    tm.recordOperationalStateAnalyzed(COMPANY_ID);
    assert(tm.getSessionCounters().operational_state_count >= 1);
  });

  // T16–T30 Future State
  suite('T16'); await test('T16: buildFutureState estrutura', () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = svc.aioiFutureStateService.buildFutureState({
      backlogForecast: { approval_backlog_forecast: 1 }, slaForecast: { a: {} },
      capacityForecast: { estimated_daily_throughput: 5 }, riskForecast: { approval_risk_forecast: 'low' }
    });
    assert(r.backlog_forecast && r.sla_forecast && r.capacity_forecast && r.risk_forecast); restoreDb();
  });
  suite('T17'); await test('T17: 4 campos future', () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = svc.aioiFutureStateService.buildFutureState({
      backlogForecast: {}, slaForecast: {}, capacityForecast: {}, riskForecast: {}
    });
    assertEqual(Object.keys(r).length, 4, ''); restoreDb();
  });
  suite('T18'); await test('T18: getFutureState ok', async () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = await svc.aioiFutureStateService.getFutureState(COMPANY_ID);
    assert(r.ok && r.future_state.backlog_forecast); restoreDb();
  });
  suite('T19'); await test('T19: sla_forecast presente', async () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = await svc.aioiFutureStateService.getFutureState(COMPANY_ID);
    assert(r.future_state.sla_forecast); restoreDb();
  });
  suite('T20'); await test('T20: capacity_forecast presente', async () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = await svc.aioiFutureStateService.getFutureState(COMPANY_ID);
    assert(r.future_state.capacity_forecast.estimated_daily_throughput != null); restoreDb();
  });
  suite('T21'); await test('T21: risk_forecast presente', async () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = await svc.aioiFutureStateService.getFutureState(COMPANY_ID);
    assert(r.future_state.risk_forecast.approval_risk_forecast); restoreDb();
  });
  suite('T22'); await test('T22: companyId inválido future', async () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = await svc.aioiFutureStateService.getFutureState('x');
    assert(!r.ok); restoreDb();
  });
  suite('T23'); await test('T23: sem forecast novo future', () => {
    const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiFutureStateService.js'), 'utf8'));
    assert(!code.includes('linearRegressionForecast') && code.includes('backlogForecastService'));
  });
  suite('T24'); await test('T24: reutiliza P2.2', () => {
    const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiFutureStateService.js'), 'utf8'));
    assert(code.includes('slaForecastService') && code.includes('riskForecastService'));
  });
  suite('T25'); await test('T25: sumBacklogForecast', () => {
    assertEqual(getTwinMetrics().sumBacklogForecast({
      approval_backlog_forecast: 10, execution_backlog_forecast: 5,
      outcome_backlog_forecast: 2, learning_backlog_forecast: 3
    }), 20, '');
  });
  suite('T26'); await test('T26: sumBacklogForecast zero', () => {
    assertEqual(getTwinMetrics().sumBacklogForecast(null), 0, '');
  });
  suite('T27'); await test('T27: determinístico future build', () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const inp = { backlogForecast: { a: 1 }, slaForecast: {}, capacityForecast: {}, riskForecast: {} };
    const a = svc.aioiFutureStateService.buildFutureState(inp);
    const b = svc.aioiFutureStateService.buildFutureState(inp);
    assertEqual(JSON.stringify(a), JSON.stringify(b), ''); restoreDb();
  });
  suite('T28'); await test('T28: zero writes future', async () => {
    const mock = createTwinDbMock(); patchDb(mock); const svc = loadP28();
    await svc.aioiFutureStateService.getFutureState(COMPANY_ID);
    assertNoWrites(mock._client._calls); restoreDb();
  });
  suite('T29'); await test('T29: recordFutureStateAnalyzed', () => {
    tm = getTwinMetrics(); tm.resetSessionCounters();
    tm.recordFutureStateAnalyzed(COMPANY_ID);
    assert(tm.getSessionCounters().future_state_count >= 1);
  });
  suite('T30'); await test('T30: anti-duplication P2.2', () => {
    const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiFutureStateService.js'), 'utf8'));
    assert(!code.includes('forecastBacklogValue'));
  });

  // T31–T45 Scenario State
  suite('T31'); await test('T31: buildScenarioState estrutura', () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = svc.aioiScenarioStateService.buildScenarioState({
      backlogReduction: { current_backlog: 5 }, slaRecovery: { current_sla_status: {} },
      capacityExpansion: { current_capacity: 3 }, resilienceImprovement: { current_resilience: {} }
    });
    assert(r.backlog_scenarios && r.sla_scenarios && r.capacity_scenarios && r.resilience_scenarios); restoreDb();
  });
  suite('T32'); await test('T32: 4 campos scenario state', () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = svc.aioiScenarioStateService.buildScenarioState({
      backlogReduction: {}, slaRecovery: {}, capacityExpansion: {}, resilienceImprovement: {}
    });
    assertEqual(Object.keys(r).length, 4, ''); restoreDb();
  });
  suite('T33'); await test('T33: getScenarioState ok', async () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = await svc.aioiScenarioStateService.getScenarioState(COMPANY_ID);
    assert(r.ok && r.scenario_state.backlog_scenarios); restoreDb();
  });
  suite('T34'); await test('T34: sla_scenarios', async () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = await svc.aioiScenarioStateService.getScenarioState(COMPANY_ID);
    assert(r.scenario_state.sla_scenarios.current_sla_status); restoreDb();
  });
  suite('T35'); await test('T35: capacity_scenarios', async () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = await svc.aioiScenarioStateService.getScenarioState(COMPANY_ID);
    assert(r.scenario_state.capacity_scenarios.current_capacity != null); restoreDb();
  });
  suite('T36'); await test('T36: resilience_scenarios', async () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = await svc.aioiScenarioStateService.getScenarioState(COMPANY_ID);
    assert(r.scenario_state.resilience_scenarios.current_resilience); restoreDb();
  });
  suite('T37'); await test('T37: companyId inválido scenario state', async () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = await svc.aioiScenarioStateService.getScenarioState('nope');
    assert(!r.ok); restoreDb();
  });
  suite('T38'); await test('T38: reutiliza P2.7', () => {
    const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiScenarioStateService.js'), 'utf8'));
    assert(code.includes('backlogScenario') && code.includes('slaScenario'));
  });
  suite('T39'); await test('T39: anti-duplication P2.7', () => {
    const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiScenarioStateService.js'), 'utf8'));
    assert(!code.includes('buildBacklogReductionScenario'));
  });
  suite('T40'); await test('T40: determinístico scenario build', () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const inp = { backlogReduction: { x: 1 }, slaRecovery: {}, capacityExpansion: {}, resilienceImprovement: {} };
    assertEqual(JSON.stringify(svc.aioiScenarioStateService.buildScenarioState(inp)),
      JSON.stringify(svc.aioiScenarioStateService.buildScenarioState(inp)), ''); restoreDb();
  });
  suite('T41'); await test('T41: zero writes scenario state', async () => {
    const mock = createTwinDbMock(); patchDb(mock); const svc = loadP28();
    await svc.aioiScenarioStateService.getScenarioState(COMPANY_ID);
    assertNoWrites(mock._client._calls); restoreDb();
  });
  suite('T42'); await test('T42: recordScenarioStateAnalyzed', () => {
    tm = getTwinMetrics(); tm.resetSessionCounters();
    tm.recordScenarioStateAnalyzed(COMPANY_ID);
    assert(tm.getSessionCounters().scenario_state_count >= 1);
  });
  suite('T43'); await test('T43: backlog_scenarios redução', async () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = await svc.aioiScenarioStateService.getScenarioState(COMPANY_ID);
    const b = r.scenario_state.backlog_scenarios;
    assert(b.reduced_backlog_50 <= b.current_backlog); restoreDb();
  });
  suite('T44'); await test('T44: capacity_scenarios expansão', async () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = await svc.aioiScenarioStateService.getScenarioState(COMPANY_ID);
    const c = r.scenario_state.capacity_scenarios;
    assert(c.expanded_50pct >= c.current_capacity); restoreDb();
  });
  suite('T45'); await test('T45: resilience_scenarios melhoria', async () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = await svc.aioiScenarioStateService.getScenarioState(COMPANY_ID);
    const rs = r.scenario_state.resilience_scenarios;
    assert(rs.improved_50pct.resilience_score >= rs.current_resilience.resilience_score); restoreDb();
  });

  // T46–T55 Twin Consistency
  suite('T46'); await test('T46: classifyConsistencyStatus coherent', () => {
    assertEqual(getTwinMetrics().classifyConsistencyStatus(80), 'coherent', '');
  });
  suite('T47'); await test('T47: classifyConsistencyStatus attention', () => {
    assertEqual(getTwinMetrics().classifyConsistencyStatus(55), 'attention', '');
  });
  suite('T48'); await test('T48: classifyConsistencyStatus divergent', () => {
    assertEqual(getTwinMetrics().classifyConsistencyStatus(30), 'divergent', '');
  });
  suite('T49'); await test('T49: limite 70 coherent', () => {
    assertEqual(getTwinMetrics().classifyConsistencyStatus(70), 'coherent', '');
  });
  suite('T50'); await test('T50: limite 40 attention', () => {
    assertEqual(getTwinMetrics().classifyConsistencyStatus(40), 'attention', '');
  });
  suite('T51'); await test('T51: computeTwinConsistencyScore range', () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const s = svc.aioiTwinConsistencyService.computeTwinConsistencyScore({
      operationalState: SAMPLE_OP_STATE, futureState: SAMPLE_FUTURE, scenarioState: SAMPLE_SCENARIO
    });
    assert(s >= 0 && s <= 100); restoreDb();
  });
  suite('T52'); await test('T52: buildTwinConsistency estrutura', () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = svc.aioiTwinConsistencyService.buildTwinConsistency({
      operationalState: SAMPLE_OP_STATE, futureState: SAMPLE_FUTURE, scenarioState: SAMPLE_SCENARIO
    });
    assert(r.consistency_score != null && r.consistency_status); restoreDb();
  });
  suite('T53'); await test('T53: getTwinConsistency ok', async () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = await svc.aioiTwinConsistencyService.getTwinConsistency(COMPANY_ID);
    assert(r.ok && r.twin_consistency.consistency_status); restoreDb();
  });
  suite('T54'); await test('T54: companyId inválido consistency', async () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = await svc.aioiTwinConsistencyService.getTwinConsistency('bad');
    assert(!r.ok); restoreDb();
  });
  suite('T55'); await test('T55: determinístico consistency', () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const inp = { operationalState: SAMPLE_OP_STATE, futureState: SAMPLE_FUTURE, scenarioState: SAMPLE_SCENARIO };
    const a = svc.aioiTwinConsistencyService.computeTwinConsistencyScore(inp);
    const b = svc.aioiTwinConsistencyService.computeTwinConsistencyScore(inp);
    assertEqual(a, b, ''); restoreDb();
  });

  // T56–T60 Read Model
  suite('T56'); await test('T56: getDigitalTwinReadModel ok', async () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = await svc.aioiDigitalTwinReadModelService.getDigitalTwinReadModel(COMPANY_ID);
    assert(r.ok && r.digital_twin_read_model.governance_read_model); restoreDb();
  });
  suite('T57'); await test('T57: operational_state no read model', async () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = await svc.aioiDigitalTwinReadModelService.getDigitalTwinReadModel(COMPANY_ID);
    assert(r.digital_twin_read_model.operational_state); restoreDb();
  });
  suite('T58'); await test('T58: future + scenario + consistency', async () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = await svc.aioiDigitalTwinReadModelService.getDigitalTwinReadModel(COMPANY_ID);
    const d = r.digital_twin_read_model;
    assert(d.future_state && d.scenario_state && d.twin_consistency); restoreDb();
  });
  suite('T59'); await test('T59: 11 blocos read model', async () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = await svc.aioiDigitalTwinReadModelService.getDigitalTwinReadModel(COMPANY_ID);
    assert(Object.keys(r.digital_twin_read_model).length >= 11); restoreDb();
  });
  suite('T60'); await test('T60: companyId inválido read model', async () => {
    patchDb(createTwinDbMock()); const svc = loadP28();
    const r = await svc.aioiDigitalTwinReadModelService.getDigitalTwinReadModel('invalid');
    assert(!r.ok); restoreDb();
  });

  // T61–T63 READ ONLY
  suite('T61'); await test('T61: INSERT bloqueado', () => {
    tm = getTwinMetrics(); let threw = false;
    try { tm.assertReadOnlySql('INSERT INTO x VALUES (1)'); } catch (e) {
      threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', '');
    }
    assert(threw);
  });
  suite('T62'); await test('T62: DELETE bloqueado', () => {
    tm = getTwinMetrics(); let threw = false;
    try { tm.assertReadOnlySql('DELETE FROM x'); } catch (e) { threw = true; } assert(threw);
  });
  suite('T63'); await test('T63: zero writes read model', async () => {
    const mock = createTwinDbMock(); patchDb(mock); const svc = loadP28();
    await svc.aioiDigitalTwinReadModelService.getDigitalTwinReadModel(COMPANY_ID);
    assertNoWrites(mock._client._calls); restoreDb();
  });

  // T64 RLS
  suite('T64'); await test('T64: RLS company_id + bypass false', async () => {
    const mock = createTwinDbMock(); patchDb(mock); const svc = loadP28();
    await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID);
    const t = mock._client._calls.find(c => c.sql.includes('app.current_company_id'));
    const b = mock._client._calls.filter(c => c.sql.includes('app.bypass_rls'));
    assert(t && t.params[0] === COMPANY_ID);
    assert(b.length >= 1); restoreDb();
  });

  // T65 Multi-tenant
  suite('T65'); await test('T65: tenant B', async () => {
    const mock = createTwinDbMock(buildIoes().map(i => ({ ...i, company_id: COMPANY_ID_B })));
    patchDb(mock); const svc = loadP28();
    const r = await svc.aioiDigitalTwinReadModelService.getDigitalTwinReadModel(COMPANY_ID_B);
    assert(r.ok);
    await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID_B);
    const t = mock._client._calls.filter(c => c.sql.includes('app.current_company_id'))
      .find(c => c.params && c.params[0] === COMPANY_ID_B);
    assert(t, 'RLS tenant B'); restoreDb();
  });

  // T66 Soberanos
  suite('T66'); await test('T66: soberanos ausentes', () => {
    const files = ['aioiDigitalTwinMetrics.js', 'aioiOperationalStateService.js', 'aioiFutureStateService.js',
      'aioiScenarioStateService.js', 'aioiTwinConsistencyService.js', 'aioiDigitalTwinReadModelService.js'];
    const forbidden = ['operationalDecisionEngine', 'operationalLearningService', 'workflowOrchestrator',
      'actionRuntimeOrchestrator', 'computePriorityScore', 'classificationConsumer', 'aioiOutboxConsumerService'];
    for (const f of files) {
      const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8'));
      for (const term of forbidden) assert(!code.includes(term), `${f} ${term}`);
    }
  });

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  AIOI-P2.8 Digital Twin Read Model Test Report');
  console.log(`  Total: ${_passed + _failed} | PASS: ${_passed} | FAIL: ${_failed}`);
  console.log(`  STATUS: ${_failed === 0 ? 'AIOI_P2_8_TEST_PASS' : 'AIOI_P2_8_TEST_FAIL'}`);
  console.log('══════════════════════════════════════════════════════════\n');
  process.exit(_failed > 0 ? 1 : 0);
}

runTests().catch(e => { console.error('Fatal:', e); process.exit(1); });
