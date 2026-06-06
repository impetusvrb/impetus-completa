'use strict';

/**
 * AIOI-P2.5 — Testes automatizados da Value Realization Intelligence Layer
 *
 * T1–T50 conforme especificação P2.5.
 * Executar: node src/tests/aioi/aioiValueReadModel.test.js
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

const P25_MODULES = [
  'aioiValueMetrics', 'aioiOperationalValueService', 'aioiRiskImpactService',
  'aioiBottleneckCostService', 'aioiPortfolioAnalysisService', 'aioiValueReadModelService',
  'aioiStrategicMetrics', 'aioiStrategicReadModelService', 'aioiPriorityAnalysisService',
  'aioiImprovementOpportunityService', 'aioiExecutiveFocusService', 'aioiStrategicAlignmentService',
  'aioiExecutiveMaturityReadModelService', 'aioiMaturityMetrics', 'aioiMaturityAnalysisService',
  'aioiBenchmarkAnalysisService', 'aioiOperationalStabilityService', 'aioiGovernanceConsistencyService',
  'aioiPredictiveMetrics', 'aioiPredictiveGovernanceReadModelService',
  'aioiBacklogForecastService', 'aioiSlaForecastService', 'aioiCapacityForecastService',
  'aioiRiskForecastService', 'aioiGovernanceMetrics', 'aioiGovernanceReadModelService',
  'aioiSlaIntelligenceService', 'aioiRiskAnalysisService', 'aioiTenantHealthService',
  'aioiTrendAnalysisService', 'aioiExecutiveMetrics', 'aioiExecutiveSnapshotService',
  'aioiBottleneckAnalysisService', 'aioiCycleAnalyticsService'
];

function loadP25() {
  const loaded = {};
  for (const mod of P25_MODULES) {
    delete require.cache[require.resolve(`${SERVICES_PATH}/${mod}`)];
    loaded[mod] = require(`${SERVICES_PATH}/${mod}`);
  }
  return loaded;
}

function getValueMetrics() {
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiValueMetrics`)];
  return require(`${SERVICES_PATH}/aioiValueMetrics`);
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

function createValueDbMock(ioes = buildIoes(), snapshots = buildSnapshots()) {
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
  let vm = getValueMetrics();
  vm.resetSessionCounters();

  // T1-T10 Operational Value
  suite('T1 — classifyValueStatus high_value');
  await test('T1: score 80 → high_value', () => {
    assertEqual(getValueMetrics().classifyValueStatus(80), 'high_value', 'high');
  });

  suite('T2 — classifyValueStatus medium_value');
  await test('T2: score 50 → medium_value', () => {
    assertEqual(getValueMetrics().classifyValueStatus(50), 'medium_value', 'medium');
  });

  suite('T3 — classifyValueStatus low_value');
  await test('T3: score 20 → low_value', () => {
    assertEqual(getValueMetrics().classifyValueStatus(20), 'low_value', 'low');
  });

  suite('T4 — classifyValueStatus limite 70');
  await test('T4: score 70 → high_value', () => {
    assertEqual(getValueMetrics().classifyValueStatus(70), 'high_value', '70');
  });

  suite('T5 — classifyValueStatus limite 40');
  await test('T5: score 40 → medium_value', () => {
    assertEqual(getValueMetrics().classifyValueStatus(40), 'medium_value', '40');
  });

  suite('T6 — computeOperationalValueScore range');
  await test('T6: score 0-100', () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const score = svc.aioiOperationalValueService.computeOperationalValueScore({
      successRate: 0.9, maturityScore: 80, stabilityScore: 75,
      consistencyScore: 70, alignmentScore: 85
    });
    assert(score >= 0 && score <= 100, 'range');
    restoreDb();
  });

  suite('T7 — computeOperationalValueScore alto');
  await test('T7: sinais fortes → score alto', () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const score = svc.aioiOperationalValueService.computeOperationalValueScore({
      successRate: 0.95, maturityScore: 90, stabilityScore: 88,
      consistencyScore: 85, alignmentScore: 92
    });
    assert(score >= 70, 'high');
    restoreDb();
  });

  suite('T8 — computeOperationalValueScore baixo');
  await test('T8: sinais fracos → score baixo', () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const score = svc.aioiOperationalValueService.computeOperationalValueScore({
      successRate: 0.3, maturityScore: 25, stabilityScore: 30,
      consistencyScore: 35, alignmentScore: 28
    });
    assert(score < 40, 'low');
    restoreDb();
  });

  suite('T9 — getOperationalValue ok');
  await test('T9: getOperationalValue ok', async () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const r = await svc.aioiOperationalValueService.getOperationalValue(COMPANY_ID);
    assert(r.ok, 'ok');
    assert(r.operational_value.operational_value_score != null, 'score');
    assert(r.operational_value.value_status, 'status');
    restoreDb();
  });

  suite('T10 — VALUE_WEIGHTS documentados');
  await test('T10: pesos somam 1.0', () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const w = svc.aioiOperationalValueService.VALUE_WEIGHTS;
    const sum = Object.values(w).reduce((a, b) => a + b, 0);
    assert(Math.abs(sum - 1) < 0.001, 'weights sum');
    restoreDb();
  });

  // T11-T18 Risk Impact
  suite('T11 — classifyRiskImpact low');
  await test('T11: low+low → low', () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    assertEqual(svc.aioiRiskImpactService.classifyRiskImpact('low', 'low'), 'low', 'low');
    restoreDb();
  });

  suite('T12 — classifyRiskImpact medium');
  await test('T12: medium+low → medium', () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    assertEqual(svc.aioiRiskImpactService.classifyRiskImpact('medium', 'low'), 'medium', 'medium');
    restoreDb();
  });

  suite('T13 — classifyRiskImpact high');
  await test('T13: high+medium → high', () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    assertEqual(svc.aioiRiskImpactService.classifyRiskImpact('high', 'medium'), 'high', 'high');
    restoreDb();
  });

  suite('T14 — classifyRiskImpact critical');
  await test('T14: high+high → critical', () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    assertEqual(svc.aioiRiskImpactService.classifyRiskImpact('high', 'high'), 'critical', 'critical');
    restoreDb();
  });

  suite('T15 — buildRiskImpactFromSignals');
  await test('T15: 4 dimensões de impacto', () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const r = svc.aioiRiskImpactService.buildRiskImpactFromSignals(
      { approval_risk: 'low', execution_risk: 'medium', outcome_risk: 'low', learning_risk: 'low' },
      { approval_risk_forecast: 'low', execution_risk_forecast: 'high', outcome_risk_forecast: 'low', learning_risk_forecast: 'low' }
    );
    assert(r.approval_risk_impact, 'approval');
    assert(r.execution_risk_impact, 'execution');
    restoreDb();
  });

  suite('T16 — risk impact valores permitidos');
  await test('T16: valores low/medium/high/critical', () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const allowed = ['low', 'medium', 'high', 'critical'];
    const r = svc.aioiRiskImpactService.buildRiskImpactFromSignals(
      { approval_risk: 'high', execution_risk: 'high', outcome_risk: 'high', learning_risk: 'high' },
      { approval_risk_forecast: 'high', execution_risk_forecast: 'high', outcome_risk_forecast: 'high', learning_risk_forecast: 'high' }
    );
    for (const v of Object.values(r)) assert(allowed.includes(v), 'allowed');
    restoreDb();
  });

  suite('T17 — getRiskImpact ok');
  await test('T17: getRiskImpact ok', async () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const r = await svc.aioiRiskImpactService.getRiskImpact(COMPANY_ID);
    assert(r.ok, 'ok');
    assert(r.risk_impact.approval_risk_impact, 'approval');
    restoreDb();
  });

  suite('T18 — risk impact sem IA');
  await test('T18: buildRiskImpact determinístico', () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const r1 = svc.aioiRiskImpactService.classifyRiskImpact('medium', 'high');
    const r2 = svc.aioiRiskImpactService.classifyRiskImpact('medium', 'high');
    assertEqual(r1, r2, 'deterministic');
    restoreDb();
  });

  // T19-T26 Bottleneck Cost
  suite('T19 — computeDimensionCostIndex range');
  await test('T19: índice 0-100', () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const idx = svc.aioiBottleneckCostService.computeDimensionCostIndex(10, 3600000, false);
    assert(idx >= 0 && idx <= 100, 'range');
    restoreDb();
  });

  suite('T20 — computeDimensionCostIndex backlog');
  await test('T20: backlog elevado → índice maior', () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const low = svc.aioiBottleneckCostService.computeDimensionCostIndex(2, 1000000, false);
    const high = svc.aioiBottleneckCostService.computeDimensionCostIndex(30, 1000000, false);
    assert(high > low, 'backlog');
    restoreDb();
  });

  suite('T21 — computeDimensionCostIndex SLA breach');
  await test('T21: SLA breach aumenta índice', () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const no = svc.aioiBottleneckCostService.computeDimensionCostIndex(5, 1000000, false);
    const yes = svc.aioiBottleneckCostService.computeDimensionCostIndex(5, 1000000, true);
    assert(yes > no, 'sla');
    restoreDb();
  });

  suite('T22 — buildBottleneckCostFromSignals');
  await test('T22: 5 índices retornados', () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const r = svc.aioiBottleneckCostService.buildBottleneckCostFromSignals({
      bottlenecks: { approval_backlog: 5, execution_backlog: 3, outcome_backlog: 1, learning_backlog: 0 },
      kpis: { triaged_to_approval_ms: 5000000, approval_to_execution_ms: 2000000,
        execution_to_outcome_ms: 10000000, outcome_to_learning_ms: 3000000 },
      slaAnalysis: { triaged_to_approval: { status: 'within_sla' } }
    });
    assert(r.approval_cost_index != null, 'approval');
    assert(r.total_cost_index != null, 'total');
    restoreDb();
  });

  suite('T23 — sem valores monetários');
  await test('T23: retorno usa índices relativos', () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const r = svc.aioiBottleneckCostService.buildBottleneckCostFromSignals({
      bottlenecks: { approval_backlog: 1, execution_backlog: 1, outcome_backlog: 0, learning_backlog: 0 },
      kpis: {}, slaAnalysis: {}
    });
    assert(!r.currency, 'no currency');
    assert(!r.monetary_value, 'no money');
    restoreDb();
  });

  suite('T24 — getBottleneckCost ok');
  await test('T24: getBottleneckCost ok', async () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const r = await svc.aioiBottleneckCostService.getBottleneckCost(COMPANY_ID);
    assert(r.ok, 'ok');
    assert(r.bottleneck_cost.total_cost_index != null, 'total');
    restoreDb();
  });

  suite('T25 — total_cost_index média');
  await test('T25: total é média dos 4 índices', () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const r = svc.aioiBottleneckCostService.buildBottleneckCostFromSignals({
      bottlenecks: { approval_backlog: 0, execution_backlog: 0, outcome_backlog: 0, learning_backlog: 0 },
      kpis: {}, slaAnalysis: {}
    });
    const avg = (r.approval_cost_index + r.execution_cost_index + r.outcome_cost_index + r.learning_cost_index) / 4;
    assertEqual(r.total_cost_index, Math.round(avg), 'avg');
    restoreDb();
  });

  suite('T26 — cycle time aumenta índice');
  await test('T26: cycle time elevado → índice maior', () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const low = svc.aioiBottleneckCostService.computeDimensionCostIndex(0, 1000000, false);
    const high = svc.aioiBottleneckCostService.computeDimensionCostIndex(0, 50000000, false);
    assert(high >= low, 'cycle');
    restoreDb();
  });

  // T27-T34 Portfolio
  suite('T27 — computePortfolioBalanceScore');
  await test('T27: balance 0-100', () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const score = svc.aioiPortfolioAnalysisService.computePortfolioBalanceScore({
      approval_cost_index: 20, execution_cost_index: 25, outcome_cost_index: 22, learning_cost_index: 18
    });
    assert(score >= 0 && score <= 100, 'range');
    restoreDb();
  });

  suite('T28 — balance uniforme alto');
  await test('T28: índices uniformes → balance alto', () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const score = svc.aioiPortfolioAnalysisService.computePortfolioBalanceScore({
      approval_cost_index: 30, execution_cost_index: 30, outcome_cost_index: 30, learning_cost_index: 30
    });
    assertEqual(score, 100, 'uniform');
    restoreDb();
  });

  suite('T29 — buildPortfolioAnalysis estrutura');
  await test('T29: 4 campos obrigatórios', () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const r = svc.aioiPortfolioAnalysisService.buildPortfolioAnalysis({
      operationalValue: { operational_value_score: 75 },
      riskImpact: { approval_risk_impact: 'low', execution_risk_impact: 'medium',
        outcome_risk_impact: 'low', learning_risk_impact: 'low' },
      bottleneckCost: { approval_cost_index: 20, execution_cost_index: 40,
        outcome_cost_index: 15, learning_cost_index: 10, total_cost_index: 21 }
    });
    assert(r.highest_value_area, 'value');
    assert(r.highest_cost_area, 'cost');
    assert(r.highest_risk_area, 'risk');
    assert(r.portfolio_balance_score != null, 'balance');
    restoreDb();
  });

  suite('T30 — highest_cost_area');
  await test('T30: highest_cost_area = execution', () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const r = svc.aioiPortfolioAnalysisService.buildPortfolioAnalysis({
      operationalValue: { operational_value_score: 50 },
      riskImpact: { approval_risk_impact: 'low', execution_risk_impact: 'low',
        outcome_risk_impact: 'low', learning_risk_impact: 'low' },
      bottleneckCost: { approval_cost_index: 10, execution_cost_index: 80,
        outcome_cost_index: 20, learning_cost_index: 15, total_cost_index: 31 }
    });
    assertEqual(r.highest_cost_area, 'execution', 'execution');
    restoreDb();
  });

  suite('T31 — highest_risk_area');
  await test('T31: highest_risk_area = learning', () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const r = svc.aioiPortfolioAnalysisService.buildPortfolioAnalysis({
      operationalValue: { operational_value_score: 50 },
      riskImpact: { approval_risk_impact: 'low', execution_risk_impact: 'medium',
        outcome_risk_impact: 'low', learning_risk_impact: 'critical' },
      bottleneckCost: { approval_cost_index: 20, execution_cost_index: 20,
        outcome_cost_index: 20, learning_cost_index: 20, total_cost_index: 20 }
    });
    assertEqual(r.highest_risk_area, 'learning', 'learning');
    restoreDb();
  });

  suite('T32 — getPortfolioAnalysis ok');
  await test('T32: getPortfolioAnalysis ok', async () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const r = await svc.aioiPortfolioAnalysisService.getPortfolioAnalysis(COMPANY_ID);
    assert(r.ok, 'ok');
    assert(r.portfolio_analysis.portfolio_balance_score != null, 'balance');
    restoreDb();
  });

  suite('T33 — highest_value_area');
  await test('T33: highest_value_area definido', () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const r = svc.aioiPortfolioAnalysisService.buildPortfolioAnalysis({
      operationalValue: { operational_value_score: 80 },
      riskImpact: { approval_risk_impact: 'low', execution_risk_impact: 'low',
        outcome_risk_impact: 'low', learning_risk_impact: 'low' },
      bottleneckCost: { approval_cost_index: 5, execution_cost_index: 60,
        outcome_cost_index: 30, learning_cost_index: 40, total_cost_index: 34 }
    });
    assert(['approval', 'execution', 'outcome', 'learning'].includes(r.highest_value_area), 'area');
    restoreDb();
  });

  suite('T34 — portfolio_balance_score spread');
  await test('T34: spread alto → balance baixo', () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const uniform = svc.aioiPortfolioAnalysisService.computePortfolioBalanceScore({
      approval_cost_index: 30, execution_cost_index: 30, outcome_cost_index: 30, learning_cost_index: 30
    });
    const spread = svc.aioiPortfolioAnalysisService.computePortfolioBalanceScore({
      approval_cost_index: 10, execution_cost_index: 90, outcome_cost_index: 20, learning_cost_index: 15
    });
    assert(uniform > spread, 'spread');
    restoreDb();
  });

  // T35-T40 Value Read Model
  suite('T35 — getValueReadModel ok');
  await test('T35: read model agregado ok', async () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const r = await svc.aioiValueReadModelService.getValueReadModel(COMPANY_ID);
    assert(r.ok, 'ok');
    assert(r.value_read_model.governance_read_model, 'gov');
    restoreDb();
  });

  suite('T36 — read model predictive');
  await test('T36: inclui predictive_read_model', async () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const r = await svc.aioiValueReadModelService.getValueReadModel(COMPANY_ID);
    assert(r.value_read_model.predictive_read_model, 'predictive');
    restoreDb();
  });

  suite('T37 — read model maturity+strategic');
  await test('T37: inclui maturity e strategic', async () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const r = await svc.aioiValueReadModelService.getValueReadModel(COMPANY_ID);
    assert(r.value_read_model.maturity_read_model, 'maturity');
    assert(r.value_read_model.strategic_read_model, 'strategic');
    restoreDb();
  });

  suite('T38 — read model operational_value');
  await test('T38: inclui operational_value', async () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const r = await svc.aioiValueReadModelService.getValueReadModel(COMPANY_ID);
    assert(r.value_read_model.operational_value, 'value');
    restoreDb();
  });

  suite('T39 — read model risk+cost+portfolio');
  await test('T39: inclui risk, cost, portfolio', async () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const r = await svc.aioiValueReadModelService.getValueReadModel(COMPANY_ID);
    assert(r.value_read_model.risk_impact, 'risk');
    assert(r.value_read_model.bottleneck_cost, 'cost');
    assert(r.value_read_model.portfolio_analysis, 'portfolio');
    restoreDb();
  });

  suite('T40 — read model 8 blocos');
  await test('T40: estrutura completa', async () => {
    patchDb(createValueDbMock());
    const svc = loadP25();
    const r = await svc.aioiValueReadModelService.getValueReadModel(COMPANY_ID);
    const keys = Object.keys(r.value_read_model);
    assert(keys.length >= 8, 'blocks');
    restoreDb();
  });

  // T41-T46 Read Only
  suite('T41 — INSERT bloqueado');
  await test('T41: INSERT → READ_ONLY_LAYER_VIOLATION', () => {
    vm = getValueMetrics();
    let threw = false;
    try { vm.assertReadOnlySql('INSERT INTO x VALUES (1)'); } catch (e) {
      threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', 'code');
    }
    assert(threw, 'throw');
  });

  suite('T42 — UPDATE bloqueado');
  await test('T42: UPDATE bloqueado', () => {
    vm = getValueMetrics();
    let threw = false;
    try { vm.assertReadOnlySql('UPDATE x SET y=1'); } catch (e) { threw = true; }
    assert(threw, 'throw');
  });

  suite('T43 — DELETE bloqueado');
  await test('T43: DELETE bloqueado', () => {
    vm = getValueMetrics();
    let threw = false;
    try { vm.assertReadOnlySql('DELETE FROM x'); } catch (e) { threw = true; }
    assert(threw, 'throw');
  });

  suite('T44 — TRUNCATE bloqueado');
  await test('T44: TRUNCATE bloqueado', () => {
    vm = getValueMetrics();
    let threw = false;
    try { vm.assertReadOnlySql('TRUNCATE TABLE x'); } catch (e) { threw = true; }
    assert(threw, 'throw');
  });

  suite('T45 — CREATE bloqueado');
  await test('T45: CREATE bloqueado', () => {
    vm = getValueMetrics();
    let threw = false;
    try { vm.assertReadOnlySql('CREATE TABLE x (id int)'); } catch (e) { threw = true; }
    assert(threw, 'throw');
  });

  suite('T46 — zero writes em consultas');
  await test('T46: queries são SELECT', async () => {
    const mock = createValueDbMock();
    patchDb(mock);
    const svc = loadP25();
    await svc.aioiValueReadModelService.getValueReadModel(COMPANY_ID);
    assertNoWrites(mock._client._calls);
    restoreDb();
  });

  // T47-T48 RLS
  suite('T47 — RLS current_company_id');
  await test('T47: set_config company_id', async () => {
    const mock = createValueDbMock();
    patchDb(mock);
    const svc = loadP25();
    await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID);
    const tenant = mock._client._calls.find(c => c.sql.includes('app.current_company_id'));
    assert(tenant, 'tenant');
    assertEqual(tenant.params[0], COMPANY_ID, 'company');
    restoreDb();
  });

  suite('T48 — RLS bypass_rls false');
  await test('T48: bypass_rls=false', async () => {
    const mock = createValueDbMock();
    patchDb(mock);
    const svc = loadP25();
    await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID);
    const bypass = mock._client._calls.filter(c => c.sql.includes('app.bypass_rls'));
    assert(bypass.length >= 1, 'bypass');
    for (const c of bypass) assert(c.sql.includes("'false'"), 'false');
    restoreDb();
  });

  // T49 Multi-tenant
  suite('T49 — Multi-tenant tenant B');
  await test('T49: getValueReadModel tenant B', async () => {
    const mock = createValueDbMock(buildIoes().map(i => ({ ...i, company_id: COMPANY_ID_B })));
    patchDb(mock);
    const svc = loadP25();
    const r = await svc.aioiValueReadModelService.getValueReadModel(COMPANY_ID_B);
    assert(r.ok, 'ok B');
    await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID_B);
    const tenant = mock._client._calls.find(c => c.sql.includes('app.current_company_id'));
    assert(tenant, 'tenant call');
    assertEqual(tenant.params[0], COMPANY_ID_B, 'tenant B');
    restoreDb();
  });

  // T50 Soberanos
  suite('T50 — Soberanos ausentes');
  await test('T50: arquivos P2.5 não importam soberanos', () => {
    const files = [
      'aioiValueMetrics.js', 'aioiOperationalValueService.js', 'aioiRiskImpactService.js',
      'aioiBottleneckCostService.js', 'aioiPortfolioAnalysisService.js', 'aioiValueReadModelService.js'
    ];
    const forbidden = [
      'operationalDecisionEngine', 'operationalLearningService', 'workflowOrchestrator',
      'actionRuntimeOrchestrator', 'computePriorityScore', 'classificationConsumer', 'aioiOutboxConsumerService'
    ];
    for (const f of files) {
      const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8'));
      for (const term of forbidden) assert(!code.includes(term), `${f} contém ${term}`);
    }
  });

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  AIOI-P2.5 Value Read Model Test Report');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Total: ${_passed + _failed} | PASS: ${_passed} | FAIL: ${_failed}`);
  console.log(`  STATUS: ${_failed === 0 ? 'AIOI_P2_5_TEST_PASS' : 'AIOI_P2_5_TEST_FAIL'}`);
  console.log('');

  process.exit(_failed > 0 ? 1 : 0);
}

runTests().catch(e => { console.error('Fatal:', e); process.exit(1); });
