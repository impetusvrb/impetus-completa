'use strict';

/**
 * AIOI-P2.7 — Testes automatizados da Executive Scenario & Simulation Layer
 * T1–T61 | node src/tests/aioi/aioiScenarioReadModel.test.js
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

const P27_MODULES = [
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

function loadP27() {
  const loaded = {};
  for (const mod of P27_MODULES) {
    delete require.cache[require.resolve(`${SERVICES_PATH}/${mod}`)];
    loaded[mod] = require(`${SERVICES_PATH}/${mod}`);
  }
  return loaded;
}
function getScenMetrics() {
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiScenarioMetrics`)];
  return require(`${SERVICES_PATH}/aioiScenarioMetrics`);
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

function createScenDbMock(ioes = buildIoes(), snapshots = buildSnapshots()) {
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
  let sm = getScenMetrics();
  sm.resetSessionCounters();

  // T1–T15 Backlog Scenario
  suite('T1'); await test('T1: applyReduction 10%', () => assertEqual(getScenMetrics().applyReduction(100, 0.10), 90, ''));
  suite('T2'); await test('T2: applyReduction 25%', () => assertEqual(getScenMetrics().applyReduction(100, 0.25), 75, ''));
  suite('T3'); await test('T3: applyReduction 50%', () => assertEqual(getScenMetrics().applyReduction(100, 0.50), 50, ''));
  suite('T4'); await test('T4: applyReduction zero', () => assertEqual(getScenMetrics().applyReduction(0, 0.50), 0, ''));
  suite('T5'); await test('T5: sumBacklog', () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    assertEqual(svc.aioiBacklogReductionScenarioService.sumBacklog({
      approval_backlog: 10, execution_backlog: 5, outcome_backlog: 3, learning_backlog: 2
    }), 20, ''); restoreDb();
  });
  suite('T6'); await test('T6: buildBacklogReductionScenario estrutura', () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const r = svc.aioiBacklogReductionScenarioService.buildBacklogReductionScenario(100);
    assert(r.current_backlog === 100 && r.reduced_backlog_10 === 90); restoreDb();
  });
  suite('T7'); await test('T7: reduced_25 < current', () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const r = svc.aioiBacklogReductionScenarioService.buildBacklogReductionScenario(80);
    assert(r.reduced_backlog_25 < r.current_backlog); restoreDb();
  });
  suite('T8'); await test('T8: reduced_50 metade', () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const r = svc.aioiBacklogReductionScenarioService.buildBacklogReductionScenario(200);
    assertEqual(r.reduced_backlog_50, 100, ''); restoreDb();
  });
  suite('T9'); await test('T9: monotonicidade', () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const r = svc.aioiBacklogReductionScenarioService.buildBacklogReductionScenario(100);
    assert(r.reduced_backlog_50 <= r.reduced_backlog_25 && r.reduced_backlog_25 <= r.reduced_backlog_10); restoreDb();
  });
  suite('T10'); await test('T10: clampNonNegative', () => assertEqual(getScenMetrics().clampNonNegative(-5), 0, ''));
  suite('T11'); await test('T11: getBacklogReductionScenario ok', async () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const r = await svc.aioiBacklogReductionScenarioService.getBacklogReductionScenario(COMPANY_ID);
    assert(r.ok && r.backlog_reduction_scenario.current_backlog != null); restoreDb();
  });
  suite('T12'); await test('T12: companyId inválido backlog', async () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const r = await svc.aioiBacklogReductionScenarioService.getBacklogReductionScenario('invalid');
    assert(!r.ok); restoreDb();
  });
  suite('T13'); await test('T13: sem alteração de dados', () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const a = svc.aioiBacklogReductionScenarioService.buildBacklogReductionScenario(50);
    const b = svc.aioiBacklogReductionScenarioService.buildBacklogReductionScenario(50);
    assertEqual(JSON.stringify(a), JSON.stringify(b), ''); restoreDb();
  });
  suite('T14'); await test('T14: REDUCTION_FACTORS', () => {
    const m = getScenMetrics();
    assertEqual(m.REDUCTION_FACTORS.pct10, 0.10, '');
    assertEqual(m.REDUCTION_FACTORS.pct50, 0.50, '');
  });
  suite('T15'); await test('T15: backlog inteiro', () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const r = svc.aioiBacklogReductionScenarioService.buildBacklogReductionScenario(33);
    assert(Number.isInteger(r.reduced_backlog_10)); restoreDb();
  });

  // T16–T30 SLA Scenario
  suite('T16'); await test('T16: aggregateSlaStatus within', () => {
    const r = getScenMetrics().aggregateSlaStatus({
      a: { status: 'within_sla' }, b: { status: 'within_sla' }
    });
    assertEqual(r.status, 'within_sla', '');
  });
  suite('T17'); await test('T17: aggregateSlaStatus breached', () => {
    const r = getScenMetrics().aggregateSlaStatus({
      a: { status: 'within_sla' }, b: { status: 'breached' }
    });
    assertEqual(r.status, 'breached', '');
  });
  suite('T18'); await test('T18: aggregateSlaStatus at_risk', () => {
    const r = getScenMetrics().aggregateSlaStatus({
      a: { status: 'at_risk' }, b: { status: 'within_sla' }
    });
    assertEqual(r.status, 'at_risk', '');
  });
  suite('T19'); await test('T19: simulateSlaRecovery reduz breaches', () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const sla = { end_to_end: { avg_time_ms: 90000000, threshold_ms: 86400000, status: 'breached' } };
    const r = svc.aioiSlaRecoveryScenarioService.simulateSlaRecovery(sla, 0.50);
    assert(r.breach_count <= 1); restoreDb();
  });
  suite('T20'); await test('T20: buildSlaRecoveryScenario estrutura', () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const sla = { end_to_end: { avg_time_ms: 40000000, threshold_ms: 86400000, status: 'within_sla' } };
    const r = svc.aioiSlaRecoveryScenarioService.buildSlaRecoveryScenario(sla);
    assert(r.current_sla_status && r.recovery_10pct && r.recovery_50pct); restoreDb();
  });
  suite('T21'); await test('T21: recovery melhora status', () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const sla = { end_to_end: { avg_time_ms: 90000000, threshold_ms: 86400000, status: 'breached' } };
    const r = svc.aioiSlaRecoveryScenarioService.buildSlaRecoveryScenario(sla);
    assert(r.recovery_50pct.breach_count <= r.current_sla_status.breach_count); restoreDb();
  });
  suite('T22'); await test('T22: getSlaRecoveryScenario ok', async () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const r = await svc.aioiSlaRecoveryScenarioService.getSlaRecoveryScenario(COMPANY_ID);
    assert(r.ok && r.sla_recovery_scenario.current_sla_status); restoreDb();
  });
  suite('T23'); await test('T23: companyId inválido SLA', async () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const r = await svc.aioiSlaRecoveryScenarioService.getSlaRecoveryScenario('bad');
    assert(!r.ok); restoreDb();
  });
  suite('T24'); await test('T24: sem forecast novo SLA', () => {
    const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiSlaRecoveryScenarioService.js'), 'utf8'));
    assert(!code.includes('linearRegressionForecast'), 'no forecast');
  });
  suite('T25'); await test('T25: recovery_10pct stages', () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const sla = { a: { avg_time_ms: 5000000, threshold_ms: 7200000, status: 'within_sla' } };
    const r = svc.aioiSlaRecoveryScenarioService.buildSlaRecoveryScenario(sla);
    assert(r.recovery_10pct.total_stages === 1); restoreDb();
  });
  suite('T26'); await test('T26: determinístico SLA', () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const sla = { x: { avg_time_ms: 8000000, threshold_ms: 7200000, status: 'breached' } };
    const a = svc.aioiSlaRecoveryScenarioService.simulateSlaRecovery(sla, 0.25);
    const b = svc.aioiSlaRecoveryScenarioService.simulateSlaRecovery(sla, 0.25);
    assertEqual(JSON.stringify(a), JSON.stringify(b), ''); restoreDb();
  });
  suite('T27'); await test('T27: null slaAnalysis', () => {
    const r = getScenMetrics().aggregateSlaStatus(null);
    assertEqual(r.status, 'within_sla', '');
  });
  suite('T28'); await test('T28: recovery_25pct', () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const sla = { end_to_end: { avg_time_ms: 70000000, threshold_ms: 86400000, status: 'within_sla' } };
    const r = svc.aioiSlaRecoveryScenarioService.buildSlaRecoveryScenario(sla);
    assert(r.recovery_25pct.stages_within_sla >= 0); restoreDb();
  });
  suite('T29'); await test('T29: breach_count campo', () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const sla = { a: { status: 'breached' }, b: { status: 'breached' } };
    const r = getScenMetrics().aggregateSlaStatus(sla);
    assertEqual(r.breach_count, 2, ''); restoreDb();
  });
  suite('T30'); await test('T30: multi-stage recovery', () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const sla = {
      open_to_triaged: { avg_time_ms: 4000000, threshold_ms: 3600000, status: 'breached' },
      end_to_end: { avg_time_ms: 90000000, threshold_ms: 86400000, status: 'breached' }
    };
    const r = svc.aioiSlaRecoveryScenarioService.buildSlaRecoveryScenario(sla);
    assert(r.recovery_50pct.breach_count < r.current_sla_status.breach_count); restoreDb();
  });

  // T31–T40 Capacity Scenario
  suite('T31'); await test('T31: applyExpansion 10%', () => assertEqual(getScenMetrics().applyExpansion(100, 1.10), 110, ''));
  suite('T32'); await test('T32: applyExpansion 25%', () => assertEqual(getScenMetrics().applyExpansion(100, 1.25), 125, ''));
  suite('T33'); await test('T33: applyExpansion 50%', () => assertEqual(getScenMetrics().applyExpansion(100, 1.50), 150, ''));
  suite('T34'); await test('T34: buildCapacityExpansionScenario', () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const r = svc.aioiCapacityExpansionScenarioService.buildCapacityExpansionScenario(10);
    assertEqual(r.current_capacity, 10, '');
    assertEqual(r.expanded_10pct, 11, ''); restoreDb();
  });
  suite('T35'); await test('T35: expanded_50pct', () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const r = svc.aioiCapacityExpansionScenarioService.buildCapacityExpansionScenario(20);
    assertEqual(r.expanded_50pct, 30, ''); restoreDb();
  });
  suite('T36'); await test('T36: monotonicidade capacity', () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const r = svc.aioiCapacityExpansionScenarioService.buildCapacityExpansionScenario(8);
    assert(r.expanded_10pct <= r.expanded_25pct && r.expanded_25pct <= r.expanded_50pct); restoreDb();
  });
  suite('T37'); await test('T37: getCapacityExpansionScenario ok', async () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const r = await svc.aioiCapacityExpansionScenarioService.getCapacityExpansionScenario(COMPANY_ID);
    assert(r.ok && r.capacity_expansion_scenario.current_capacity != null); restoreDb();
  });
  suite('T38'); await test('T38: companyId inválido capacity', async () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const r = await svc.aioiCapacityExpansionScenarioService.getCapacityExpansionScenario('x');
    assert(!r.ok); restoreDb();
  });
  suite('T39'); await test('T39: EXPANSION_FACTORS', () => {
    const m = getScenMetrics();
    assertEqual(m.EXPANSION_FACTORS.pct50, 1.50, '');
  });
  suite('T40'); await test('T40: capacity zero', () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const r = svc.aioiCapacityExpansionScenarioService.buildCapacityExpansionScenario(0);
    assertEqual(r.expanded_50pct, 0, ''); restoreDb();
  });

  // T41–T50 Resilience Scenario
  suite('T41'); await test('T41: applyImprovement 10%', () => assertEqual(getScenMetrics().applyImprovement(50, 0.10), 55, ''));
  suite('T42'); await test('T42: applyImprovement cap 100', () => assertEqual(getScenMetrics().applyImprovement(95, 0.50), 100, ''));
  suite('T43'); await test('T43: buildResilienceImprovementScenario', () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const r = svc.aioiResilienceScenarioService.buildResilienceImprovementScenario({
      resilience_score: 60, resilience_status: 'resilient'
    });
    assert(r.current_resilience.resilience_score === 60 && r.improved_10pct.resilience_score > 60); restoreDb();
  });
  suite('T44'); await test('T44: improved_50pct > improved_10pct', () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const r = svc.aioiResilienceScenarioService.buildResilienceImprovementScenario({
      resilience_score: 40, resilience_status: 'resilient'
    });
    assert(r.improved_50pct.resilience_score >= r.improved_10pct.resilience_score); restoreDb();
  });
  suite('T45'); await test('T45: resilience_status recalculado', () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const r = svc.aioiResilienceScenarioService.buildResilienceImprovementScenario({
      resilience_score: 65, resilience_status: 'resilient'
    });
    assert(['fragile', 'resilient', 'highly_resilient'].includes(r.improved_25pct.resilience_status)); restoreDb();
  });
  suite('T46'); await test('T46: getResilienceImprovementScenario ok', async () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const r = await svc.aioiResilienceScenarioService.getResilienceImprovementScenario(COMPANY_ID);
    assert(r.ok && r.resilience_improvement_scenario.current_resilience); restoreDb();
  });
  suite('T47'); await test('T47: companyId inválido resilience', async () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const r = await svc.aioiResilienceScenarioService.getResilienceImprovementScenario('nope');
    assert(!r.ok); restoreDb();
  });
  suite('T48'); await test('T48: score real inalterado', () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const orig = { resilience_score: 55, resilience_status: 'resilient' };
    svc.aioiResilienceScenarioService.buildResilienceImprovementScenario(orig);
    assertEqual(orig.resilience_score, 55, ''); restoreDb();
  });
  suite('T49'); await test('T49: IMPROVEMENT_FACTORS', () => {
    assertEqual(getScenMetrics().IMPROVEMENT_FACTORS.pct25, 0.25, '');
  });
  suite('T50'); await test('T50: teórico apenas', () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const r = svc.aioiResilienceScenarioService.buildResilienceImprovementScenario({ resilience_score: 30 });
    assert(r.improved_50pct.resilience_score > 30 && r.current_resilience.resilience_score === 30); restoreDb();
  });

  // T51–T55 Read Model
  suite('T51'); await test('T51: getScenarioReadModel ok', async () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const r = await svc.aioiScenarioReadModelService.getScenarioReadModel(COMPANY_ID);
    assert(r.ok && r.scenario_read_model.governance_read_model); restoreDb();
  });
  suite('T52'); await test('T52: resilience_read_model nested', async () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const r = await svc.aioiScenarioReadModelService.getScenarioReadModel(COMPANY_ID);
    assert(r.scenario_read_model.resilience_read_model.operational_resilience); restoreDb();
  });
  suite('T53'); await test('T53: 4 cenários', async () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const r = await svc.aioiScenarioReadModelService.getScenarioReadModel(COMPANY_ID);
    assert(r.scenario_read_model.backlog_reduction_scenario &&
      r.scenario_read_model.sla_recovery_scenario &&
      r.scenario_read_model.capacity_expansion_scenario &&
      r.scenario_read_model.resilience_improvement_scenario); restoreDb();
  });
  suite('T54'); await test('T54: 10 blocos', async () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const r = await svc.aioiScenarioReadModelService.getScenarioReadModel(COMPANY_ID);
    assert(Object.keys(r.scenario_read_model).length >= 10); restoreDb();
  });
  suite('T55'); await test('T55: companyId inválido read model', async () => {
    patchDb(createScenDbMock()); const svc = loadP27();
    const r = await svc.aioiScenarioReadModelService.getScenarioReadModel('invalid');
    assert(!r.ok); restoreDb();
  });

  // T56–T58 READ ONLY
  suite('T56'); await test('T56: INSERT bloqueado', () => {
    sm = getScenMetrics(); let threw = false;
    try { sm.assertReadOnlySql('INSERT INTO x VALUES (1)'); } catch (e) {
      threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', '');
    }
    assert(threw);
  });
  suite('T57'); await test('T57: UPDATE bloqueado', () => {
    sm = getScenMetrics(); let threw = false;
    try { sm.assertReadOnlySql('UPDATE x SET y=1'); } catch (e) { threw = true; } assert(threw);
  });
  suite('T58'); await test('T58: zero writes read model', async () => {
    const mock = createScenDbMock(); patchDb(mock); const svc = loadP27();
    await svc.aioiScenarioReadModelService.getScenarioReadModel(COMPANY_ID);
    assertNoWrites(mock._client._calls); restoreDb();
  });

  // T59 RLS
  suite('T59'); await test('T59: RLS company_id + bypass false', async () => {
    const mock = createScenDbMock(); patchDb(mock); const svc = loadP27();
    await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID);
    const t = mock._client._calls.find(c => c.sql.includes('app.current_company_id'));
    const b = mock._client._calls.filter(c => c.sql.includes('app.bypass_rls'));
    assert(t && t.params[0] === COMPANY_ID);
    assert(b.length >= 1); for (const c of b) assert(c.sql.includes("'false'")); restoreDb();
  });

  // T60 Multi-tenant
  suite('T60'); await test('T60: tenant B', async () => {
    const mock = createScenDbMock(buildIoes().map(i => ({ ...i, company_id: COMPANY_ID_B })));
    patchDb(mock); const svc = loadP27();
    const r = await svc.aioiScenarioReadModelService.getScenarioReadModel(COMPANY_ID_B);
    assert(r.ok);
    await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID_B);
    const t = mock._client._calls.filter(c => c.sql.includes('app.current_company_id'))
      .find(c => c.params && c.params[0] === COMPANY_ID_B);
    assert(t, 'RLS tenant B'); restoreDb();
  });

  // T61 Soberanos
  suite('T61'); await test('T61: soberanos ausentes', () => {
    const files = ['aioiScenarioMetrics.js', 'aioiBacklogReductionScenarioService.js',
      'aioiSlaRecoveryScenarioService.js', 'aioiCapacityExpansionScenarioService.js',
      'aioiResilienceScenarioService.js', 'aioiScenarioReadModelService.js'];
    const forbidden = ['operationalDecisionEngine', 'operationalLearningService', 'workflowOrchestrator',
      'actionRuntimeOrchestrator', 'computePriorityScore', 'classificationConsumer', 'aioiOutboxConsumerService'];
    for (const f of files) {
      const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8'));
      for (const term of forbidden) assert(!code.includes(term), `${f} ${term}`);
    }
  });

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  AIOI-P2.7 Scenario Read Model Test Report');
  console.log(`  Total: ${_passed + _failed} | PASS: ${_passed} | FAIL: ${_failed}`);
  console.log(`  STATUS: ${_failed === 0 ? 'AIOI_P2_7_TEST_PASS' : 'AIOI_P2_7_TEST_FAIL'}`);
  console.log('══════════════════════════════════════════════════════════\n');
  process.exit(_failed > 0 ? 1 : 0);
}

runTests().catch(e => { console.error('Fatal:', e); process.exit(1); });
