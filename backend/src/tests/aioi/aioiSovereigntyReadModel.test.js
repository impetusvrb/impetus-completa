'use strict';

/**
 * AIOI-P4.0 — Testes automatizados da Enterprise Intelligence Sovereignty Layer
 * T1–T126 | node src/tests/aioi/aioiSovereigntyReadModel.test.js
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

const P40_EXPORTS = [
  'aioiInstitutionalizationReadModelService', 'aioiSovereigntyMetrics',
  'aioiKnowledgeIndependenceService', 'aioiInstitutionalResilienceService',
  'aioiSovereigntyCoverageService', 'aioiEnterpriseSovereigntyService',
  'aioiSovereigntyReadModelService', 'aioiBenchmarkAnalysisService'
];

function clearAioiModuleCache() {
  for (const key of Object.keys(require.cache)) {
    if (key.includes('/services/aioi/')) delete require.cache[key];
  }
}

let _svcCache = null;

function loadP40() {
  if (_svcCache) return _svcCache;
  const loaded = {};
  for (const mod of P40_EXPORTS) {
    loaded[mod] = require(`${SERVICES_PATH}/${mod}`);
  }
  _svcCache = loaded;
  return loaded;
}

function reloadP40() {
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
    'aioiConformanceReadModelService', 'aioiGovernanceExcellenceReadModelService',
    'aioiInstitutionalizationReadModelService'
  ];
  for (const mod of chainPreload) require(`${SERVICES_PATH}/${mod}`);
  return loadP40();
}

function getSovMetrics() {
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiSovereigntyMetrics`)];
  if (_svcCache) delete _svcCache.aioiSovereigntyMetrics;
  const m = require(`${SERVICES_PATH}/aioiSovereigntyMetrics`);
  if (_svcCache) _svcCache.aioiSovereigntyMetrics = m;
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
const SAMPLE_IRM = {
  governance_excellence_read_model: SAMPLE_GERM,
  governance_stability: { stability_score: 83, stability_status: 'stable' },
  institutionalization_coverage: { coverage_score: 90, coverage_status: 'comprehensive' },
  governance_persistence: { persistence_score: 85, persistence_status: 'persistent' },
  enterprise_institutionalization: { institutionalization_score: 86, institutionalization_level: 'established' }
};

const EMPTY_IRM = { governance_excellence_read_model: { conformance_read_model: {} } };

async function runTests() {
  let sm = getSovMetrics();
  sm.resetSessionCounters();
  const mock = createReadinessDbMock();
  patchDb(mock);
  const svc = reloadP40();
  let cachedSov = null;
  async function getCachedSov() {
    if (!cachedSov) {
      cachedSov = await svc.aioiSovereigntyReadModelService.getSovereigntyReadModel(COMPANY_ID);
    }
    return cachedSov;
  }

  suite('T1'); await test('T1: classifyKnowledgeIndependence independent', async () => { assertEqual(getSovMetrics().classifyKnowledgeIndependence(80), 'independent', '') });
  suite('T2'); await test('T2: classifyKnowledgeIndependence partially_independent', async () => { assertEqual(getSovMetrics().classifyKnowledgeIndependence(55), 'partially_independent', '') });
  suite('T3'); await test('T3: classifyKnowledgeIndependence dependent', async () => { assertEqual(getSovMetrics().classifyKnowledgeIndependence(30), 'dependent', '') });
  suite('T4'); await test('T4: INDEPENDENCE_PILLARS 10', async () => { assertEqual(svc.aioiKnowledgeIndependenceService.INDEPENDENCE_PILLARS.length, 10, '') });
  suite('T5'); await test('T5: buildKnowledgeIndependence', async () => { const r = svc.aioiKnowledgeIndependenceService.buildKnowledgeIndependence(SAMPLE_IRM); assert(r.independence_score >= 70 && r.independence_status === 'independent') });
  suite('T6'); await test('T6: computeKnowledgeIndependenceScore range', async () => { const s = svc.aioiKnowledgeIndependenceService.computeKnowledgeIndependenceScore(SAMPLE_IRM); assert(s >= 0 && s <= 100) });
  suite('T7'); await test('T7: getKnowledgeIndependence via read model', async () => { const r = await getCachedSov(); assert(r.ok && r.sovereignty_read_model.knowledge_independence.independence_status) });
  suite('T8'); await test('T8: companyId inválido independence', async () => { const r = await svc.aioiKnowledgeIndependenceService.getKnowledgeIndependence('bad'); assert(!r.ok) });
  suite('T9'); await test('T9: composição P3.9 institutionalizationReadModel', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiKnowledgeIndependenceService.js'), 'utf8')); assert(code.includes('institutionalizationReadModel') && !code.includes('getGovernanceExcellenceReadModel')) });
  suite('T10'); await test('T10: determinístico independence', async () => { assertEqual(svc.aioiKnowledgeIndependenceService.computeKnowledgeIndependenceScore(SAMPLE_IRM), svc.aioiKnowledgeIndependenceService.computeKnowledgeIndependenceScore(SAMPLE_IRM), '') });
  suite('T11'); await test('T11: recordKnowledgeIndependenceAnalyzed', async () => { sm = getSovMetrics(); sm.resetSessionCounters(); sm.recordKnowledgeIndependenceAnalyzed(COMPANY_ID); assert(sm.getSessionCounters().knowledge_independence_count >= 1) });
  suite('T12'); await test('T12: zero writes independence path', async () => { await getCachedSov(); assertNoWrites(mock._client._calls) });
  suite('T13'); await test('T13: limite 70 independent', async () => { assertEqual(getSovMetrics().classifyKnowledgeIndependence(70), 'independent', '') });
  suite('T14'); await test('T14: empty irm score baixo', async () => { assert(svc.aioiKnowledgeIndependenceService.computeKnowledgeIndependenceScore(EMPTY_IRM) <= 40) });
  suite('T15'); await test('T15: status permitidos independence', async () => { const allowed = ['dependent', 'partially_independent', 'independent']; for (const s of [80, 50, 20]) assert(allowed.includes(getSovMetrics().classifyKnowledgeIndependence(s))) });
  suite('T16'); await test('T16: _extractSovereigntySignals trust', async () => { assertEqual(getSovMetrics()._extractSovereigntySignals(SAMPLE_IRM).trustScore, 80, '') });
  suite('T17'); await test('T17: _extractSovereigntySignals conformance', async () => { assertEqual(getSovMetrics()._extractSovereigntySignals(SAMPLE_IRM).conformanceScore, 84, '') });
  suite('T18'); await test('T18: _extractSovereigntySignals institutionalization', async () => { assertEqual(getSovMetrics()._extractSovereigntySignals(SAMPLE_IRM).institutionalizationScore, 86, '') });
  suite('T19'); await test('T19: pilares incluem institutionalization', async () => { assert(svc.aioiKnowledgeIndependenceService.INDEPENDENCE_PILLARS.includes('institutionalization')) });
  suite('T20'); await test('T20: buildKnowledgeIndependence campos', async () => { const r = svc.aioiKnowledgeIndependenceService.buildKnowledgeIndependence(SAMPLE_IRM); assert('independence_score' in r && 'independence_status' in r) });
  suite('T21'); await test('T21: classifyInstitutionalResilience resilient', async () => { assertEqual(getSovMetrics().classifyInstitutionalResilience(80), 'resilient', '') });
  suite('T22'); await test('T22: classifyInstitutionalResilience partial', async () => { assertEqual(getSovMetrics().classifyInstitutionalResilience(55), 'partial', '') });
  suite('T23'); await test('T23: classifyInstitutionalResilience fragile', async () => { assertEqual(getSovMetrics().classifyInstitutionalResilience(30), 'fragile', '') });
  suite('T24'); await test('T24: RESILIENCE_STAGES 10', async () => { assertEqual(svc.aioiInstitutionalResilienceService.RESILIENCE_STAGES.length, 10, '') });
  suite('T25'); await test('T25: buildInstitutionalResilience', async () => { const r = svc.aioiInstitutionalResilienceService.buildInstitutionalResilience(SAMPLE_IRM); assert(r.resilience_score >= 70 && r.resilience_status === 'resilient') });
  suite('T26'); await test('T26: computeInstitutionalResilienceScore range', async () => { const s = svc.aioiInstitutionalResilienceService.computeInstitutionalResilienceScore(SAMPLE_IRM); assert(s >= 0 && s <= 100) });
  suite('T27'); await test('T27: getInstitutionalResilience ok', async () => { const r = await svc.aioiInstitutionalResilienceService.getInstitutionalResilience(COMPANY_ID); assert(r.ok && r.institutional_resilience.resilience_status) });
  suite('T28'); await test('T28: companyId inválido resilience', async () => { const r = await svc.aioiInstitutionalResilienceService.getInstitutionalResilience('x'); assert(!r.ok) });
  suite('T29'); await test('T29: empty irm resilience baixo', async () => { assert(svc.aioiInstitutionalResilienceService.computeInstitutionalResilienceScore(EMPTY_IRM) <= 40) });
  suite('T30'); await test('T30: recordInstitutionalResilienceAnalyzed', async () => { sm = getSovMetrics(); sm.recordInstitutionalResilienceAnalyzed(COMPANY_ID); assert(sm.getSessionCounters().institutional_resilience_count >= 1) });
  suite('T31'); await test('T31: zero writes resilience', async () => { assertNoWrites(mock._client._calls) });
  suite('T32'); await test('T32: limite 70 resilient', async () => { assertEqual(getSovMetrics().classifyInstitutionalResilience(70), 'resilient', '') });
  suite('T33'); await test('T33: determinístico resilience', async () => { assertEqual(svc.aioiInstitutionalResilienceService.computeInstitutionalResilienceScore(SAMPLE_IRM), svc.aioiInstitutionalResilienceService.computeInstitutionalResilienceScore(SAMPLE_IRM), '') });
  suite('T34'); await test('T34: cadeia trust→institutionalization', async () => { const stages = svc.aioiInstitutionalResilienceService.RESILIENCE_STAGES; assertEqual(stages[0], 'trust', ''); assertEqual(stages[9], 'institutionalization', '') });
  suite('T35'); await test('T35: status permitidos resilience', async () => { const allowed = ['fragile', 'partial', 'resilient']; for (const s of [80, 50, 20]) assert(allowed.includes(getSovMetrics().classifyInstitutionalResilience(s))) });
  suite('T36'); await test('T36: composição P3.9 resilience', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInstitutionalResilienceService.js'), 'utf8')); assert(code.includes('institutionalizationReadModel')) });
  suite('T37'); await test('T37: partial irm só trust', async () => { const partial = { governance_excellence_read_model: { conformance_read_model: { certification_read_model: { sustainability_read_model: { value_governance_read_model: { readiness_read_model: { auditability_read_model: { assurance_read_model: { trust_read_model: { intelligence_trust: { trust_score: 75 } } } } } } } } } } }; assert(svc.aioiInstitutionalResilienceService.computeInstitutionalResilienceScore(partial) < 70) });
  suite('T38'); await test('T38: full vs partial resilience', async () => { const full = svc.aioiInstitutionalResilienceService.computeInstitutionalResilienceScore(SAMPLE_IRM); const partial = svc.aioiInstitutionalResilienceService.computeInstitutionalResilienceScore({ governance_excellence_read_model: { conformance_read_model: { certification_read_model: { sustainability_read_model: { value_governance_read_model: { readiness_read_model: { auditability_read_model: { assurance_read_model: { trust_read_model: { intelligence_trust: { trust_score: 80 } } } } } } } } } } }); assert(full > partial) });
  suite('T39'); await test('T39: limite 40 partial resilience', async () => { assertEqual(getSovMetrics().classifyInstitutionalResilience(40), 'partial', '') });
  suite('T40'); await test('T40: buildInstitutionalResilience campos', async () => { const r = svc.aioiInstitutionalResilienceService.buildInstitutionalResilience(SAMPLE_IRM); assert('resilience_score' in r && 'resilience_status' in r) });
  suite('T41'); await test('T41: classifySovereigntyCoverage comprehensive', async () => { assertEqual(getSovMetrics().classifySovereigntyCoverage(80), 'comprehensive', '') });
  suite('T42'); await test('T42: classifySovereigntyCoverage partial', async () => { assertEqual(getSovMetrics().classifySovereigntyCoverage(55), 'partial', '') });
  suite('T43'); await test('T43: classifySovereigntyCoverage limited', async () => { assertEqual(getSovMetrics().classifySovereigntyCoverage(30), 'limited', '') });
  suite('T44'); await test('T44: SOVEREIGNTY_DOMAINS 20', async () => { assertEqual(svc.aioiSovereigntyCoverageService.SOVEREIGNTY_DOMAINS.length, 20, '') });
  suite('T45'); await test('T45: buildSovereigntyCoverage', async () => { const r = svc.aioiSovereigntyCoverageService.buildSovereigntyCoverage(SAMPLE_IRM); assert(r.coverage_score >= 70 && r.coverage_status === 'comprehensive') });
  suite('T46'); await test('T46: computeSovereigntyCoverageScore range', async () => { const s = svc.aioiSovereigntyCoverageService.computeSovereigntyCoverageScore(SAMPLE_IRM); assert(s >= 0 && s <= 100) });
  suite('T47'); await test('T47: getSovereigntyCoverage ok', async () => { const r = await svc.aioiSovereigntyCoverageService.getSovereigntyCoverage(COMPANY_ID); assert(r.ok && r.sovereignty_coverage.coverage_status) });
  suite('T48'); await test('T48: companyId inválido coverage', async () => { const r = await svc.aioiSovereigntyCoverageService.getSovereigntyCoverage('invalid'); assert(!r.ok) });
  suite('T49'); await test('T49: empty irm coverage baixo', async () => { assert(svc.aioiSovereigntyCoverageService.computeSovereigntyCoverageScore(EMPTY_IRM) <= 40) });
  suite('T50'); await test('T50: recordSovereigntyCoverageAnalyzed', async () => { sm = getSovMetrics(); sm.recordSovereigntyCoverageAnalyzed(COMPANY_ID); assert(sm.getSessionCounters().sovereignty_coverage_count >= 1) });
  suite('T51'); await test('T51: domínio institutionalization', async () => { assert(svc.aioiSovereigntyCoverageService.SOVEREIGNTY_DOMAINS.includes('institutionalization')) });
  suite('T52'); await test('T52: domínio governance_excellence', async () => { assert(svc.aioiSovereigntyCoverageService.SOVEREIGNTY_DOMAINS.includes('governance_excellence')) });
  suite('T53'); await test('T53: determinístico coverage', async () => { assertEqual(svc.aioiSovereigntyCoverageService.computeSovereigntyCoverageScore(SAMPLE_IRM), svc.aioiSovereigntyCoverageService.computeSovereigntyCoverageScore(SAMPLE_IRM), '') });
  suite('T54'); await test('T54: limite 70 comprehensive', async () => { assertEqual(getSovMetrics().classifySovereigntyCoverage(70), 'comprehensive', '') });
  suite('T55'); await test('T55: buildSovereigntyCoverage campos', async () => { const r = svc.aioiSovereigntyCoverageService.buildSovereigntyCoverage(SAMPLE_IRM); assert('coverage_score' in r && 'coverage_status' in r) });
  suite('T56'); await test('T56: classifyEnterpriseSovereignty sovereign', async () => { assertEqual(getSovMetrics().classifyEnterpriseSovereignty(92), 'sovereign', '') });
  suite('T57'); await test('T57: classifyEnterpriseSovereignty institutional_sovereign', async () => { assertEqual(getSovMetrics().classifyEnterpriseSovereignty(75), 'institutional_sovereign', '') });
  suite('T58'); await test('T58: classifyEnterpriseSovereignty developing', async () => { assertEqual(getSovMetrics().classifyEnterpriseSovereignty(55), 'developing', '') });
  suite('T59'); await test('T59: classifyEnterpriseSovereignty emerging', async () => { assertEqual(getSovMetrics().classifyEnterpriseSovereignty(30), 'emerging', '') });
  suite('T60'); await test('T60: ENTERPRISE_SOVEREIGNTY_WEIGHTS 0.25', async () => { const w = svc.aioiEnterpriseSovereigntyService.ENTERPRISE_SOVEREIGNTY_WEIGHTS; assertEqual(w.knowledgeIndependence, 0.25, ''); assertEqual(w.institutionalResilience, 0.25, ''); assertEqual(w.sovereigntyCoverage, 0.25, ''); assertEqual(w.enterpriseInstitutionalization, 0.25, '') });
  suite('T61'); await test('T61: buildEnterpriseSovereignty', async () => { const r = svc.aioiEnterpriseSovereigntyService.buildEnterpriseSovereignty({ independenceScore: 80, resilienceScore: 85, coverageScore: 82, institutionalizationScore: 83 }); assert(r.sovereignty_score >= 70 && r.sovereignty_level) });
  suite('T62'); await test('T62: computeEnterpriseSovereigntyScore range', async () => { const s = svc.aioiEnterpriseSovereigntyService.computeEnterpriseSovereigntyScore({ independenceScore: 80, resilienceScore: 80, coverageScore: 80, institutionalizationScore: 80 }); assert(s >= 0 && s <= 100) });
  suite('T63'); await test('T63: getEnterpriseSovereignty ok', async () => { const r = await svc.aioiEnterpriseSovereigntyService.getEnterpriseSovereignty(COMPANY_ID); assert(r.ok && r.enterprise_sovereignty.sovereignty_level) });
  suite('T64'); await test('T64: companyId inválido enterprise', async () => { const r = await svc.aioiEnterpriseSovereigntyService.getEnterpriseSovereignty('bad-id'); assert(!r.ok) });
  suite('T65'); await test('T65: recordEnterpriseSovereigntyAnalyzed', async () => { sm = getSovMetrics(); sm.recordEnterpriseSovereigntyAnalyzed(COMPANY_ID); assert(sm.getSessionCounters().enterprise_sovereignty_count >= 1) });
  suite('T66'); await test('T66: zero writes enterprise', async () => { assertNoWrites(mock._client._calls) });
  suite('T67'); await test('T67: limite 90 sovereign', async () => { assertEqual(getSovMetrics().classifyEnterpriseSovereignty(90), 'sovereign', '') });
  suite('T68'); await test('T68: determinístico enterprise', async () => { const inp = { independenceScore: 80, resilienceScore: 75, coverageScore: 82, institutionalizationScore: 78 }; assertEqual(svc.aioiEnterpriseSovereigntyService.computeEnterpriseSovereigntyScore(inp), svc.aioiEnterpriseSovereigntyService.computeEnterpriseSovereigntyScore(inp), '') });
  suite('T69'); await test('T69: pesos iguais soma ponderada', async () => { assertEqual(svc.aioiEnterpriseSovereigntyService.computeEnterpriseSovereigntyScore({ independenceScore: 100, resilienceScore: 100, coverageScore: 100, institutionalizationScore: 100 }), 100, '') });
  suite('T70'); await test('T70: níveis permitidos enterprise', async () => { const allowed = ['emerging', 'developing', 'institutional_sovereign', 'sovereign']; for (const s of [30, 55, 75, 92]) assert(allowed.includes(getSovMetrics().classifyEnterpriseSovereignty(s))) });
  suite('T71'); await test('T71: getSovereigntyReadModel ok', async () => { const r = await getCachedSov(); assert(r.ok && r.sovereignty_read_model) });
  suite('T72'); await test('T72: estrutura obrigatória read model', async () => { const r = await getCachedSov(); const srm = r.sovereignty_read_model; assert(srm.institutionalization_read_model && srm.knowledge_independence && srm.institutional_resilience && srm.sovereignty_coverage && srm.enterprise_sovereignty) });
  suite('T73'); await test('T73: companyId inválido read model', async () => { const r = await svc.aioiSovereigntyReadModelService.getSovereigntyReadModel('invalid'); assert(!r.ok) });
  suite('T74'); await test('T74: anti-duplication build* local', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiSovereigntyReadModelService.js'), 'utf8')); assert(code.includes('buildKnowledgeIndependence') && code.includes('buildInstitutionalResilience')); assert(!code.includes('getKnowledgeIndependence(') && !code.includes('getInstitutionalResilience(')) });
  suite('T75'); await test('T75: getInstitutionalizationReadModel uma vez', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiSovereigntyReadModelService.js'), 'utf8')); assertEqual((code.match(/getInstitutionalizationReadModel/g) || []).length, 1, 'single irm call') });
  suite('T76'); await test('T76: sem LLM/IA P4.0', async () => { const files = ['aioiKnowledgeIndependenceService.js', 'aioiInstitutionalResilienceService.js', 'aioiSovereigntyCoverageService.js', 'aioiEnterpriseSovereigntyService.js', 'aioiSovereigntyReadModelService.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('openai') && !code.includes('generateText'), f); } });
  suite('T77'); await test('T77: sem forecast novo', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiSovereigntyReadModelService.js'), 'utf8')); assert(!code.includes('getBacklogForecast') && !code.includes('BacklogForecast')) });
  suite('T78'); await test('T78: Promise.all agregador', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiSovereigntyReadModelService.js'), 'utf8')); assert(code.includes('Promise.all')) });
  suite('T79'); await test('T79: institutionalization_read_model nested', async () => { const r = await getCachedSov(); assert(r.sovereignty_read_model.institutionalization_read_model.governance_excellence_read_model) });
  suite('T80'); await test('T80: knowledge_independence campos', async () => { const r = await getCachedSov(); const ki = r.sovereignty_read_model.knowledge_independence; assert('independence_score' in ki && 'independence_status' in ki) });
  suite('T81'); await test('T81: institutional_resilience campos', async () => { const r = await getCachedSov(); const ir = r.sovereignty_read_model.institutional_resilience; assert('resilience_score' in ir && 'resilience_status' in ir) });
  suite('T82'); await test('T82: sovereignty_coverage campos', async () => { const r = await getCachedSov(); const sc = r.sovereignty_read_model.sovereignty_coverage; assert('coverage_score' in sc && 'coverage_status' in sc) });
  suite('T83'); await test('T83: enterprise_sovereignty campos', async () => { const r = await getCachedSov(); const es = r.sovereignty_read_model.enterprise_sovereignty; assert('sovereignty_score' in es && 'sovereignty_level' in es) });
  suite('T84'); await test('T84: composição exclusiva P3.9', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiSovereigntyReadModelService.js'), 'utf8')); assert(code.includes('institutionalizationReadModel') && !code.includes('getGovernanceExcellenceReadModel')) });
  suite('T85'); await test('T85: recordSovereigntyRequested/Completed', async () => { sm = getSovMetrics(); if (_svcCache) _svcCache.aioiSovereigntyMetrics = sm; sm.resetSessionCounters(); sm.recordSovereigntyRequested(COMPANY_ID); sm.recordSovereigntyCompleted(COMPANY_ID, 42); const c = sm.getSessionCounters(); assertEqual(c.sovereignty_requests, 1, ''); assertEqual(c.avg_query_latency_ms, 42, '') });
  suite('T86'); await test('T86: enterprise_sovereignty composto', async () => { const r = await getCachedSov(); const es = r.sovereignty_read_model.enterprise_sovereignty; assert(es.sovereignty_score >= 0 && es.sovereignty_level) });
  suite('T87'); await test('T87: governance_excellence via irm nested', async () => { const r = await getCachedSov(); assert(r.sovereignty_read_model.institutionalization_read_model.governance_excellence_read_model.enterprise_governance_excellence) });
  suite('T88'); await test('T88: determinístico read model scores', async () => { const r1 = svc.aioiKnowledgeIndependenceService.buildKnowledgeIndependence(SAMPLE_IRM); const r2 = svc.aioiKnowledgeIndependenceService.buildKnowledgeIndependence(SAMPLE_IRM); assertEqual(r1.independence_score, r2.independence_score, '') });
  suite('T89'); await test('T89: 20 domínios coverage full sample', async () => { assert(svc.aioiSovereigntyCoverageService.computeSovereigntyCoverageScore(SAMPLE_IRM) >= 85) });
  suite('T90'); await test('T90: 10 pilares independence full sample', async () => { assert(svc.aioiKnowledgeIndependenceService.computeKnowledgeIndependenceScore(SAMPLE_IRM) >= 70) });
  suite('T91'); await test('T91: 10 estágios resilience full sample', async () => { assert(svc.aioiInstitutionalResilienceService.computeInstitutionalResilienceScore(SAMPLE_IRM) >= 70) });
  suite('T92'); await test('T92: _extractSovereigntySignals governance excellence', async () => { assertEqual(getSovMetrics()._extractSovereigntySignals(SAMPLE_IRM).governanceExcellenceScore, 84, '') });
  suite('T93'); await test('T93: limite 40 partially_independent', async () => { assertEqual(getSovMetrics().classifyKnowledgeIndependence(40), 'partially_independent', '') });
  suite('T94'); await test('T94: limite 40 developing sovereignty', async () => { assertEqual(getSovMetrics().classifyEnterpriseSovereignty(40), 'developing', '') });
  suite('T95'); await test('T95: composição P3.9 enterprise', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiEnterpriseSovereigntyService.js'), 'utf8')); assert(code.includes('institutionalizationReadModel') && !code.includes('getGovernanceStability')) });
  suite('T96'); await test('T96: INSERT bloqueado', async () => { sm = getSovMetrics(); let threw = false; try { sm.assertReadOnlySql('INSERT INTO x VALUES (1)'); } catch (e) { threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', ''); } assert(threw) });
  suite('T97'); await test('T97: UPDATE bloqueado', async () => { sm = getSovMetrics(); let threw = false; try { sm.assertReadOnlySql('UPDATE x SET y=1'); } catch (e) { threw = true; } assert(threw) });
  suite('T98'); await test('T98: DELETE bloqueado', async () => { sm = getSovMetrics(); let threw = false; try { sm.assertReadOnlySql('DELETE FROM x'); } catch (e) { threw = true; } assert(threw) });
  suite('T99'); await test('T99: RLS company_id + bypass false', async () => { await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID); const t = mock._client._calls.find(c => c.sql.includes('app.current_company_id')); const b = mock._client._calls.filter(c => c.sql.includes('app.bypass_rls')); assert(t && t.params[0] === COMPANY_ID); assert(b.length >= 1) });
  suite('T100'); await test('T100: tenant B benchmark only', async () => { const mockB = createReadinessDbMock(buildIoes().map(i => ({ ...i, company_id: COMPANY_ID_B })), buildSnapshots().map(s => ({ ...s, company_id: COMPANY_ID_B }))); patchDb(mockB); _svcCache = null; clearAioiModuleCache(); const svcB = loadP40(); const bench = await svcB.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID_B); assert(bench.ok && bench.benchmark); const t = mockB._client._calls.filter(c => c.sql.includes('app.current_company_id')).find(c => c.params && c.params[0] === COMPANY_ID_B); assert(t, 'RLS tenant B') });
  restoreDb();
  suite('T101'); await test('T101: recordSovereigntyRequested log', async () => { sm = getSovMetrics(); sm.resetSessionCounters(); sm.recordSovereigntyRequested(COMPANY_ID); assert(sm.getSessionCounters().sovereignty_requests === 1) });
  suite('T102'); await test('T102: recordKnowledgeIndependenceAnalyzed log', async () => { sm = getSovMetrics(); sm.recordKnowledgeIndependenceAnalyzed(COMPANY_ID); assert(sm.getSessionCounters().knowledge_independence_count >= 1) });
  suite('T103'); await test('T103: recordInstitutionalResilienceAnalyzed log', async () => { sm = getSovMetrics(); sm.recordInstitutionalResilienceAnalyzed(COMPANY_ID); assert(sm.getSessionCounters().institutional_resilience_count >= 1) });
  suite('T104'); await test('T104: recordSovereigntyCoverageAnalyzed log', async () => { sm = getSovMetrics(); sm.recordSovereigntyCoverageAnalyzed(COMPANY_ID); assert(sm.getSessionCounters().sovereignty_coverage_count >= 1) });
  suite('T105'); await test('T105: recordEnterpriseSovereigntyAnalyzed log', async () => { sm = getSovMetrics(); sm.recordEnterpriseSovereigntyAnalyzed(COMPANY_ID); assert(sm.getSessionCounters().enterprise_sovereignty_count >= 1) });
  suite('T106'); await test('T106: getSessionCounters campos', async () => { sm = getSovMetrics(); sm.resetSessionCounters(); sm.recordEnterpriseSovereigntyAnalyzed(COMPANY_ID); const c = sm.getSessionCounters(); assert(c.enterprise_sovereignty_count >= 1 && 'avg_query_latency_ms' in c); assert('sovereignty_requests' in c && 'knowledge_independence_count' in c) });
  suite('T107'); await test('T107: clampScore', async () => { assertEqual(getSovMetrics().clampScore(150), 100, '') });
  suite('T108'); await test('T108: TRUNCATE bloqueado', async () => { sm = getSovMetrics(); let threw = false; try { sm.assertReadOnlySql('TRUNCATE TABLE x'); } catch (e) { threw = true; } assert(threw) });
  suite('T109'); await test('T109: ON CONFLICT bloqueado', async () => { sm = getSovMetrics(); let threw = false; try { sm.assertReadOnlySql('INSERT INTO x VALUES (1) ON CONFLICT DO NOTHING'); } catch (e) { threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', ''); } assert(threw) });
  suite('T110'); await test('T110: MERGE bloqueado', async () => { sm = getSovMetrics(); let threw = false; try { sm.assertReadOnlySql('MERGE INTO x'); } catch (e) { threw = true; } assert(threw) });
  suite('T111'); await test('T111: anti-duplication composição P3.9', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiSovereigntyReadModelService.js'), 'utf8')); assert(code.includes('institutionalizationReadModel') && !code.includes('getKnowledgeIndependence')); assert(code.includes('_extractSovereigntySignals')) });
  suite('T112'); await test('T112: sem getGovernanceExcellenceReadModel direto', async () => { const files = ['aioiKnowledgeIndependenceService.js', 'aioiInstitutionalResilienceService.js', 'aioiSovereigntyCoverageService.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('getGovernanceExcellenceReadModel'), f); } });
  suite('T113'); await test('T113: sem getConformanceReadModel direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiSovereigntyReadModelService.js'), 'utf8')); assert(!code.includes('getConformanceReadModel')) });
  suite('T114'); await test('T114: CREATE bloqueado', async () => { sm = getSovMetrics(); let threw = false; try { sm.assertReadOnlySql('CREATE TABLE x (id int)'); } catch (e) { threw = true; } assert(threw) });
  suite('T115'); await test('T115: GRANT bloqueado', async () => { sm = getSovMetrics(); let threw = false; try { sm.assertReadOnlySql('GRANT ALL ON x TO y'); } catch (e) { threw = true; } assert(threw) });
  suite('T116'); await test('T116: soberanos ausentes P4.0', async () => { const files = ['aioiSovereigntyMetrics.js', 'aioiKnowledgeIndependenceService.js', 'aioiInstitutionalResilienceService.js', 'aioiSovereigntyCoverageService.js', 'aioiEnterpriseSovereigntyService.js', 'aioiSovereigntyReadModelService.js']; const forbidden = ['operationalDecisionEngine', 'operationalLearningService', 'workflowOrchestrator', 'actionRuntimeOrchestrator', 'computePriorityScore', 'classificationConsumer', 'aioiOutboxConsumerService']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); for (const bad of forbidden) assert(!code.includes(bad), `${f} contém ${bad}`); } });
  suite('T117'); await test('T117: sem fan-out getInstitutionalizationReadModel', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiSovereigntyReadModelService.js'), 'utf8')); assertEqual((code.match(/getInstitutionalizationReadModel/g) || []).length, 1, 'no fan-out') });
  suite('T118'); await test('T118: sem getCertificationReadModel direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiSovereigntyReadModelService.js'), 'utf8')); assert(!code.includes('getCertificationReadModel')) });
  suite('T119'); await test('T119: domínio certification coverage', async () => { assert(svc.aioiSovereigntyCoverageService.SOVEREIGNTY_DOMAINS.includes('certification')) });
  suite('T120'); await test('T120: pilares incluem governance_excellence', async () => { assert(svc.aioiKnowledgeIndependenceService.INDEPENDENCE_PILLARS.includes('governance_excellence')) });
  suite('T121'); await test('T121: REVOKE bloqueado', async () => { sm = getSovMetrics(); let threw = false; try { sm.assertReadOnlySql('REVOKE ALL ON x FROM y'); } catch (e) { threw = true; } assert(threw) });
  suite('T122'); await test('T122: sem getSustainabilityReadModel direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiSovereigntyReadModelService.js'), 'utf8')); assert(!code.includes('getSustainabilityReadModel')) });
  suite('T123'); await test('T123: limite 40 partial coverage', async () => { assertEqual(getSovMetrics().classifySovereigntyCoverage(40), 'partial', '') });
  suite('T124'); await test('T124: _extractSovereigntySignals certification', async () => { assertEqual(getSovMetrics()._extractSovereigntySignals(SAMPLE_IRM).certificationScore, 86, '') });
  suite('T125'); await test('T125: 9 estágios resilience index', async () => { assertEqual(svc.aioiInstitutionalResilienceService.RESILIENCE_STAGES[8], 'governance_excellence', '') });
  suite('T126'); await test('T126: domínio conformance coverage', async () => { assert(svc.aioiSovereigntyCoverageService.SOVEREIGNTY_DOMAINS.includes('conformance')) });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`AIOI-P4.0 Sovereignty Tests: ${_passed} passed, ${_failed} failed`);
  console.log(`${'='.repeat(60)}`);
  if (_failed === 0) {
    console.log('\nAIOI_P4_0_ENTERPRISE_INTELLIGENCE_SOVEREIGNTY_PASS\n');
  } else {
    process.exitCode = 1;
  }
}

runTests().catch(err => {
  console.error('FATAL:', err);
  process.exitCode = 1;
});
