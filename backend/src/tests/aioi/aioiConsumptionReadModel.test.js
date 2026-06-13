'use strict';

/**
 * AIOI-P4.2 — Testes automatizados da Enterprise Intelligence Consumption Layer
 * T1–T136 | node src/tests/aioi/aioiConsumptionReadModel.test.js
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

const P42_EXPORTS = [
  'aioiAutonomyReadModelService', 'aioiConsumptionMetrics',
  'aioiExecutiveVisibilityService', 'aioiDecisionConsumptionService',
  'aioiIntelligenceAccessibilityService', 'aioiEnterpriseConsumptionService',
  'aioiConsumptionReadModelService', 'aioiBenchmarkAnalysisService'
];

function clearAioiModuleCache() {
  for (const key of Object.keys(require.cache)) {
    if (key.includes('/services/aioi/')) delete require.cache[key];
  }
}

let _svcCache = null;

function loadP42() {
  if (_svcCache) return _svcCache;
  const loaded = {};
  for (const mod of P42_EXPORTS) {
    loaded[mod] = require(`${SERVICES_PATH}/${mod}`);
  }
  _svcCache = loaded;
  return loaded;
}

function reloadP42() {
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
    'aioiInstitutionalizationReadModelService', 'aioiSovereigntyReadModelService',
    'aioiAutonomyReadModelService'
  ];
  for (const mod of chainPreload) require(`${SERVICES_PATH}/${mod}`);
  return loadP42();
}

function getConsMetrics() {
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiConsumptionMetrics`)];
  if (_svcCache) delete _svcCache.aioiConsumptionMetrics;
  const m = require(`${SERVICES_PATH}/aioiConsumptionMetrics`);
  if (_svcCache) _svcCache.aioiConsumptionMetrics = m;
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
const SAMPLE_SOVR_RM = {
  institutionalization_read_model: SAMPLE_IRM,
  knowledge_independence: { independence_score: 85, independence_status: 'independent' },
  institutional_resilience: { resilience_score: 84, resilience_status: 'resilient' },
  sovereignty_coverage: { coverage_score: 90, coverage_status: 'comprehensive' },
  enterprise_sovereignty: { sovereignty_score: 86, sovereignty_level: 'institutional_sovereign' }
};

const EMPTY_SOVR_RM = { institutionalization_read_model: { governance_excellence_read_model: { conformance_read_model: {} } } };
const SAMPLE_ARM = {
  sovereignty_read_model: SAMPLE_SOVR_RM,
  knowledge_autonomy: { autonomy_score: 85, autonomy_status: 'autonomous' },
  sovereignty_continuity: { continuity_score: 84, continuity_status: 'continuous' },
  autonomy_coverage: { coverage_score: 90, coverage_status: 'comprehensive' },
  enterprise_autonomy: { autonomy_score: 86, autonomy_level: 'sovereign_autonomous' }
};

const EMPTY_ARM = { sovereignty_read_model: { institutionalization_read_model: { governance_excellence_read_model: { conformance_read_model: {} } } } };

async function runTests() {
  let cm = getConsMetrics();
  cm.resetSessionCounters();
  const mock = createReadinessDbMock();
  patchDb(mock);
  const svc = reloadP42();
  let cachedCons = null;
  async function getCachedCons() {
    if (!cachedCons) {
      cachedCons = await svc.aioiConsumptionReadModelService.getConsumptionReadModel(COMPANY_ID);
    }
    return cachedCons;
  }

  suite('T1'); await test('T1: classifyExecutiveVisibility visible', async () => { assertEqual(getConsMetrics().classifyExecutiveVisibility(80), 'visible', '') });
  suite('T2'); await test('T2: classifyExecutiveVisibility partial', async () => { assertEqual(getConsMetrics().classifyExecutiveVisibility(55), 'partial', '') });
  suite('T3'); await test('T3: classifyExecutiveVisibility opaque', async () => { assertEqual(getConsMetrics().classifyExecutiveVisibility(30), 'opaque', '') });
  suite('T4'); await test('T4: VISIBILITY_PILLARS 12', async () => { assertEqual(svc.aioiExecutiveVisibilityService.VISIBILITY_PILLARS.length, 12, '') });
  suite('T5'); await test('T5: buildExecutiveVisibility', async () => { const r = svc.aioiExecutiveVisibilityService.buildExecutiveVisibility(SAMPLE_ARM); assert(r.visibility_score >= 70 && r.visibility_status === 'visible') });
  suite('T6'); await test('T6: computeExecutiveVisibilityScore range', async () => { const s = svc.aioiExecutiveVisibilityService.computeExecutiveVisibilityScore(SAMPLE_ARM); assert(s >= 0 && s <= 100) });
  suite('T7'); await test('T7: getExecutiveVisibility via read model', async () => { const r = await getCachedCons(); assert(r.ok && r.consumption_read_model.executive_visibility.visibility_status) });
  suite('T8'); await test('T8: companyId inválido visibility', async () => { const r = await svc.aioiExecutiveVisibilityService.getExecutiveVisibility('bad'); assert(!r.ok) });
  suite('T9'); await test('T9: composição P4.1 autonomyReadModel', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiExecutiveVisibilityService.js'), 'utf8')); assert(code.includes('autonomyReadModel') && !code.includes('getSovereigntyReadModel')) });
  suite('T10'); await test('T10: determinístico visibility', async () => { assertEqual(svc.aioiExecutiveVisibilityService.computeExecutiveVisibilityScore(SAMPLE_ARM), svc.aioiExecutiveVisibilityService.computeExecutiveVisibilityScore(SAMPLE_ARM), '') });
  suite('T11'); await test('T11: recordExecutiveVisibilityAnalyzed', async () => { cm = getConsMetrics(); cm.resetSessionCounters(); cm.recordExecutiveVisibilityAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().executive_visibility_count >= 1) });
  suite('T12'); await test('T12: zero writes visibility path', async () => { await getCachedCons(); assertNoWrites(mock._client._calls) });
  suite('T13'); await test('T13: limite 70 visible', async () => { assertEqual(getConsMetrics().classifyExecutiveVisibility(70), 'visible', '') });
  suite('T14'); await test('T14: empty arm score baixo', async () => { assert(svc.aioiExecutiveVisibilityService.computeExecutiveVisibilityScore(EMPTY_ARM) <= 40) });
  suite('T15'); await test('T15: status permitidos visibility', async () => { const allowed = ['opaque', 'partial', 'visible']; for (const s of [80, 50, 20]) assert(allowed.includes(getConsMetrics().classifyExecutiveVisibility(s))) });
  suite('T16'); await test('T16: _extractConsumptionSignals trust', async () => { assertEqual(getConsMetrics()._extractConsumptionSignals(SAMPLE_ARM).trustScore, 80, '') });
  suite('T17'); await test('T17: _extractConsumptionSignals autonomy', async () => { assertEqual(getConsMetrics()._extractConsumptionSignals(SAMPLE_ARM).autonomyScore, 86, '') });
  suite('T18'); await test('T18: _extractConsumptionSignals sovereignty', async () => { assertEqual(getConsMetrics()._extractConsumptionSignals(SAMPLE_ARM).sovereigntyScore, 86, '') });
  suite('T19'); await test('T19: pilares incluem autonomy', async () => { assert(svc.aioiExecutiveVisibilityService.VISIBILITY_PILLARS.includes('autonomy')) });
  suite('T20'); await test('T20: buildExecutiveVisibility campos', async () => { const r = svc.aioiExecutiveVisibilityService.buildExecutiveVisibility(SAMPLE_ARM); assert('visibility_score' in r && 'visibility_status' in r) });
  suite('T21'); await test('T21: classifyDecisionConsumption consumable', async () => { assertEqual(getConsMetrics().classifyDecisionConsumption(80), 'consumable', '') });
  suite('T22'); await test('T22: classifyDecisionConsumption partial', async () => { assertEqual(getConsMetrics().classifyDecisionConsumption(55), 'partial', '') });
  suite('T23'); await test('T23: classifyDecisionConsumption fragmented', async () => { assertEqual(getConsMetrics().classifyDecisionConsumption(30), 'fragmented', '') });
  suite('T24'); await test('T24: DECISION_CONSUMPTION_STAGES 12', async () => { assertEqual(svc.aioiDecisionConsumptionService.DECISION_CONSUMPTION_STAGES.length, 12, '') });
  suite('T25'); await test('T25: buildDecisionConsumption', async () => { const r = svc.aioiDecisionConsumptionService.buildDecisionConsumption(SAMPLE_ARM); assert(r.consumption_score >= 70 && r.consumption_status === 'consumable') });
  suite('T26'); await test('T26: computeDecisionConsumptionScore range', async () => { const s = svc.aioiDecisionConsumptionService.computeDecisionConsumptionScore(SAMPLE_ARM); assert(s >= 0 && s <= 100) });
  suite('T27'); await test('T27: getDecisionConsumption ok', async () => { const r = await svc.aioiDecisionConsumptionService.getDecisionConsumption(COMPANY_ID); assert(r.ok && r.decision_consumption.consumption_status) });
  suite('T28'); await test('T28: companyId inválido decision', async () => { const r = await svc.aioiDecisionConsumptionService.getDecisionConsumption('x'); assert(!r.ok) });
  suite('T29'); await test('T29: empty arm decision baixo', async () => { assert(svc.aioiDecisionConsumptionService.computeDecisionConsumptionScore(EMPTY_ARM) <= 40) });
  suite('T30'); await test('T30: recordDecisionConsumptionAnalyzed', async () => { cm = getConsMetrics(); cm.recordDecisionConsumptionAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().decision_consumption_count >= 1) });
  suite('T31'); await test('T31: zero writes decision', async () => { assertNoWrites(mock._client._calls) });
  suite('T32'); await test('T32: limite 70 consumable', async () => { assertEqual(getConsMetrics().classifyDecisionConsumption(70), 'consumable', '') });
  suite('T33'); await test('T33: determinístico decision', async () => { assertEqual(svc.aioiDecisionConsumptionService.computeDecisionConsumptionScore(SAMPLE_ARM), svc.aioiDecisionConsumptionService.computeDecisionConsumptionScore(SAMPLE_ARM), '') });
  suite('T34'); await test('T34: cadeia trust→autonomy', async () => { const stages = svc.aioiDecisionConsumptionService.DECISION_CONSUMPTION_STAGES; assertEqual(stages[0], 'trust', ''); assertEqual(stages[11], 'autonomy', '') });
  suite('T35'); await test('T35: status permitidos decision', async () => { const allowed = ['fragmented', 'partial', 'consumable']; for (const s of [80, 50, 20]) assert(allowed.includes(getConsMetrics().classifyDecisionConsumption(s))) });
  suite('T36'); await test('T36: composição P4.1 decision', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiDecisionConsumptionService.js'), 'utf8')); assert(code.includes('autonomyReadModel')) });
  suite('T37'); await test('T37: partial arm só trust', async () => { const partial = { sovereignty_read_model: { institutionalization_read_model: { governance_excellence_read_model: { conformance_read_model: { certification_read_model: { sustainability_read_model: { value_governance_read_model: { readiness_read_model: { auditability_read_model: { assurance_read_model: { trust_read_model: { intelligence_trust: { trust_score: 75 } } } } } } } } } } } } }; assert(svc.aioiDecisionConsumptionService.computeDecisionConsumptionScore(partial) < 70) });
  suite('T38'); await test('T38: full vs partial decision', async () => { const full = svc.aioiDecisionConsumptionService.computeDecisionConsumptionScore(SAMPLE_ARM); const partial = svc.aioiDecisionConsumptionService.computeDecisionConsumptionScore({ sovereignty_read_model: { institutionalization_read_model: { governance_excellence_read_model: { conformance_read_model: { certification_read_model: { sustainability_read_model: { value_governance_read_model: { readiness_read_model: { auditability_read_model: { assurance_read_model: { trust_read_model: { intelligence_trust: { trust_score: 80 } } } } } } } } } } } } }); assert(full > partial) });
  suite('T39'); await test('T39: limite 40 partial decision', async () => { assertEqual(getConsMetrics().classifyDecisionConsumption(40), 'partial', '') });
  suite('T40'); await test('T40: buildDecisionConsumption campos', async () => { const r = svc.aioiDecisionConsumptionService.buildDecisionConsumption(SAMPLE_ARM); assert('consumption_score' in r && 'consumption_status' in r) });
  suite('T41'); await test('T41: classifyIntelligenceAccessibility accessible', async () => { assertEqual(getConsMetrics().classifyIntelligenceAccessibility(80), 'accessible', '') });
  suite('T42'); await test('T42: classifyIntelligenceAccessibility partial', async () => { assertEqual(getConsMetrics().classifyIntelligenceAccessibility(55), 'partial', '') });
  suite('T43'); await test('T43: classifyIntelligenceAccessibility restricted', async () => { assertEqual(getConsMetrics().classifyIntelligenceAccessibility(30), 'restricted', '') });
  suite('T44'); await test('T44: ACCESSIBILITY_DOMAINS 22', async () => { assertEqual(svc.aioiIntelligenceAccessibilityService.ACCESSIBILITY_DOMAINS.length, 22, '') });
  suite('T45'); await test('T45: buildIntelligenceAccessibility', async () => { const r = svc.aioiIntelligenceAccessibilityService.buildIntelligenceAccessibility(SAMPLE_ARM); assert(r.accessibility_score >= 70 && r.accessibility_status === 'accessible') });
  suite('T46'); await test('T46: computeIntelligenceAccessibilityScore range', async () => { const s = svc.aioiIntelligenceAccessibilityService.computeIntelligenceAccessibilityScore(SAMPLE_ARM); assert(s >= 0 && s <= 100) });
  suite('T47'); await test('T47: getIntelligenceAccessibility ok', async () => { const r = await svc.aioiIntelligenceAccessibilityService.getIntelligenceAccessibility(COMPANY_ID); assert(r.ok && r.intelligence_accessibility.accessibility_status) });
  suite('T48'); await test('T48: companyId inválido accessibility', async () => { const r = await svc.aioiIntelligenceAccessibilityService.getIntelligenceAccessibility('invalid'); assert(!r.ok) });
  suite('T49'); await test('T49: empty arm accessibility baixo', async () => { assert(svc.aioiIntelligenceAccessibilityService.computeIntelligenceAccessibilityScore(EMPTY_ARM) <= 40) });
  suite('T50'); await test('T50: recordIntelligenceAccessibilityAnalyzed', async () => { cm = getConsMetrics(); cm.recordIntelligenceAccessibilityAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().intelligence_accessibility_count >= 1) });
  suite('T51'); await test('T51: domínio autonomy', async () => { assert(svc.aioiIntelligenceAccessibilityService.ACCESSIBILITY_DOMAINS.includes('autonomy')) });
  suite('T52'); await test('T52: domínio sovereignty', async () => { assert(svc.aioiIntelligenceAccessibilityService.ACCESSIBILITY_DOMAINS.includes('sovereignty')) });
  suite('T53'); await test('T53: determinístico accessibility', async () => { assertEqual(svc.aioiIntelligenceAccessibilityService.computeIntelligenceAccessibilityScore(SAMPLE_ARM), svc.aioiIntelligenceAccessibilityService.computeIntelligenceAccessibilityScore(SAMPLE_ARM), '') });
  suite('T54'); await test('T54: limite 70 accessible', async () => { assertEqual(getConsMetrics().classifyIntelligenceAccessibility(70), 'accessible', '') });
  suite('T55'); await test('T55: buildIntelligenceAccessibility campos', async () => { const r = svc.aioiIntelligenceAccessibilityService.buildIntelligenceAccessibility(SAMPLE_ARM); assert('accessibility_score' in r && 'accessibility_status' in r) });
  suite('T56'); await test('T56: classifyEnterpriseConsumption consumption_ready', async () => { assertEqual(getConsMetrics().classifyEnterpriseConsumption(92), 'consumption_ready', '') });
  suite('T57'); await test('T57: classifyEnterpriseConsumption executive_ready', async () => { assertEqual(getConsMetrics().classifyEnterpriseConsumption(75), 'executive_ready', '') });
  suite('T58'); await test('T58: classifyEnterpriseConsumption developing', async () => { assertEqual(getConsMetrics().classifyEnterpriseConsumption(55), 'developing', '') });
  suite('T59'); await test('T59: classifyEnterpriseConsumption emerging', async () => { assertEqual(getConsMetrics().classifyEnterpriseConsumption(30), 'emerging', '') });
  suite('T60'); await test('T60: ENTERPRISE_CONSUMPTION_WEIGHTS 0.25', async () => { const w = svc.aioiEnterpriseConsumptionService.ENTERPRISE_CONSUMPTION_WEIGHTS; assertEqual(w.executiveVisibility, 0.25, ''); assertEqual(w.decisionConsumption, 0.25, ''); assertEqual(w.intelligenceAccessibility, 0.25, ''); assertEqual(w.enterpriseAutonomy, 0.25, '') });
  suite('T61'); await test('T61: buildEnterpriseConsumption', async () => { const r = svc.aioiEnterpriseConsumptionService.buildEnterpriseConsumption({ visibilityScore: 80, decisionConsumptionScore: 85, accessibilityScore: 82, enterpriseAutonomyScore: 83 }); assert(r.consumption_score >= 70 && r.consumption_level) });
  suite('T62'); await test('T62: computeEnterpriseConsumptionScore range', async () => { const s = svc.aioiEnterpriseConsumptionService.computeEnterpriseConsumptionScore({ visibilityScore: 80, decisionConsumptionScore: 80, accessibilityScore: 80, enterpriseAutonomyScore: 80 }); assert(s >= 0 && s <= 100) });
  suite('T63'); await test('T63: getEnterpriseConsumption ok', async () => { const r = await svc.aioiEnterpriseConsumptionService.getEnterpriseConsumption(COMPANY_ID); assert(r.ok && r.enterprise_consumption.consumption_level) });
  suite('T64'); await test('T64: companyId inválido enterprise', async () => { const r = await svc.aioiEnterpriseConsumptionService.getEnterpriseConsumption('bad-id'); assert(!r.ok) });
  suite('T65'); await test('T65: recordEnterpriseConsumptionAnalyzed', async () => { cm = getConsMetrics(); cm.recordEnterpriseConsumptionAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().enterprise_consumption_count >= 1) });
  suite('T66'); await test('T66: zero writes enterprise', async () => { assertNoWrites(mock._client._calls) });
  suite('T67'); await test('T67: limite 90 consumption_ready', async () => { assertEqual(getConsMetrics().classifyEnterpriseConsumption(90), 'consumption_ready', '') });
  suite('T68'); await test('T68: determinístico enterprise', async () => { const inp = { visibilityScore: 80, decisionConsumptionScore: 75, accessibilityScore: 82, enterpriseAutonomyScore: 78 }; assertEqual(svc.aioiEnterpriseConsumptionService.computeEnterpriseConsumptionScore(inp), svc.aioiEnterpriseConsumptionService.computeEnterpriseConsumptionScore(inp), '') });
  suite('T69'); await test('T69: pesos iguais soma ponderada', async () => { assertEqual(svc.aioiEnterpriseConsumptionService.computeEnterpriseConsumptionScore({ visibilityScore: 100, decisionConsumptionScore: 100, accessibilityScore: 100, enterpriseAutonomyScore: 100 }), 100, '') });
  suite('T70'); await test('T70: níveis permitidos enterprise', async () => { const allowed = ['emerging', 'developing', 'executive_ready', 'consumption_ready']; for (const s of [30, 55, 75, 92]) assert(allowed.includes(getConsMetrics().classifyEnterpriseConsumption(s))) });
  suite('T71'); await test('T71: getConsumptionReadModel ok', async () => { const r = await getCachedCons(); assert(r.ok && r.consumption_read_model) });
  suite('T72'); await test('T72: estrutura obrigatória read model', async () => { const r = await getCachedCons(); const crm = r.consumption_read_model; assert(crm.autonomy_read_model && crm.executive_visibility && crm.decision_consumption && crm.intelligence_accessibility && crm.enterprise_consumption) });
  suite('T73'); await test('T73: companyId inválido read model', async () => { const r = await svc.aioiConsumptionReadModelService.getConsumptionReadModel('invalid'); assert(!r.ok) });
  suite('T74'); await test('T74: anti-duplication build* local', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiConsumptionReadModelService.js'), 'utf8')); assert(code.includes('buildExecutiveVisibility') && code.includes('buildDecisionConsumption')); assert(!code.includes('getExecutiveVisibility(') && !code.includes('getDecisionConsumption(')) });
  suite('T75'); await test('T75: getAutonomyReadModel uma vez', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiConsumptionReadModelService.js'), 'utf8')); assertEqual((code.match(/getAutonomyReadModel/g) || []).length, 1, 'single arm call') });
  suite('T76'); await test('T76: sem LLM/IA P4.2', async () => { const files = ['aioiExecutiveVisibilityService.js', 'aioiDecisionConsumptionService.js', 'aioiIntelligenceAccessibilityService.js', 'aioiEnterpriseConsumptionService.js', 'aioiConsumptionReadModelService.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('openai') && !code.includes('generateText'), f); } });
  suite('T77'); await test('T77: sem forecast novo', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiConsumptionReadModelService.js'), 'utf8')); assert(!code.includes('getBacklogForecast') && !code.includes('BacklogForecast')) });
  suite('T78'); await test('T78: Promise.all agregador', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiConsumptionReadModelService.js'), 'utf8')); assert(code.includes('Promise.all')) });
  suite('T79'); await test('T79: autonomy_read_model nested', async () => { const r = await getCachedCons(); assert(r.consumption_read_model.autonomy_read_model.sovereignty_read_model) });
  suite('T80'); await test('T80: executive_visibility campos', async () => { const r = await getCachedCons(); const ev = r.consumption_read_model.executive_visibility; assert('visibility_score' in ev && 'visibility_status' in ev) });
  suite('T81'); await test('T81: decision_consumption campos', async () => { const r = await getCachedCons(); const dc = r.consumption_read_model.decision_consumption; assert('consumption_score' in dc && 'consumption_status' in dc) });
  suite('T82'); await test('T82: intelligence_accessibility campos', async () => { const r = await getCachedCons(); const ia = r.consumption_read_model.intelligence_accessibility; assert('accessibility_score' in ia && 'accessibility_status' in ia) });
  suite('T83'); await test('T83: enterprise_consumption campos', async () => { const r = await getCachedCons(); const ec = r.consumption_read_model.enterprise_consumption; assert('consumption_score' in ec && 'consumption_level' in ec) });
  suite('T84'); await test('T84: composição exclusiva P4.1', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiConsumptionReadModelService.js'), 'utf8')); assert(code.includes('autonomyReadModel') && !code.includes('getSovereigntyReadModel')) });
  suite('T85'); await test('T85: recordConsumptionRequested/Completed', async () => { cm = getConsMetrics(); if (_svcCache) _svcCache.aioiConsumptionMetrics = cm; cm.resetSessionCounters(); cm.recordConsumptionRequested(COMPANY_ID); cm.recordConsumptionCompleted(COMPANY_ID, 42); const c = cm.getSessionCounters(); assertEqual(c.consumption_requests, 1, ''); assertEqual(c.avg_query_latency_ms, 42, '') });
  suite('T86'); await test('T86: enterprise_consumption composto', async () => { const r = await getCachedCons(); const ec = r.consumption_read_model.enterprise_consumption; assert(ec.consumption_score >= 0 && ec.consumption_level) });
  suite('T87'); await test('T87: enterprise_autonomy via arm nested', async () => { const r = await getCachedCons(); assert(r.consumption_read_model.autonomy_read_model.enterprise_autonomy) });
  suite('T88'); await test('T88: determinístico read model scores', async () => { const r1 = svc.aioiExecutiveVisibilityService.buildExecutiveVisibility(SAMPLE_ARM); const r2 = svc.aioiExecutiveVisibilityService.buildExecutiveVisibility(SAMPLE_ARM); assertEqual(r1.visibility_score, r2.visibility_score, '') });
  suite('T89'); await test('T89: 22 domínios accessibility full sample', async () => { assert(svc.aioiIntelligenceAccessibilityService.computeIntelligenceAccessibilityScore(SAMPLE_ARM) >= 85) });
  suite('T90'); await test('T90: 12 pilares visibility full sample', async () => { assert(svc.aioiExecutiveVisibilityService.computeExecutiveVisibilityScore(SAMPLE_ARM) >= 70) });
  suite('T91'); await test('T91: 12 estágios decision full sample', async () => { assert(svc.aioiDecisionConsumptionService.computeDecisionConsumptionScore(SAMPLE_ARM) >= 70) });
  suite('T92'); await test('T92: _extractConsumptionSignals governance excellence', async () => { assertEqual(getConsMetrics()._extractConsumptionSignals(SAMPLE_ARM).governanceExcellenceScore, 84, '') });
  suite('T93'); await test('T93: limite 40 partial visibility', async () => { assertEqual(getConsMetrics().classifyExecutiveVisibility(40), 'partial', '') });
  suite('T94'); await test('T94: limite 40 developing enterprise', async () => { assertEqual(getConsMetrics().classifyEnterpriseConsumption(40), 'developing', '') });
  suite('T95'); await test('T95: composição P4.1 enterprise', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiEnterpriseConsumptionService.js'), 'utf8')); assert(code.includes('autonomyReadModel') && !code.includes('getKnowledgeAutonomy')) });
  suite('T96'); await test('T96: INSERT bloqueado', async () => { cm = getConsMetrics(); let threw = false; try { cm.assertReadOnlySql('INSERT INTO x VALUES (1)'); } catch (e) { threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', ''); } assert(threw) });
  suite('T97'); await test('T97: UPDATE bloqueado', async () => { cm = getConsMetrics(); let threw = false; try { cm.assertReadOnlySql('UPDATE x SET y=1'); } catch (e) { threw = true; } assert(threw) });
  suite('T98'); await test('T98: DELETE bloqueado', async () => { cm = getConsMetrics(); let threw = false; try { cm.assertReadOnlySql('DELETE FROM x'); } catch (e) { threw = true; } assert(threw) });
  suite('T99'); await test('T99: RLS company_id + bypass false', async () => { await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID); const t = mock._client._calls.find(c => c.sql.includes('app.current_company_id')); const b = mock._client._calls.filter(c => c.sql.includes('app.bypass_rls')); assert(t && t.params[0] === COMPANY_ID); assert(b.length >= 1) });
  suite('T100'); await test('T100: tenant B benchmark only', async () => { const mockB = createReadinessDbMock(buildIoes().map(i => ({ ...i, company_id: COMPANY_ID_B })), buildSnapshots().map(s => ({ ...s, company_id: COMPANY_ID_B }))); patchDb(mockB); _svcCache = null; clearAioiModuleCache(); const svcB = loadP42(); const bench = await svcB.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID_B); assert(bench.ok && bench.benchmark); const t = mockB._client._calls.filter(c => c.sql.includes('app.current_company_id')).find(c => c.params && c.params[0] === COMPANY_ID_B); assert(t, 'RLS tenant B') });
  restoreDb();
  suite('T101'); await test('T101: recordConsumptionRequested log', async () => { cm = getConsMetrics(); cm.resetSessionCounters(); cm.recordConsumptionRequested(COMPANY_ID); assert(cm.getSessionCounters().consumption_requests === 1) });
  suite('T102'); await test('T102: recordExecutiveVisibilityAnalyzed log', async () => { cm = getConsMetrics(); cm.recordExecutiveVisibilityAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().executive_visibility_count >= 1) });
  suite('T103'); await test('T103: recordDecisionConsumptionAnalyzed log', async () => { cm = getConsMetrics(); cm.recordDecisionConsumptionAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().decision_consumption_count >= 1) });
  suite('T104'); await test('T104: recordIntelligenceAccessibilityAnalyzed log', async () => { cm = getConsMetrics(); cm.recordIntelligenceAccessibilityAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().intelligence_accessibility_count >= 1) });
  suite('T105'); await test('T105: recordEnterpriseConsumptionAnalyzed log', async () => { cm = getConsMetrics(); cm.recordEnterpriseConsumptionAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().enterprise_consumption_count >= 1) });
  suite('T106'); await test('T106: getSessionCounters campos', async () => { cm = getConsMetrics(); cm.resetSessionCounters(); cm.recordEnterpriseConsumptionAnalyzed(COMPANY_ID); const c = cm.getSessionCounters(); assert(c.enterprise_consumption_count >= 1 && 'avg_query_latency_ms' in c); assert('consumption_requests' in c && 'executive_visibility_count' in c) });
  suite('T107'); await test('T107: clampScore', async () => { assertEqual(getConsMetrics().clampScore(150), 100, '') });
  suite('T108'); await test('T108: TRUNCATE bloqueado', async () => { cm = getConsMetrics(); let threw = false; try { cm.assertReadOnlySql('TRUNCATE TABLE x'); } catch (e) { threw = true; } assert(threw) });
  suite('T109'); await test('T109: ON CONFLICT bloqueado', async () => { cm = getConsMetrics(); let threw = false; try { cm.assertReadOnlySql('INSERT INTO x VALUES (1) ON CONFLICT DO NOTHING'); } catch (e) { threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', ''); } assert(threw) });
  suite('T110'); await test('T110: MERGE bloqueado', async () => { cm = getConsMetrics(); let threw = false; try { cm.assertReadOnlySql('MERGE INTO x'); } catch (e) { threw = true; } assert(threw) });
  suite('T111'); await test('T111: anti-duplication composição P4.1', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiConsumptionReadModelService.js'), 'utf8')); assert(code.includes('autonomyReadModel') && !code.includes('getExecutiveVisibility')); assert(code.includes('_extractConsumptionSignals')) });
  suite('T112'); await test('T112: sem getSovereigntyReadModel direto', async () => { const files = ['aioiExecutiveVisibilityService.js', 'aioiDecisionConsumptionService.js', 'aioiIntelligenceAccessibilityService.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('getSovereigntyReadModel'), f); } });
  suite('T113'); await test('T113: sem getInstitutionalizationReadModel direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiConsumptionReadModelService.js'), 'utf8')); assert(!code.includes('getInstitutionalizationReadModel')) });
  suite('T114'); await test('T114: CREATE bloqueado', async () => { cm = getConsMetrics(); let threw = false; try { cm.assertReadOnlySql('CREATE TABLE x (id int)'); } catch (e) { threw = true; } assert(threw) });
  suite('T115'); await test('T115: GRANT bloqueado', async () => { cm = getConsMetrics(); let threw = false; try { cm.assertReadOnlySql('GRANT ALL ON x TO y'); } catch (e) { threw = true; } assert(threw) });
  suite('T116'); await test('T116: soberanos ausentes P4.2', async () => { const files = ['aioiConsumptionMetrics.js', 'aioiExecutiveVisibilityService.js', 'aioiDecisionConsumptionService.js', 'aioiIntelligenceAccessibilityService.js', 'aioiEnterpriseConsumptionService.js', 'aioiConsumptionReadModelService.js']; const forbidden = ['operationalDecisionEngine', 'operationalLearningService', 'workflowOrchestrator', 'actionRuntimeOrchestrator', 'computePriorityScore', 'classificationConsumer', 'aioiOutboxConsumerService']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); for (const bad of forbidden) assert(!code.includes(bad), `${f} contém ${bad}`); } });
  suite('T117'); await test('T117: sem fan-out getAutonomyReadModel', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiConsumptionReadModelService.js'), 'utf8')); assertEqual((code.match(/getAutonomyReadModel/g) || []).length, 1, 'no fan-out') });
  suite('T118'); await test('T118: sem getConformanceReadModel direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiConsumptionReadModelService.js'), 'utf8')); assert(!code.includes('getConformanceReadModel')) });
  suite('T119'); await test('T119: domínio certification accessibility', async () => { assert(svc.aioiIntelligenceAccessibilityService.ACCESSIBILITY_DOMAINS.includes('certification')) });
  suite('T120'); await test('T120: pilares incluem governance_excellence', async () => { assert(svc.aioiExecutiveVisibilityService.VISIBILITY_PILLARS.includes('governance_excellence')) });
  suite('T121'); await test('T121: REVOKE bloqueado', async () => { cm = getConsMetrics(); let threw = false; try { cm.assertReadOnlySql('REVOKE ALL ON x FROM y'); } catch (e) { threw = true; } assert(threw) });
  suite('T122'); await test('T122: sem getCertificationReadModel direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiConsumptionReadModelService.js'), 'utf8')); assert(!code.includes('getCertificationReadModel')) });
  suite('T123'); await test('T123: limite 40 partial accessibility', async () => { assertEqual(getConsMetrics().classifyIntelligenceAccessibility(40), 'partial', '') });
  suite('T124'); await test('T124: _extractConsumptionSignals certification', async () => { assertEqual(getConsMetrics()._extractConsumptionSignals(SAMPLE_ARM).certificationScore, 86, '') });
  suite('T125'); await test('T125: 11 estágios decision index governance_excellence', async () => { assertEqual(svc.aioiDecisionConsumptionService.DECISION_CONSUMPTION_STAGES[8], 'governance_excellence', '') });
  suite('T126'); await test('T126: domínio conformance accessibility', async () => { assert(svc.aioiIntelligenceAccessibilityService.ACCESSIBILITY_DOMAINS.includes('conformance')) });
  suite('T127'); await test('T127: regressão P4.1 autonomy read model intacto', async () => { const r = await getCachedCons(); assert(r.consumption_read_model.autonomy_read_model.knowledge_autonomy) });
  suite('T128'); await test('T128: regressão P4.1 enterprise autonomy', async () => { const r = await getCachedCons(); assert(r.consumption_read_model.autonomy_read_model.enterprise_autonomy.autonomy_level) });
  suite('T129'); await test('T129: sem getSustainabilityReadModel direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiConsumptionReadModelService.js'), 'utf8')); assert(!code.includes('getSustainabilityReadModel')) });
  suite('T130'); await test('T130: domínio institutionalization accessibility', async () => { assert(svc.aioiIntelligenceAccessibilityService.ACCESSIBILITY_DOMAINS.includes('institutionalization')) });
  suite('T131'); await test('T131: recordConsumptionCompleted log', async () => { cm = getConsMetrics(); cm.recordConsumptionCompleted(COMPANY_ID, 50); assert(cm.getSessionCounters().avg_query_latency_ms === 50) });
  suite('T132'); await test('T132: domínio governance_excellence accessibility', async () => { assert(svc.aioiIntelligenceAccessibilityService.ACCESSIBILITY_DOMAINS.includes('governance_excellence')) });
  suite('T133'); await test('T133: pilares incluem institutionalization', async () => { assert(svc.aioiExecutiveVisibilityService.VISIBILITY_PILLARS.includes('institutionalization')) });
  suite('T134'); await test('T134: sem execução operacional P4.2', async () => { const files = ['aioiConsumptionReadModelService.js', 'aioiEnterpriseConsumptionService.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('executeDecision') && !code.includes('runWorkflow'), f); } });
  suite('T135'); await test('T135: sem scoring novo P4.2', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiConsumptionMetrics.js'), 'utf8')); assert(!code.includes('computePriorityScore') && !code.includes('mlModel')) });
  suite('T136'); await test('T136: consumption layer read only', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiConsumptionReadModelService.js'), 'utf8')); assert(code.includes('autonomyReadModel') && !code.includes('INSERT') && !code.includes('UPDATE')) });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`AIOI-P4.2 Consumption Tests: ${_passed} passed, ${_failed} failed`);
  console.log(`${'='.repeat(60)}`);
  if (_failed === 0) {
    console.log('\nAIOI_P4_2_ENTERPRISE_INTELLIGENCE_CONSUMPTION_PASS\n');
  } else {
    process.exitCode = 1;
  }
}

runTests().catch(err => {
  console.error('FATAL:', err);
  process.exitCode = 1;
});
