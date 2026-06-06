'use strict';

/**
 * AIOI-P2.9 — Testes automatizados da Executive Command Intelligence Layer
 * T1–T71 | node src/tests/aioi/aioiExecutiveCommandReadModel.test.js
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

const P29_MODULES = [
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

function loadP29() {
  const loaded = {};
  for (const mod of P29_MODULES) {
    delete require.cache[require.resolve(`${SERVICES_PATH}/${mod}`)];
    loaded[mod] = require(`${SERVICES_PATH}/${mod}`);
  }
  return loaded;
}
function getCmdMetrics() {
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiExecutiveCommandMetrics`)];
  return require(`${SERVICES_PATH}/aioiExecutiveCommandMetrics`);
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

function createCmdDbMock(ioes = buildIoes(), snapshots = buildSnapshots()) {
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

const SAMPLE_TWIN = {
  operational_state: { governance_status: 'healthy', resilience_status: 'resilient', executive_snapshot: {} },
  future_state: { backlog_forecast: {} },
  scenario_state: { backlog_scenarios: {} },
  twin_consistency: { consistency_score: 75, consistency_status: 'coherent' }
};

async function runTests() {
  let cm = getCmdMetrics();
  cm.resetSessionCounters();

  // T1–T15 Executive Command State
  suite('T1'); await test('T1: buildExecutiveCommandState estrutura', () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = svc.aioiExecutiveCommandStateService.buildExecutiveCommandState(SAMPLE_TWIN);
    assert(r.operational_state && r.future_state && r.twin_consistency); restoreDb();
  });
  suite('T2'); await test('T2: governance_status', () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = svc.aioiExecutiveCommandStateService.buildExecutiveCommandState(SAMPLE_TWIN);
    assertEqual(r.governance_status, 'healthy', ''); restoreDb();
  });
  suite('T3'); await test('T3: resilience_status', () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = svc.aioiExecutiveCommandStateService.buildExecutiveCommandState(SAMPLE_TWIN);
    assertEqual(r.resilience_status, 'resilient', ''); restoreDb();
  });
  suite('T4'); await test('T4: 6 campos command state', () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = svc.aioiExecutiveCommandStateService.buildExecutiveCommandState(SAMPLE_TWIN);
    assertEqual(Object.keys(r).length, 6, ''); restoreDb();
  });
  suite('T5'); await test('T5: getExecutiveCommandState ok', async () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = await svc.aioiExecutiveCommandStateService.getExecutiveCommandState(COMPANY_ID);
    assert(r.ok && r.executive_command_state.operational_state); restoreDb();
  });
  suite('T6'); await test('T6: companyId inválido command state', async () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = await svc.aioiExecutiveCommandStateService.getExecutiveCommandState('bad');
    assert(!r.ok); restoreDb();
  });
  suite('T7'); await test('T7: composição P2.8', () => {
    const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiExecutiveCommandStateService.js'), 'utf8'));
    assert(code.includes('digitalTwinReadModel') && !code.includes('computeMaturityScore'));
  });
  suite('T8'); await test('T8: scenario_state presente', () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = svc.aioiExecutiveCommandStateService.buildExecutiveCommandState(SAMPLE_TWIN);
    assert(r.scenario_state); restoreDb();
  });
  suite('T9'); await test('T9: future_state presente', () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = svc.aioiExecutiveCommandStateService.buildExecutiveCommandState(SAMPLE_TWIN);
    assert(r.future_state); restoreDb();
  });
  suite('T10'); await test('T10: determinístico command state', () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const a = svc.aioiExecutiveCommandStateService.buildExecutiveCommandState(SAMPLE_TWIN);
    const b = svc.aioiExecutiveCommandStateService.buildExecutiveCommandState(SAMPLE_TWIN);
    assertEqual(JSON.stringify(a), JSON.stringify(b), ''); restoreDb();
  });
  suite('T11'); await test('T11: zero writes command state', async () => {
    const mock = createCmdDbMock(); patchDb(mock); const svc = loadP29();
    await svc.aioiExecutiveCommandStateService.getExecutiveCommandState(COMPANY_ID);
    assertNoWrites(mock._client._calls); restoreDb();
  });
  suite('T12'); await test('T12: recordCommandStateAnalyzed', () => {
    cm = getCmdMetrics(); cm.resetSessionCounters();
    cm.recordCommandStateAnalyzed(COMPANY_ID);
    assert(cm.getSessionCounters().command_state_count >= 1);
  });
  suite('T13'); await test('T13: operational_state nested', async () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = await svc.aioiExecutiveCommandStateService.getExecutiveCommandState(COMPANY_ID);
    assert(r.executive_command_state.operational_state.maturity_level != null ||
      r.executive_command_state.operational_state.executive_snapshot); restoreDb();
  });
  suite('T14'); await test('T14: twin_consistency nested', async () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = await svc.aioiExecutiveCommandStateService.getExecutiveCommandState(COMPANY_ID);
    assert(r.executive_command_state.twin_consistency.consistency_score != null); restoreDb();
  });
  suite('T15'); await test('T15: sem reimplementação P2.8', () => {
    const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiExecutiveCommandStateService.js'), 'utf8'));
    assert(!code.includes('buildOperationalState'));
  });

  // T16–T30 Priority Matrix
  suite('T16'); await test('T16: buildExecutivePriorityMatrix estrutura', () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = svc.aioiExecutivePriorityMatrixService.buildExecutivePriorityMatrix({
      strategicPriorities: { priorities: [{ domain: 'sla', priority_score: 80 }] },
      portfolioAnalysis: { highest_risk_area: 'approval', highest_cost_area: 'execution', highest_value_area: 'outcome' }
    });
    assertEqual(r.highest_priority_domain, 'sla', ''); restoreDb();
  });
  suite('T17'); await test('T17: highest_risk_domain', () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = svc.aioiExecutivePriorityMatrixService.buildExecutivePriorityMatrix({
      strategicPriorities: { priorities: [] },
      portfolioAnalysis: { highest_risk_area: 'learning', highest_cost_area: 'a', highest_value_area: 'b' }
    });
    assertEqual(r.highest_risk_domain, 'learning', ''); restoreDb();
  });
  suite('T18'); await test('T18: highest_cost_domain', () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = svc.aioiExecutivePriorityMatrixService.buildExecutivePriorityMatrix({
      strategicPriorities: { priorities: [] },
      portfolioAnalysis: { highest_risk_area: 'a', highest_cost_area: 'execution', highest_value_area: 'b' }
    });
    assertEqual(r.highest_cost_domain, 'execution', ''); restoreDb();
  });
  suite('T19'); await test('T19: highest_value_domain', () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = svc.aioiExecutivePriorityMatrixService.buildExecutivePriorityMatrix({
      strategicPriorities: { priorities: [] },
      portfolioAnalysis: { highest_risk_area: 'a', highest_cost_area: 'b', highest_value_area: 'approval' }
    });
    assertEqual(r.highest_value_domain, 'approval', ''); restoreDb();
  });
  suite('T20'); await test('T20: 4 campos matrix', () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = svc.aioiExecutivePriorityMatrixService.buildExecutivePriorityMatrix({
      strategicPriorities: { priorities: [{ domain: 'backlog' }] },
      portfolioAnalysis: { highest_risk_area: 'a', highest_cost_area: 'b', highest_value_area: 'c' }
    });
    assertEqual(Object.keys(r).length, 4, ''); restoreDb();
  });
  suite('T21'); await test('T21: getExecutivePriorityMatrix ok', async () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = await svc.aioiExecutivePriorityMatrixService.getExecutivePriorityMatrix(COMPANY_ID);
    assert(r.ok && r.executive_priority_matrix.highest_priority_domain); restoreDb();
  });
  suite('T22'); await test('T22: companyId inválido matrix', async () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = await svc.aioiExecutivePriorityMatrixService.getExecutivePriorityMatrix('x');
    assert(!r.ok); restoreDb();
  });
  suite('T23'); await test('T23: composição P2.4/P2.5', () => {
    const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiExecutivePriorityMatrixService.js'), 'utf8'));
    assert(code.includes('priorityService') && code.includes('portfolioService'));
  });
  suite('T24'); await test('T24: default governance priority', () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = svc.aioiExecutivePriorityMatrixService.buildExecutivePriorityMatrix({
      strategicPriorities: { priorities: [] },
      portfolioAnalysis: { highest_risk_area: 'a', highest_cost_area: 'b', highest_value_area: 'c' }
    });
    assertEqual(r.highest_priority_domain, 'governance', ''); restoreDb();
  });
  suite('T25'); await test('T25: determinístico matrix', () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const inp = { strategicPriorities: { priorities: [{ domain: 'sla' }] },
      portfolioAnalysis: { highest_risk_area: 'a', highest_cost_area: 'b', highest_value_area: 'c' } };
    assertEqual(JSON.stringify(svc.aioiExecutivePriorityMatrixService.buildExecutivePriorityMatrix(inp)),
      JSON.stringify(svc.aioiExecutivePriorityMatrixService.buildExecutivePriorityMatrix(inp)), ''); restoreDb();
  });
  suite('T26'); await test('T26: recordPriorityMatrixAnalyzed', () => {
    cm = getCmdMetrics(); cm.resetSessionCounters();
    cm.recordPriorityMatrixAnalyzed(COMPANY_ID);
    assert(cm.getSessionCounters().priority_matrix_count >= 1);
  });
  suite('T27'); await test('T27: zero writes matrix', async () => {
    const mock = createCmdDbMock(); patchDb(mock); const svc = loadP29();
    await svc.aioiExecutivePriorityMatrixService.getExecutivePriorityMatrix(COMPANY_ID);
    assertNoWrites(mock._client._calls); restoreDb();
  });
  suite('T28'); await test('T28: anti-duplication portfolio', () => {
    const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiExecutivePriorityMatrixService.js'), 'utf8'));
    assert(!code.includes('buildPortfolioAnalysis'));
  });
  suite('T29'); await test('T29: domains válidos portfolio', async () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = await svc.aioiExecutivePriorityMatrixService.getExecutivePriorityMatrix(COMPANY_ID);
    const allowed = ['approval', 'execution', 'outcome', 'learning'];
    assert(allowed.includes(r.executive_priority_matrix.highest_risk_domain)); restoreDb();
  });
  suite('T30'); await test('T30: priority domain válido', async () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = await svc.aioiExecutivePriorityMatrixService.getExecutivePriorityMatrix(COMPANY_ID);
    const allowed = ['sla', 'backlog', 'maturity', 'stability', 'governance'];
    assert(allowed.includes(r.executive_priority_matrix.highest_priority_domain)); restoreDb();
  });

  // T31–T45 Attention Map
  suite('T31'); await test('T31: classifyAttentionLevel critical', () => {
    assertEqual(getCmdMetrics().classifyAttentionLevel(80), 'critical', '');
  });
  suite('T32'); await test('T32: classifyAttentionLevel attention', () => {
    assertEqual(getCmdMetrics().classifyAttentionLevel(60), 'attention', '');
  });
  suite('T33'); await test('T33: classifyAttentionLevel monitor', () => {
    assertEqual(getCmdMetrics().classifyAttentionLevel(30), 'monitor', '');
  });
  suite('T34'); await test('T34: classifyAttentionLevel observe', () => {
    assertEqual(getCmdMetrics().classifyAttentionLevel(10), 'observe', '');
  });
  suite('T35'); await test('T35: ATTENTION_DOMAINS 7', () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    assertEqual(svc.aioiExecutiveAttentionMapService.ATTENTION_DOMAINS.length, 7, ''); restoreDb();
  });
  suite('T36'); await test('T36: buildAttentionDomains', () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const d = svc.aioiExecutiveAttentionMapService.buildAttentionDomains({
      slaScore: 80, backlogScore: 20, governanceScore: 50, maturityScore: 40,
      stabilityScore: 30, valueScore: 60, resilienceScore: 45
    });
    assertEqual(d.length, 7, ''); restoreDb();
  });
  suite('T37'); await test('T37: buildExecutiveAttentionMap domains', () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = svc.aioiExecutiveAttentionMapService.buildExecutiveAttentionMap({
      slaScore: 90, backlogScore: 10, governanceScore: 10, maturityScore: 10,
      stabilityScore: 10, valueScore: 10, resilienceScore: 10
    });
    assert(r.domains.length === 7); restoreDb();
  });
  suite('T38'); await test('T38: resilienceAttentionScore fragile', () => {
    assertEqual(getCmdMetrics().resilienceAttentionScore('fragile'), 85, '');
  });
  suite('T39'); await test('T39: getExecutiveAttentionMap ok', async () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = await svc.aioiExecutiveAttentionMapService.getExecutiveAttentionMap(COMPANY_ID);
    assert(r.ok && r.executive_attention_map.domains.length === 7); restoreDb();
  });
  suite('T40'); await test('T40: companyId inválido attention', async () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = await svc.aioiExecutiveAttentionMapService.getExecutiveAttentionMap('nope');
    assert(!r.ok); restoreDb();
  });
  suite('T41'); await test('T41: níveis permitidos', async () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = await svc.aioiExecutiveAttentionMapService.getExecutiveAttentionMap(COMPANY_ID);
    const allowed = ['observe', 'monitor', 'attention', 'critical'];
    for (const d of r.executive_attention_map.domains) assert(allowed.includes(d.attention_level)); restoreDb();
  });
  suite('T42'); await test('T42: domínios obrigatórios', async () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = await svc.aioiExecutiveAttentionMapService.getExecutiveAttentionMap(COMPANY_ID);
    const names = r.executive_attention_map.domains.map(d => d.domain);
    assert(names.includes('sla') && names.includes('resilience') && names.includes('value')); restoreDb();
  });
  suite('T43'); await test('T43: determinístico attention', () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const inp = { slaScore: 50, backlogScore: 50, governanceScore: 50, maturityScore: 50,
      stabilityScore: 50, valueScore: 50, resilienceScore: 50 };
    const a = svc.aioiExecutiveAttentionMapService.buildExecutiveAttentionMap(inp);
    const b = svc.aioiExecutiveAttentionMapService.buildExecutiveAttentionMap(inp);
    assertEqual(JSON.stringify(a), JSON.stringify(b), ''); restoreDb();
  });
  suite('T44'); await test('T44: recordAttentionMapAnalyzed', () => {
    cm = getCmdMetrics(); cm.resetSessionCounters();
    cm.recordAttentionMapAnalyzed(COMPANY_ID);
    assert(cm.getSessionCounters().attention_map_count >= 1);
  });
  suite('T45'); await test('T45: zero writes attention', async () => {
    const mock = createCmdDbMock(); patchDb(mock); const svc = loadP29();
    await svc.aioiExecutiveAttentionMapService.getExecutiveAttentionMap(COMPANY_ID);
    assertNoWrites(mock._client._calls); restoreDb();
  });

  // T46–T55 Readiness
  suite('T46'); await test('T46: classifyReadinessLevel emerging', () => {
    assertEqual(getCmdMetrics().classifyReadinessLevel(30), 'emerging', '');
  });
  suite('T47'); await test('T47: classifyReadinessLevel progressing', () => {
    assertEqual(getCmdMetrics().classifyReadinessLevel(55), 'progressing', '');
  });
  suite('T48'); await test('T48: classifyReadinessLevel advanced', () => {
    assertEqual(getCmdMetrics().classifyReadinessLevel(80), 'advanced', '');
  });
  suite('T49'); await test('T49: classifyReadinessLevel enterprise_ready', () => {
    assertEqual(getCmdMetrics().classifyReadinessLevel(95), 'enterprise_ready', '');
  });
  suite('T50'); await test('T50: limite 90 enterprise_ready', () => {
    assertEqual(getCmdMetrics().classifyReadinessLevel(90), 'enterprise_ready', '');
  });
  suite('T51'); await test('T51: computeReadinessScore range', () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const s = svc.aioiExecutiveReadinessService.computeReadinessScore({
      maturityScore: 70, alignmentScore: 75, resilienceScore: 65,
      governanceScore: 80, valueScore: 72, twinConsistencyScore: 78
    });
    assert(s >= 0 && s <= 100); restoreDb();
  });
  suite('T52'); await test('T52: buildExecutiveReadiness estrutura', () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = svc.aioiExecutiveReadinessService.buildExecutiveReadiness({
      maturityScore: 95, alignmentScore: 96, resilienceScore: 94,
      governanceScore: 98, valueScore: 97, twinConsistencyScore: 99
    });
    assert(r.readiness_score >= 90 && r.readiness_level === 'enterprise_ready'); restoreDb();
  });
  suite('T53'); await test('T53: getExecutiveReadiness ok', async () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = await svc.aioiExecutiveReadinessService.getExecutiveReadiness(COMPANY_ID);
    assert(r.ok && r.executive_readiness.readiness_level); restoreDb();
  });
  suite('T54'); await test('T54: companyId inválido readiness', async () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = await svc.aioiExecutiveReadinessService.getExecutiveReadiness('bad');
    assert(!r.ok); restoreDb();
  });
  suite('T55'); await test('T55: READINESS_WEIGHTS soma ~1', () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const w = svc.aioiExecutiveReadinessService.READINESS_WEIGHTS;
    const sum = Object.values(w).reduce((a, b) => a + b, 0);
    assert(Math.abs(sum - 1) < 0.01); restoreDb();
  });

  // T56–T65 Command Read Model
  suite('T56'); await test('T56: getExecutiveCommandReadModel ok', async () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = await svc.aioiExecutiveCommandReadModelService.getExecutiveCommandReadModel(COMPANY_ID);
    assert(r.ok && r.executive_command_read_model.governance_read_model); restoreDb();
  });
  suite('T57'); await test('T57: digital_twin_read_model nested', async () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = await svc.aioiExecutiveCommandReadModelService.getExecutiveCommandReadModel(COMPANY_ID);
    assert(r.executive_command_read_model.digital_twin_read_model.operational_state); restoreDb();
  });
  suite('T58'); await test('T58: executive_command_state', async () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = await svc.aioiExecutiveCommandReadModelService.getExecutiveCommandReadModel(COMPANY_ID);
    assert(r.executive_command_read_model.executive_command_state); restoreDb();
  });
  suite('T59'); await test('T59: priority + attention + readiness', async () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = await svc.aioiExecutiveCommandReadModelService.getExecutiveCommandReadModel(COMPANY_ID);
    const m = r.executive_command_read_model;
    assert(m.executive_priority_matrix && m.executive_attention_map && m.executive_readiness); restoreDb();
  });
  suite('T60'); await test('T60: 12 blocos read model', async () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = await svc.aioiExecutiveCommandReadModelService.getExecutiveCommandReadModel(COMPANY_ID);
    assert(Object.keys(r.executive_command_read_model).length >= 12); restoreDb();
  });
  suite('T61'); await test('T61: companyId inválido read model', async () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = await svc.aioiExecutiveCommandReadModelService.getExecutiveCommandReadModel('invalid');
    assert(!r.ok); restoreDb();
  });
  suite('T62'); await test('T62: recordCommandRequested', () => {
    cm = getCmdMetrics(); cm.resetSessionCounters();
    cm.recordCommandRequested(COMPANY_ID);
    assert(cm.getSessionCounters().command_requests >= 1);
  });
  suite('T63'); await test('T63: zero writes read model', async () => {
    const mock = createCmdDbMock(); patchDb(mock); const svc = loadP29();
    await svc.aioiExecutiveCommandReadModelService.getExecutiveCommandReadModel(COMPANY_ID);
    assertNoWrites(mock._client._calls); restoreDb();
  });
  suite('T64'); await test('T64: scenario_read_model presente', async () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const r = await svc.aioiExecutiveCommandReadModelService.getExecutiveCommandReadModel(COMPANY_ID);
    assert(r.executive_command_read_model.scenario_read_model); restoreDb();
  });
  suite('T65'); await test('T65: determinístico readiness', () => {
    patchDb(createCmdDbMock()); const svc = loadP29();
    const inp = { maturityScore: 60, alignmentScore: 60, resilienceScore: 60,
      governanceScore: 60, valueScore: 60, twinConsistencyScore: 60 };
    assertEqual(svc.aioiExecutiveReadinessService.computeReadinessScore(inp),
      svc.aioiExecutiveReadinessService.computeReadinessScore(inp), ''); restoreDb();
  });

  // T66–T68 READ ONLY
  suite('T66'); await test('T66: INSERT bloqueado', () => {
    cm = getCmdMetrics(); let threw = false;
    try { cm.assertReadOnlySql('INSERT INTO x VALUES (1)'); } catch (e) {
      threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', '');
    }
    assert(threw);
  });
  suite('T67'); await test('T67: UPDATE bloqueado', () => {
    cm = getCmdMetrics(); let threw = false;
    try { cm.assertReadOnlySql('UPDATE x SET y=1'); } catch (e) { threw = true; } assert(threw);
  });
  suite('T68'); await test('T68: DELETE bloqueado', () => {
    cm = getCmdMetrics(); let threw = false;
    try { cm.assertReadOnlySql('DELETE FROM x'); } catch (e) { threw = true; } assert(threw);
  });

  // T69 RLS
  suite('T69'); await test('T69: RLS company_id + bypass false', async () => {
    const mock = createCmdDbMock(); patchDb(mock); const svc = loadP29();
    await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID);
    const t = mock._client._calls.find(c => c.sql.includes('app.current_company_id'));
    const b = mock._client._calls.filter(c => c.sql.includes('app.bypass_rls'));
    assert(t && t.params[0] === COMPANY_ID);
    assert(b.length >= 1); restoreDb();
  });

  // T70 Multi-tenant
  suite('T70'); await test('T70: tenant B', async () => {
    const mock = createCmdDbMock(buildIoes().map(i => ({ ...i, company_id: COMPANY_ID_B })));
    patchDb(mock); const svc = loadP29();
    const r = await svc.aioiExecutiveCommandReadModelService.getExecutiveCommandReadModel(COMPANY_ID_B);
    assert(r.ok);
    await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID_B);
    const t = mock._client._calls.filter(c => c.sql.includes('app.current_company_id'))
      .find(c => c.params && c.params[0] === COMPANY_ID_B);
    assert(t, 'RLS tenant B'); restoreDb();
  });

  // T71 Soberanos
  suite('T71'); await test('T71: soberanos ausentes', () => {
    const files = ['aioiExecutiveCommandMetrics.js', 'aioiExecutiveCommandStateService.js',
      'aioiExecutivePriorityMatrixService.js', 'aioiExecutiveAttentionMapService.js',
      'aioiExecutiveReadinessService.js', 'aioiExecutiveCommandReadModelService.js'];
    const forbidden = ['operationalDecisionEngine', 'operationalLearningService', 'workflowOrchestrator',
      'actionRuntimeOrchestrator', 'computePriorityScore', 'classificationConsumer', 'aioiOutboxConsumerService'];
    for (const f of files) {
      const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8'));
      for (const term of forbidden) assert(!code.includes(term), `${f} ${term}`);
    }
  });

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  AIOI-P2.9 Executive Command Read Model Test Report');
  console.log(`  Total: ${_passed + _failed} | PASS: ${_passed} | FAIL: ${_failed}`);
  console.log(`  STATUS: ${_failed === 0 ? 'AIOI_P2_9_TEST_PASS' : 'AIOI_P2_9_TEST_FAIL'}`);
  console.log('══════════════════════════════════════════════════════════\n');
  process.exit(_failed > 0 ? 1 : 0);
}

runTests().catch(e => { console.error('Fatal:', e); process.exit(1); });
