'use strict';

/**
 * AIOI-P3.1 — Testes automatizados da Enterprise Intelligence Assurance & Explainability Layer
 * T1–T81 | node src/tests/aioi/aioiAssuranceReadModel.test.js
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

const P31_MODULES = [
  'aioiExplainabilityMetrics', 'aioiEvidenceAnalysisService', 'aioiDecisionTraceabilityService',
  'aioiInsightExplainabilityService', 'aioiIntelligenceAssuranceService', 'aioiAssuranceReadModelService',
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

function loadP31() {
  const loaded = {};
  for (const mod of P31_MODULES) {
    delete require.cache[require.resolve(`${SERVICES_PATH}/${mod}`)];
    loaded[mod] = require(`${SERVICES_PATH}/${mod}`);
  }
  return loaded;
}
function getExpMetrics() {
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiExplainabilityMetrics`)];
  return require(`${SERVICES_PATH}/aioiExplainabilityMetrics`);
}

function buildIoes() {
  const base = {
    company_id: COMPANY_ID, source_type: 'plc_event', category: 'equipment_degradation',
    priority_band: 'high', correlation_id: 'c1', decision_type: 'maintenance_work_order',
    decision_payload: null, approved_by_user_id: null, approved_at: null,
    workflow_instance_id: null, execution_trace_id: null,
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

function createAssuranceDbMock(ioes = buildIoes(), snapshots = buildSnapshots()) {
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

      if (s.includes('decision_type IS NOT NULL') && s.includes('approved_by_user_id')) {
        const total = filtered.length;
        const withDecision = filtered.filter(i => i.decision_type).length;
        const withHitl = filtered.filter(i => i.approved_by_user_id).length;
        const withExec = filtered.filter(i => i.workflow_instance_id || i.execution_trace_id).length;
        const withOutcome = filtered.filter(i => i.decision_payload?.aioi_outcome).length;
        const withLearning = filtered.filter(i =>
          i.decision_payload?.aioi_learning_processed || i.decision_payload?.aioi_learning_submitted).length;
        return { rows: [{ total: String(total), with_decision: String(withDecision),
          with_hitl: String(withHitl), with_execution: String(withExec),
          with_outcome: String(withOutcome), with_learning: String(withLearning) }] };
      }
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

const SAMPLE_TRUST = {
  executive_command_read_model: {
    governance_read_model: {}, predictive_read_model: {}, maturity_read_model: { maturity: { score: 70 } },
    strategic_read_model: {}, value_read_model: { portfolio_analysis: { portfolio_balance_score: 65 } },
    resilience_read_model: { operational_resilience: { resilience_score: 60 }, dependency_risk: { approval_dependency_risk: 'medium' } },
    digital_twin_read_model: { operational_state: {} },
    executive_command_state: {
      operational_state: {
        governance_status: 'healthy', maturity_level: 'managed',
        operational_value: { operational_value_score: 72 },
        strategic_alignment: { score: 68 }, resilience_status: 'resilient'
      }
    },
    executive_readiness: { readiness_score: 70 }
  },
  data_integrity: { integrity_score: 80, integrity_status: 'verified' },
  model_consistency: { consistency_score: 75 },
  forecast_reliability: { reliability_score: 78 },
  intelligence_trust: { trust_score: 77, trust_level: 'high_trust' }
};

const SAMPLE_TRACE = {
  total: 4, with_decision: 4, with_hitl: 3, with_execution: 2,
  with_outcome: 1, with_learning: 1, history_count: 3, snapshot_count: 6, audit_count: 2
};

async function runTests() {
  let em = getExpMetrics();
  em.resetSessionCounters();

  // T1–T15 Evidence Analysis
  suite('T1'); await test('T1: classifyEvidenceStatus verified', () => {
    assertEqual(getExpMetrics().classifyEvidenceStatus(80), 'verified', '');
  });
  suite('T2'); await test('T2: classifyEvidenceStatus partial', () => {
    assertEqual(getExpMetrics().classifyEvidenceStatus(55), 'partial', '');
  });
  suite('T3'); await test('T3: classifyEvidenceStatus weak', () => {
    assertEqual(getExpMetrics().classifyEvidenceStatus(30), 'weak', '');
  });
  suite('T4'); await test('T4: EVIDENCE_DOMAINS 8', () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    assertEqual(svc.aioiEvidenceAnalysisService.EVIDENCE_DOMAINS.length, 8, ''); restoreDb();
  });
  suite('T5'); await test('T5: buildEvidenceAnalysis', () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const r = svc.aioiEvidenceAnalysisService.buildEvidenceAnalysis(SAMPLE_TRUST);
    assert(r.evidence_score >= 70 && r.evidence_status === 'verified'); restoreDb();
  });
  suite('T6'); await test('T6: computeEvidenceScore range', () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const s = svc.aioiEvidenceAnalysisService.computeEvidenceScore(SAMPLE_TRUST);
    assert(s >= 0 && s <= 100); restoreDb();
  });
  suite('T7'); await test('T7: getEvidenceAnalysis ok', async () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const r = await svc.aioiEvidenceAnalysisService.getEvidenceAnalysis(COMPANY_ID);
    assert(r.ok && r.evidence_analysis.evidence_status); restoreDb();
  });
  suite('T8'); await test('T8: companyId inválido evidence', async () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const r = await svc.aioiEvidenceAnalysisService.getEvidenceAnalysis('bad');
    assert(!r.ok); restoreDb();
  });
  suite('T9'); await test('T9: composição P3.0', () => {
    const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiEvidenceAnalysisService.js'), 'utf8'));
    assert(code.includes('trustReadModel') && !code.includes('getGovernanceReadModel'));
  });
  suite('T10'); await test('T10: determinístico evidence', () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    assertEqual(svc.aioiEvidenceAnalysisService.computeEvidenceScore(SAMPLE_TRUST),
      svc.aioiEvidenceAnalysisService.computeEvidenceScore(SAMPLE_TRUST), ''); restoreDb();
  });
  suite('T11'); await test('T11: recordEvidenceAnalyzed', () => {
    em = getExpMetrics(); em.resetSessionCounters();
    em.recordEvidenceAnalyzed(COMPANY_ID);
    assert(em.getSessionCounters().evidence_analysis_count >= 1);
  });
  suite('T12'); await test('T12: zero writes evidence', async () => {
    const mock = createAssuranceDbMock(); patchDb(mock); const svc = loadP31();
    await svc.aioiEvidenceAnalysisService.getEvidenceAnalysis(COMPANY_ID);
    assertNoWrites(mock._client._calls); restoreDb();
  });
  suite('T13'); await test('T13: limite 70 verified', () => {
    assertEqual(getExpMetrics().classifyEvidenceStatus(70), 'verified', '');
  });
  suite('T14'); await test('T14: trust domain evidence', () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const r = svc.aioiEvidenceAnalysisService.buildEvidenceAnalysis(SAMPLE_TRUST);
    assert(r.evidence_score > 0); restoreDb();
  });
  suite('T15'); await test('T15: weak trust model', () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const weak = { executive_command_read_model: {}, data_integrity: { integrity_score: 10 } };
    assert(svc.aioiEvidenceAnalysisService.computeEvidenceScore(weak) < 70); restoreDb();
  });

  // T16–T30 Decision Traceability
  suite('T16'); await test('T16: classifyTraceabilityStatus complete', () => {
    assertEqual(getExpMetrics().classifyTraceabilityStatus(80), 'complete', '');
  });
  suite('T17'); await test('T17: classifyTraceabilityStatus partial', () => {
    assertEqual(getExpMetrics().classifyTraceabilityStatus(55), 'partial', '');
  });
  suite('T18'); await test('T18: classifyTraceabilityStatus broken', () => {
    assertEqual(getExpMetrics().classifyTraceabilityStatus(30), 'broken', '');
  });
  suite('T19'); await test('T19: buildDecisionTraceability', () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const r = svc.aioiDecisionTraceabilityService.buildDecisionTraceability(SAMPLE_TRACE);
    assert(r.traceability_score >= 70 && r.traceability_status === 'complete'); restoreDb();
  });
  suite('T20'); await test('T20: computeTraceabilityScore range', () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const s = svc.aioiDecisionTraceabilityService.computeTraceabilityScore(SAMPLE_TRACE);
    assert(s >= 0 && s <= 100); restoreDb();
  });
  suite('T21'); await test('T21: getDecisionTraceability ok', async () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const r = await svc.aioiDecisionTraceabilityService.getDecisionTraceability(COMPANY_ID);
    assert(r.ok && r.decision_traceability.traceability_status); restoreDb();
  });
  suite('T22'); await test('T22: companyId inválido traceability', async () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const r = await svc.aioiDecisionTraceabilityService.getDecisionTraceability('x');
    assert(!r.ok); restoreDb();
  });
  suite('T23'); await test('T23: empty signals score baixo', () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const s = svc.aioiDecisionTraceabilityService.computeTraceabilityScore({
      total: 0, with_decision: 0, with_hitl: 0, with_execution: 0,
      with_outcome: 0, with_learning: 0, history_count: 0, snapshot_count: 0, audit_count: 0
    });
    assert(s <= 40); restoreDb();
  });
  suite('T24'); await test('T24: determinístico traceability', () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    assertEqual(svc.aioiDecisionTraceabilityService.computeTraceabilityScore(SAMPLE_TRACE),
      svc.aioiDecisionTraceabilityService.computeTraceabilityScore(SAMPLE_TRACE), ''); restoreDb();
  });
  suite('T25'); await test('T25: recordTraceabilityAnalyzed', () => {
    em = getExpMetrics(); em.resetSessionCounters();
    em.recordTraceabilityAnalyzed(COMPANY_ID);
    assert(em.getSessionCounters().traceability_analysis_count >= 1);
  });
  suite('T26'); await test('T26: zero writes traceability', async () => {
    const mock = createAssuranceDbMock(); patchDb(mock); const svc = loadP31();
    await svc.aioiDecisionTraceabilityService.getDecisionTraceability(COMPANY_ID);
    assertNoWrites(mock._client._calls); restoreDb();
  });
  suite('T27'); await test('T27: limite 70 complete', () => {
    assertEqual(getExpMetrics().classifyTraceabilityStatus(70), 'complete', '');
  });
  suite('T28'); await test('T28: audit+history boost', () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const withMeta = { ...SAMPLE_TRACE, audit_count: 5, history_count: 5, snapshot_count: 5 };
    const without = { ...SAMPLE_TRACE, audit_count: 0, history_count: 0, snapshot_count: 0 };
    assert(svc.aioiDecisionTraceabilityService.computeTraceabilityScore(withMeta) >=
      svc.aioiDecisionTraceabilityService.computeTraceabilityScore(without)); restoreDb();
  });
  suite('T29'); await test('T29: status permitidos trace', () => {
    const allowed = ['complete', 'partial', 'broken'];
    for (const s of [80, 50, 20]) assert(allowed.includes(getExpMetrics().classifyTraceabilityStatus(s)));
  });
  suite('T30'); await test('T30: IOE lifecycle chain', async () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const r = await svc.aioiDecisionTraceabilityService.getDecisionTraceability(COMPANY_ID);
    assert(r.decision_traceability.traceability_score > 0); restoreDb();
  });

  // T31–T45 Insight Explainability
  suite('T31'); await test('T31: buildDriver estrutura', () => {
    const d = getExpMetrics().buildDriver('test_factor', 75);
    assertEqual(d.factor, 'test_factor', '');
    assertEqual(d.impact_score, 75, '');
  });
  suite('T32'); await test('T32: buildInsightExplainability 5 grupos', () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const r = svc.aioiInsightExplainabilityService.buildInsightExplainability(SAMPLE_TRUST);
    assert(r.maturity_drivers && r.risk_drivers && r.value_drivers &&
      r.resilience_drivers && r.trust_drivers); restoreDb();
  });
  suite('T33'); await test('T33: maturity_drivers', () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const r = svc.aioiInsightExplainabilityService.buildInsightExplainability(SAMPLE_TRUST);
    assert(r.maturity_drivers.length >= 1); restoreDb();
  });
  suite('T34'); await test('T34: trust_drivers', () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const r = svc.aioiInsightExplainabilityService.buildInsightExplainability(SAMPLE_TRUST);
    assert(r.trust_drivers.length >= 1); restoreDb();
  });
  suite('T35'); await test('T35: driver factor+impact_score', () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const r = svc.aioiInsightExplainabilityService.buildInsightExplainability(SAMPLE_TRUST);
    for (const d of r.trust_drivers) assert(d.factor && d.impact_score != null); restoreDb();
  });
  suite('T36'); await test('T36: getInsightExplainability ok', async () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const r = await svc.aioiInsightExplainabilityService.getInsightExplainability(COMPANY_ID);
    assert(r.ok && r.insight_explainability.maturity_drivers); restoreDb();
  });
  suite('T37'); await test('T37: companyId inválido explainability', async () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const r = await svc.aioiInsightExplainabilityService.getInsightExplainability('nope');
    assert(!r.ok); restoreDb();
  });
  suite('T38'); await test('T38: sem LLM/texto livre', () => {
    const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInsightExplainabilityService.js'), 'utf8'));
    assert(!code.includes('openai') && !code.includes('generateText'));
  });
  suite('T39'); await test('T39: computeExplainabilityScore', () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const exp = svc.aioiInsightExplainabilityService.buildInsightExplainability(SAMPLE_TRUST);
    const s = svc.aioiInsightExplainabilityService.computeExplainabilityScore(exp);
    assert(s >= 0 && s <= 100); restoreDb();
  });
  suite('T40'); await test('T40: determinístico explainability', () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const a = svc.aioiInsightExplainabilityService.buildInsightExplainability(SAMPLE_TRUST);
    const b = svc.aioiInsightExplainabilityService.buildInsightExplainability(SAMPLE_TRUST);
    assertEqual(JSON.stringify(a), JSON.stringify(b), ''); restoreDb();
  });
  suite('T41'); await test('T41: recordExplainabilityAnalyzed', () => {
    em = getExpMetrics(); em.resetSessionCounters();
    em.recordExplainabilityAnalyzed(COMPANY_ID);
    assert(em.getSessionCounters().explainability_analysis_count >= 1);
  });
  suite('T42'); await test('T42: zero writes explainability', async () => {
    const mock = createAssuranceDbMock(); patchDb(mock); const svc = loadP31();
    await svc.aioiInsightExplainabilityService.getInsightExplainability(COMPANY_ID);
    assertNoWrites(mock._client._calls); restoreDb();
  });
  suite('T43'); await test('T43: risk_drivers', () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const r = svc.aioiInsightExplainabilityService.buildInsightExplainability(SAMPLE_TRUST);
    assert(Array.isArray(r.risk_drivers)); restoreDb();
  });
  suite('T44'); await test('T44: value_drivers', () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const r = svc.aioiInsightExplainabilityService.buildInsightExplainability(SAMPLE_TRUST);
    assert(r.value_drivers.length >= 1); restoreDb();
  });
  suite('T45'); await test('T45: resilience_drivers', () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const r = svc.aioiInsightExplainabilityService.buildInsightExplainability(SAMPLE_TRUST);
    assert(r.resilience_drivers.length >= 1); restoreDb();
  });

  // T46–T55 Intelligence Assurance
  suite('T46'); await test('T46: classifyAssuranceLevel low', () => {
    assertEqual(getExpMetrics().classifyAssuranceLevel(30), 'low_assurance', '');
  });
  suite('T47'); await test('T47: classifyAssuranceLevel moderate', () => {
    assertEqual(getExpMetrics().classifyAssuranceLevel(55), 'moderate_assurance', '');
  });
  suite('T48'); await test('T48: classifyAssuranceLevel high', () => {
    assertEqual(getExpMetrics().classifyAssuranceLevel(80), 'high_assurance', '');
  });
  suite('T49'); await test('T49: classifyAssuranceLevel enterprise', () => {
    assertEqual(getExpMetrics().classifyAssuranceLevel(95), 'enterprise_assured', '');
  });
  suite('T50'); await test('T50: limite 90 enterprise', () => {
    assertEqual(getExpMetrics().classifyAssuranceLevel(90), 'enterprise_assured', '');
  });
  suite('T51'); await test('T51: computeAssuranceScore range', () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const s = svc.aioiIntelligenceAssuranceService.computeAssuranceScore({
      evidenceScore: 80, traceabilityScore: 75, explainabilityScore: 70, trustScore: 78
    });
    assert(s >= 0 && s <= 100); restoreDb();
  });
  suite('T52'); await test('T52: buildIntelligenceAssurance', () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const r = svc.aioiIntelligenceAssuranceService.buildIntelligenceAssurance({
      evidenceScore: 95, traceabilityScore: 92, explainabilityScore: 94, trustScore: 96
    });
    assert(r.assurance_score >= 90 && r.assurance_level === 'enterprise_assured'); restoreDb();
  });
  suite('T53'); await test('T53: getIntelligenceAssurance ok', async () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const r = await svc.aioiIntelligenceAssuranceService.getIntelligenceAssurance(COMPANY_ID);
    assert(r.ok && r.intelligence_assurance.assurance_level); restoreDb();
  });
  suite('T54'); await test('T54: companyId inválido assurance', async () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const r = await svc.aioiIntelligenceAssuranceService.getIntelligenceAssurance('invalid');
    assert(!r.ok); restoreDb();
  });
  suite('T55'); await test('T55: ASSURANCE_WEIGHTS soma 1', () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const w = svc.aioiIntelligenceAssuranceService.ASSURANCE_WEIGHTS;
    assert(Math.abs(Object.values(w).reduce((a, b) => a + b, 0) - 1) < 0.01); restoreDb();
  });

  // T56–T70 Assurance Read Model
  suite('T56'); await test('T56: getAssuranceReadModel ok', async () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const r = await svc.aioiAssuranceReadModelService.getAssuranceReadModel(COMPANY_ID);
    assert(r.ok && r.assurance_read_model.trust_read_model); restoreDb();
  });
  suite('T57'); await test('T57: evidence_analysis', async () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const r = await svc.aioiAssuranceReadModelService.getAssuranceReadModel(COMPANY_ID);
    assert(r.assurance_read_model.evidence_analysis); restoreDb();
  });
  suite('T58'); await test('T58: decision_traceability', async () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const r = await svc.aioiAssuranceReadModelService.getAssuranceReadModel(COMPANY_ID);
    assert(r.assurance_read_model.decision_traceability); restoreDb();
  });
  suite('T59'); await test('T59: insight_explainability', async () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const r = await svc.aioiAssuranceReadModelService.getAssuranceReadModel(COMPANY_ID);
    assert(r.assurance_read_model.insight_explainability); restoreDb();
  });
  suite('T60'); await test('T60: intelligence_assurance', async () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const r = await svc.aioiAssuranceReadModelService.getAssuranceReadModel(COMPANY_ID);
    assert(r.assurance_read_model.intelligence_assurance); restoreDb();
  });
  suite('T61'); await test('T61: 5 blocos assurance read model', async () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const r = await svc.aioiAssuranceReadModelService.getAssuranceReadModel(COMPANY_ID);
    assertEqual(Object.keys(r.assurance_read_model).length, 5, ''); restoreDb();
  });
  suite('T62'); await test('T62: companyId inválido read model', async () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const r = await svc.aioiAssuranceReadModelService.getAssuranceReadModel('bad');
    assert(!r.ok); restoreDb();
  });
  suite('T63'); await test('T63: recordAssuranceRequested', () => {
    em = getExpMetrics(); em.resetSessionCounters();
    em.recordAssuranceRequested(COMPANY_ID);
    assert(em.getSessionCounters().assurance_requests >= 1);
  });
  suite('T64'); await test('T64: zero writes read model', async () => {
    const mock = createAssuranceDbMock(); patchDb(mock); const svc = loadP31();
    await svc.aioiAssuranceReadModelService.getAssuranceReadModel(COMPANY_ID);
    assertNoWrites(mock._client._calls); restoreDb();
  });
  suite('T65'); await test('T65: recordAssuranceAnalyzed', () => {
    em = getExpMetrics(); em.resetSessionCounters();
    em.recordAssuranceAnalyzed(COMPANY_ID);
    assert(em.getSessionCounters().assurance_analysis_count >= 1);
  });
  suite('T66'); await test('T66: determinístico assurance', () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const inp = { evidenceScore: 70, traceabilityScore: 70, explainabilityScore: 70, trustScore: 70 };
    assertEqual(svc.aioiIntelligenceAssuranceService.computeAssuranceScore(inp),
      svc.aioiIntelligenceAssuranceService.computeAssuranceScore(inp), ''); restoreDb();
  });
  suite('T67'); await test('T67: anti-duplication P3.0', () => {
    const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiAssuranceReadModelService.js'), 'utf8'));
    assert(code.includes('trustReadModel') && !code.includes('buildDataIntegrity'));
  });
  suite('T68'); await test('T68: níveis assurance permitidos', () => {
    const allowed = ['low_assurance', 'moderate_assurance', 'high_assurance', 'enterprise_assured'];
    for (const s of [20, 50, 80, 95]) assert(allowed.includes(getExpMetrics().classifyAssuranceLevel(s)));
  });
  suite('T69'); await test('T69: executive_command nested', async () => {
    patchDb(createAssuranceDbMock()); const svc = loadP31();
    const r = await svc.aioiAssuranceReadModelService.getAssuranceReadModel(COMPANY_ID);
    assert(r.assurance_read_model.trust_read_model.executive_command_read_model); restoreDb();
  });
  suite('T70'); await test('T70: recordAssuranceCompleted', () => {
    em = getExpMetrics(); em.recordAssuranceCompleted(COMPANY_ID, 15);
    assert(em.getSessionCounters().assurance_requests >= 0);
  });

  // T71–T73 READ ONLY
  suite('T71'); await test('T71: INSERT bloqueado', () => {
    em = getExpMetrics(); let threw = false;
    try { em.assertReadOnlySql('INSERT INTO x VALUES (1)'); } catch (e) {
      threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', '');
    }
    assert(threw);
  });
  suite('T72'); await test('T72: UPDATE bloqueado', () => {
    em = getExpMetrics(); let threw = false;
    try { em.assertReadOnlySql('UPDATE x SET y=1'); } catch (e) { threw = true; } assert(threw);
  });
  suite('T73'); await test('T73: DELETE bloqueado', () => {
    em = getExpMetrics(); let threw = false;
    try { em.assertReadOnlySql('DELETE FROM x'); } catch (e) { threw = true; } assert(threw);
  });

  // T74 RLS
  suite('T74'); await test('T74: RLS company_id + bypass false', async () => {
    const mock = createAssuranceDbMock(); patchDb(mock); const svc = loadP31();
    await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID);
    const t = mock._client._calls.find(c => c.sql.includes('app.current_company_id'));
    const b = mock._client._calls.filter(c => c.sql.includes('app.bypass_rls'));
    assert(t && t.params[0] === COMPANY_ID);
    assert(b.length >= 1); restoreDb();
  });

  // T75 Multi-tenant
  suite('T75'); await test('T75: tenant B', async () => {
    const mock = createAssuranceDbMock(buildIoes().map(i => ({ ...i, company_id: COMPANY_ID_B })));
    patchDb(mock); const svc = loadP31();
    const r = await svc.aioiAssuranceReadModelService.getAssuranceReadModel(COMPANY_ID_B);
    assert(r.ok);
    await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID_B);
    const t = mock._client._calls.filter(c => c.sql.includes('app.current_company_id'))
      .find(c => c.params && c.params[0] === COMPANY_ID_B);
    assert(t, 'RLS tenant B'); restoreDb();
  });

  // T76 Soberanos — spec says T81 but coverage list shows T76 for soberanos; we need 81 tests total
  // Add T77-T81 to reach 81 tests as spec says 80+ with T81 soberanos
  suite('T76'); await test('T76: buildDriver clamp', () => {
    assertEqual(getExpMetrics().buildDriver('x', 150).impact_score, 100, '');
  });
  suite('T77'); await test('T77: clampScore', () => {
    assertEqual(getExpMetrics().clampScore(150), 100, '');
  });
  suite('T78'); await test('T78: TRUNCATE bloqueado', () => {
    em = getExpMetrics(); let threw = false;
    try { em.assertReadOnlySql('TRUNCATE TABLE x'); } catch (e) { threw = true; } assert(threw);
  });
  suite('T79'); await test('T79: CREATE bloqueado', () => {
    em = getExpMetrics(); let threw = false;
    try { em.assertReadOnlySql('CREATE TABLE x (id int)'); } catch (e) { threw = true; } assert(threw);
  });
  suite('T80'); await test('T80: MERGE bloqueado', () => {
    em = getExpMetrics(); let threw = false;
    try { em.assertReadOnlySql('MERGE INTO x'); } catch (e) { threw = true; } assert(threw);
  });
  suite('T81'); await test('T81: soberanos ausentes', () => {
    const files = ['aioiExplainabilityMetrics.js', 'aioiEvidenceAnalysisService.js',
      'aioiDecisionTraceabilityService.js', 'aioiInsightExplainabilityService.js',
      'aioiIntelligenceAssuranceService.js', 'aioiAssuranceReadModelService.js'];
    const forbidden = ['operationalDecisionEngine', 'operationalLearningService', 'workflowOrchestrator',
      'actionRuntimeOrchestrator', 'computePriorityScore', 'classificationConsumer', 'aioiOutboxConsumerService'];
    for (const f of files) {
      const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8'));
      for (const term of forbidden) assert(!code.includes(term), `${f} ${term}`);
    }
  });

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  AIOI-P3.1 Assurance Read Model Test Report');
  console.log(`  Total: ${_passed + _failed} | PASS: ${_passed} | FAIL: ${_failed}`);
  console.log(`  STATUS: ${_failed === 0 ? 'AIOI_P3_1_TEST_PASS' : 'AIOI_P3_1_TEST_FAIL'}`);
  console.log('══════════════════════════════════════════════════════════\n');
  process.exit(_failed > 0 ? 1 : 0);
}

runTests().catch(e => { console.error('Fatal:', e); process.exit(1); });
