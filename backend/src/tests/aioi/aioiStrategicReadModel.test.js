'use strict';

/**
 * AIOI-P2.4 — Testes automatizados da Strategic Intelligence Layer
 *
 * T1–T45 conforme especificação P2.4.
 * Executar: node src/tests/aioi/aioiStrategicReadModel.test.js
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

const P24_MODULES = [
  'aioiStrategicMetrics',
  'aioiPriorityAnalysisService',
  'aioiImprovementOpportunityService',
  'aioiExecutiveFocusService',
  'aioiStrategicAlignmentService',
  'aioiStrategicReadModelService',
  'aioiExecutiveMaturityReadModelService',
  'aioiMaturityMetrics',
  'aioiMaturityAnalysisService',
  'aioiBenchmarkAnalysisService',
  'aioiOperationalStabilityService',
  'aioiGovernanceConsistencyService',
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

function loadP24() {
  const loaded = {};
  for (const mod of P24_MODULES) {
    delete require.cache[require.resolve(`${SERVICES_PATH}/${mod}`)];
    loaded[mod] = require(`${SERVICES_PATH}/${mod}`);
  }
  return loaded;
}

function getStratMetrics() {
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiStrategicMetrics`)];
  return require(`${SERVICES_PATH}/aioiStrategicMetrics`);
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

function createStratDbMock(ioes = buildIoes(), snapshots = buildSnapshots()) {
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
  let stratMetrics = getStratMetrics();
  stratMetrics.resetSessionCounters();

  // T1-T8 Priority Analysis
  suite('T1 — classifyPriorityLevel critical');
  await test('T1: score 85 → critical', () => {
    assertEqual(getStratMetrics().classifyPriorityLevel(85), 'critical', 'critical');
  });

  suite('T2 — classifyPriorityLevel high');
  await test('T2: score 65 → high', () => {
    assertEqual(getStratMetrics().classifyPriorityLevel(65), 'high', 'high');
  });

  suite('T3 — classifyPriorityLevel medium');
  await test('T3: score 45 → medium', () => {
    assertEqual(getStratMetrics().classifyPriorityLevel(45), 'medium', 'medium');
  });

  suite('T4 — classifyPriorityLevel low');
  await test('T4: score 20 → low', () => {
    assertEqual(getStratMetrics().classifyPriorityLevel(20), 'low', 'low');
  });

  suite('T5 — scoreSlaDomain');
  await test('T5: SLA breaches elevam score', () => {
    patchDb(createStratDbMock());
    const svc = loadP24();
    const score = svc.aioiPriorityAnalysisService.scoreSlaDomain({
      open_to_triaged: { status: 'breached' },
      end_to_end: { status: 'at_risk' }
    });
    assert(score > 0, 'score > 0');
    restoreDb();
  });

  suite('T6 — scoreBacklogDomain');
  await test('T6: backlog alto → score alto', () => {
    patchDb(createStratDbMock());
    const svc = loadP24();
    const score = svc.aioiPriorityAnalysisService.scoreBacklogDomain({
      approval_backlog: 60, execution_backlog: 0, outcome_backlog: 0, learning_backlog: 0
    });
    assertEqual(score, 90, 'backlog score');
    restoreDb();
  });

  suite('T7 — buildPrioritiesFromSignals');
  await test('T7: 5 domínios ordenados', () => {
    patchDb(createStratDbMock());
    const svc = loadP24();
    const p = svc.aioiPriorityAnalysisService.buildPrioritiesFromSignals({
      slaAnalysis: { a: { status: 'within_sla' } },
      bottlenecks: { approval_backlog: 5, execution_backlog: 0, outcome_backlog: 0, learning_backlog: 0 },
      maturity: { score: 70 }, stability: { stability_score: 80 }, consistency: { score: 75 }
    });
    assertEqual(p.length, 5, '5 domains');
    assert(p[0].priority_score >= p[1].priority_score, 'sorted');
    restoreDb();
  });

  suite('T8 — getStrategicPriorities ok');
  await test('T8: getStrategicPriorities ok', async () => {
    patchDb(createStratDbMock());
    const svc = loadP24();
    const r = await svc.aioiPriorityAnalysisService.getStrategicPriorities(COMPANY_ID);
    assert(r.ok, 'ok');
    assert(r.strategic_priorities.priorities.length === 5, '5 priorities');
    restoreDb();
  });

  // T9-T16 Improvement Opportunities
  suite('T9 — detectBenchmarkOpportunities');
  await test('T9: benchmark degradado detectado', () => {
    patchDb(createStratDbMock());
    const svc = loadP24();
    const opps = svc.aioiImprovementOpportunityService.detectBenchmarkOpportunities({
      cycle_time: { variation_pct: 20 }
    });
    assert(opps.length >= 1, 'opp');
    restoreDb();
  });

  suite('T10 — detectMaturityOpportunities');
  await test('T10: maturity gap detectado', () => {
    patchDb(createStratDbMock());
    const svc = loadP24();
    const opps = svc.aioiImprovementOpportunityService.detectMaturityOpportunities({ score: 40, level: 'managed' });
    assert(opps.length >= 1, 'opp');
    restoreDb();
  });

  suite('T11 — detectBacklogConcentration');
  await test('T11: concentração backlog', () => {
    patchDb(createStratDbMock());
    const svc = loadP24();
    const opps = svc.aioiImprovementOpportunityService.detectBacklogConcentration({
      approval_backlog: 30, execution_backlog: 2, outcome_backlog: 1, learning_backlog: 1
    });
    assert(opps.some(o => o.opportunity_code.includes('CONCENTRATION')), 'concentration');
    restoreDb();
  });

  suite('T12 — opportunity estrutura');
  await test('T12: oportunidade tem campos determinísticos', () => {
    patchDb(createStratDbMock());
    const svc = loadP24();
    const opps = svc.aioiImprovementOpportunityService.buildOpportunitiesFromSignals({
      benchmark: { success_rate: { variation_pct: 15 } },
      maturity: { score: 50, level: 'managed' },
      capacity: { capacity_forecast: { trend: 'stable', estimated_daily_throughput: 5 } },
      bottlenecks: { approval_backlog: 2, execution_backlog: 1, outcome_backlog: 0, learning_backlog: 0 }
    });
    for (const o of opps) {
      assert(o.domain, 'domain');
      assert(o.opportunity_code, 'code');
      assert(o.gap_value != null, 'gap');
    }
    restoreDb();
  });

  suite('T13 — sem texto gerado');
  await test('T13: oportunidades sem campos de texto livre', () => {
    patchDb(createStratDbMock());
    const svc = loadP24();
    const opps = svc.aioiImprovementOpportunityService.buildOpportunitiesFromSignals({
      benchmark: {}, maturity: { score: 30, level: 'developing' },
      capacity: {}, bottlenecks: { approval_backlog: 0, execution_backlog: 0, outcome_backlog: 0, learning_backlog: 0 }
    });
    for (const o of opps) {
      assert(!o.description, 'no description');
      assert(!o.narrative, 'no narrative');
    }
    restoreDb();
  });

  suite('T14 — getImprovementOpportunities ok');
  await test('T14: getImprovementOpportunities ok', async () => {
    patchDb(createStratDbMock());
    const svc = loadP24();
    const r = await svc.aioiImprovementOpportunityService.getImprovementOpportunities(COMPANY_ID);
    assert(r.ok, 'ok');
    assert(Array.isArray(r.improvement_opportunities.opportunities), 'array');
    restoreDb();
  });

  suite('T15 — throughput declining');
  await test('T15: throughput declining opportunity', () => {
    patchDb(createStratDbMock());
    const svc = loadP24();
    const opps = svc.aioiImprovementOpportunityService.buildOpportunitiesFromSignals({
      benchmark: {}, maturity: { score: 80, level: 'optimized' },
      capacity: { capacity_forecast: { trend: 'decreasing', estimated_daily_throughput: 3 } },
      bottlenecks: { approval_backlog: 0, execution_backlog: 0, outcome_backlog: 0, learning_backlog: 0 }
    });
    assert(opps.some(o => o.opportunity_code === 'THROUGHPUT_DECLINING'), 'declining');
    restoreDb();
  });

  suite('T16 — oportunidades vazias');
  await test('T16: sinais bons → poucas oportunidades', () => {
    patchDb(createStratDbMock());
    const svc = loadP24();
    const opps = svc.aioiImprovementOpportunityService.buildOpportunitiesFromSignals({
      benchmark: { success_rate: { variation_pct: 2 } },
      maturity: { score: 95, level: 'autonomous_ready' },
      capacity: { capacity_forecast: { trend: 'increasing', estimated_daily_throughput: 10 } },
      bottlenecks: { approval_backlog: 1, execution_backlog: 0, outcome_backlog: 0, learning_backlog: 0 }
    });
    assert(opps.length <= 2, 'few opps');
    restoreDb();
  });

  // T17-T22 Executive Focus
  suite('T17 — resolveExecutiveFocus SLA');
  await test('T17: focus sla → SLA_RISK', () => {
    patchDb(createStratDbMock());
    const svc = loadP24();
    const f = svc.aioiExecutiveFocusService.resolveExecutiveFocus([
      { domain: 'sla', priority_score: 90, priority_level: 'critical' }
    ]);
    assertEqual(f.rationale_code, 'SLA_RISK', 'SLA_RISK');
    assertEqual(f.focus_area, 'sla', 'sla');
    restoreDb();
  });

  suite('T18 — resolveExecutiveFocus BACKLOG');
  await test('T18: focus backlog → BACKLOG_RISK', () => {
    patchDb(createStratDbMock());
    const svc = loadP24();
    const f = svc.aioiExecutiveFocusService.resolveExecutiveFocus([
      { domain: 'backlog', priority_score: 80, priority_level: 'critical' }
    ]);
    assertEqual(f.rationale_code, 'BACKLOG_RISK', 'BACKLOG_RISK');
    restoreDb();
  });

  suite('T19 — resolveExecutiveFocus MATURITY');
  await test('T19: focus maturity → MATURITY_RISK', () => {
    patchDb(createStratDbMock());
    const svc = loadP24();
    const f = svc.aioiExecutiveFocusService.resolveExecutiveFocus([
      { domain: 'maturity', priority_score: 70, priority_level: 'high' }
    ]);
    assertEqual(f.rationale_code, 'MATURITY_RISK', 'MATURITY_RISK');
    restoreDb();
  });

  suite('T20 — resolveExecutiveFocus STABILITY');
  await test('T20: focus stability → STABILITY_RISK', () => {
    patchDb(createStratDbMock());
    const svc = loadP24();
    const f = svc.aioiExecutiveFocusService.resolveExecutiveFocus([
      { domain: 'stability', priority_score: 75, priority_level: 'high' }
    ]);
    assertEqual(f.rationale_code, 'STABILITY_RISK', 'STABILITY_RISK');
    restoreDb();
  });

  suite('T21 — resolveExecutiveFocus GOVERNANCE');
  await test('T21: focus governance → GOVERNANCE_RISK', () => {
    patchDb(createStratDbMock());
    const svc = loadP24();
    const f = svc.aioiExecutiveFocusService.resolveExecutiveFocus([
      { domain: 'governance', priority_score: 85, priority_level: 'critical' }
    ]);
    assertEqual(f.rationale_code, 'GOVERNANCE_RISK', 'GOVERNANCE_RISK');
    restoreDb();
  });

  suite('T22 — getExecutiveFocus ok');
  await test('T22: getExecutiveFocus ok', async () => {
    patchDb(createStratDbMock());
    const svc = loadP24();
    const r = await svc.aioiExecutiveFocusService.getExecutiveFocus(COMPANY_ID);
    assert(r.ok, 'ok');
    assert(r.executive_focus.focus_area, 'focus');
    assert(r.executive_focus.rationale_code, 'rationale');
    restoreDb();
  });

  // T23-T28 Strategic Alignment
  suite('T23 — classifyAlignmentStatus aligned');
  await test('T23: score 85 → aligned', () => {
    assertEqual(getStratMetrics().classifyAlignmentStatus(85), 'aligned', 'aligned');
  });

  suite('T24 — classifyAlignmentStatus partially_aligned');
  await test('T24: score 60 → partially_aligned', () => {
    assertEqual(getStratMetrics().classifyAlignmentStatus(60), 'partially_aligned', 'partial');
  });

  suite('T25 — classifyAlignmentStatus misaligned');
  await test('T25: score 30 → misaligned', () => {
    assertEqual(getStratMetrics().classifyAlignmentStatus(30), 'misaligned', 'misaligned');
  });

  suite('T26 — computeAlignmentScore');
  await test('T26: score 0-100', () => {
    patchDb(createStratDbMock());
    const svc = loadP24();
    const score = svc.aioiStrategicAlignmentService.computeAlignmentScore({
      maturityScore: 80, stabilityScore: 75, consistencyScore: 70, successRate: 0.9
    });
    assert(score >= 0 && score <= 100, 'range');
    restoreDb();
  });

  suite('T27 — computeAlignmentScore alto');
  await test('T27: sinais fortes → score alto', () => {
    patchDb(createStratDbMock());
    const svc = loadP24();
    const score = svc.aioiStrategicAlignmentService.computeAlignmentScore({
      maturityScore: 95, stabilityScore: 90, consistencyScore: 88, successRate: 0.95
    });
    assert(score >= 80, 'high');
    restoreDb();
  });

  suite('T28 — getStrategicAlignment ok');
  await test('T28: getStrategicAlignment ok', async () => {
    patchDb(createStratDbMock());
    const svc = loadP24();
    const r = await svc.aioiStrategicAlignmentService.getStrategicAlignment(COMPANY_ID);
    assert(r.ok, 'ok');
    assert(r.strategic_alignment.status, 'status');
    restoreDb();
  });

  // T29-T34 Strategic Read Model
  suite('T29 — getStrategicReadModel ok');
  await test('T29: read model agregado ok', async () => {
    patchDb(createStratDbMock());
    const svc = loadP24();
    const r = await svc.aioiStrategicReadModelService.getStrategicReadModel(COMPANY_ID);
    assert(r.ok, 'ok');
    assert(r.strategic_read_model.governance_read_model, 'gov');
    restoreDb();
  });

  suite('T30 — read model predictive');
  await test('T30: inclui predictive_read_model', async () => {
    patchDb(createStratDbMock());
    const svc = loadP24();
    const r = await svc.aioiStrategicReadModelService.getStrategicReadModel(COMPANY_ID);
    assert(r.strategic_read_model.predictive_read_model, 'predictive');
    restoreDb();
  });

  suite('T31 — read model maturity_read_model');
  await test('T31: inclui maturity_read_model', async () => {
    patchDb(createStratDbMock());
    const svc = loadP24();
    const r = await svc.aioiStrategicReadModelService.getStrategicReadModel(COMPANY_ID);
    assert(r.strategic_read_model.maturity_read_model, 'maturity');
    restoreDb();
  });

  suite('T32 — read model strategic_priorities');
  await test('T32: inclui strategic_priorities', async () => {
    patchDb(createStratDbMock());
    const svc = loadP24();
    const r = await svc.aioiStrategicReadModelService.getStrategicReadModel(COMPANY_ID);
    assert(r.strategic_read_model.strategic_priorities, 'priorities');
    restoreDb();
  });

  suite('T33 — read model opportunities+focus+alignment');
  await test('T33: inclui opportunities, focus, alignment', async () => {
    patchDb(createStratDbMock());
    const svc = loadP24();
    const r = await svc.aioiStrategicReadModelService.getStrategicReadModel(COMPANY_ID);
    assert(r.strategic_read_model.improvement_opportunities, 'opps');
    assert(r.strategic_read_model.executive_focus, 'focus');
    assert(r.strategic_read_model.strategic_alignment, 'alignment');
    restoreDb();
  });

  suite('T34 — read model estrutura completa');
  await test('T34: 7 blocos obrigatórios', async () => {
    patchDb(createStratDbMock());
    const svc = loadP24();
    const r = await svc.aioiStrategicReadModelService.getStrategicReadModel(COMPANY_ID);
    const keys = Object.keys(r.strategic_read_model);
    assert(keys.includes('governance_read_model'), 'gov');
    assert(keys.includes('predictive_read_model'), 'pred');
    assert(keys.includes('maturity_read_model'), 'mat');
    assert(keys.includes('strategic_priorities'), 'pri');
    assert(keys.includes('improvement_opportunities'), 'opp');
    assert(keys.includes('executive_focus'), 'focus');
    assert(keys.includes('strategic_alignment'), 'align');
    restoreDb();
  });

  // T35-T40 Read Only
  suite('T35 — INSERT bloqueado');
  await test('T35: INSERT → READ_ONLY_LAYER_VIOLATION', () => {
    stratMetrics = getStratMetrics();
    let threw = false;
    try { stratMetrics.assertReadOnlySql('INSERT INTO x VALUES (1)'); } catch (e) {
      threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', 'code');
    }
    assert(threw, 'throw');
  });

  suite('T36 — UPDATE bloqueado');
  await test('T36: UPDATE bloqueado', () => {
    stratMetrics = getStratMetrics();
    let threw = false;
    try { stratMetrics.assertReadOnlySql('UPDATE x SET y=1'); } catch (e) { threw = true; }
    assert(threw, 'throw');
  });

  suite('T37 — DELETE bloqueado');
  await test('T37: DELETE bloqueado', () => {
    stratMetrics = getStratMetrics();
    let threw = false;
    try { stratMetrics.assertReadOnlySql('DELETE FROM x'); } catch (e) { threw = true; }
    assert(threw, 'throw');
  });

  suite('T38 — ALTER bloqueado');
  await test('T38: ALTER bloqueado', () => {
    stratMetrics = getStratMetrics();
    let threw = false;
    try { stratMetrics.assertReadOnlySql('ALTER TABLE x ADD COLUMN y int'); } catch (e) { threw = true; }
    assert(threw, 'throw');
  });

  suite('T39 — DROP bloqueado');
  await test('T39: DROP bloqueado', () => {
    stratMetrics = getStratMetrics();
    let threw = false;
    try { stratMetrics.assertReadOnlySql('DROP TABLE x'); } catch (e) { threw = true; }
    assert(threw, 'throw');
  });

  suite('T40 — zero writes em consultas');
  await test('T40: queries são SELECT', async () => {
    const mock = createStratDbMock();
    patchDb(mock);
    const svc = loadP24();
    await svc.aioiStrategicReadModelService.getStrategicReadModel(COMPANY_ID);
    assertNoWrites(mock._client._calls);
    restoreDb();
  });

  // T41-T42 RLS
  suite('T41 — RLS current_company_id');
  await test('T41: set_config company_id', async () => {
    const mock = createStratDbMock();
    patchDb(mock);
    const svc = loadP24();
    await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID);
    const tenant = mock._client._calls.find(c => c.sql.includes('app.current_company_id'));
    assert(tenant, 'tenant');
    assertEqual(tenant.params[0], COMPANY_ID, 'company');
    restoreDb();
  });

  suite('T42 — RLS bypass_rls false');
  await test('T42: bypass_rls=false', async () => {
    const mock = createStratDbMock();
    patchDb(mock);
    const svc = loadP24();
    await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID);
    const bypass = mock._client._calls.filter(c => c.sql.includes('app.bypass_rls'));
    assert(bypass.length >= 1, 'bypass');
    for (const c of bypass) assert(c.sql.includes("'false'"), 'false');
    restoreDb();
  });

  // T43-T44 Multi-tenant
  suite('T43 — Multi-tenant tenant B');
  await test('T43: set_config tenant B', async () => {
    const mock = createStratDbMock(buildIoes().map(i => ({ ...i, company_id: COMPANY_ID_B })));
    patchDb(mock);
    const svc = loadP24();
    await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID_B);
    const tenant = mock._client._calls.find(c => c.sql.includes('app.current_company_id'));
    assert(tenant, 'tenant call');
    assertEqual(tenant.params[0], COMPANY_ID_B, 'tenant B');
    restoreDb();
  });

  suite('T44 — Multi-tenant strategic read model B');
  await test('T44: getStrategicReadModel tenant B', async () => {
    const mock = createStratDbMock(buildIoes().map(i => ({ ...i, company_id: COMPANY_ID_B })));
    patchDb(mock);
    const svc = loadP24();
    const r = await svc.aioiStrategicReadModelService.getStrategicReadModel(COMPANY_ID_B);
    assert(r.ok, 'ok B');
    restoreDb();
  });

  // T45 Soberanos
  suite('T45 — Soberanos ausentes');
  await test('T45: arquivos P2.4 não importam soberanos', () => {
    const files = [
      'aioiStrategicMetrics.js', 'aioiPriorityAnalysisService.js',
      'aioiImprovementOpportunityService.js', 'aioiExecutiveFocusService.js',
      'aioiStrategicAlignmentService.js', 'aioiStrategicReadModelService.js'
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
  console.log('  AIOI-P2.4 Strategic Read Model Test Report');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Total: ${_passed + _failed} | PASS: ${_passed} | FAIL: ${_failed}`);
  console.log(`  STATUS: ${_failed === 0 ? 'AIOI_P2_4_TEST_PASS' : 'AIOI_P2_4_TEST_FAIL'}`);
  console.log('');

  process.exit(_failed > 0 ? 1 : 0);
}

runTests().catch(e => { console.error('Fatal:', e); process.exit(1); });
