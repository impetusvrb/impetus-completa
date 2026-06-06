'use strict';

/**
 * AIOI-P3.2 — Testes automatizados da Enterprise Intelligence Compliance & Auditability Layer
 * T1–T86 | node src/tests/aioi/aioiAuditabilityReadModel.test.js
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

const P32_MODULES = [
  'aioiAuditabilityMetrics', 'aioiIntelligenceComplianceService', 'aioiAuditCoverageService',
  'aioiEvidenceChainService', 'aioiGovernanceCoverageService', 'aioiEnterpriseAuditabilityService',
  'aioiAuditabilityReadModelService',
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

function loadP32() {
  const loaded = {};
  for (const mod of P32_MODULES) {
    delete require.cache[require.resolve(`${SERVICES_PATH}/${mod}`)];
    loaded[mod] = require(`${SERVICES_PATH}/${mod}`);
  }
  return loaded;
}
function getAuditMetrics() {
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiAuditabilityMetrics`)];
  return require(`${SERVICES_PATH}/aioiAuditabilityMetrics`);
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

function _ioeCounts(filtered) {
  return {
    total: filtered.length,
    with_decision: filtered.filter(i => i.decision_type).length,
    with_hitl: filtered.filter(i => i.approved_by_user_id).length,
    with_approval: filtered.filter(i => i.approved_by_user_id).length,
    with_execution: filtered.filter(i => i.workflow_instance_id || i.execution_trace_id).length,
    with_outcome: filtered.filter(i => i.decision_payload?.aioi_outcome).length,
    with_learning: filtered.filter(i =>
      i.decision_payload?.aioi_learning_processed || i.decision_payload?.aioi_learning_submitted).length
  };
}

function createAuditabilityDbMock(ioes = buildIoes(), snapshots = buildSnapshots()) {
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

      if (s.includes('decision_type IS NOT NULL')) {
        const c = _ioeCounts(filtered);
        const row = { total: String(c.total), with_decision: String(c.with_decision),
          with_hitl: String(c.with_hitl), with_execution: String(c.with_execution),
          with_outcome: String(c.with_outcome), with_learning: String(c.with_learning) };
        if (s.includes('with_approval')) row.with_approval = String(c.with_approval);
        return { rows: [row] };
      }
      if (s.includes('event_type ILIKE') && s.includes('trust')) {
        return { rows: [{ cnt: '1' }] };
      }
      if (s.includes('event_type ILIKE') && (s.includes('assurance') || s.includes('compliance'))) {
        return { rows: [{ cnt: '1' }] };
      }
      if (s.includes('aioi_audit_events') && s.includes('COUNT') && !s.includes('ILIKE')) {
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

const SAMPLE_LAYER = {
  governance_read_model: { ok: true, governance_read_model: {} },
  predictive_governance_read_model: { ok: true, predictive_governance_read_model: {} },
  executive_maturity_read_model: { ok: true, executive_maturity_read_model: {} },
  strategic_read_model: { ok: true, strategic_read_model: {} },
  value_read_model: { ok: true, value_read_model: {} },
  resilience_read_model: { ok: true, resilience_read_model: {} },
  scenario_read_model: { ok: true, scenario_read_model: {} },
  digital_twin_read_model: { ok: true, digital_twin_read_model: {} },
  executive_command_read_model: { ok: true, executive_command_read_model: {} },
  trust_read_model: { ok: true, trust_read_model: { intelligence_trust: { trust_score: 80 } } },
  assurance_read_model: { ok: true, assurance_read_model: { intelligence_assurance: { assurance_score: 85 } } }
};

const SAMPLE_ASSURANCE_RM = {
  trust_read_model: {
    executive_command_read_model: {
      governance_read_model: {}, predictive_read_model: {},
      maturity_read_model: { maturity: { score: 70 }, benchmark: { score: 65 } },
      strategic_read_model: {}, value_read_model: {},
      resilience_read_model: {}, scenario_read_model: {},
      digital_twin_read_model: { operational_state: {} },
      executive_command_state: { operational_state: {} }
    },
    intelligence_trust: { trust_score: 77 }
  },
  intelligence_assurance: { assurance_score: 82, assurance_level: 'high_assurance' }
};

const SAMPLE_COVERAGE = {
  events: 4, decisions: 4, hitl: 3, execution: 2, outcomes: 1,
  learning: 1, snapshots: 6, trust: 1, assurance: 1, history_count: 3
};

const SAMPLE_CHAIN = {
  total: 4, with_decision: 4, with_approval: 3, with_execution: 2,
  with_outcome: 1, with_learning: 1, intelligence: 1, trust: 1, assurance: 1
};

async function runTests() {
  let am = getAuditMetrics();
  am.resetSessionCounters();

  // T1–T15 Intelligence Compliance
  suite('T1'); await test('T1: classifyComplianceStatus compliant', () => {
    assertEqual(getAuditMetrics().classifyComplianceStatus(80), 'compliant', '');
  });
  suite('T2'); await test('T2: classifyComplianceStatus attention', () => {
    assertEqual(getAuditMetrics().classifyComplianceStatus(55), 'attention', '');
  });
  suite('T3'); await test('T3: classifyComplianceStatus non_compliant', () => {
    assertEqual(getAuditMetrics().classifyComplianceStatus(30), 'non_compliant', '');
  });
  suite('T4'); await test('T4: COMPLIANCE_LAYERS 11', () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    assertEqual(svc.aioiIntelligenceComplianceService.COMPLIANCE_LAYERS.length, 11, ''); restoreDb();
  });
  suite('T5'); await test('T5: buildIntelligenceCompliance', () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const r = svc.aioiIntelligenceComplianceService.buildIntelligenceCompliance(SAMPLE_LAYER);
    assert(r.compliance_score >= 70 && r.compliance_status === 'compliant'); restoreDb();
  });
  suite('T6'); await test('T6: computeComplianceScore range', () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const s = svc.aioiIntelligenceComplianceService.computeComplianceScore(SAMPLE_LAYER);
    assert(s >= 0 && s <= 100); restoreDb();
  });
  suite('T7'); await test('T7: getIntelligenceCompliance ok', async () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const r = await svc.aioiIntelligenceComplianceService.getIntelligenceCompliance(COMPANY_ID);
    assert(r.ok && r.intelligence_compliance.compliance_status); restoreDb();
  });
  suite('T8'); await test('T8: companyId inválido compliance', async () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const r = await svc.aioiIntelligenceComplianceService.getIntelligenceCompliance('bad');
    assert(!r.ok); restoreDb();
  });
  suite('T9'); await test('T9: composição 11 read models', () => {
    const code = stripComments(fs.readFileSync(
      path.join(SERVICES_PATH, 'aioiIntelligenceComplianceService.js'), 'utf8'));
    assert(code.includes('getAssuranceReadModel') && code.includes('getGovernanceReadModel'));
  });
  suite('T10'); await test('T10: determinístico compliance', () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    assertEqual(svc.aioiIntelligenceComplianceService.computeComplianceScore(SAMPLE_LAYER),
      svc.aioiIntelligenceComplianceService.computeComplianceScore(SAMPLE_LAYER), ''); restoreDb();
  });
  suite('T11'); await test('T11: recordComplianceAnalyzed', () => {
    am = getAuditMetrics(); am.resetSessionCounters();
    am.recordComplianceAnalyzed(COMPANY_ID);
    assert(am.getSessionCounters().compliance_analysis_count >= 1);
  });
  suite('T12'); await test('T12: zero writes compliance', async () => {
    const mock = createAuditabilityDbMock(); patchDb(mock); const svc = loadP32();
    await svc.aioiIntelligenceComplianceService.getIntelligenceCompliance(COMPANY_ID);
    assertNoWrites(mock._client._calls); restoreDb();
  });
  suite('T13'); await test('T13: limite 70 compliant', () => {
    assertEqual(getAuditMetrics().classifyComplianceStatus(70), 'compliant', '');
  });
  suite('T14'); await test('T14: layer parcial score', () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const partial = { governance_read_model: { ok: true, governance_read_model: {} } };
    assert(svc.aioiIntelligenceComplianceService.computeComplianceScore(partial) < 70); restoreDb();
  });
  suite('T15'); await test('T15: status permitidos compliance', () => {
    const allowed = ['compliant', 'attention', 'non_compliant'];
    for (const s of [80, 50, 20]) assert(allowed.includes(getAuditMetrics().classifyComplianceStatus(s)));
  });

  // T16–T30 Audit Coverage
  suite('T16'); await test('T16: classifyCoverageStatus full', () => {
    assertEqual(getAuditMetrics().classifyCoverageStatus(80), 'full', '');
  });
  suite('T17'); await test('T17: classifyCoverageStatus partial', () => {
    assertEqual(getAuditMetrics().classifyCoverageStatus(55), 'partial', '');
  });
  suite('T18'); await test('T18: classifyCoverageStatus insufficient', () => {
    assertEqual(getAuditMetrics().classifyCoverageStatus(30), 'insufficient', '');
  });
  suite('T19'); await test('T19: COVERAGE_ELEMENTS 9', () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    assertEqual(svc.aioiAuditCoverageService.COVERAGE_ELEMENTS.length, 9, ''); restoreDb();
  });
  suite('T20'); await test('T20: buildAuditCoverage', () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const r = svc.aioiAuditCoverageService.buildAuditCoverage(SAMPLE_COVERAGE);
    assert(r.coverage_score >= 70 && r.coverage_status === 'full'); restoreDb();
  });
  suite('T21'); await test('T21: computeCoverageScore range', () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const s = svc.aioiAuditCoverageService.computeCoverageScore(SAMPLE_COVERAGE);
    assert(s >= 0 && s <= 100); restoreDb();
  });
  suite('T22'); await test('T22: getAuditCoverage ok', async () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const r = await svc.aioiAuditCoverageService.getAuditCoverage(COMPANY_ID);
    assert(r.ok && r.audit_coverage.coverage_status); restoreDb();
  });
  suite('T23'); await test('T23: companyId inválido coverage', async () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const r = await svc.aioiAuditCoverageService.getAuditCoverage('x');
    assert(!r.ok); restoreDb();
  });
  suite('T24'); await test('T24: empty coverage score baixo', () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const s = svc.aioiAuditCoverageService.computeCoverageScore({
      events: 0, decisions: 0, hitl: 0, execution: 0, outcomes: 0,
      learning: 0, snapshots: 0, trust: 0, assurance: 0, history_count: 0
    });
    assert(s <= 40); restoreDb();
  });
  suite('T25'); await test('T25: recordAuditCoverageAnalyzed', () => {
    am = getAuditMetrics(); am.resetSessionCounters();
    am.recordAuditCoverageAnalyzed(COMPANY_ID);
    assert(am.getSessionCounters().audit_coverage_count >= 1);
  });
  suite('T26'); await test('T26: zero writes coverage', async () => {
    const mock = createAuditabilityDbMock(); patchDb(mock); const svc = loadP32();
    await svc.aioiAuditCoverageService.getAuditCoverage(COMPANY_ID);
    assertNoWrites(mock._client._calls); restoreDb();
  });
  suite('T27'); await test('T27: limite 70 full', () => {
    assertEqual(getAuditMetrics().classifyCoverageStatus(70), 'full', '');
  });
  suite('T28'); await test('T28: determinístico coverage', () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    assertEqual(svc.aioiAuditCoverageService.computeCoverageScore(SAMPLE_COVERAGE),
      svc.aioiAuditCoverageService.computeCoverageScore(SAMPLE_COVERAGE), ''); restoreDb();
  });
  suite('T29'); await test('T29: events element covered', () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const full = { ...SAMPLE_COVERAGE, events: 5 };
    assert(svc.aioiAuditCoverageService.computeCoverageScore(full) >=
      svc.aioiAuditCoverageService.computeCoverageScore({ ...SAMPLE_COVERAGE, events: 0 })); restoreDb();
  });
  suite('T30'); await test('T30: status permitidos coverage', () => {
    const allowed = ['full', 'partial', 'insufficient'];
    for (const s of [80, 50, 20]) assert(allowed.includes(getAuditMetrics().classifyCoverageStatus(s)));
  });

  // T31–T45 Evidence Chain
  suite('T31'); await test('T31: classifyChainStatus verified', () => {
    assertEqual(getAuditMetrics().classifyChainStatus(80), 'verified', '');
  });
  suite('T32'); await test('T32: classifyChainStatus partial', () => {
    assertEqual(getAuditMetrics().classifyChainStatus(55), 'partial', '');
  });
  suite('T33'); await test('T33: classifyChainStatus broken', () => {
    assertEqual(getAuditMetrics().classifyChainStatus(30), 'broken', '');
  });
  suite('T34'); await test('T34: CHAIN_STAGES 9', () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    assertEqual(svc.aioiEvidenceChainService.CHAIN_STAGES.length, 9, ''); restoreDb();
  });
  suite('T35'); await test('T35: buildEvidenceChain', () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const r = svc.aioiEvidenceChainService.buildEvidenceChain(SAMPLE_CHAIN);
    assert(r.chain_score >= 70 && r.chain_status === 'verified'); restoreDb();
  });
  suite('T36'); await test('T36: computeChainScore range', () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const s = svc.aioiEvidenceChainService.computeChainScore(SAMPLE_CHAIN);
    assert(s >= 0 && s <= 100); restoreDb();
  });
  suite('T37'); await test('T37: getEvidenceChain ok', async () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const r = await svc.aioiEvidenceChainService.getEvidenceChain(COMPANY_ID);
    assert(r.ok && r.evidence_chain.chain_status); restoreDb();
  });
  suite('T38'); await test('T38: companyId inválido chain', async () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const r = await svc.aioiEvidenceChainService.getEvidenceChain('nope');
    assert(!r.ok); restoreDb();
  });
  suite('T39'); await test('T39: empty chain score baixo', () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const s = svc.aioiEvidenceChainService.computeChainScore({
      total: 0, with_decision: 0, with_approval: 0, with_execution: 0,
      with_outcome: 0, with_learning: 0, intelligence: 0, trust: 0, assurance: 0
    });
    assert(s <= 40); restoreDb();
  });
  suite('T40'); await test('T40: determinístico chain', () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    assertEqual(svc.aioiEvidenceChainService.computeChainScore(SAMPLE_CHAIN),
      svc.aioiEvidenceChainService.computeChainScore(SAMPLE_CHAIN), ''); restoreDb();
  });
  suite('T41'); await test('T41: recordEvidenceChainAnalyzed', () => {
    am = getAuditMetrics(); am.resetSessionCounters();
    am.recordEvidenceChainAnalyzed(COMPANY_ID);
    assert(am.getSessionCounters().evidence_chain_count >= 1);
  });
  suite('T42'); await test('T42: zero writes chain', async () => {
    const mock = createAuditabilityDbMock(); patchDb(mock); const svc = loadP32();
    await svc.aioiEvidenceChainService.getEvidenceChain(COMPANY_ID);
    assertNoWrites(mock._client._calls); restoreDb();
  });
  suite('T43'); await test('T43: limite 70 verified', () => {
    assertEqual(getAuditMetrics().classifyChainStatus(70), 'verified', '');
  });
  suite('T44'); await test('T44: intelligence stage boost', () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const withIntel = { ...SAMPLE_CHAIN, intelligence: 1, trust: 1, assurance: 1 };
    const without = { ...SAMPLE_CHAIN, intelligence: 0, trust: 0, assurance: 0 };
    assert(svc.aioiEvidenceChainService.computeChainScore(withIntel) >=
      svc.aioiEvidenceChainService.computeChainScore(without)); restoreDb();
  });
  suite('T45'); await test('T45: status permitidos chain', () => {
    const allowed = ['verified', 'partial', 'broken'];
    for (const s of [80, 50, 20]) assert(allowed.includes(getAuditMetrics().classifyChainStatus(s)));
  });

  // T46–T60 Governance Coverage
  suite('T46'); await test('T46: classifyGovernanceStatus complete', () => {
    assertEqual(getAuditMetrics().classifyGovernanceStatus(80), 'complete', '');
  });
  suite('T47'); await test('T47: classifyGovernanceStatus partial', () => {
    assertEqual(getAuditMetrics().classifyGovernanceStatus(55), 'partial', '');
  });
  suite('T48'); await test('T48: classifyGovernanceStatus missing', () => {
    assertEqual(getAuditMetrics().classifyGovernanceStatus(30), 'missing', '');
  });
  suite('T49'); await test('T49: GOVERNANCE_DOMAINS 11', () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    assertEqual(svc.aioiGovernanceCoverageService.GOVERNANCE_DOMAINS.length, 11, ''); restoreDb();
  });
  suite('T50'); await test('T50: buildGovernanceCoverage', () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const r = svc.aioiGovernanceCoverageService.buildGovernanceCoverage(SAMPLE_ASSURANCE_RM);
    assert(r.governance_score >= 70 && r.governance_status === 'complete'); restoreDb();
  });
  suite('T51'); await test('T51: computeGovernanceScore range', () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const s = svc.aioiGovernanceCoverageService.computeGovernanceScore(SAMPLE_ASSURANCE_RM);
    assert(s >= 0 && s <= 100); restoreDb();
  });
  suite('T52'); await test('T52: getGovernanceCoverage ok', async () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const r = await svc.aioiGovernanceCoverageService.getGovernanceCoverage(COMPANY_ID);
    assert(r.ok && r.governance_coverage.governance_status); restoreDb();
  });
  suite('T53'); await test('T53: companyId inválido governance', async () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const r = await svc.aioiGovernanceCoverageService.getGovernanceCoverage('invalid');
    assert(!r.ok); restoreDb();
  });
  suite('T54'); await test('T54: composição P3.1', () => {
    const code = stripComments(fs.readFileSync(
      path.join(SERVICES_PATH, 'aioiGovernanceCoverageService.js'), 'utf8'));
    assert(code.includes('assuranceReadModel') && !code.includes('getGovernanceReadModel'));
  });
  suite('T55'); await test('T55: determinístico governance', () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    assertEqual(svc.aioiGovernanceCoverageService.computeGovernanceScore(SAMPLE_ASSURANCE_RM),
      svc.aioiGovernanceCoverageService.computeGovernanceScore(SAMPLE_ASSURANCE_RM), ''); restoreDb();
  });
  suite('T56'); await test('T56: recordGovernanceCoverageAnalyzed', () => {
    am = getAuditMetrics(); am.resetSessionCounters();
    am.recordGovernanceCoverageAnalyzed(COMPANY_ID);
    assert(am.getSessionCounters().governance_coverage_count >= 1);
  });
  suite('T57'); await test('T57: zero writes governance', async () => {
    const mock = createAuditabilityDbMock(); patchDb(mock); const svc = loadP32();
    await svc.aioiGovernanceCoverageService.getGovernanceCoverage(COMPANY_ID);
    assertNoWrites(mock._client._calls); restoreDb();
  });
  suite('T58'); await test('T58: limite 70 complete', () => {
    assertEqual(getAuditMetrics().classifyGovernanceStatus(70), 'complete', '');
  });
  suite('T59'); await test('T59: domain trust present', () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const r = svc.aioiGovernanceCoverageService.buildGovernanceCoverage(SAMPLE_ASSURANCE_RM);
    assert(r.governance_score > 0); restoreDb();
  });
  suite('T60'); await test('T60: status permitidos governance', () => {
    const allowed = ['complete', 'partial', 'missing'];
    for (const s of [80, 50, 20]) assert(allowed.includes(getAuditMetrics().classifyGovernanceStatus(s)));
  });

  // T61–T75 Enterprise Auditability + Read Model
  suite('T61'); await test('T61: classifyAuditabilityLevel low', () => {
    assertEqual(getAuditMetrics().classifyAuditabilityLevel(30), 'low_auditability', '');
  });
  suite('T62'); await test('T62: classifyAuditabilityLevel moderate', () => {
    assertEqual(getAuditMetrics().classifyAuditabilityLevel(55), 'moderate_auditability', '');
  });
  suite('T63'); await test('T63: classifyAuditabilityLevel high', () => {
    assertEqual(getAuditMetrics().classifyAuditabilityLevel(80), 'high_auditability', '');
  });
  suite('T64'); await test('T64: classifyAuditabilityLevel enterprise', () => {
    assertEqual(getAuditMetrics().classifyAuditabilityLevel(95), 'enterprise_auditable', '');
  });
  suite('T65'); await test('T65: limite 90 enterprise', () => {
    assertEqual(getAuditMetrics().classifyAuditabilityLevel(90), 'enterprise_auditable', '');
  });
  suite('T66'); await test('T66: AUDITABILITY_WEIGHTS soma 1', () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const w = svc.aioiEnterpriseAuditabilityService.AUDITABILITY_WEIGHTS;
    assert(Math.abs(Object.values(w).reduce((a, b) => a + b, 0) - 1) < 0.01); restoreDb();
  });
  suite('T67'); await test('T67: computeAuditabilityScore range', () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const s = svc.aioiEnterpriseAuditabilityService.computeAuditabilityScore({
      complianceScore: 80, coverageScore: 75, chainScore: 70, governanceScore: 78
    });
    assert(s >= 0 && s <= 100); restoreDb();
  });
  suite('T68'); await test('T68: buildEnterpriseAuditability', () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const r = svc.aioiEnterpriseAuditabilityService.buildEnterpriseAuditability({
      complianceScore: 95, coverageScore: 92, chainScore: 94, governanceScore: 96
    });
    assert(r.auditability_score >= 90 && r.auditability_level === 'enterprise_auditable'); restoreDb();
  });
  suite('T69'); await test('T69: getEnterpriseAuditability ok', async () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const r = await svc.aioiEnterpriseAuditabilityService.getEnterpriseAuditability(COMPANY_ID);
    assert(r.ok && r.enterprise_auditability.auditability_level); restoreDb();
  });
  suite('T70'); await test('T70: companyId inválido auditability', async () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const r = await svc.aioiEnterpriseAuditabilityService.getEnterpriseAuditability('bad');
    assert(!r.ok); restoreDb();
  });
  suite('T71'); await test('T71: getAuditabilityReadModel ok', async () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const r = await svc.aioiAuditabilityReadModelService.getAuditabilityReadModel(COMPANY_ID);
    assert(r.ok && r.auditability_read_model.assurance_read_model); restoreDb();
  });
  suite('T72'); await test('T72: 6 blocos auditability read model', async () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const r = await svc.aioiAuditabilityReadModelService.getAuditabilityReadModel(COMPANY_ID);
    assertEqual(Object.keys(r.auditability_read_model).length, 6, ''); restoreDb();
  });
  suite('T73'); await test('T73: intelligence_compliance bloco', async () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const r = await svc.aioiAuditabilityReadModelService.getAuditabilityReadModel(COMPANY_ID);
    assert(r.auditability_read_model.intelligence_compliance); restoreDb();
  });
  suite('T74'); await test('T74: enterprise_auditability bloco', async () => {
    patchDb(createAuditabilityDbMock()); const svc = loadP32();
    const r = await svc.aioiAuditabilityReadModelService.getAuditabilityReadModel(COMPANY_ID);
    assert(r.auditability_read_model.enterprise_auditability); restoreDb();
  });
  suite('T75'); await test('T75: zero writes read model', async () => {
    const mock = createAuditabilityDbMock(); patchDb(mock); const svc = loadP32();
    await svc.aioiAuditabilityReadModelService.getAuditabilityReadModel(COMPANY_ID);
    assertNoWrites(mock._client._calls); restoreDb();
  });

  // T76–T78 READ ONLY Guard
  suite('T76'); await test('T76: INSERT bloqueado', () => {
    am = getAuditMetrics(); let threw = false;
    try { am.assertReadOnlySql('INSERT INTO x VALUES (1)'); } catch (e) {
      threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', '');
    }
    assert(threw);
  });
  suite('T77'); await test('T77: UPDATE bloqueado', () => {
    am = getAuditMetrics(); let threw = false;
    try { am.assertReadOnlySql('UPDATE x SET y=1'); } catch (e) { threw = true; } assert(threw);
  });
  suite('T78'); await test('T78: DELETE bloqueado', () => {
    am = getAuditMetrics(); let threw = false;
    try { am.assertReadOnlySql('DELETE FROM x'); } catch (e) { threw = true; } assert(threw);
  });

  // T79 RLS
  suite('T79'); await test('T79: RLS company_id + bypass false', async () => {
    const mock = createAuditabilityDbMock(); patchDb(mock); const svc = loadP32();
    await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID);
    const t = mock._client._calls.find(c => c.sql.includes('app.current_company_id'));
    const b = mock._client._calls.filter(c => c.sql.includes('app.bypass_rls'));
    assert(t && t.params[0] === COMPANY_ID);
    assert(b.length >= 1); restoreDb();
  });

  // T80 Multi-tenant
  suite('T80'); await test('T80: tenant B', async () => {
    const mock = createAuditabilityDbMock(buildIoes().map(i => ({ ...i, company_id: COMPANY_ID_B })));
    patchDb(mock); const svc = loadP32();
    const r = await svc.aioiAuditabilityReadModelService.getAuditabilityReadModel(COMPANY_ID_B);
    assert(r.ok);
    await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID_B);
    const t = mock._client._calls.filter(c => c.sql.includes('app.current_company_id'))
      .find(c => c.params && c.params[0] === COMPANY_ID_B);
    assert(t, 'RLS tenant B'); restoreDb();
  });

  // T81–T83 Logs
  suite('T81'); await test('T81: recordAuditabilityRequested', () => {
    am = getAuditMetrics(); am.resetSessionCounters();
    am.recordAuditabilityRequested(COMPANY_ID);
    assert(am.getSessionCounters().auditability_requests >= 1);
  });
  suite('T82'); await test('T82: recordAuditabilityCompleted', () => {
    am = getAuditMetrics(); am.recordAuditabilityCompleted(COMPANY_ID, 12);
    assert(am.getSessionCounters().auditability_requests >= 0);
  });
  suite('T83'); await test('T83: recordAuditabilityAnalyzed', () => {
    am = getAuditMetrics(); am.resetSessionCounters();
    am.recordAuditabilityAnalyzed(COMPANY_ID);
    assert(am.getSessionCounters().auditability_analysis_count >= 1);
  });

  // T84–T85 Métricas
  suite('T84'); await test('T84: getSessionCounters campos', () => {
    am = getAuditMetrics(); am.resetSessionCounters();
    am.recordComplianceAnalyzed(COMPANY_ID);
    const c = am.getSessionCounters();
    assert(c.compliance_analysis_count >= 1 && 'avg_query_latency_ms' in c);
  });
  suite('T85'); await test('T85: clampScore', () => {
    assertEqual(getAuditMetrics().clampScore(150), 100, '');
  });

  // T86 Soberanos + extra guards
  suite('T86'); await test('T86: soberanos ausentes', () => {
    const files = ['aioiAuditabilityMetrics.js', 'aioiIntelligenceComplianceService.js',
      'aioiAuditCoverageService.js', 'aioiEvidenceChainService.js', 'aioiGovernanceCoverageService.js',
      'aioiEnterpriseAuditabilityService.js', 'aioiAuditabilityReadModelService.js'];
    const forbidden = ['operationalDecisionEngine', 'operationalLearningService', 'workflowOrchestrator',
      'actionRuntimeOrchestrator', 'computePriorityScore', 'classificationConsumer', 'aioiOutboxConsumerService'];
    for (const f of files) {
      const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8'));
      for (const term of forbidden) assert(!code.includes(term), `${f} ${term}`);
    }
  });

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  AIOI-P3.2 Auditability Read Model Test Report');
  console.log(`  Total: ${_passed + _failed} | PASS: ${_passed} | FAIL: ${_failed}`);
  console.log(`  STATUS: ${_failed === 0 ? 'AIOI_P3_2_TEST_PASS' : 'AIOI_P3_2_TEST_FAIL'}`);
  console.log('══════════════════════════════════════════════════════════\n');
  process.exit(_failed > 0 ? 1 : 0);
}

runTests().catch(e => { console.error('Fatal:', e); process.exit(1); });
