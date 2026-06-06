'use strict';

/**
 * AIOI-P3.9 — Testes automatizados da Enterprise Intelligence Stability & Institutionalization Layer
 * T1–T121 | node src/tests/aioi/aioiInstitutionalizationReadModel.test.js
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
function suite(n) { console.log(`\\n[SUITE] ${n}`); }

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

const P39_EXPORTS = [
  'aioiGovernanceExcellenceReadModelService', 'aioiInstitutionalizationMetrics',
  'aioiGovernanceStabilityService', 'aioiInstitutionalizationCoverageService',
  'aioiGovernancePersistenceService', 'aioiEnterpriseInstitutionalizationService',
  'aioiInstitutionalizationReadModelService', 'aioiBenchmarkAnalysisService'
];

function clearAioiModuleCache() {
  for (const key of Object.keys(require.cache)) {
    if (key.includes('/services/aioi/')) delete require.cache[key];
  }
}

let _svcCache = null;

function loadP39() {
  if (_svcCache) return _svcCache;
  const loaded = {};
  for (const mod of P39_EXPORTS) {
    loaded[mod] = require(`${SERVICES_PATH}/${mod}`);
  }
  _svcCache = loaded;
  return loaded;
}

function reloadP39() {
  _svcCache = null;
  clearAioiModuleCache();
  const chainPreload = [
    'aioiGovernanceReadModelService', 'aioiPredictiveGovernanceReadModelService',
    'aioiExecutiveMaturityReadModelService', 'aioiStrategicReadModelService',
    'aioiValueReadModelService', 'aioiResilienceReadModelService',
    'aioiScenarioReadModelService', 'aioiDigitalTwinReadModelService',
    'aioiExecutiveCommandReadModelService', 'aioiTrustReadModelService',
    'aioiAssuranceReadModelService', 'aioiAuditabilityReadModelService',
    'aioiReadinessReadModelService', 'aioiValueGovernanceReadModelService',
    'aioiSustainabilityReadModelService', 'aioiCertificationReadModelService',
    'aioiConformanceReadModelService', 'aioiGovernanceExcellenceReadModelService'
  ];
  for (const mod of chainPreload) require(`${SERVICES_PATH}/${mod}`);
  return loadP39();
}

function getInstMetrics() {
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiInstitutionalizationMetrics`)];
  if (_svcCache) delete _svcCache.aioiInstitutionalizationMetrics;
  const m = require(`${SERVICES_PATH}/aioiInstitutionalizationMetrics`);
  if (_svcCache) _svcCache.aioiInstitutionalizationMetrics = m;
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
      if (s.includes('event_type ILIKE') && (s.includes('assurance') || s.includes('compliance'))) return { rows: [{ cnt: '1' }] };
      if (s.includes('aioi_audit_events') && s.includes('COUNT') && !s.includes('ILIKE')) return { rows: [{ cnt: '2' }] };
      if (s.includes('aioi_processing_history') && s.includes('COUNT') && !s.includes('GROUP BY')) return { rows: [{ cnt: '3' }] };
      if (s.includes('aioi_metrics_snapshots') && s.includes('COUNT') && !s.includes('snapshot_payload')) {
        return { rows: [{ cnt: String(snapStore.filter(x => x.company_id === companyId).length) }] };
      }
      if (s.includes('industrial_operational_events') && s.includes('COUNT')) {
        if (s.includes("'resolved'") || s.includes("'closed'")) return { rows: [{ cnt: String(filtered.filter(i => i.status === 'resolved').length) }] };
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
      if (s.includes("status = 'resolved'") && s.includes('GROUP BY')) return { rows: [{ day: '2026-06-04', cnt: '2' }] };
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
      if (s.includes('GROUP BY priority_band') || s.includes('GROUP BY category') || s.includes('GROUP BY status')) return { rows: [] };
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

const SAMPLE_VGRM = {
  readiness_read_model: {
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
    enterprise_scale_readiness: { enterprise_readiness_score: 78 }
  },
  enterprise_value_governance: { value_governance_score: 85, value_governance_level: 'advanced' },
  intelligence_utilization: { utilization_score: 85 },
  outcome_alignment: { alignment_score: 78 },
  value_coverage: { coverage_score: 88 }
};

const SAMPLE_SRM = {
  value_governance_read_model: SAMPLE_VGRM,
  intelligence_health: { health_score: 82, health_status: 'healthy' },
  governance_continuity: { continuity_score: 85, continuity_status: 'continuous' },
  value_sustainability: { sustainability_score: 81, sustainability_status: 'highly_sustainable' },
  enterprise_sustainability: { enterprise_sustainability_score: 83, enterprise_sustainability_level: 'sustainable' }
};

const SAMPLE_CRM = {
  sustainability_read_model: SAMPLE_SRM,
  certification_readiness: { certification_readiness_score: 82, certification_readiness_status: 'certification_ready' },
  accreditation_coverage: { coverage_score: 88, coverage_status: 'comprehensive' },
  intelligence_maturity_certification: { maturity_score: 84, maturity_level: 'level_4_trusted' },
  enterprise_certification: { certification_score: 86, certification_level: 'certifiable' }
};

const SAMPLE_CONF_RM = {
  certification_read_model: SAMPLE_CRM,
  intelligence_conformance: { conformance_score: 84, conformance_status: 'conformant' },
  standards_coverage: { coverage_score: 88, coverage_status: 'complete' },
  certification_continuity: { continuity_score: 86, continuity_status: 'continuous' },
  enterprise_conformance: { enterprise_conformance_score: 85, enterprise_conformance_level: 'conformant' }
};

const SAMPLE_GERM = {
  conformance_read_model: SAMPLE_CONF_RM,
  governance_maturity: { maturity_score: 82, maturity_status: 'mature' },
  governance_consistency: { consistency_score: 85, consistency_status: 'consistent' },
  governance_excellence_coverage: { coverage_score: 88, coverage_status: 'comprehensive' },
  enterprise_governance_excellence: { governance_excellence_score: 84, governance_excellence_level: 'excellent' }
};

const EMPTY_GERM = { conformance_read_model: {} };

async function runTests() {
  let im = getInstMetrics();
  im.resetSessionCounters();
  const mock = createReadinessDbMock();
  patchDb(mock);
  const svc = reloadP39();
  let cachedInst = null;
  async function getCachedInst() {
    if (!cachedInst) {
      cachedInst = await svc.aioiInstitutionalizationReadModelService.getInstitutionalizationReadModel(COMPANY_ID);
    }
    return cachedInst;
  }

  suite('T1'); await test('T1: classifyGovernanceStability stable', async () => { assertEqual(getInstMetrics().classifyGovernanceStability(80), 'stable', '') });
  suite('T2'); await test('T2: classifyGovernanceStability developing', async () => { assertEqual(getInstMetrics().classifyGovernanceStability(55), 'developing', '') });
  suite('T3'); await test('T3: classifyGovernanceStability unstable', async () => { assertEqual(getInstMetrics().classifyGovernanceStability(30), 'unstable', '') });
  suite('T4'); await test('T4: STABILITY_PILLARS 9', async () => { assertEqual(svc.aioiGovernanceStabilityService.STABILITY_PILLARS.length, 9, '') });
  suite('T5'); await test('T5: buildGovernanceStability', async () => { const r = svc.aioiGovernanceStabilityService.buildGovernanceStability(SAMPLE_GERM); assert(r.stability_score >= 70 && r.stability_status === 'stable') });
  suite('T6'); await test('T6: computeGovernanceStabilityScore range', async () => { const s = svc.aioiGovernanceStabilityService.computeGovernanceStabilityScore(SAMPLE_GERM); assert(s >= 0 && s <= 100) });
  suite('T7'); await test('T7: getGovernanceStability via read model', async () => { const r = await getCachedInst(); assert(r.ok && r.institutionalization_read_model.governance_stability.stability_status) });
  suite('T8'); await test('T8: companyId inválido stability', async () => { const r = await svc.aioiGovernanceStabilityService.getGovernanceStability('bad'); assert(!r.ok) });
  suite('T9'); await test('T9: composição P3.8 governanceExcellenceReadModel', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiGovernanceStabilityService.js'), 'utf8')); assert(code.includes('governanceExcellenceReadModel') && !code.includes('getConformanceReadModel')) });
  suite('T10'); await test('T10: determinístico stability', async () => { assertEqual(svc.aioiGovernanceStabilityService.computeGovernanceStabilityScore(SAMPLE_GERM), svc.aioiGovernanceStabilityService.computeGovernanceStabilityScore(SAMPLE_GERM), '') });
  suite('T11'); await test('T11: recordGovernanceStabilityAnalyzed', async () => { im = getInstMetrics(); im.resetSessionCounters(); im.recordGovernanceStabilityAnalyzed(COMPANY_ID); assert(im.getSessionCounters().governance_stability_count >= 1) });
  suite('T12'); await test('T12: zero writes stability path', async () => { await getCachedInst(); assertNoWrites(mock._client._calls) });
  suite('T13'); await test('T13: limite 70 stable', async () => { assertEqual(getInstMetrics().classifyGovernanceStability(70), 'stable', '') });
  suite('T14'); await test('T14: empty germ score baixo', async () => { assert(svc.aioiGovernanceStabilityService.computeGovernanceStabilityScore(EMPTY_GERM) <= 40) });
  suite('T15'); await test('T15: status permitidos stability', async () => { const allowed = ['unstable', 'developing', 'stable']; for (const s of [80, 50, 20]) assert(allowed.includes(getInstMetrics().classifyGovernanceStability(s))) });
  suite('T16'); await test('T16: _extractInstitutionalizationSignals trust', async () => { assertEqual(getInstMetrics()._extractInstitutionalizationSignals(SAMPLE_GERM).trustScore, 80, '') });
  suite('T17'); await test('T17: _extractInstitutionalizationSignals conformance', async () => { assertEqual(getInstMetrics()._extractInstitutionalizationSignals(SAMPLE_GERM).conformanceScore, 84, '') });
  suite('T18'); await test('T18: _extractInstitutionalizationSignals governance excellence', async () => { assertEqual(getInstMetrics()._extractInstitutionalizationSignals(SAMPLE_GERM).governanceExcellenceScore, 84, '') });
  suite('T19'); await test('T19: pilares incluem governance_excellence', async () => { assert(svc.aioiGovernanceStabilityService.STABILITY_PILLARS.includes('governance_excellence')) });
  suite('T20'); await test('T20: buildGovernanceStability campos', async () => { const r = svc.aioiGovernanceStabilityService.buildGovernanceStability(SAMPLE_GERM); assert('stability_score' in r && 'stability_status' in r) });
  suite('T21'); await test('T21: classifyInstitutionalizationCoverage comprehensive', async () => { assertEqual(getInstMetrics().classifyInstitutionalizationCoverage(80), 'comprehensive', '') });
  suite('T22'); await test('T22: classifyInstitutionalizationCoverage partial', async () => { assertEqual(getInstMetrics().classifyInstitutionalizationCoverage(55), 'partial', '') });
  suite('T23'); await test('T23: classifyInstitutionalizationCoverage limited', async () => { assertEqual(getInstMetrics().classifyInstitutionalizationCoverage(30), 'limited', '') });
  suite('T24'); await test('T24: INSTITUTIONALIZATION_DOMAINS 19', async () => { assertEqual(svc.aioiInstitutionalizationCoverageService.INSTITUTIONALIZATION_DOMAINS.length, 19, '') });
  suite('T25'); await test('T25: buildInstitutionalizationCoverage', async () => { const r = svc.aioiInstitutionalizationCoverageService.buildInstitutionalizationCoverage(SAMPLE_GERM); assert(r.coverage_score >= 70 && r.coverage_status === 'comprehensive') });
  suite('T26'); await test('T26: computeInstitutionalizationCoverageScore range', async () => { const s = svc.aioiInstitutionalizationCoverageService.computeInstitutionalizationCoverageScore(SAMPLE_GERM); assert(s >= 0 && s <= 100) });
  suite('T27'); await test('T27: getInstitutionalizationCoverage ok', async () => { const r = await svc.aioiInstitutionalizationCoverageService.getInstitutionalizationCoverage(COMPANY_ID); assert(r.ok && r.institutionalization_coverage.coverage_status) });
  suite('T28'); await test('T28: companyId inválido coverage', async () => { const r = await svc.aioiInstitutionalizationCoverageService.getInstitutionalizationCoverage('x'); assert(!r.ok) });
  suite('T29'); await test('T29: empty germ coverage baixo', async () => { assert(svc.aioiInstitutionalizationCoverageService.computeInstitutionalizationCoverageScore(EMPTY_GERM) <= 40) });
  suite('T30'); await test('T30: recordInstitutionalizationCoverageAnalyzed', async () => { im = getInstMetrics(); im.recordInstitutionalizationCoverageAnalyzed(COMPANY_ID); assert(im.getSessionCounters().institutionalization_coverage_count >= 1) });
  suite('T31'); await test('T31: zero writes coverage', async () => { assertNoWrites(mock._client._calls) });
  suite('T32'); await test('T32: limite 70 comprehensive', async () => { assertEqual(getInstMetrics().classifyInstitutionalizationCoverage(70), 'comprehensive', '') });
  suite('T33'); await test('T33: determinístico coverage', async () => { assertEqual(svc.aioiInstitutionalizationCoverageService.computeInstitutionalizationCoverageScore(SAMPLE_GERM), svc.aioiInstitutionalizationCoverageService.computeInstitutionalizationCoverageScore(SAMPLE_GERM), '') });
  suite('T34'); await test('T34: domínio governance_excellence', async () => { assert(svc.aioiInstitutionalizationCoverageService.INSTITUTIONALIZATION_DOMAINS.includes('governance_excellence')) });
  suite('T35'); await test('T35: domínio conformance', async () => { assert(svc.aioiInstitutionalizationCoverageService.INSTITUTIONALIZATION_DOMAINS.includes('conformance')) });
  suite('T36'); await test('T36: composição P3.8 coverage', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInstitutionalizationCoverageService.js'), 'utf8')); assert(code.includes('governanceExcellenceReadModel')) });
  suite('T37'); await test('T37: partial germ só trust', async () => { const partial = { conformance_read_model: { certification_read_model: { sustainability_read_model: { value_governance_read_model: { readiness_read_model: { auditability_read_model: { assurance_read_model: { trust_read_model: { intelligence_trust: { trust_score: 75 } } } } } } } } } }; assert(svc.aioiInstitutionalizationCoverageService.computeInstitutionalizationCoverageScore(partial) < 70) });
  suite('T38'); await test('T38: full vs partial coverage', async () => { const full = svc.aioiInstitutionalizationCoverageService.computeInstitutionalizationCoverageScore(SAMPLE_GERM); const partial = svc.aioiInstitutionalizationCoverageService.computeInstitutionalizationCoverageScore({ conformance_read_model: { certification_read_model: { sustainability_read_model: { value_governance_read_model: { readiness_read_model: { auditability_read_model: { assurance_read_model: { trust_read_model: { intelligence_trust: { trust_score: 80 } } } } } } } } } }); assert(full > partial) });
  suite('T39'); await test('T39: limite 40 partial coverage', async () => { assertEqual(getInstMetrics().classifyInstitutionalizationCoverage(40), 'partial', '') });
  suite('T40'); await test('T40: buildInstitutionalizationCoverage campos', async () => { const r = svc.aioiInstitutionalizationCoverageService.buildInstitutionalizationCoverage(SAMPLE_GERM); assert('coverage_score' in r && 'coverage_status' in r) });
  suite('T41'); await test('T41: classifyGovernancePersistence persistent', async () => { assertEqual(getInstMetrics().classifyGovernancePersistence(80), 'persistent', '') });
  suite('T42'); await test('T42: classifyGovernancePersistence partial', async () => { assertEqual(getInstMetrics().classifyGovernancePersistence(55), 'partial', '') });
  suite('T43'); await test('T43: classifyGovernancePersistence fragile', async () => { assertEqual(getInstMetrics().classifyGovernancePersistence(30), 'fragile', '') });
  suite('T44'); await test('T44: PERSISTENCE_STAGES 9', async () => { assertEqual(svc.aioiGovernancePersistenceService.PERSISTENCE_STAGES.length, 9, '') });
  suite('T45'); await test('T45: buildGovernancePersistence', async () => { const r = svc.aioiGovernancePersistenceService.buildGovernancePersistence(SAMPLE_GERM); assert(r.persistence_score >= 70 && r.persistence_status === 'persistent') });
  suite('T46'); await test('T46: computeGovernancePersistenceScore range', async () => { const s = svc.aioiGovernancePersistenceService.computeGovernancePersistenceScore(SAMPLE_GERM); assert(s >= 0 && s <= 100) });
  suite('T47'); await test('T47: getGovernancePersistence ok', async () => { const r = await svc.aioiGovernancePersistenceService.getGovernancePersistence(COMPANY_ID); assert(r.ok && r.governance_persistence.persistence_status) });
  suite('T48'); await test('T48: companyId inválido persistence', async () => { const r = await svc.aioiGovernancePersistenceService.getGovernancePersistence('invalid'); assert(!r.ok) });
  suite('T49'); await test('T49: empty germ persistence baixo', async () => { assert(svc.aioiGovernancePersistenceService.computeGovernancePersistenceScore(EMPTY_GERM) <= 40) });
  suite('T50'); await test('T50: recordGovernancePersistenceAnalyzed', async () => { im = getInstMetrics(); im.recordGovernancePersistenceAnalyzed(COMPANY_ID); assert(im.getSessionCounters().governance_persistence_count >= 1) });
  suite('T51'); await test('T51: cadeia trust→governance_excellence', async () => { const stages = svc.aioiGovernancePersistenceService.PERSISTENCE_STAGES; assertEqual(stages[0], 'trust', ''); assertEqual(stages[8], 'governance_excellence', '') });
  suite('T52'); await test('T52: limite 70 persistent', async () => { assertEqual(getInstMetrics().classifyGovernancePersistence(70), 'persistent', '') });
  suite('T53'); await test('T53: determinístico persistence', async () => { assertEqual(svc.aioiGovernancePersistenceService.computeGovernancePersistenceScore(SAMPLE_GERM), svc.aioiGovernancePersistenceService.computeGovernancePersistenceScore(SAMPLE_GERM), '') });
  suite('T54'); await test('T54: composição P3.8 persistence', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiGovernancePersistenceService.js'), 'utf8')); assert(code.includes('governanceExcellenceReadModel')) });
  suite('T55'); await test('T55: buildGovernancePersistence campos', async () => { const r = svc.aioiGovernancePersistenceService.buildGovernancePersistence(SAMPLE_GERM); assert('persistence_score' in r && 'persistence_status' in r) });
  suite('T56'); await test('T56: classifyEnterpriseInstitutionalization institutionalized', async () => { assertEqual(getInstMetrics().classifyEnterpriseInstitutionalization(92), 'institutionalized', '') });
  suite('T57'); await test('T57: classifyEnterpriseInstitutionalization established', async () => { assertEqual(getInstMetrics().classifyEnterpriseInstitutionalization(75), 'established', '') });
  suite('T58'); await test('T58: classifyEnterpriseInstitutionalization developing', async () => { assertEqual(getInstMetrics().classifyEnterpriseInstitutionalization(55), 'developing', '') });
  suite('T59'); await test('T59: classifyEnterpriseInstitutionalization emerging', async () => { assertEqual(getInstMetrics().classifyEnterpriseInstitutionalization(30), 'emerging', '') });
  suite('T60'); await test('T60: ENTERPRISE_INSTITUTIONALIZATION_WEIGHTS 0.25', async () => { const w = svc.aioiEnterpriseInstitutionalizationService.ENTERPRISE_INSTITUTIONALIZATION_WEIGHTS; assertEqual(w.governanceStability, 0.25, ''); assertEqual(w.institutionalizationCoverage, 0.25, ''); assertEqual(w.governancePersistence, 0.25, ''); assertEqual(w.governanceExcellence, 0.25, '') });
  suite('T61'); await test('T61: buildEnterpriseInstitutionalization', async () => { const r = svc.aioiEnterpriseInstitutionalizationService.buildEnterpriseInstitutionalization({ stabilityScore: 80, coverageScore: 85, persistenceScore: 82, governanceExcellenceScore: 83 }); assert(r.institutionalization_score >= 70 && r.institutionalization_level) });
  suite('T62'); await test('T62: computeEnterpriseInstitutionalizationScore range', async () => { const s = svc.aioiEnterpriseInstitutionalizationService.computeEnterpriseInstitutionalizationScore({ stabilityScore: 80, coverageScore: 80, persistenceScore: 80, governanceExcellenceScore: 80 }); assert(s >= 0 && s <= 100) });
  suite('T63'); await test('T63: getEnterpriseInstitutionalization ok', async () => { const r = await svc.aioiEnterpriseInstitutionalizationService.getEnterpriseInstitutionalization(COMPANY_ID); assert(r.ok && r.enterprise_institutionalization.institutionalization_level) });
  suite('T64'); await test('T64: companyId inválido enterprise', async () => { const r = await svc.aioiEnterpriseInstitutionalizationService.getEnterpriseInstitutionalization('bad-id'); assert(!r.ok) });
  suite('T65'); await test('T65: recordEnterpriseInstitutionalizationAnalyzed', async () => { im = getInstMetrics(); im.recordEnterpriseInstitutionalizationAnalyzed(COMPANY_ID); assert(im.getSessionCounters().enterprise_institutionalization_count >= 1) });
  suite('T66'); await test('T66: zero writes enterprise', async () => { assertNoWrites(mock._client._calls) });
  suite('T67'); await test('T67: limite 90 institutionalized', async () => { assertEqual(getInstMetrics().classifyEnterpriseInstitutionalization(90), 'institutionalized', '') });
  suite('T68'); await test('T68: determinístico enterprise', async () => { const inp = { stabilityScore: 80, coverageScore: 75, persistenceScore: 82, governanceExcellenceScore: 78 }; assertEqual(svc.aioiEnterpriseInstitutionalizationService.computeEnterpriseInstitutionalizationScore(inp), svc.aioiEnterpriseInstitutionalizationService.computeEnterpriseInstitutionalizationScore(inp), '') });
  suite('T69'); await test('T69: pesos iguais soma ponderada', async () => { assertEqual(svc.aioiEnterpriseInstitutionalizationService.computeEnterpriseInstitutionalizationScore({ stabilityScore: 100, coverageScore: 100, persistenceScore: 100, governanceExcellenceScore: 100 }), 100, '') });
  suite('T70'); await test('T70: níveis permitidos enterprise', async () => { const allowed = ['emerging', 'developing', 'established', 'institutionalized']; for (const s of [30, 55, 75, 92]) assert(allowed.includes(getInstMetrics().classifyEnterpriseInstitutionalization(s))) });
  suite('T71'); await test('T71: getInstitutionalizationReadModel ok', async () => { const r = await getCachedInst(); assert(r.ok && r.institutionalization_read_model) });
  suite('T72'); await test('T72: estrutura obrigatória read model', async () => { const r = await getCachedInst(); const irm = r.institutionalization_read_model; assert(irm.governance_excellence_read_model && irm.governance_stability && irm.institutionalization_coverage && irm.governance_persistence && irm.enterprise_institutionalization) });
  suite('T73'); await test('T73: companyId inválido read model', async () => { const r = await svc.aioiInstitutionalizationReadModelService.getInstitutionalizationReadModel('invalid'); assert(!r.ok) });
  suite('T74'); await test('T74: anti-duplication build* local', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInstitutionalizationReadModelService.js'), 'utf8')); assert(code.includes('buildGovernanceStability') && code.includes('buildGovernancePersistence')); assert(!code.includes('getGovernanceStability(') && !code.includes('getGovernancePersistence(')) });
  suite('T75'); await test('T75: getGovernanceExcellenceReadModel uma vez', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInstitutionalizationReadModelService.js'), 'utf8')); assertEqual((code.match(/getGovernanceExcellenceReadModel/g) || []).length, 1, 'single germ call') });
  suite('T76'); await test('T76: sem LLM/IA P3.9', async () => { const files = ['aioiGovernanceStabilityService.js', 'aioiInstitutionalizationCoverageService.js', 'aioiGovernancePersistenceService.js', 'aioiEnterpriseInstitutionalizationService.js', 'aioiInstitutionalizationReadModelService.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('openai') && !code.includes('generateText'), f); } });
  suite('T77'); await test('T77: sem forecast novo', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInstitutionalizationReadModelService.js'), 'utf8')); assert(!code.includes('getBacklogForecast') && !code.includes('BacklogForecast')) });
  suite('T78'); await test('T78: Promise.all agregador', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInstitutionalizationReadModelService.js'), 'utf8')); assert(code.includes('Promise.all')) });
  suite('T79'); await test('T79: governance_excellence_read_model nested', async () => { const r = await getCachedInst(); assert(r.institutionalization_read_model.governance_excellence_read_model.conformance_read_model) });
  suite('T80'); await test('T80: governance_stability campos', async () => { const r = await getCachedInst(); const gs = r.institutionalization_read_model.governance_stability; assert('stability_score' in gs && 'stability_status' in gs) });
  suite('T81'); await test('T81: institutionalization_coverage campos', async () => { const r = await getCachedInst(); const ic = r.institutionalization_read_model.institutionalization_coverage; assert('coverage_score' in ic && 'coverage_status' in ic) });
  suite('T82'); await test('T82: governance_persistence campos', async () => { const r = await getCachedInst(); const gp = r.institutionalization_read_model.governance_persistence; assert('persistence_score' in gp && 'persistence_status' in gp) });
  suite('T83'); await test('T83: enterprise_institutionalization campos', async () => { const r = await getCachedInst(); const ei = r.institutionalization_read_model.enterprise_institutionalization; assert('institutionalization_score' in ei && 'institutionalization_level' in ei) });
  suite('T84'); await test('T84: composição exclusiva P3.8', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInstitutionalizationReadModelService.js'), 'utf8')); assert(code.includes('governanceExcellenceReadModel') && !code.includes('getConformanceReadModel')) });
  suite('T85'); await test('T85: recordInstitutionalizationRequested/Completed', async () => { im = getInstMetrics(); if (_svcCache) _svcCache.aioiInstitutionalizationMetrics = im; im.resetSessionCounters(); im.recordInstitutionalizationRequested(COMPANY_ID); im.recordInstitutionalizationCompleted(COMPANY_ID, 42); const c = im.getSessionCounters(); assertEqual(c.institutionalization_requests, 1, ''); assertEqual(c.avg_query_latency_ms, 42, '') });
  suite('T86'); await test('T86: enterprise_institutionalization composto', async () => { const r = await getCachedInst(); const ei = r.institutionalization_read_model.enterprise_institutionalization; assert(ei.institutionalization_score >= 0 && ei.institutionalization_level) });
  suite('T87'); await test('T87: governance_maturity via germ nested', async () => { const r = await getCachedInst(); assert(r.institutionalization_read_model.governance_excellence_read_model.governance_maturity) });
  suite('T88'); await test('T88: determinístico read model scores', async () => { const r1 = svc.aioiGovernanceStabilityService.buildGovernanceStability(SAMPLE_GERM); const r2 = svc.aioiGovernanceStabilityService.buildGovernanceStability(SAMPLE_GERM); assertEqual(r1.stability_score, r2.stability_score, '') });
  suite('T89'); await test('T89: 19 domínios coverage full sample', async () => { assert(svc.aioiInstitutionalizationCoverageService.computeInstitutionalizationCoverageScore(SAMPLE_GERM) >= 85) });
  suite('T90'); await test('T90: 9 pilares stability full sample', async () => { assert(svc.aioiGovernanceStabilityService.computeGovernanceStabilityScore(SAMPLE_GERM) >= 70) });
  suite('T91'); await test('T91: 9 estágios persistence full sample', async () => { assert(svc.aioiGovernancePersistenceService.computeGovernancePersistenceScore(SAMPLE_GERM) >= 70) });
  suite('T92'); await test('T92: _extractInstitutionalizationSignals certification', async () => { assertEqual(getInstMetrics()._extractInstitutionalizationSignals(SAMPLE_GERM).certificationScore, 86, '') });
  suite('T93'); await test('T93: limite 40 developing stability', async () => { assertEqual(getInstMetrics().classifyGovernanceStability(40), 'developing', '') });
  suite('T94'); await test('T94: limite 40 developing institutionalization', async () => { assertEqual(getInstMetrics().classifyEnterpriseInstitutionalization(40), 'developing', '') });
  suite('T95'); await test('T95: composição P3.8 enterprise', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiEnterpriseInstitutionalizationService.js'), 'utf8')); assert(code.includes('governanceExcellenceReadModel') && !code.includes('getGovernanceMaturity')) });
  suite('T96'); await test('T96: INSERT bloqueado', async () => { im = getInstMetrics(); let threw = false; try { im.assertReadOnlySql('INSERT INTO x VALUES (1)'); } catch (e) { threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', ''); } assert(threw) });
  suite('T97'); await test('T97: UPDATE bloqueado', async () => { im = getInstMetrics(); let threw = false; try { im.assertReadOnlySql('UPDATE x SET y=1'); } catch (e) { threw = true; } assert(threw) });
  suite('T98'); await test('T98: DELETE bloqueado', async () => { im = getInstMetrics(); let threw = false; try { im.assertReadOnlySql('DELETE FROM x'); } catch (e) { threw = true; } assert(threw) });
  suite('T99'); await test('T99: RLS company_id + bypass false', async () => { await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID); const t = mock._client._calls.find(c => c.sql.includes('app.current_company_id')); const b = mock._client._calls.filter(c => c.sql.includes('app.bypass_rls')); assert(t && t.params[0] === COMPANY_ID); assert(b.length >= 1) });
  suite('T100'); await test('T100: tenant B benchmark only', async () => { const mockB = createReadinessDbMock(buildIoes().map(i => ({ ...i, company_id: COMPANY_ID_B })), buildSnapshots().map(s => ({ ...s, company_id: COMPANY_ID_B }))); patchDb(mockB); _svcCache = null; clearAioiModuleCache(); const svcB = loadP39(); const bench = await svcB.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID_B); assert(bench.ok && bench.benchmark); const t = mockB._client._calls.filter(c => c.sql.includes('app.current_company_id')).find(c => c.params && c.params[0] === COMPANY_ID_B); assert(t, 'RLS tenant B') });
  restoreDb();
  suite('T101'); await test('T101: recordInstitutionalizationRequested log', async () => { im = getInstMetrics(); im.resetSessionCounters(); im.recordInstitutionalizationRequested(COMPANY_ID); assert(im.getSessionCounters().institutionalization_requests === 1) });
  suite('T102'); await test('T102: recordGovernanceStabilityAnalyzed log', async () => { im = getInstMetrics(); im.recordGovernanceStabilityAnalyzed(COMPANY_ID); assert(im.getSessionCounters().governance_stability_count >= 1) });
  suite('T103'); await test('T103: recordInstitutionalizationCoverageAnalyzed log', async () => { im = getInstMetrics(); im.recordInstitutionalizationCoverageAnalyzed(COMPANY_ID); assert(im.getSessionCounters().institutionalization_coverage_count >= 1) });
  suite('T104'); await test('T104: recordGovernancePersistenceAnalyzed log', async () => { im = getInstMetrics(); im.recordGovernancePersistenceAnalyzed(COMPANY_ID); assert(im.getSessionCounters().governance_persistence_count >= 1) });
  suite('T105'); await test('T105: recordEnterpriseInstitutionalizationAnalyzed log', async () => { im = getInstMetrics(); im.recordEnterpriseInstitutionalizationAnalyzed(COMPANY_ID); assert(im.getSessionCounters().enterprise_institutionalization_count >= 1) });
  suite('T106'); await test('T106: getSessionCounters campos', async () => { im = getInstMetrics(); im.resetSessionCounters(); im.recordEnterpriseInstitutionalizationAnalyzed(COMPANY_ID); const c = im.getSessionCounters(); assert(c.enterprise_institutionalization_count >= 1 && 'avg_query_latency_ms' in c); assert('institutionalization_requests' in c && 'governance_stability_count' in c) });
  suite('T107'); await test('T107: clampScore', async () => { assertEqual(getInstMetrics().clampScore(150), 100, '') });
  suite('T108'); await test('T108: TRUNCATE bloqueado', async () => { im = getInstMetrics(); let threw = false; try { im.assertReadOnlySql('TRUNCATE TABLE x'); } catch (e) { threw = true; } assert(threw) });
  suite('T109'); await test('T109: ON CONFLICT bloqueado', async () => { im = getInstMetrics(); let threw = false; try { im.assertReadOnlySql('INSERT INTO x VALUES (1) ON CONFLICT DO NOTHING'); } catch (e) { threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', ''); } assert(threw) });
  suite('T110'); await test('T110: MERGE bloqueado', async () => { im = getInstMetrics(); let threw = false; try { im.assertReadOnlySql('MERGE INTO x'); } catch (e) { threw = true; } assert(threw) });
  suite('T111'); await test('T111: anti-duplication composição P3.8', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInstitutionalizationReadModelService.js'), 'utf8')); assert(code.includes('governanceExcellenceReadModel') && !code.includes('getIntelligenceConformance')); assert(code.includes('_extractInstitutionalizationSignals')) });
  suite('T112'); await test('T112: sem getConformanceReadModel direto', async () => { const files = ['aioiGovernanceStabilityService.js', 'aioiInstitutionalizationCoverageService.js', 'aioiGovernancePersistenceService.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('getConformanceReadModel'), f); } });
  suite('T113'); await test('T113: sem getCertificationReadModel direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInstitutionalizationReadModelService.js'), 'utf8')); assert(!code.includes('getCertificationReadModel')) });
  suite('T114'); await test('T114: CREATE bloqueado', async () => { im = getInstMetrics(); let threw = false; try { im.assertReadOnlySql('CREATE TABLE x (id int)'); } catch (e) { threw = true; } assert(threw) });
  suite('T115'); await test('T115: GRANT bloqueado', async () => { im = getInstMetrics(); let threw = false; try { im.assertReadOnlySql('GRANT ALL ON x TO y'); } catch (e) { threw = true; } assert(threw) });
  suite('T116'); await test('T116: soberanos ausentes P3.9', async () => { const files = ['aioiInstitutionalizationMetrics.js', 'aioiGovernanceStabilityService.js', 'aioiInstitutionalizationCoverageService.js', 'aioiGovernancePersistenceService.js', 'aioiEnterpriseInstitutionalizationService.js', 'aioiInstitutionalizationReadModelService.js']; const forbidden = ['operationalDecisionEngine', 'operationalLearningService', 'workflowOrchestrator', 'actionRuntimeOrchestrator', 'computePriorityScore', 'classificationConsumer', 'aioiOutboxConsumerService']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); for (const bad of forbidden) assert(!code.includes(bad), `${f} contém ${bad}`); } });
  suite('T117'); await test('T117: sem fan-out getGovernanceExcellenceReadModel', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInstitutionalizationReadModelService.js'), 'utf8')); assertEqual((code.match(/getGovernanceExcellenceReadModel/g) || []).length, 1, 'no fan-out') });
  suite('T118'); await test('T118: sem getSustainabilityReadModel direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInstitutionalizationReadModelService.js'), 'utf8')); assert(!code.includes('getSustainabilityReadModel')) });
  suite('T119'); await test('T119: status permitidos persistence', async () => { const allowed = ['fragile', 'partial', 'persistent']; for (const s of [80, 50, 20]) assert(allowed.includes(getInstMetrics().classifyGovernancePersistence(s))) });
  suite('T120'); await test('T120: domínio certification coverage', async () => { assert(svc.aioiInstitutionalizationCoverageService.INSTITUTIONALIZATION_DOMAINS.includes('certification')) });
  suite('T121'); await test('T121: REVOKE bloqueado', async () => { im = getInstMetrics(); let threw = false; try { im.assertReadOnlySql('REVOKE ALL ON x FROM y'); } catch (e) { threw = true; } assert(threw) });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`AIOI-P3.9 Institutionalization Tests: ${_passed} passed, ${_failed} failed`);
  console.log(`${'='.repeat(60)}`);
  if (_failed === 0) {
    console.log('\nAIOI_P3_9_ENTERPRISE_INTELLIGENCE_STABILITY_INSTITUTIONALIZATION_PASS\n');
  } else {
    process.exitCode = 1;
  }
}

runTests().catch(err => {
  console.error('FATAL:', err);
  process.exitCode = 1;
});
