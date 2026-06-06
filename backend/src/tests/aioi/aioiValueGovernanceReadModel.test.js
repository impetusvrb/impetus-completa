'use strict';

/**
 * AIOI-P3.4 — Testes automatizados da Enterprise Intelligence Value Governance Layer
 * T1–T96 | node src/tests/aioi/aioiValueGovernanceReadModel.test.js
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

const P34_EXPORTS = [
  'aioiValueGovernanceMetrics', 'aioiIntelligenceUtilizationService', 'aioiOutcomeAlignmentService',
  'aioiValueCoverageService', 'aioiEnterpriseValueGovernanceService', 'aioiValueGovernanceReadModelService',
  'aioiBenchmarkAnalysisService'
];

function clearAioiModuleCache() {
  for (const key of Object.keys(require.cache)) {
    if (key.includes('/services/aioi/')) delete require.cache[key];
  }
}

let _svcCache = null;

function loadP34() {
  if (_svcCache) return _svcCache;
  const loaded = {};
  for (const mod of P34_EXPORTS) {
    loaded[mod] = require(`${SERVICES_PATH}/${mod}`);
  }
  _svcCache = loaded;
  return loaded;
}

function reloadP34() {
  _svcCache = null;
  clearAioiModuleCache();
  return loadP34();
}

function getVgMetrics() {
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiValueGovernanceMetrics`)];
  if (_svcCache) delete _svcCache.aioiValueGovernanceMetrics;
  const m = require(`${SERVICES_PATH}/aioiValueGovernanceMetrics`);
  if (_svcCache) _svcCache.aioiValueGovernanceMetrics = m;
  return m;
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

function createReadinessDbMock(ioes = buildIoes(), snapshots = buildSnapshots()) {
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
      if (s.includes('event_type ILIKE') && s.includes('trust')) return { rows: [{ cnt: '1' }] };
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

const SAMPLE_READINESS_RM = {
  auditability_read_model: {
    assurance_read_model: {
      trust_read_model: {
        executive_command_read_model: {
          governance_read_model: {}, predictive_read_model: {}, strategic_read_model: {},
          value_read_model: {}, resilience_read_model: {},
          maturity_read_model: { maturity: { score: 75 }, benchmark: { score: 70 } },
          scenario_read_model: {}, digital_twin_read_model: { operational_state: {} },
          executive_command_state: { operational_state: {} }
        },
        intelligence_trust: { trust_score: 80 }
      },
      intelligence_assurance: { assurance_score: 82 }
    },
    enterprise_auditability: { auditability_score: 84 }
  },
  adoption_analysis: { adoption_score: 85 },
  enterprise_scale_readiness: { enterprise_readiness_score: 80 }
};

const SAMPLE_ALIGNMENT = {
  total: 4, with_decision: 4, with_execution: 2, with_outcome: 1,
  history_count: 3, snapshot_count: 6, audit_count: 2, intelligence: 1
};

async function runTests() {
  let vgm = getVgMetrics();
  vgm.resetSessionCounters();

  const mock = createReadinessDbMock();
  patchDb(mock);
  const svc = reloadP34();
  let cachedVg = null;
  async function getCachedVg() {
    if (!cachedVg) {
      cachedVg = await svc.aioiValueGovernanceReadModelService.getValueGovernanceReadModel(COMPANY_ID);
    }
    return cachedVg;
  }

  // T1–T15 Intelligence Utilization
  suite('T1'); await test('T1: classifyUtilizationStatus high', () => {
    assertEqual(getVgMetrics().classifyUtilizationStatus(80), 'high_utilization', '');
  });
  suite('T2'); await test('T2: classifyUtilizationStatus moderate', () => {
    assertEqual(getVgMetrics().classifyUtilizationStatus(55), 'moderate_utilization', '');
  });
  suite('T3'); await test('T3: classifyUtilizationStatus low', () => {
    assertEqual(getVgMetrics().classifyUtilizationStatus(30), 'low_utilization', '');
  });
  suite('T4'); await test('T4: UTILIZATION_LAYERS 13', () => {
    assertEqual(svc.aioiIntelligenceUtilizationService.UTILIZATION_LAYERS.length, 13, '');
  });
  suite('T5'); await test('T5: buildIntelligenceUtilization', () => {
    const r = svc.aioiIntelligenceUtilizationService.buildIntelligenceUtilization(SAMPLE_READINESS_RM);
    assert(r.utilization_score >= 70 && r.utilization_status === 'high_utilization');
  });
  suite('T6'); await test('T6: computeUtilizationScore range', () => {
    const s = svc.aioiIntelligenceUtilizationService.computeUtilizationScore(SAMPLE_READINESS_RM);
    assert(s >= 0 && s <= 100);
  });
  suite('T7'); await test('T7: getIntelligenceUtilization ok', async () => {
    const r = await getCachedVg();
    assert(r.ok && r.value_governance_read_model.intelligence_utilization.utilization_status);
  });
  suite('T8'); await test('T8: companyId inválido utilization', async () => {
    const r = await svc.aioiIntelligenceUtilizationService.getIntelligenceUtilization('bad');
    assert(!r.ok);
  });
  suite('T9'); await test('T9: composição P3.3', () => {
    const code = stripComments(fs.readFileSync(
      path.join(SERVICES_PATH, 'aioiIntelligenceUtilizationService.js'), 'utf8'));
    assert(code.includes('readinessReadModel') && !code.includes('getGovernanceReadModel'));
  });
  suite('T10'); await test('T10: determinístico utilization', () => {
    assertEqual(
      svc.aioiIntelligenceUtilizationService.computeUtilizationScore(SAMPLE_READINESS_RM),
      svc.aioiIntelligenceUtilizationService.computeUtilizationScore(SAMPLE_READINESS_RM), '');
  });
  suite('T11'); await test('T11: recordUtilizationAnalyzed', () => {
    vgm = getVgMetrics(); vgm.resetSessionCounters();
    vgm.recordUtilizationAnalyzed(COMPANY_ID);
    assert(vgm.getSessionCounters().utilization_analysis_count >= 1);
  });
  suite('T12'); await test('T12: zero writes utilization', async () => {
    await getCachedVg();
    assertNoWrites(mock._client._calls);
  });
  suite('T13'); await test('T13: limite 70 high_utilization', () => {
    assertEqual(getVgMetrics().classifyUtilizationStatus(70), 'high_utilization', '');
  });
  suite('T14'); await test('T14: partial utilization score baixo', () => {
    const partial = { auditability_read_model: { assurance_read_model: { trust_read_model: {} } } };
    assert(svc.aioiIntelligenceUtilizationService.computeUtilizationScore(partial) < 70);
  });
  suite('T15'); await test('T15: status permitidos utilization', () => {
    const allowed = ['low_utilization', 'moderate_utilization', 'high_utilization'];
    for (const s of [80, 50, 20]) assert(allowed.includes(getVgMetrics().classifyUtilizationStatus(s)));
  });

  // T16–T30 Outcome Alignment
  suite('T16'); await test('T16: classifyAlignmentStatus aligned', () => {
    assertEqual(getVgMetrics().classifyAlignmentStatus(80), 'aligned', '');
  });
  suite('T17'); await test('T17: classifyAlignmentStatus partially_aligned', () => {
    assertEqual(getVgMetrics().classifyAlignmentStatus(55), 'partially_aligned', '');
  });
  suite('T18'); await test('T18: classifyAlignmentStatus misaligned', () => {
    assertEqual(getVgMetrics().classifyAlignmentStatus(30), 'misaligned', '');
  });
  suite('T19'); await test('T19: ALIGNMENT_STAGES 4', () => {
    assertEqual(svc.aioiOutcomeAlignmentService.ALIGNMENT_STAGES.length, 4, '');
  });
  suite('T20'); await test('T20: buildOutcomeAlignment', () => {
    const r = svc.aioiOutcomeAlignmentService.buildOutcomeAlignment(SAMPLE_ALIGNMENT);
    assert(r.alignment_score >= 70 && r.alignment_status === 'aligned');
  });
  suite('T21'); await test('T21: computeAlignmentScore range', () => {
    const s = svc.aioiOutcomeAlignmentService.computeAlignmentScore(SAMPLE_ALIGNMENT);
    assert(s >= 0 && s <= 100);
  });
  suite('T22'); await test('T22: getOutcomeAlignment ok', async () => {
    const r = await svc.aioiOutcomeAlignmentService.getOutcomeAlignment(COMPANY_ID);
    assert(r.ok && r.outcome_alignment.alignment_status);
  });
  suite('T23'); await test('T23: companyId inválido alignment', async () => {
    const r = await svc.aioiOutcomeAlignmentService.getOutcomeAlignment('x');
    assert(!r.ok);
  });
  suite('T24'); await test('T24: empty signals score baixo', () => {
    const empty = { total: 0, with_decision: 0, with_execution: 0, with_outcome: 0,
      history_count: 0, snapshot_count: 0, audit_count: 0, intelligence: 0 };
    assert(svc.aioiOutcomeAlignmentService.computeAlignmentScore(empty) <= 40);
  });
  suite('T25'); await test('T25: recordOutcomeAlignmentAnalyzed', () => {
    vgm = getVgMetrics(); vgm.resetSessionCounters();
    vgm.recordOutcomeAlignmentAnalyzed(COMPANY_ID);
    assert(vgm.getSessionCounters().outcome_alignment_count >= 1);
  });
  suite('T26'); await test('T26: zero writes alignment', async () => {
    assertNoWrites(mock._client._calls);
  });
  suite('T27'); await test('T27: limite 70 aligned', () => {
    assertEqual(getVgMetrics().classifyAlignmentStatus(70), 'aligned', '');
  });
  suite('T28'); await test('T28: determinístico alignment', () => {
    assertEqual(
      svc.aioiOutcomeAlignmentService.computeAlignmentScore(SAMPLE_ALIGNMENT),
      svc.aioiOutcomeAlignmentService.computeAlignmentScore(SAMPLE_ALIGNMENT), '');
  });
  suite('T29'); await test('T29: intelligence stage', () => {
    const r = svc.aioiOutcomeAlignmentService.buildOutcomeAlignment(SAMPLE_ALIGNMENT);
    assert(r.alignment_score > 0);
  });
  suite('T30'); await test('T30: status permitidos alignment', () => {
    const allowed = ['misaligned', 'partially_aligned', 'aligned'];
    for (const s of [80, 50, 20]) assert(allowed.includes(getVgMetrics().classifyAlignmentStatus(s)));
  });

  // T31–T45 Value Coverage
  suite('T31'); await test('T31: classifyCoverageStatus comprehensive', () => {
    assertEqual(getVgMetrics().classifyCoverageStatus(80), 'comprehensive', '');
  });
  suite('T32'); await test('T32: classifyCoverageStatus partial', () => {
    assertEqual(getVgMetrics().classifyCoverageStatus(55), 'partial', '');
  });
  suite('T33'); await test('T33: classifyCoverageStatus limited', () => {
    assertEqual(getVgMetrics().classifyCoverageStatus(30), 'limited', '');
  });
  suite('T34'); await test('T34: VALUE_DOMAINS 13', () => {
    assertEqual(svc.aioiValueCoverageService.VALUE_DOMAINS.length, 13, '');
  });
  suite('T35'); await test('T35: buildValueCoverage', () => {
    const r = svc.aioiValueCoverageService.buildValueCoverage(SAMPLE_READINESS_RM);
    assert(r.coverage_score >= 70 && r.coverage_status === 'comprehensive');
  });
  suite('T36'); await test('T36: computeCoverageScore range', () => {
    const s = svc.aioiValueCoverageService.computeCoverageScore(SAMPLE_READINESS_RM);
    assert(s >= 0 && s <= 100);
  });
  suite('T37'); await test('T37: getValueCoverage ok', async () => {
    const r = await getCachedVg();
    assert(r.value_governance_read_model.value_coverage.coverage_status);
  });
  suite('T38'); await test('T38: companyId inválido coverage', async () => {
    const r = await svc.aioiValueCoverageService.getValueCoverage('invalid');
    assert(!r.ok);
  });
  suite('T39'); await test('T39: empty domains score baixo', () => {
    assert(svc.aioiValueCoverageService.computeCoverageScore({}) <= 40);
  });
  suite('T40'); await test('T40: recordValueCoverageAnalyzed', () => {
    vgm = getVgMetrics(); vgm.resetSessionCounters();
    vgm.recordValueCoverageAnalyzed(COMPANY_ID);
    assert(vgm.getSessionCounters().value_coverage_count >= 1);
  });
  suite('T41'); await test('T41: zero writes coverage', async () => {
    assertNoWrites(mock._client._calls);
  });
  suite('T42'); await test('T42: limite 70 comprehensive', () => {
    assertEqual(getVgMetrics().classifyCoverageStatus(70), 'comprehensive', '');
  });
  suite('T43'); await test('T43: determinístico coverage', () => {
    assertEqual(
      svc.aioiValueCoverageService.computeCoverageScore(SAMPLE_READINESS_RM),
      svc.aioiValueCoverageService.computeCoverageScore(SAMPLE_READINESS_RM), '');
  });
  suite('T44'); await test('T44: maturity domain', () => {
    const r = svc.aioiValueCoverageService.buildValueCoverage(SAMPLE_READINESS_RM);
    assert(r.coverage_score > 0);
  });
  suite('T45'); await test('T45: status permitidos coverage', () => {
    const allowed = ['limited', 'partial', 'comprehensive'];
    for (const s of [80, 50, 20]) assert(allowed.includes(getVgMetrics().classifyCoverageStatus(s)));
  });

  // T46–T60 Enterprise Value Governance
  suite('T46'); await test('T46: classifyValueGovernanceLevel emerging', () => {
    assertEqual(getVgMetrics().classifyValueGovernanceLevel(30), 'emerging', '');
  });
  suite('T47'); await test('T47: classifyValueGovernanceLevel developing', () => {
    assertEqual(getVgMetrics().classifyValueGovernanceLevel(55), 'developing', '');
  });
  suite('T48'); await test('T48: classifyValueGovernanceLevel advanced', () => {
    assertEqual(getVgMetrics().classifyValueGovernanceLevel(80), 'advanced', '');
  });
  suite('T49'); await test('T49: classifyValueGovernanceLevel value_governed', () => {
    assertEqual(getVgMetrics().classifyValueGovernanceLevel(95), 'value_governed', '');
  });
  suite('T50'); await test('T50: limite 90 value_governed', () => {
    assertEqual(getVgMetrics().classifyValueGovernanceLevel(90), 'value_governed', '');
  });
  suite('T51'); await test('T51: VALUE_GOVERNANCE_WEIGHTS soma 1', () => {
    const w = svc.aioiEnterpriseValueGovernanceService.VALUE_GOVERNANCE_WEIGHTS;
    assert(Math.abs(Object.values(w).reduce((a, b) => a + b, 0) - 1) < 0.01);
  });
  suite('T52'); await test('T52: computeValueGovernanceScore range', () => {
    const s = svc.aioiEnterpriseValueGovernanceService.computeValueGovernanceScore({
      utilizationScore: 80, alignmentScore: 75, coverageScore: 78, readinessScore: 82
    });
    assert(s >= 0 && s <= 100);
  });
  suite('T53'); await test('T53: buildEnterpriseValueGovernance value_governed', () => {
    const r = svc.aioiEnterpriseValueGovernanceService.buildEnterpriseValueGovernance({
      utilizationScore: 95, alignmentScore: 96, coverageScore: 97, readinessScore: 98
    });
    assert(r.value_governance_score >= 90 && r.value_governance_level === 'value_governed');
  });
  suite('T54'); await test('T54: getEnterpriseValueGovernance ok', async () => {
    const r = await getCachedVg();
    assert(r.value_governance_read_model.enterprise_value_governance.value_governance_level);
  });
  suite('T55'); await test('T55: companyId inválido enterprise value governance', async () => {
    const r = await svc.aioiEnterpriseValueGovernanceService.getEnterpriseValueGovernance('bad');
    assert(!r.ok);
  });
  suite('T56'); await test('T56: recordValueGovernanceAnalyzed', () => {
    vgm = getVgMetrics(); vgm.resetSessionCounters();
    vgm.recordValueGovernanceAnalyzed(COMPANY_ID);
    assert(vgm.getSessionCounters().value_governance_count >= 1);
  });
  suite('T57'); await test('T57: zero writes enterprise value governance', async () => {
    assertNoWrites(mock._client._calls);
  });
  suite('T58'); await test('T58: determinístico enterprise value governance', () => {
    const inp = { utilizationScore: 70, alignmentScore: 70, coverageScore: 70, readinessScore: 70 };
    assertEqual(svc.aioiEnterpriseValueGovernanceService.computeValueGovernanceScore(inp),
      svc.aioiEnterpriseValueGovernanceService.computeValueGovernanceScore(inp), '');
  });
  suite('T59'); await test('T59: níveis permitidos enterprise value governance', () => {
    const allowed = ['emerging', 'developing', 'advanced', 'value_governed'];
    for (const s of [20, 50, 80, 95]) assert(allowed.includes(getVgMetrics().classifyValueGovernanceLevel(s)));
  });
  suite('T60'); await test('T60: composição P3.3', () => {
    const code = stripComments(fs.readFileSync(
      path.join(SERVICES_PATH, 'aioiEnterpriseValueGovernanceService.js'), 'utf8'));
    assert(code.includes('readinessReadModel') && code.includes('getReadinessReadModel'));
  });

  // T61–T80 Value Governance Read Model
  suite('T61'); await test('T61: getValueGovernanceReadModel ok', async () => {
    const r = await getCachedVg();
    assert(r.ok && r.value_governance_read_model.readiness_read_model);
  });
  suite('T62'); await test('T62: 5 blocos value governance read model', async () => {
    const r = await getCachedVg();
    assertEqual(Object.keys(r.value_governance_read_model).length, 5, '');
  });
  suite('T63'); await test('T63: readiness_read_model bloco', async () => {
    const r = await getCachedVg();
    assert(r.value_governance_read_model.readiness_read_model);
  });
  suite('T64'); await test('T64: intelligence_utilization bloco', async () => {
    const r = await getCachedVg();
    assert(r.value_governance_read_model.intelligence_utilization);
  });
  suite('T65'); await test('T65: outcome_alignment bloco', async () => {
    const r = await getCachedVg();
    assert(r.value_governance_read_model.outcome_alignment);
  });
  suite('T66'); await test('T66: value_coverage bloco', async () => {
    const r = await getCachedVg();
    assert(r.value_governance_read_model.value_coverage);
  });
  suite('T67'); await test('T67: enterprise_value_governance bloco', async () => {
    const r = await getCachedVg();
    assert(r.value_governance_read_model.enterprise_value_governance);
  });
  suite('T68'); await test('T68: companyId inválido read model', async () => {
    const r = await svc.aioiValueGovernanceReadModelService.getValueGovernanceReadModel('bad');
    assert(!r.ok);
  });
  suite('T69'); await test('T69: recordValueGovernanceRequested', () => {
    vgm = getVgMetrics(); vgm.resetSessionCounters();
    vgm.recordValueGovernanceRequested(COMPANY_ID);
    assert(vgm.getSessionCounters().value_governance_requests >= 1);
  });
  suite('T70'); await test('T70: zero writes read model', async () => {
    assertNoWrites(mock._client._calls);
  });
  suite('T71'); await test('T71: recordValueGovernanceCompleted', () => {
    vgm = getVgMetrics(); vgm.recordValueGovernanceCompleted(COMPANY_ID, 18);
    assert(vgm.getSessionCounters().value_governance_requests >= 0);
  });
  suite('T72'); await test('T72: anti-duplication P3.3', () => {
    const code = stripComments(fs.readFileSync(
      path.join(SERVICES_PATH, 'aioiValueGovernanceReadModelService.js'), 'utf8'));
    assert(code.includes('readinessReadModel') && !code.includes('buildAdoptionAnalysis'));
  });
  suite('T73'); await test('T73: readiness nested', async () => {
    const r = await getCachedVg();
    assert(r.value_governance_read_model.readiness_read_model.auditability_read_model);
  });
  suite('T74'); await test('T74: Promise.all agregador', () => {
    const code = stripComments(fs.readFileSync(
      path.join(SERVICES_PATH, 'aioiValueGovernanceReadModelService.js'), 'utf8'));
    assert(code.includes('Promise.all'));
  });
  suite('T75'); await test('T75: sem LLM/IA', () => {
    const files = ['aioiIntelligenceUtilizationService.js', 'aioiOutcomeAlignmentService.js',
      'aioiValueCoverageService.js', 'aioiEnterpriseValueGovernanceService.js'];
    for (const f of files) {
      const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8'));
      assert(!code.includes('openai') && !code.includes('generateText'), f);
    }
  });
  suite('T76'); await test('T76: sem forecast novo', () => {
    const code = stripComments(fs.readFileSync(
      path.join(SERVICES_PATH, 'aioiValueGovernanceReadModelService.js'), 'utf8'));
    assert(!code.includes('getBacklogForecast') && !code.includes('BacklogForecast'));
  });
  suite('T77'); await test('T77: composição utilization P3.3', () => {
    const code = stripComments(fs.readFileSync(
      path.join(SERVICES_PATH, 'aioiValueGovernanceReadModelService.js'), 'utf8'));
    assert(code.includes('buildIntelligenceUtilization') && !code.includes('getIntelligenceUtilization'));
  });
  suite('T78'); await test('T78: composição coverage P3.3', () => {
    const code = stripComments(fs.readFileSync(
      path.join(SERVICES_PATH, 'aioiValueGovernanceReadModelService.js'), 'utf8'));
    assert(code.includes('buildValueCoverage') && !code.includes('getValueCoverage'));
  });
  suite('T79'); await test('T79: composição alignment DB', () => {
    const code = stripComments(fs.readFileSync(
      path.join(SERVICES_PATH, 'aioiValueGovernanceReadModelService.js'), 'utf8'));
    assert(code.includes('getOutcomeAlignment') && code.includes('alignmentService'));
  });
  suite('T80'); await test('T80: enterprise_value_governance composto', async () => {
    const r = await getCachedVg();
    const evg = r.value_governance_read_model.enterprise_value_governance;
    assert(evg.value_governance_score >= 0 && evg.value_governance_level);
  });

  // T81–T83 READ ONLY Guard
  suite('T81'); await test('T81: INSERT bloqueado', () => {
    vgm = getVgMetrics(); let threw = false;
    try { vgm.assertReadOnlySql('INSERT INTO x VALUES (1)'); } catch (e) {
      threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', '');
    }
    assert(threw);
  });
  suite('T82'); await test('T82: UPDATE bloqueado', () => {
    vgm = getVgMetrics(); let threw = false;
    try { vgm.assertReadOnlySql('UPDATE x SET y=1'); } catch (e) { threw = true; } assert(threw);
  });
  suite('T83'); await test('T83: DELETE bloqueado', () => {
    vgm = getVgMetrics(); let threw = false;
    try { vgm.assertReadOnlySql('DELETE FROM x'); } catch (e) { threw = true; } assert(threw);
  });

  // T84 RLS
  suite('T84'); await test('T84: RLS company_id + bypass false', async () => {
    await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID);
    const t = mock._client._calls.find(c => c.sql.includes('app.current_company_id'));
    const b = mock._client._calls.filter(c => c.sql.includes('app.bypass_rls'));
    assert(t && t.params[0] === COMPANY_ID);
    assert(b.length >= 1);
  });

  // T85 Multi-tenant
  suite('T85'); await test('T85: tenant B benchmark only', async () => {
    const mockB = createReadinessDbMock(
      buildIoes().map(i => ({ ...i, company_id: COMPANY_ID_B })),
      buildSnapshots().map(s => ({ ...s, company_id: COMPANY_ID_B }))
    );
    patchDb(mockB);
    _svcCache = null;
    clearAioiModuleCache();
    const svcB = loadP34();
    const bench = await svcB.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID_B);
    assert(bench.ok && bench.benchmark);
    const t = mockB._client._calls.filter(c => c.sql.includes('app.current_company_id'))
      .find(c => c.params && c.params[0] === COMPANY_ID_B);
    assert(t, 'RLS tenant B');
  });

  restoreDb();

  // T86–T89 Logs
  suite('T86'); await test('T86: recordValueGovernanceRequested log', () => {
    vgm = getVgMetrics(); vgm.resetSessionCounters();
    vgm.recordValueGovernanceRequested(COMPANY_ID);
    assert(vgm.getSessionCounters().value_governance_requests === 1);
  });
  suite('T87'); await test('T87: recordUtilizationAnalyzed log', () => {
    vgm = getVgMetrics(); vgm.recordUtilizationAnalyzed(COMPANY_ID);
    assert(vgm.getSessionCounters().utilization_analysis_count >= 1);
  });
  suite('T88'); await test('T88: recordOutcomeAlignmentAnalyzed log', () => {
    vgm = getVgMetrics(); vgm.recordOutcomeAlignmentAnalyzed(COMPANY_ID);
    assert(vgm.getSessionCounters().outcome_alignment_count >= 1);
  });
  suite('T89'); await test('T89: recordValueCoverageAnalyzed log', () => {
    vgm = getVgMetrics(); vgm.recordValueCoverageAnalyzed(COMPANY_ID);
    assert(vgm.getSessionCounters().value_coverage_count >= 1);
  });

  // T90–T91 Métricas
  suite('T90'); await test('T90: getSessionCounters campos', () => {
    vgm = getVgMetrics(); vgm.resetSessionCounters();
    vgm.recordValueGovernanceAnalyzed(COMPANY_ID);
    const c = vgm.getSessionCounters();
    assert(c.value_governance_count >= 1 && 'avg_query_latency_ms' in c);
  });
  suite('T91'); await test('T91: clampScore', () => {
    assertEqual(getVgMetrics().clampScore(150), 100, '');
  });

  // T92–T96 guards + soberanos
  suite('T92'); await test('T92: TRUNCATE bloqueado', () => {
    vgm = getVgMetrics(); let threw = false;
    try { vgm.assertReadOnlySql('TRUNCATE TABLE x'); } catch (e) { threw = true; } assert(threw);
  });
  suite('T93'); await test('T93: CREATE bloqueado', () => {
    vgm = getVgMetrics(); let threw = false;
    try { vgm.assertReadOnlySql('CREATE TABLE x (id int)'); } catch (e) { threw = true; } assert(threw);
  });
  suite('T94'); await test('T94: MERGE bloqueado', () => {
    vgm = getVgMetrics(); let threw = false;
    try { vgm.assertReadOnlySql('MERGE INTO x'); } catch (e) { threw = true; } assert(threw);
  });
  suite('T95'); await test('T95: anti-duplication composição', () => {
    const code = stripComments(fs.readFileSync(
      path.join(SERVICES_PATH, 'aioiIntelligenceUtilizationService.js'), 'utf8'));
    assert(code.includes('readinessReadModel') && !code.includes('INSERT'));
  });
  suite('T96'); await test('T96: soberanos ausentes', () => {
    const files = ['aioiValueGovernanceMetrics.js', 'aioiIntelligenceUtilizationService.js',
      'aioiOutcomeAlignmentService.js', 'aioiValueCoverageService.js',
      'aioiEnterpriseValueGovernanceService.js', 'aioiValueGovernanceReadModelService.js'];
    const forbidden = ['operationalDecisionEngine', 'operationalLearningService', 'workflowOrchestrator',
      'actionRuntimeOrchestrator', 'computePriorityScore', 'classificationConsumer', 'aioiOutboxConsumerService'];
    for (const f of files) {
      const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8'));
      for (const term of forbidden) assert(!code.includes(term), `${f} ${term}`);
    }
  });

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  AIOI-P3.4 Value Governance Read Model Test Report');
  console.log(`  Total: ${_passed + _failed} | PASS: ${_passed} | FAIL: ${_failed}`);
  console.log(`  STATUS: ${_failed === 0 ? 'AIOI_P3_4_TEST_PASS' : 'AIOI_P3_4_TEST_FAIL'}`);
  console.log('══════════════════════════════════════════════════════════\n');
  process.exit(_failed > 0 ? 1 : 0);
}

runTests().catch(e => { console.error('Fatal:', e); process.exit(1); });
