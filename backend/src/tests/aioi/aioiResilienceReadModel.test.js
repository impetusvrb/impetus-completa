'use strict';

/**
 * AIOI-P2.6 — Testes automatizados da Enterprise Resilience & Sustainability Layer
 * T1–T56 | node src/tests/aioi/aioiResilienceReadModel.test.js
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

const P26_MODULES = [
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

function loadP26() {
  const loaded = {};
  for (const mod of P26_MODULES) {
    delete require.cache[require.resolve(`${SERVICES_PATH}/${mod}`)];
    loaded[mod] = require(`${SERVICES_PATH}/${mod}`);
  }
  return loaded;
}
function getResMetrics() {
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiResilienceMetrics`)];
  return require(`${SERVICES_PATH}/aioiResilienceMetrics`);
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
      snapshot_payload: { end_to_end_cycle_ms: 35000000 }, created_at: mid },
    { company_id: COMPANY_ID, snapshot_type: 'lifecycle_snapshot',
      snapshot_payload: { operational_success_rate: 0.85 }, created_at: recent },
    { company_id: COMPANY_ID, snapshot_type: 'throughput_snapshot',
      snapshot_payload: { daily_throughput: 6 }, created_at: recent }
  ];
}

function createResDbMock(ioes = buildIoes(), snapshots = buildSnapshots()) {
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

async function runTests() {
  let rm = getResMetrics();
  rm.resetSessionCounters();

  // T1-T12 Operational Resilience
  suite('T1'); await test('T1: fragile', () => assertEqual(getResMetrics().classifyResilienceStatus(30), 'fragile', ''));
  suite('T2'); await test('T2: resilient', () => assertEqual(getResMetrics().classifyResilienceStatus(50), 'resilient', ''));
  suite('T3'); await test('T3: highly_resilient', () => assertEqual(getResMetrics().classifyResilienceStatus(80), 'highly_resilient', ''));
  suite('T4'); await test('T4: limite 70', () => assertEqual(getResMetrics().classifyResilienceStatus(70), 'highly_resilient', ''));
  suite('T5'); await test('T5: limite 40', () => assertEqual(getResMetrics().classifyResilienceStatus(40), 'resilient', ''));
  suite('T6'); await test('T6: limite 39', () => assertEqual(getResMetrics().classifyResilienceStatus(39), 'fragile', ''));
  suite('T7'); await test('T7: capacityTrendScore increasing', () => assertEqual(getResMetrics().capacityTrendScore('increasing'), 90, ''));
  suite('T8'); await test('T8: capacityTrendScore stable', () => assertEqual(getResMetrics().capacityTrendScore('stable'), 70, ''));
  suite('T9'); await test('T9: capacityTrendScore decreasing', () => assertEqual(getResMetrics().capacityTrendScore('decreasing'), 40, ''));
  suite('T10'); await test('T10: computeResilienceScore range', () => {
    patchDb(createResDbMock()); const svc = loadP26();
    const s = svc.aioiOperationalResilienceService.computeResilienceScore({
      stabilityScore: 80, maturityScore: 75, consistencyScore: 70, successRate: 0.9, capacityTrend: 'stable'
    });
    assert(s >= 0 && s <= 100, 'range'); restoreDb();
  });
  suite('T11'); await test('T11: computeResilienceScore alto', () => {
    patchDb(createResDbMock()); const svc = loadP26();
    const s = svc.aioiOperationalResilienceService.computeResilienceScore({
      stabilityScore: 90, maturityScore: 85, consistencyScore: 88, successRate: 0.95, capacityTrend: 'increasing'
    });
    assert(s >= 70, 'high'); restoreDb();
  });
  suite('T12'); await test('T12: getOperationalResilience ok', async () => {
    patchDb(createResDbMock()); const svc = loadP26();
    const r = await svc.aioiOperationalResilienceService.getOperationalResilience(COMPANY_ID);
    assert(r.ok && r.operational_resilience.resilience_status); restoreDb();
  });

  // T13-T22 Dependency Risk
  suite('T13'); await test('T13: dependency low', () => {
    patchDb(createResDbMock()); const svc = loadP26();
    assertEqual(svc.aioiDependencyRiskService.classifyDependencyRisk(20, 20, 'low'), 'low', ''); restoreDb();
  });
  suite('T14'); await test('T14: dependency medium', () => {
    patchDb(createResDbMock()); const svc = loadP26();
    assertEqual(svc.aioiDependencyRiskService.classifyDependencyRisk(55, 30, 'medium'), 'medium', ''); restoreDb();
  });
  suite('T15'); await test('T15: dependency high', () => {
    patchDb(createResDbMock()); const svc = loadP26();
    assertEqual(svc.aioiDependencyRiskService.classifyDependencyRisk(55, 40, 'high'), 'high', ''); restoreDb();
  });
  suite('T16'); await test('T16: dependency critical', () => {
    patchDb(createResDbMock()); const svc = loadP26();
    assertEqual(svc.aioiDependencyRiskService.classifyDependencyRisk(75, 60, 'critical'), 'critical', ''); restoreDb();
  });
  suite('T17'); await test('T17: buildDependencyRisk 4 dims', () => {
    patchDb(createResDbMock()); const svc = loadP26();
    const r = svc.aioiDependencyRiskService.buildDependencyRiskFromSignals({
      bottlenecks: { approval_backlog: 30, execution_backlog: 2, outcome_backlog: 1, learning_backlog: 1 },
      bottleneckCost: { approval_cost_index: 60, execution_cost_index: 10, outcome_cost_index: 10, learning_cost_index: 10 },
      riskImpact: { approval_risk_impact: 'high', execution_risk_impact: 'low', outcome_risk_impact: 'low', learning_risk_impact: 'low' }
    });
    assert(r.approval_dependency_risk, 'approval'); restoreDb();
  });
  suite('T18'); await test('T18: valores permitidos', () => {
    patchDb(createResDbMock()); const svc = loadP26();
    const allowed = ['low', 'medium', 'high', 'critical'];
    const r = svc.aioiDependencyRiskService.buildDependencyRiskFromSignals({
      bottlenecks: { approval_backlog: 1, execution_backlog: 1, outcome_backlog: 0, learning_backlog: 0 },
      bottleneckCost: { approval_cost_index: 20, execution_cost_index: 20, outcome_cost_index: 10, learning_cost_index: 10 },
      riskImpact: { approval_risk_impact: 'low', execution_risk_impact: 'low', outcome_risk_impact: 'low', learning_risk_impact: 'low' }
    });
    for (const v of Object.values(r)) assert(allowed.includes(v)); restoreDb();
  });
  suite('T19'); await test('T19: concentração approval', () => {
    patchDb(createResDbMock()); const svc = loadP26();
    const r = svc.aioiDependencyRiskService.buildDependencyRiskFromSignals({
      bottlenecks: { approval_backlog: 80, execution_backlog: 5, outcome_backlog: 5, learning_backlog: 5 },
      bottleneckCost: { approval_cost_index: 70, execution_cost_index: 10, outcome_cost_index: 10, learning_cost_index: 10 },
      riskImpact: { approval_risk_impact: 'high', execution_risk_impact: 'low', outcome_risk_impact: 'low', learning_risk_impact: 'low' }
    });
    assert(['high', 'critical'].includes(r.approval_dependency_risk)); restoreDb();
  });
  suite('T20'); await test('T20: getDependencyRisk ok', async () => {
    patchDb(createResDbMock()); const svc = loadP26();
    const r = await svc.aioiDependencyRiskService.getDependencyRisk(COMPANY_ID);
    assert(r.ok && r.dependency_risk.execution_dependency_risk); restoreDb();
  });
  suite('T21'); await test('T21: sem IA', () => {
    patchDb(createResDbMock()); const svc = loadP26();
    const a = svc.aioiDependencyRiskService.classifyDependencyRisk(50, 50, 'medium');
    const b = svc.aioiDependencyRiskService.classifyDependencyRisk(50, 50, 'medium');
    assertEqual(a, b, 'det'); restoreDb();
  });
  suite('T22'); await test('T22: learning_dependency_risk', () => {
    patchDb(createResDbMock()); const svc = loadP26();
    const r = svc.aioiDependencyRiskService.buildDependencyRiskFromSignals({
      bottlenecks: { approval_backlog: 1, execution_backlog: 1, outcome_backlog: 1, learning_backlog: 50 },
      bottleneckCost: { approval_cost_index: 5, execution_cost_index: 5, outcome_cost_index: 5, learning_cost_index: 70 },
      riskImpact: { approval_risk_impact: 'low', execution_risk_impact: 'low', outcome_risk_impact: 'low', learning_risk_impact: 'high' }
    });
    assert(r.learning_dependency_risk, 'learning'); restoreDb();
  });

  // T23-T30 Recovery Readiness
  suite('T23'); await test('T23: ready', () => assertEqual(getResMetrics().classifyReadinessStatus(85), 'ready', ''));
  suite('T24'); await test('T24: attention', () => assertEqual(getResMetrics().classifyReadinessStatus(60), 'attention', ''));
  suite('T25'); await test('T25: unprepared', () => assertEqual(getResMetrics().classifyReadinessStatus(30), 'unprepared', ''));
  suite('T26'); await test('T26: limite 80', () => assertEqual(getResMetrics().classifyReadinessStatus(80), 'ready', ''));
  suite('T27'); await test('T27: limite 50', () => assertEqual(getResMetrics().classifyReadinessStatus(50), 'attention', ''));
  suite('T28'); await test('T28: computeReadinessScore', () => {
    patchDb(createResDbMock()); const svc = loadP26();
    const s = svc.aioiRecoveryReadinessService.computeReadinessScore({
      consistencyScore: 80, learningRatio: 0.9, stabilityScore: 75, maturityScore: 70
    });
    assert(s >= 0 && s <= 100); restoreDb();
  });
  suite('T29'); await test('T29: computeReadinessScore alto', () => {
    patchDb(createResDbMock()); const svc = loadP26();
    const s = svc.aioiRecoveryReadinessService.computeReadinessScore({
      consistencyScore: 95, learningRatio: 1, stabilityScore: 90, maturityScore: 88
    });
    assert(s >= 80); restoreDb();
  });
  suite('T30'); await test('T30: getRecoveryReadiness ok', async () => {
    patchDb(createResDbMock()); const svc = loadP26();
    const r = await svc.aioiRecoveryReadinessService.getRecoveryReadiness(COMPANY_ID);
    assert(r.ok && r.recovery_readiness.readiness_status); restoreDb();
  });

  // T31-T40 Sustainability
  suite('T31'); await test('T31: sustainable', () => assertEqual(getResMetrics().classifySustainabilityStatus(75), 'sustainable', ''));
  suite('T32'); await test('T32: watch', () => assertEqual(getResMetrics().classifySustainabilityStatus(50), 'watch', ''));
  suite('T33'); await test('T33: unsustainable', () => assertEqual(getResMetrics().classifySustainabilityStatus(25), 'unsustainable', ''));
  suite('T34'); await test('T34: benchmark stability', () => {
    patchDb(createResDbMock()); const svc = loadP26();
    const s = svc.aioiSustainabilityAnalysisService._benchmarkStabilityScore({
      success_rate: { variation_pct: 5 }, cycle_time: { variation_pct: 8 }, backlog_total: { variation_pct: 3 }
    });
    assert(s >= 80); restoreDb();
  });
  suite('T35'); await test('T35: trend stability', () => {
    patchDb(createResDbMock()); const svc = loadP26();
    const s = svc.aioiSustainabilityAnalysisService._trendStabilityScore({
      success_rate_trend: 'stable', cycle_time_trend: 'improving',
      approval_backlog_trend: 'stable', execution_backlog_trend: 'stable'
    });
    assert(s >= 75); restoreDb();
  });
  suite('T36'); await test('T36: capacity stability', () => {
    patchDb(createResDbMock()); const svc = loadP26();
    assertEqual(svc.aioiSustainabilityAnalysisService._capacityStabilityScore({ trend: 'stable' }), 85, ''); restoreDb();
  });
  suite('T37'); await test('T37: SLA stability', () => {
    patchDb(createResDbMock()); const svc = loadP26();
    const s = svc.aioiSustainabilityAnalysisService._slaStabilityScore({
      open_to_triaged: { status: 'within_sla' }, end_to_end: { status: 'within_sla' }
    });
    assertEqual(s, 100, ''); restoreDb();
  });
  suite('T38'); await test('T38: computeSustainabilityScore', () => {
    patchDb(createResDbMock()); const svc = loadP26();
    const s = svc.aioiSustainabilityAnalysisService.computeSustainabilityScore({
      benchmark: { success_rate: { variation_pct: 5 } },
      trendAnalysis: { success_rate_trend: 'stable', cycle_time_trend: 'stable', approval_backlog_trend: 'stable', execution_backlog_trend: 'stable' },
      capacityForecast: { trend: 'stable' },
      slaAnalysis: { a: { status: 'within_sla' }, b: { status: 'within_sla' } }
    });
    assert(s >= 0 && s <= 100); restoreDb();
  });
  suite('T39'); await test('T39: sem forecast novo', () => {
    const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiSustainabilityAnalysisService.js'), 'utf8'));
    assert(!code.includes('linearRegressionForecast'), 'no new forecast'); 
  });
  suite('T40'); await test('T40: getOperationalSustainability ok', async () => {
    patchDb(createResDbMock()); const svc = loadP26();
    const r = await svc.aioiSustainabilityAnalysisService.getOperationalSustainability(COMPANY_ID);
    assert(r.ok && r.sustainability.sustainability_status); restoreDb();
  });

  // T41-T46 Read Model
  suite('T41'); await test('T41: getResilienceReadModel ok', async () => {
    patchDb(createResDbMock()); const svc = loadP26();
    const r = await svc.aioiResilienceReadModelService.getResilienceReadModel(COMPANY_ID);
    assert(r.ok && r.resilience_read_model.governance_read_model); restoreDb();
  });
  suite('T42'); await test('T42: value_read_model', async () => {
    patchDb(createResDbMock()); const svc = loadP26();
    const r = await svc.aioiResilienceReadModelService.getResilienceReadModel(COMPANY_ID);
    assert(r.resilience_read_model.value_read_model); restoreDb();
  });
  suite('T43'); await test('T43: operational_resilience', async () => {
    patchDb(createResDbMock()); const svc = loadP26();
    const r = await svc.aioiResilienceReadModelService.getResilienceReadModel(COMPANY_ID);
    assert(r.resilience_read_model.operational_resilience); restoreDb();
  });
  suite('T44'); await test('T44: dependency_risk', async () => {
    patchDb(createResDbMock()); const svc = loadP26();
    const r = await svc.aioiResilienceReadModelService.getResilienceReadModel(COMPANY_ID);
    assert(r.resilience_read_model.dependency_risk); restoreDb();
  });
  suite('T45'); await test('T45: recovery+sustainability', async () => {
    patchDb(createResDbMock()); const svc = loadP26();
    const r = await svc.aioiResilienceReadModelService.getResilienceReadModel(COMPANY_ID);
    assert(r.resilience_read_model.recovery_readiness && r.resilience_read_model.sustainability); restoreDb();
  });
  suite('T46'); await test('T46: 9 blocos', async () => {
    patchDb(createResDbMock()); const svc = loadP26();
    const r = await svc.aioiResilienceReadModelService.getResilienceReadModel(COMPANY_ID);
    assert(Object.keys(r.resilience_read_model).length >= 9); restoreDb();
  });

  // T47-T52 Read Only
  suite('T47'); await test('T47: INSERT bloqueado', () => {
    rm = getResMetrics(); let threw = false;
    try { rm.assertReadOnlySql('INSERT INTO x VALUES (1)'); } catch (e) { threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', ''); }
    assert(threw);
  });
  suite('T48'); await test('T48: UPDATE bloqueado', () => {
    rm = getResMetrics(); let threw = false;
    try { rm.assertReadOnlySql('UPDATE x SET y=1'); } catch (e) { threw = true; } assert(threw);
  });
  suite('T49'); await test('T49: DELETE bloqueado', () => {
    rm = getResMetrics(); let threw = false;
    try { rm.assertReadOnlySql('DELETE FROM x'); } catch (e) { threw = true; } assert(threw);
  });
  suite('T50'); await test('T50: TRUNCATE bloqueado', () => {
    rm = getResMetrics(); let threw = false;
    try { rm.assertReadOnlySql('TRUNCATE TABLE x'); } catch (e) { threw = true; } assert(threw);
  });
  suite('T51'); await test('T51: CREATE bloqueado', () => {
    rm = getResMetrics(); let threw = false;
    try { rm.assertReadOnlySql('CREATE TABLE x (id int)'); } catch (e) { threw = true; } assert(threw);
  });
  suite('T52'); await test('T52: zero writes', async () => {
    const mock = createResDbMock(); patchDb(mock); const svc = loadP26();
    await svc.aioiResilienceReadModelService.getResilienceReadModel(COMPANY_ID);
    assertNoWrites(mock._client._calls); restoreDb();
  });

  // T53-T54 RLS
  suite('T53'); await test('T53: RLS company_id', async () => {
    const mock = createResDbMock(); patchDb(mock); const svc = loadP26();
    await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID);
    const t = mock._client._calls.find(c => c.sql.includes('app.current_company_id'));
    assert(t && t.params[0] === COMPANY_ID); restoreDb();
  });
  suite('T54'); await test('T54: bypass_rls false', async () => {
    const mock = createResDbMock(); patchDb(mock); const svc = loadP26();
    await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID);
    const b = mock._client._calls.filter(c => c.sql.includes('app.bypass_rls'));
    assert(b.length >= 1); for (const c of b) assert(c.sql.includes("'false'")); restoreDb();
  });

  // T55 Multi-tenant
  suite('T55'); await test('T55: tenant B', async () => {
    const mock = createResDbMock(buildIoes().map(i => ({ ...i, company_id: COMPANY_ID_B })));
    patchDb(mock); const svc = loadP26();
    const r = await svc.aioiResilienceReadModelService.getResilienceReadModel(COMPANY_ID_B);
    assert(r.ok); await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID_B);
    const t = mock._client._calls.find(c => c.sql.includes('app.current_company_id'));
    assertEqual(t.params[0], COMPANY_ID_B, ''); restoreDb();
  });

  // T56 Soberanos
  suite('T56'); await test('T56: soberanos ausentes', () => {
    const files = ['aioiResilienceMetrics.js', 'aioiOperationalResilienceService.js', 'aioiDependencyRiskService.js',
      'aioiRecoveryReadinessService.js', 'aioiSustainabilityAnalysisService.js', 'aioiResilienceReadModelService.js'];
    const forbidden = ['operationalDecisionEngine', 'operationalLearningService', 'workflowOrchestrator',
      'actionRuntimeOrchestrator', 'computePriorityScore', 'classificationConsumer', 'aioiOutboxConsumerService'];
    for (const f of files) {
      const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8'));
      for (const term of forbidden) assert(!code.includes(term), `${f} ${term}`);
    }
  });

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  AIOI-P2.6 Resilience Read Model Test Report');
  console.log(`  Total: ${_passed + _failed} | PASS: ${_passed} | FAIL: ${_failed}`);
  console.log(`  STATUS: ${_failed === 0 ? 'AIOI_P2_6_TEST_PASS' : 'AIOI_P2_6_TEST_FAIL'}`);
  console.log('══════════════════════════════════════════════════════════\n');
  process.exit(_failed > 0 ? 1 : 0);
}

runTests().catch(e => { console.error('Fatal:', e); process.exit(1); });
