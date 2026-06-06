'use strict';

/**
 * AIOI-P3.8 — Testes automatizados da Enterprise Intelligence Governance Excellence Layer
 * T1–T116 | node src/tests/aioi/aioiGovernanceExcellenceReadModel.test.js
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

const P38_EXPORTS = [
  'aioiCertificationReadModelService', 'aioiConformanceReadModelService',
  'aioiGovernanceExcellenceMetrics', 'aioiGovernanceMaturityService', 'aioiExcellenceGovernanceConsistencyService',
  'aioiGovernanceExcellenceCoverageService', 'aioiEnterpriseGovernanceExcellenceService',
  'aioiGovernanceExcellenceReadModelService', 'aioiBenchmarkAnalysisService'
];

function clearAioiModuleCache() {
  for (const key of Object.keys(require.cache)) {
    if (key.includes('/services/aioi/')) delete require.cache[key];
  }
}

let _svcCache = null;

function loadP38() {
  if (_svcCache) return _svcCache;
  const loaded = {};
  for (const mod of P38_EXPORTS) {
    loaded[mod] = require(`${SERVICES_PATH}/${mod}`);
  }
  _svcCache = loaded;
  return loaded;
}

function reloadP38() {
  _svcCache = null;
  clearAioiModuleCache();
  const chainPreload = [
    'aioiGovernanceReadModelService',
    'aioiPredictiveGovernanceReadModelService',
    'aioiExecutiveMaturityReadModelService',
    'aioiStrategicReadModelService',
    'aioiValueReadModelService',
    'aioiResilienceReadModelService',
    'aioiScenarioReadModelService',
    'aioiDigitalTwinReadModelService',
    'aioiExecutiveCommandReadModelService',
    'aioiTrustReadModelService',
    'aioiAssuranceReadModelService',
    'aioiAuditabilityReadModelService',
    'aioiReadinessReadModelService',
    'aioiValueGovernanceReadModelService',
    'aioiSustainabilityReadModelService',
    'aioiCertificationReadModelService',
    'aioiConformanceReadModelService'
  ];
  for (const mod of chainPreload) {
    require(`${SERVICES_PATH}/${mod}`);
  }
  return loadP38();
}

function getGovMetrics() {
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiGovernanceExcellenceMetrics`)];
  if (_svcCache) delete _svcCache.aioiGovernanceExcellenceMetrics;
  const m = require(`${SERVICES_PATH}/aioiGovernanceExcellenceMetrics`);
  if (_svcCache) _svcCache.aioiGovernanceExcellenceMetrics = m;
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

const EMPTY_SRM = {};

const SAMPLE_CRM = {
  sustainability_read_model: SAMPLE_SRM,
  certification_readiness: { certification_readiness_score: 82, certification_readiness_status: 'certification_ready' },
  accreditation_coverage: { coverage_score: 88, coverage_status: 'comprehensive' },
  intelligence_maturity_certification: { maturity_score: 84, maturity_level: 'level_4_trusted' },
  enterprise_certification: { certification_score: 86, certification_level: 'certifiable' }
};

const EMPTY_CRM = {};

const SAMPLE_CONF_RM = {
  certification_read_model: SAMPLE_CRM,
  intelligence_conformance: { conformance_score: 84, conformance_status: 'conformant' },
  standards_coverage: { coverage_score: 88, coverage_status: 'complete' },
  certification_continuity: { continuity_score: 86, continuity_status: 'continuous' },
  enterprise_conformance: { enterprise_conformance_score: 85, enterprise_conformance_level: 'conformant' }
};

const EMPTY_CONF_RM = {};

async function runTests() {
  let gm = getGovMetrics();
  gm.resetSessionCounters();

  const mock = createReadinessDbMock();
  patchDb(mock);
  const svc = reloadP38();
  let cachedGov = null;
  async function getCachedGov() {
    if (!cachedGov) {
      cachedGov = await svc.aioiGovernanceExcellenceReadModelService.getGovernanceExcellenceReadModel(COMPANY_ID);
    }
    return cachedGov;
  }
  suite('T1'); await test('T1: classifyGovernanceMaturity mature', () => { assertEqual(getGovMetrics().classifyGovernanceMaturity(80), 'mature', '') });
  suite('T2'); await test('T2: classifyGovernanceMaturity developing', () => { assertEqual(getGovMetrics().classifyGovernanceMaturity(55), 'developing', '') });
  suite('T3'); await test('T3: classifyGovernanceMaturity immature', () => { assertEqual(getGovMetrics().classifyGovernanceMaturity(30), 'immature', '') });
  suite('T4'); await test('T4: MATURITY_PILLARS 8', () => { assertEqual(svc.aioiGovernanceMaturityService.MATURITY_PILLARS.length, 8, '') });
  suite('T5'); await test('T5: buildGovernanceMaturity', () => { const r = svc.aioiGovernanceMaturityService.buildGovernanceMaturity(SAMPLE_CONF_RM); assert(r.maturity_score >= 70 && r.maturity_status === 'mature') });
  suite('T6'); await test('T6: computeGovernanceMaturityScore range', () => { const s = svc.aioiGovernanceMaturityService.computeGovernanceMaturityScore(SAMPLE_CONF_RM); assert(s >= 0 && s <= 100) });
  suite('T7'); await test('T7: getGovernanceMaturity ok', async () => { const r = await getCachedGov(); assert(r.ok && r.governance_excellence_read_model.governance_maturity.maturity_status) });
  suite('T8'); await test('T8: companyId inválido maturity', async () => { const r = await svc.aioiGovernanceMaturityService.getGovernanceMaturity('bad'); assert(!r.ok) });
  suite('T9'); await test('T9: composição P3.7 conformanceReadModel', () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiGovernanceMaturityService.js'), 'utf8')); assert(code.includes('conformanceReadModel') && !code.includes('getCertificationReadModel')) });
  suite('T10'); await test('T10: determinístico maturity', () => { assertEqual(svc.aioiGovernanceMaturityService.computeGovernanceMaturityScore(SAMPLE_CONF_RM), svc.aioiGovernanceMaturityService.computeGovernanceMaturityScore(SAMPLE_CONF_RM), '') });
  suite('T11'); await test('T11: recordGovernanceMaturityAnalyzed', () => { gm = getGovMetrics(); gm.resetSessionCounters(); gm.recordGovernanceMaturityAnalyzed(COMPANY_ID); assert(gm.getSessionCounters().governance_maturity_count >= 1) });
  suite('T12'); await test('T12: zero writes maturity path', async () => { await getCachedGov(); assertNoWrites(mock._client._calls) });
  suite('T13'); await test('T13: limite 70 mature', () => { assertEqual(getGovMetrics().classifyGovernanceMaturity(70), 'mature', '') });
  suite('T14'); await test('T14: empty conf rm score baixo', () => { assert(svc.aioiGovernanceMaturityService.computeGovernanceMaturityScore(EMPTY_CONF_RM) <= 40) });
  suite('T15'); await test('T15: status permitidos maturity', () => { const allowed = ['immature', 'developing', 'mature']; for (const s of [80, 50, 20]) assert(allowed.includes(getGovMetrics().classifyGovernanceMaturity(s))) });
  suite('T16'); await test('T16: _extractGovernanceSignals trust', () => { assertEqual(getGovMetrics()._extractGovernanceSignals(SAMPLE_CONF_RM).trustScore, 80, '') });
  suite('T17'); await test('T17: _extractGovernanceSignals conformance', () => { assertEqual(getGovMetrics()._extractGovernanceSignals(SAMPLE_CONF_RM).conformanceScore, 84, '') });
  suite('T18'); await test('T18: _extractGovernanceSignals certification', () => { assertEqual(getGovMetrics()._extractGovernanceSignals(SAMPLE_CONF_RM).certificationScore, 86, '') });
  suite('T19'); await test('T19: pilares incluem conformance', () => { assert(svc.aioiGovernanceMaturityService.MATURITY_PILLARS.includes('conformance')) });
  suite('T20'); await test('T20: buildGovernanceMaturity campos', () => { const r = svc.aioiGovernanceMaturityService.buildGovernanceMaturity(SAMPLE_CONF_RM); assert('maturity_score' in r && 'maturity_status' in r) });
  suite('T21'); await test('T21: classifyGovernanceConsistency consistent', () => { assertEqual(getGovMetrics().classifyGovernanceConsistency(80), 'consistent', '') });
  suite('T22'); await test('T22: classifyGovernanceConsistency partial', () => { assertEqual(getGovMetrics().classifyGovernanceConsistency(55), 'partial', '') });
  suite('T23'); await test('T23: classifyGovernanceConsistency inconsistent', () => { assertEqual(getGovMetrics().classifyGovernanceConsistency(30), 'inconsistent', '') });
  suite('T24'); await test('T24: CONSISTENCY_STAGES 8', () => { assertEqual(svc.aioiExcellenceGovernanceConsistencyService.CONSISTENCY_STAGES.length, 8, '') });
  suite('T25'); await test('T25: buildGovernanceConsistency', () => { const r = svc.aioiExcellenceGovernanceConsistencyService.buildGovernanceConsistency(SAMPLE_CONF_RM); assert(r.consistency_score >= 70 && r.consistency_status === 'consistent') });
  suite('T26'); await test('T26: computeGovernanceConsistencyScore range', () => { const s = svc.aioiExcellenceGovernanceConsistencyService.computeGovernanceConsistencyScore(SAMPLE_CONF_RM); assert(s >= 0 && s <= 100) });
  suite('T27'); await test('T27: getGovernanceConsistency ok', async () => { const r = await svc.aioiExcellenceGovernanceConsistencyService.getGovernanceConsistency(COMPANY_ID); assert(r.ok && r.governance_consistency.consistency_status) });
  suite('T28'); await test('T28: companyId inválido consistency', async () => { const r = await svc.aioiExcellenceGovernanceConsistencyService.getGovernanceConsistency('x'); assert(!r.ok) });
  suite('T29'); await test('T29: empty conf rm consistency baixo', () => { assert(svc.aioiExcellenceGovernanceConsistencyService.computeGovernanceConsistencyScore(EMPTY_CONF_RM) <= 40) });
  suite('T30'); await test('T30: recordGovernanceConsistencyAnalyzed', () => { gm = getGovMetrics(); gm.recordGovernanceConsistencyAnalyzed(COMPANY_ID); assert(gm.getSessionCounters().governance_consistency_count >= 1) });
  suite('T31'); await test('T31: zero writes consistency', () => { assertNoWrites(mock._client._calls) });
  suite('T32'); await test('T32: limite 70 consistent', () => { assertEqual(getGovMetrics().classifyGovernanceConsistency(70), 'consistent', '') });
  suite('T33'); await test('T33: determinístico consistency', () => { assertEqual(svc.aioiExcellenceGovernanceConsistencyService.computeGovernanceConsistencyScore(SAMPLE_CONF_RM), svc.aioiExcellenceGovernanceConsistencyService.computeGovernanceConsistencyScore(SAMPLE_CONF_RM), '') });
  suite('T34'); await test('T34: cadeia trust→conformance', () => { const stages = svc.aioiExcellenceGovernanceConsistencyService.CONSISTENCY_STAGES; assertEqual(stages[0], 'trust', ''); assertEqual(stages[7], 'conformance', '') });
  suite('T35'); await test('T35: status permitidos consistency', () => { const allowed = ['inconsistent', 'partial', 'consistent']; for (const s of [80, 50, 20]) assert(allowed.includes(getGovMetrics().classifyGovernanceConsistency(s))) });
  suite('T36'); await test('T36: composição P3.7 consistency', () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiExcellenceGovernanceConsistencyService.js'), 'utf8')); assert(code.includes('conformanceReadModel')) });
  suite('T37'); await test('T37: partial conf rm só trust', () => { const partial = { certification_read_model: { sustainability_read_model: { value_governance_read_model: { readiness_read_model: { auditability_read_model: { assurance_read_model: { trust_read_model: { intelligence_trust: { trust_score: 75 } } } } } } } } }; assert(svc.aioiExcellenceGovernanceConsistencyService.computeGovernanceConsistencyScore(partial) < 70) });
  suite('T38'); await test('T38: full vs partial consistency', () => { const full = svc.aioiExcellenceGovernanceConsistencyService.computeGovernanceConsistencyScore(SAMPLE_CONF_RM); const partial = svc.aioiExcellenceGovernanceConsistencyService.computeGovernanceConsistencyScore({ certification_read_model: { sustainability_read_model: { value_governance_read_model: { readiness_read_model: { auditability_read_model: { assurance_read_model: { trust_read_model: { intelligence_trust: { trust_score: 80 } } } } } } } } }); assert(full > partial) });
  suite('T39'); await test('T39: limite 40 partial', () => { assertEqual(getGovMetrics().classifyGovernanceConsistency(40), 'partial', '') });
  suite('T40'); await test('T40: buildGovernanceConsistency campos', () => { const r = svc.aioiExcellenceGovernanceConsistencyService.buildGovernanceConsistency(SAMPLE_CONF_RM); assert('consistency_score' in r && 'consistency_status' in r) });
  suite('T41'); await test('T41: classifyGovernanceCoverage comprehensive', () => { assertEqual(getGovMetrics().classifyGovernanceCoverage(80), 'comprehensive', '') });
  suite('T42'); await test('T42: classifyGovernanceCoverage partial', () => { assertEqual(getGovMetrics().classifyGovernanceCoverage(55), 'partial', '') });
  suite('T43'); await test('T43: classifyGovernanceCoverage limited', () => { assertEqual(getGovMetrics().classifyGovernanceCoverage(30), 'limited', '') });
  suite('T44'); await test('T44: EXCELLENCE_DOMAINS 18', () => { assertEqual(svc.aioiGovernanceExcellenceCoverageService.EXCELLENCE_DOMAINS.length, 18, '') });
  suite('T45'); await test('T45: buildGovernanceExcellenceCoverage', () => { const r = svc.aioiGovernanceExcellenceCoverageService.buildGovernanceExcellenceCoverage(SAMPLE_CONF_RM); assert(r.coverage_score >= 70 && r.coverage_status === 'comprehensive') });
  suite('T46'); await test('T46: computeGovernanceExcellenceCoverageScore range', () => { const s = svc.aioiGovernanceExcellenceCoverageService.computeGovernanceExcellenceCoverageScore(SAMPLE_CONF_RM); assert(s >= 0 && s <= 100) });
  suite('T47'); await test('T47: getGovernanceExcellenceCoverage ok', async () => { const r = await svc.aioiGovernanceExcellenceCoverageService.getGovernanceExcellenceCoverage(COMPANY_ID); assert(r.ok && r.governance_excellence_coverage.coverage_status) });
  suite('T48'); await test('T48: companyId inválido coverage', async () => { const r = await svc.aioiGovernanceExcellenceCoverageService.getGovernanceExcellenceCoverage('invalid'); assert(!r.ok) });
  suite('T49'); await test('T49: empty conf rm coverage baixo', () => { assert(svc.aioiGovernanceExcellenceCoverageService.computeGovernanceExcellenceCoverageScore(EMPTY_CONF_RM) <= 40) });
  suite('T50'); await test('T50: recordGovernanceCoverageAnalyzed', () => { gm = getGovMetrics(); gm.recordGovernanceCoverageAnalyzed(COMPANY_ID); assert(gm.getSessionCounters().governance_coverage_count >= 1) });
  suite('T51'); await test('T51: domínio conformance', () => { assert(svc.aioiGovernanceExcellenceCoverageService.EXCELLENCE_DOMAINS.includes('conformance')) });
  suite('T52'); await test('T52: domínio certification', () => { assert(svc.aioiGovernanceExcellenceCoverageService.EXCELLENCE_DOMAINS.includes('certification')) });
  suite('T53'); await test('T53: determinístico coverage', () => { assertEqual(svc.aioiGovernanceExcellenceCoverageService.computeGovernanceExcellenceCoverageScore(SAMPLE_CONF_RM), svc.aioiGovernanceExcellenceCoverageService.computeGovernanceExcellenceCoverageScore(SAMPLE_CONF_RM), '') });
  suite('T54'); await test('T54: limite 70 comprehensive', () => { assertEqual(getGovMetrics().classifyGovernanceCoverage(70), 'comprehensive', '') });
  suite('T55'); await test('T55: buildGovernanceExcellenceCoverage campos', () => { const r = svc.aioiGovernanceExcellenceCoverageService.buildGovernanceExcellenceCoverage(SAMPLE_CONF_RM); assert('coverage_score' in r && 'coverage_status' in r) });
  suite('T56'); await test('T56: classifyGovernanceExcellence governance_excellent', () => { assertEqual(getGovMetrics().classifyGovernanceExcellence(92), 'governance_excellent', '') });
  suite('T57'); await test('T57: classifyGovernanceExcellence excellent', () => { assertEqual(getGovMetrics().classifyGovernanceExcellence(75), 'excellent', '') });
  suite('T58'); await test('T58: classifyGovernanceExcellence developing', () => { assertEqual(getGovMetrics().classifyGovernanceExcellence(55), 'developing', '') });
  suite('T59'); await test('T59: classifyGovernanceExcellence emerging', () => { assertEqual(getGovMetrics().classifyGovernanceExcellence(30), 'emerging', '') });
  suite('T60'); await test('T60: ENTERPRISE_GOVERNANCE_EXCELLENCE_WEIGHTS 0.25', () => { const w = svc.aioiEnterpriseGovernanceExcellenceService.ENTERPRISE_GOVERNANCE_EXCELLENCE_WEIGHTS; assertEqual(w.governanceMaturity, 0.25, ''); assertEqual(w.governanceConsistency, 0.25, ''); assertEqual(w.excellenceCoverage, 0.25, ''); assertEqual(w.enterpriseConformance, 0.25, '') });
  suite('T61'); await test('T61: buildEnterpriseGovernanceExcellence', () => { const r = svc.aioiEnterpriseGovernanceExcellenceService.buildEnterpriseGovernanceExcellence({ maturityScore: 80, consistencyScore: 85, coverageScore: 82, enterpriseConformanceScore: 83 }); assert(r.governance_excellence_score >= 70 && r.governance_excellence_level) });
  suite('T62'); await test('T62: computeEnterpriseGovernanceExcellenceScore range', () => { const s = svc.aioiEnterpriseGovernanceExcellenceService.computeEnterpriseGovernanceExcellenceScore({ maturityScore: 80, consistencyScore: 80, coverageScore: 80, enterpriseConformanceScore: 80 }); assert(s >= 0 && s <= 100) });
  suite('T63'); await test('T63: getEnterpriseGovernanceExcellence ok', async () => { const r = await svc.aioiEnterpriseGovernanceExcellenceService.getEnterpriseGovernanceExcellence(COMPANY_ID); assert(r.ok && r.enterprise_governance_excellence.governance_excellence_level) });
  suite('T64'); await test('T64: companyId inválido enterprise', async () => { const r = await svc.aioiEnterpriseGovernanceExcellenceService.getEnterpriseGovernanceExcellence('bad-id'); assert(!r.ok) });
  suite('T65'); await test('T65: recordEnterpriseGovernanceAnalyzed', () => { gm = getGovMetrics(); gm.recordEnterpriseGovernanceAnalyzed(COMPANY_ID); assert(gm.getSessionCounters().enterprise_governance_count >= 1) });
  suite('T66'); await test('T66: zero writes enterprise', () => { assertNoWrites(mock._client._calls) });
  suite('T67'); await test('T67: limite 90 governance_excellent', () => { assertEqual(getGovMetrics().classifyGovernanceExcellence(90), 'governance_excellent', '') });
  suite('T68'); await test('T68: determinístico enterprise', () => { const inp = { maturityScore: 80, consistencyScore: 75, coverageScore: 82, enterpriseConformanceScore: 78 }; assertEqual(svc.aioiEnterpriseGovernanceExcellenceService.computeEnterpriseGovernanceExcellenceScore(inp), svc.aioiEnterpriseGovernanceExcellenceService.computeEnterpriseGovernanceExcellenceScore(inp), '') });
  suite('T69'); await test('T69: pesos iguais soma ponderada', () => { assertEqual(svc.aioiEnterpriseGovernanceExcellenceService.computeEnterpriseGovernanceExcellenceScore({ maturityScore: 100, consistencyScore: 100, coverageScore: 100, enterpriseConformanceScore: 100 }), 100, '') });
  suite('T70'); await test('T70: níveis permitidos enterprise', () => { const allowed = ['emerging', 'developing', 'excellent', 'governance_excellent']; for (const s of [30, 55, 75, 92]) assert(allowed.includes(getGovMetrics().classifyGovernanceExcellence(s))) });
  suite('T71'); await test('T71: getGovernanceExcellenceReadModel ok', async () => { const r = await getCachedGov(); assert(r.ok && r.governance_excellence_read_model) });
  suite('T72'); await test('T72: estrutura obrigatória read model', async () => { const r = await getCachedGov(); const grm = r.governance_excellence_read_model; assert(grm.conformance_read_model && grm.governance_maturity && grm.governance_consistency && grm.governance_excellence_coverage && grm.enterprise_governance_excellence) });
  suite('T73'); await test('T73: companyId inválido read model', async () => { const r = await svc.aioiGovernanceExcellenceReadModelService.getGovernanceExcellenceReadModel('invalid'); assert(!r.ok) });
  suite('T74'); await test('T74: anti-duplication build* local', () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiGovernanceExcellenceReadModelService.js'), 'utf8')); assert(code.includes('buildGovernanceMaturity') && code.includes('buildGovernanceConsistency')); assert(!code.includes('getGovernanceMaturity(') && !code.includes('getGovernanceConsistency(')) });
  suite('T75'); await test('T75: getConformanceReadModel uma vez', () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiGovernanceExcellenceReadModelService.js'), 'utf8')); assertEqual((code.match(/getConformanceReadModel/g) || []).length, 1, 'single conf rm call') });
  suite('T76'); await test('T76: sem LLM/IA P3.8', () => { const files = ['aioiGovernanceMaturityService.js', 'aioiExcellenceGovernanceConsistencyService.js', 'aioiGovernanceExcellenceCoverageService.js', 'aioiEnterpriseGovernanceExcellenceService.js', 'aioiGovernanceExcellenceReadModelService.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('openai') && !code.includes('generateText'), f); } });
  suite('T77'); await test('T77: sem forecast novo', () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiGovernanceExcellenceReadModelService.js'), 'utf8')); assert(!code.includes('getBacklogForecast') && !code.includes('BacklogForecast')) });
  suite('T78'); await test('T78: Promise.all agregador', () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiGovernanceExcellenceReadModelService.js'), 'utf8')); assert(code.includes('Promise.all')) });
  suite('T79'); await test('T79: conformance_read_model nested', async () => { const r = await getCachedGov(); assert(r.governance_excellence_read_model.conformance_read_model.certification_read_model) });
  suite('T80'); await test('T80: governance_maturity campos', async () => { const r = await getCachedGov(); const gm = r.governance_excellence_read_model.governance_maturity; assert('maturity_score' in gm && 'maturity_status' in gm) });
  suite('T81'); await test('T81: governance_consistency campos', async () => { const r = await getCachedGov(); const gc = r.governance_excellence_read_model.governance_consistency; assert('consistency_score' in gc && 'consistency_status' in gc) });
  suite('T82'); await test('T82: governance_excellence_coverage campos', async () => { const r = await getCachedGov(); const gec = r.governance_excellence_read_model.governance_excellence_coverage; assert('coverage_score' in gec && 'coverage_status' in gec) });
  suite('T83'); await test('T83: enterprise_governance_excellence campos', async () => { const r = await getCachedGov(); const ege = r.governance_excellence_read_model.enterprise_governance_excellence; assert('governance_excellence_score' in ege && 'governance_excellence_level' in ege) });
  suite('T84'); await test('T84: composição exclusiva P3.7', () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiGovernanceExcellenceReadModelService.js'), 'utf8')); assert(code.includes('conformanceReadModel') && !code.includes('getCertificationReadModel')) });
  suite('T85'); await test('T85: recordGovernanceExcellenceRequested/Completed', () => { gm = getGovMetrics(); if (_svcCache) _svcCache.aioiGovernanceExcellenceMetrics = gm; gm.resetSessionCounters(); gm.recordGovernanceExcellenceRequested(COMPANY_ID); gm.recordGovernanceExcellenceCompleted(COMPANY_ID, 42); const c = gm.getSessionCounters(); assertEqual(c.governance_excellence_requests, 1, ''); assertEqual(c.avg_query_latency_ms, 42, '') });
  suite('T86'); await test('T86: enterprise_governance_excellence composto', async () => { const r = await getCachedGov(); const ege = r.governance_excellence_read_model.enterprise_governance_excellence; assert(ege.governance_excellence_score >= 0 && ege.governance_excellence_level) });
  suite('T87'); await test('T87: intelligence_conformance via conf rm', async () => { const r = await getCachedGov(); assert(r.governance_excellence_read_model.conformance_read_model.intelligence_conformance) });
  suite('T88'); await test('T88: determinístico read model scores', () => { const r1 = svc.aioiGovernanceMaturityService.buildGovernanceMaturity(SAMPLE_CONF_RM); const r2 = svc.aioiGovernanceMaturityService.buildGovernanceMaturity(SAMPLE_CONF_RM); assertEqual(r1.maturity_score, r2.maturity_score, '') });
  suite('T89'); await test('T89: 18 domínios coverage full sample', () => { assert(svc.aioiGovernanceExcellenceCoverageService.computeGovernanceExcellenceCoverageScore(SAMPLE_CONF_RM) >= 85) });
  suite('T90'); await test('T90: 8 pilares maturity full sample', () => { assert(svc.aioiGovernanceMaturityService.computeGovernanceMaturityScore(SAMPLE_CONF_RM) >= 70) });
  suite('T91'); await test('T91: 8 estágios consistency full sample', () => { assert(svc.aioiExcellenceGovernanceConsistencyService.computeGovernanceConsistencyScore(SAMPLE_CONF_RM) >= 70) });
  suite('T92'); await test('T92: _extractGovernanceSignals enterprise conformance', () => { assertEqual(getGovMetrics()._extractGovernanceSignals(SAMPLE_CONF_RM).enterpriseConformanceScore, 85, '') });
  suite('T93'); await test('T93: limite 40 developing maturity', () => { assertEqual(getGovMetrics().classifyGovernanceMaturity(40), 'developing', '') });
  suite('T94'); await test('T94: limite 40 developing excellence', () => { assertEqual(getGovMetrics().classifyGovernanceExcellence(40), 'developing', '') });
  suite('T95'); await test('T95: composição P3.7 enterprise', () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiEnterpriseGovernanceExcellenceService.js'), 'utf8')); assert(code.includes('conformanceReadModel') && !code.includes('getIntelligenceConformance')) });
  suite('T96'); await test('T96: INSERT bloqueado', () => { gm = getGovMetrics(); let threw = false; try { gm.assertReadOnlySql('INSERT INTO x VALUES (1)'); } catch (e) { threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', ''); } assert(threw) });
  suite('T97'); await test('T97: UPDATE bloqueado', () => { gm = getGovMetrics(); let threw = false; try { gm.assertReadOnlySql('UPDATE x SET y=1'); } catch (e) { threw = true; } assert(threw) });
  suite('T98'); await test('T98: DELETE bloqueado', () => { gm = getGovMetrics(); let threw = false; try { gm.assertReadOnlySql('DELETE FROM x'); } catch (e) { threw = true; } assert(threw) });
  suite('T99'); await test('T99: RLS company_id + bypass false', async () => { await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID); const t = mock._client._calls.find(c => c.sql.includes('app.current_company_id')); const b = mock._client._calls.filter(c => c.sql.includes('app.bypass_rls')); assert(t && t.params[0] === COMPANY_ID); assert(b.length >= 1) });
  suite('T100'); await test('T100: tenant B benchmark only', async () => { const mockB = createReadinessDbMock(buildIoes().map(i => ({ ...i, company_id: COMPANY_ID_B })), buildSnapshots().map(s => ({ ...s, company_id: COMPANY_ID_B }))); patchDb(mockB); _svcCache = null; clearAioiModuleCache(); const svcB = loadP38(); const bench = await svcB.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID_B); assert(bench.ok && bench.benchmark); const t = mockB._client._calls.filter(c => c.sql.includes('app.current_company_id')).find(c => c.params && c.params[0] === COMPANY_ID_B); assert(t, 'RLS tenant B') });
  restoreDb();
  suite('T101'); await test('T101: recordGovernanceExcellenceRequested log', () => { gm = getGovMetrics(); gm.resetSessionCounters(); gm.recordGovernanceExcellenceRequested(COMPANY_ID); assert(gm.getSessionCounters().governance_excellence_requests === 1) });
  suite('T102'); await test('T102: recordGovernanceMaturityAnalyzed log', () => { gm = getGovMetrics(); gm.recordGovernanceMaturityAnalyzed(COMPANY_ID); assert(gm.getSessionCounters().governance_maturity_count >= 1) });
  suite('T103'); await test('T103: recordGovernanceConsistencyAnalyzed log', () => { gm = getGovMetrics(); gm.recordGovernanceConsistencyAnalyzed(COMPANY_ID); assert(gm.getSessionCounters().governance_consistency_count >= 1) });
  suite('T104'); await test('T104: recordGovernanceCoverageAnalyzed log', () => { gm = getGovMetrics(); gm.recordGovernanceCoverageAnalyzed(COMPANY_ID); assert(gm.getSessionCounters().governance_coverage_count >= 1) });
  suite('T105'); await test('T105: recordEnterpriseGovernanceAnalyzed log', () => { gm = getGovMetrics(); gm.recordEnterpriseGovernanceAnalyzed(COMPANY_ID); assert(gm.getSessionCounters().enterprise_governance_count >= 1) });
  suite('T106'); await test('T106: getSessionCounters campos', () => { gm = getGovMetrics(); gm.resetSessionCounters(); gm.recordEnterpriseGovernanceAnalyzed(COMPANY_ID); const c = gm.getSessionCounters(); assert(c.enterprise_governance_count >= 1 && 'avg_query_latency_ms' in c); assert('governance_excellence_requests' in c && 'governance_maturity_count' in c) });
  suite('T107'); await test('T107: clampScore', () => { assertEqual(getGovMetrics().clampScore(150), 100, '') });
  suite('T108'); await test('T108: TRUNCATE bloqueado', () => { gm = getGovMetrics(); let threw = false; try { gm.assertReadOnlySql('TRUNCATE TABLE x'); } catch (e) { threw = true; } assert(threw) });
  suite('T109'); await test('T109: ON CONFLICT bloqueado', () => { gm = getGovMetrics(); let threw = false; try { gm.assertReadOnlySql('INSERT INTO x VALUES (1) ON CONFLICT DO NOTHING'); } catch (e) { threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', ''); } assert(threw) });
  suite('T110'); await test('T110: MERGE bloqueado', () => { gm = getGovMetrics(); let threw = false; try { gm.assertReadOnlySql('MERGE INTO x'); } catch (e) { threw = true; } assert(threw) });
  suite('T111'); await test('T111: anti-duplication composição P3.7', () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiGovernanceExcellenceReadModelService.js'), 'utf8')); assert(code.includes('conformanceReadModel') && !code.includes('getIntelligenceConformance')); assert(code.includes('_extractGovernanceSignals')) });
  suite('T112'); await test('T112: sem getCertificationReadModel direto', () => { const files = ['aioiGovernanceMaturityService.js', 'aioiExcellenceGovernanceConsistencyService.js', 'aioiGovernanceExcellenceCoverageService.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('getCertificationReadModel'), f); } });
  suite('T113'); await test('T113: sem getSustainabilityReadModel direto', () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiGovernanceExcellenceReadModelService.js'), 'utf8')); assert(!code.includes('getSustainabilityReadModel')) });
  suite('T114'); await test('T114: CREATE bloqueado', () => { gm = getGovMetrics(); let threw = false; try { gm.assertReadOnlySql('CREATE TABLE x (id int)'); } catch (e) { threw = true; } assert(threw) });
  suite('T115'); await test('T115: GRANT bloqueado', () => { gm = getGovMetrics(); let threw = false; try { gm.assertReadOnlySql('GRANT ALL ON x TO y'); } catch (e) { threw = true; } assert(threw) });
  suite('T116'); await test('T116: soberanos ausentes P3.8', () => { const files = ['aioiGovernanceExcellenceMetrics.js', 'aioiGovernanceMaturityService.js', 'aioiExcellenceGovernanceConsistencyService.js', 'aioiGovernanceExcellenceCoverageService.js', 'aioiEnterpriseGovernanceExcellenceService.js', 'aioiGovernanceExcellenceReadModelService.js']; const forbidden = ['operationalDecisionEngine', 'operationalLearningService', 'workflowOrchestrator', 'actionRuntimeOrchestrator', 'computePriorityScore', 'classificationConsumer', 'aioiOutboxConsumerService']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); for (const bad of forbidden) assert(!code.includes(bad), `${f} contém ${bad}`); } });
  console.log(`\n${'='.repeat(60)}`);
  console.log(`AIOI-P3.8 Governance Excellence Tests: ${_passed} passed, ${_failed} failed`);
  console.log(`${'='.repeat(60)}`);
  if (_failed === 0) {
    console.log('\nAIOI_P3_8_ENTERPRISE_INTELLIGENCE_GOVERNANCE_EXCELLENCE_PASS\n');
  } else {
    process.exitCode = 1;
  }
}

runTests().catch(err => {
  console.error('FATAL:', err);
  process.exitCode = 1;
});
