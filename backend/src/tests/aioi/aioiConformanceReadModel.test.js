'use strict';

/**
 * AIOI-P3.7 — Testes automatizados da Enterprise Intelligence Conformance Layer
 * T1–T111 | node src/tests/aioi/aioiConformanceReadModel.test.js
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

const P37_EXPORTS = [
  'aioiConformanceMetrics', 'aioiIntelligenceConformanceService', 'aioiStandardsCoverageService',
  'aioiCertificationContinuityService', 'aioiEnterpriseConformanceService', 'aioiConformanceReadModelService',
  'aioiCertificationReadModelService', 'aioiBenchmarkAnalysisService'
];

function clearAioiModuleCache() {
  for (const key of Object.keys(require.cache)) {
    if (key.includes('/services/aioi/')) delete require.cache[key];
  }
}

let _svcCache = null;

function loadP37() {
  if (_svcCache) return _svcCache;
  const loaded = {};
  for (const mod of P37_EXPORTS) {
    loaded[mod] = require(`${SERVICES_PATH}/${mod}`);
  }
  _svcCache = loaded;
  return loaded;
}

function reloadP37() {
  _svcCache = null;
  clearAioiModuleCache();
  return loadP37();
}

function getConfMetrics() {
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiConformanceMetrics`)];
  if (_svcCache) delete _svcCache.aioiConformanceMetrics;
  const m = require(`${SERVICES_PATH}/aioiConformanceMetrics`);
  if (_svcCache) _svcCache.aioiConformanceMetrics = m;
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

const EMPTY_SRM = {};function stripComments(c) { return c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); }
function assertNoWrites(calls) {
  for (const c of calls) {
    const s = c.sql.trim().toUpperCase();
    if (['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'ALTER', 'DROP', 'CREATE', 'MERGE'].some(k => s.startsWith(k))) {
      throw new Error(`escrita: ${c.sql.slice(0, 60)}`);
    }
  }
}


const SAMPLE_CRM = {
  sustainability_read_model: SAMPLE_SRM,
  certification_readiness: { certification_readiness_score: 82, certification_readiness_status: 'certification_ready' },
  accreditation_coverage: { coverage_score: 88, coverage_status: 'comprehensive' },
  intelligence_maturity_certification: { maturity_score: 84, maturity_level: 'level_4_trusted' },
  enterprise_certification: { certification_score: 86, certification_level: 'certifiable' }
};

const EMPTY_CRM = {};

async function runTests() {
  let cm = getConfMetrics();
  cm.resetSessionCounters();

  const mock = createReadinessDbMock();
  patchDb(mock);
  const svc = reloadP37();
  let cachedConf = null;
  async function getCachedConf() {
    if (!cachedConf) {
      cachedConf = await svc.aioiConformanceReadModelService.getConformanceReadModel(COMPANY_ID);
    }
    return cachedConf;
  }
  suite('T1'); await test('T1: classifyConformanceStatus conformant', () => { assertEqual(getConfMetrics().classifyConformanceStatus(80), 'conformant', '') });
  suite('T2'); await test('T2: classifyConformanceStatus partially_conformant', () => { assertEqual(getConfMetrics().classifyConformanceStatus(55), 'partially_conformant', '') });
  suite('T3'); await test('T3: classifyConformanceStatus non_conformant', () => { assertEqual(getConfMetrics().classifyConformanceStatus(30), 'non_conformant', '') });
  suite('T4'); await test('T4: CONFORMANCE_PILLARS 7', () => { assertEqual(svc.aioiIntelligenceConformanceService.CONFORMANCE_PILLARS.length, 7, '') });
  suite('T5'); await test('T5: buildIntelligenceConformance', () => { const r = svc.aioiIntelligenceConformanceService.buildIntelligenceConformance(SAMPLE_CRM); assert(r.conformance_score >= 70 && r.conformance_status === 'conformant') });
  suite('T6'); await test('T6: computeConformanceScore range', () => { const s = svc.aioiIntelligenceConformanceService.computeConformanceScore(SAMPLE_CRM); assert(s >= 0 && s <= 100) });
  suite('T7'); await test('T7: getIntelligenceConformance ok', async () => { const r = await getCachedConf(); assert(r.ok && r.conformance_read_model.intelligence_conformance.conformance_status) });
  suite('T8'); await test('T8: companyId inválido conformance', async () => { const r = await svc.aioiIntelligenceConformanceService.getIntelligenceConformance('bad'); assert(!r.ok) });
  suite('T9'); await test('T9: composição P3.6 certificationReadModel', () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiIntelligenceConformanceService.js'), 'utf8')); assert(code.includes('certificationReadModel') && !code.includes('getSustainabilityReadModel')) });
  suite('T10'); await test('T10: determinístico conformance', () => { assertEqual(svc.aioiIntelligenceConformanceService.computeConformanceScore(SAMPLE_CRM), svc.aioiIntelligenceConformanceService.computeConformanceScore(SAMPLE_CRM), '') });
  suite('T11'); await test('T11: recordConformanceAnalyzed', () => { cm = getConfMetrics(); cm.resetSessionCounters(); cm.recordConformanceAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().conformance_analysis_count >= 1) });
  suite('T12'); await test('T12: zero writes conformance path', async () => { await getCachedConf(); assertNoWrites(mock._client._calls) });
  suite('T13'); await test('T13: limite 70 conformant', () => { assertEqual(getConfMetrics().classifyConformanceStatus(70), 'conformant', '') });
  suite('T14'); await test('T14: empty crm score baixo', () => { assert(svc.aioiIntelligenceConformanceService.computeConformanceScore(EMPTY_CRM) <= 40) });
  suite('T15'); await test('T15: status permitidos conformance', () => { const allowed = ['non_conformant', 'partially_conformant', 'conformant']; for (const s of [80, 50, 20]) assert(allowed.includes(getConfMetrics().classifyConformanceStatus(s))) });
  suite('T16'); await test('T16: _extractConformanceSignals trust', () => { assertEqual(getConfMetrics()._extractConformanceSignals(SAMPLE_CRM).trustScore, 80, '') });
  suite('T17'); await test('T17: _extractConformanceSignals certification', () => { assertEqual(getConfMetrics()._extractConformanceSignals(SAMPLE_CRM).certificationScore, 86, '') });
  suite('T18'); await test('T18: _extractConformanceSignals sustainability', () => { assertEqual(getConfMetrics()._extractConformanceSignals(SAMPLE_CRM).sustainabilityScore, 83, '') });
  suite('T19'); await test('T19: pilares incluem certification', () => { assert(svc.aioiIntelligenceConformanceService.CONFORMANCE_PILLARS.includes('certification')) });
  suite('T20'); await test('T20: buildIntelligenceConformance campos', () => { const r = svc.aioiIntelligenceConformanceService.buildIntelligenceConformance(SAMPLE_CRM); assert('conformance_score' in r && 'conformance_status' in r) });
  suite('T21'); await test('T21: classifyCoverageStatus complete', () => { assertEqual(getConfMetrics().classifyCoverageStatus(80), 'complete', '') });
  suite('T22'); await test('T22: classifyCoverageStatus partial', () => { assertEqual(getConfMetrics().classifyCoverageStatus(55), 'partial', '') });
  suite('T23'); await test('T23: classifyCoverageStatus limited', () => { assertEqual(getConfMetrics().classifyCoverageStatus(30), 'limited', '') });
  suite('T24'); await test('T24: STANDARDS_DOMAINS 17', () => { assertEqual(svc.aioiStandardsCoverageService.STANDARDS_DOMAINS.length, 17, '') });
  suite('T25'); await test('T25: buildStandardsCoverage', () => { const r = svc.aioiStandardsCoverageService.buildStandardsCoverage(SAMPLE_CRM); assert(r.coverage_score >= 70 && r.coverage_status === 'complete') });
  suite('T26'); await test('T26: computeStandardsCoverageScore range', () => { const s = svc.aioiStandardsCoverageService.computeStandardsCoverageScore(SAMPLE_CRM); assert(s >= 0 && s <= 100) });
  suite('T27'); await test('T27: getStandardsCoverage ok', async () => { const r = await svc.aioiStandardsCoverageService.getStandardsCoverage(COMPANY_ID); assert(r.ok && r.standards_coverage.coverage_status) });
  suite('T28'); await test('T28: companyId inválido standards', async () => { const r = await svc.aioiStandardsCoverageService.getStandardsCoverage('x'); assert(!r.ok) });
  suite('T29'); await test('T29: empty crm coverage baixo', () => { assert(svc.aioiStandardsCoverageService.computeStandardsCoverageScore(EMPTY_CRM) <= 40) });
  suite('T30'); await test('T30: recordStandardsCoverageAnalyzed', () => { cm = getConfMetrics(); cm.recordStandardsCoverageAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().standards_coverage_count >= 1) });
  suite('T31'); await test('T31: zero writes standards', () => { assertNoWrites(mock._client._calls) });
  suite('T32'); await test('T32: limite 70 complete', () => { assertEqual(getConfMetrics().classifyCoverageStatus(70), 'complete', '') });
  suite('T33'); await test('T33: determinístico standards', () => { assertEqual(svc.aioiStandardsCoverageService.computeStandardsCoverageScore(SAMPLE_CRM), svc.aioiStandardsCoverageService.computeStandardsCoverageScore(SAMPLE_CRM), '') });
  suite('T34'); await test('T34: domínio certification', () => { assert(svc.aioiStandardsCoverageService.STANDARDS_DOMAINS.includes('certification')) });
  suite('T35'); await test('T35: domínio adoption', () => { assert(svc.aioiStandardsCoverageService.STANDARDS_DOMAINS.includes('adoption')) });
  suite('T36'); await test('T36: status permitidos standards', () => { const allowed = ['limited', 'partial', 'complete']; for (const s of [80, 50, 20]) assert(allowed.includes(getConfMetrics().classifyCoverageStatus(s))) });
  suite('T37'); await test('T37: composição P3.6 standards', () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiStandardsCoverageService.js'), 'utf8')); assert(code.includes('certificationReadModel')) });
  suite('T38'); await test('T38: partial crm só trust', () => { const partial = { sustainability_read_model: { value_governance_read_model: { readiness_read_model: { auditability_read_model: { assurance_read_model: { trust_read_model: { intelligence_trust: { trust_score: 75 } } } } } } } }; assert(svc.aioiStandardsCoverageService.computeStandardsCoverageScore(partial) < 70) });
  suite('T39'); await test('T39: limite 40 partial', () => { assertEqual(getConfMetrics().classifyCoverageStatus(40), 'partial', '') });
  suite('T40'); await test('T40: buildStandardsCoverage campos', () => { const r = svc.aioiStandardsCoverageService.buildStandardsCoverage(SAMPLE_CRM); assert('coverage_score' in r && 'coverage_status' in r) });
  suite('T41'); await test('T41: classifyContinuityStatus continuous', () => { assertEqual(getConfMetrics().classifyContinuityStatus(80), 'continuous', '') });
  suite('T42'); await test('T42: classifyContinuityStatus partial', () => { assertEqual(getConfMetrics().classifyContinuityStatus(55), 'partial', '') });
  suite('T43'); await test('T43: classifyContinuityStatus broken', () => { assertEqual(getConfMetrics().classifyContinuityStatus(30), 'broken', '') });
  suite('T44'); await test('T44: CONTINUITY_STAGES 7', () => { assertEqual(svc.aioiCertificationContinuityService.CONTINUITY_STAGES.length, 7, '') });
  suite('T45'); await test('T45: buildCertificationContinuity', () => { const r = svc.aioiCertificationContinuityService.buildCertificationContinuity(SAMPLE_CRM); assert(r.continuity_score >= 70 && r.continuity_status === 'continuous') });
  suite('T46'); await test('T46: computeCertificationContinuityScore range', () => { const s = svc.aioiCertificationContinuityService.computeCertificationContinuityScore(SAMPLE_CRM); assert(s >= 0 && s <= 100) });
  suite('T47'); await test('T47: getCertificationContinuity ok', async () => { const r = await svc.aioiCertificationContinuityService.getCertificationContinuity(COMPANY_ID); assert(r.ok && r.certification_continuity.continuity_status) });
  suite('T48'); await test('T48: companyId inválido continuity', async () => { const r = await svc.aioiCertificationContinuityService.getCertificationContinuity('invalid'); assert(!r.ok) });
  suite('T49'); await test('T49: empty crm continuity baixo', () => { assert(svc.aioiCertificationContinuityService.computeCertificationContinuityScore(EMPTY_CRM) <= 40) });
  suite('T50'); await test('T50: recordCertificationContinuityAnalyzed', () => { cm = getConfMetrics(); cm.recordCertificationContinuityAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().continuity_analysis_count >= 1) });
  suite('T51'); await test('T51: cadeia trust→certification', () => { const stages = svc.aioiCertificationContinuityService.CONTINUITY_STAGES; assertEqual(stages[0], 'trust', ''); assertEqual(stages[6], 'certification', '') });
  suite('T52'); await test('T52: determinístico continuity', () => { assertEqual(svc.aioiCertificationContinuityService.computeCertificationContinuityScore(SAMPLE_CRM), svc.aioiCertificationContinuityService.computeCertificationContinuityScore(SAMPLE_CRM), '') });
  suite('T53'); await test('T53: full vs partial continuity', () => { const full = svc.aioiCertificationContinuityService.computeCertificationContinuityScore(SAMPLE_CRM); const partial = svc.aioiCertificationContinuityService.computeCertificationContinuityScore({ sustainability_read_model: { value_governance_read_model: { readiness_read_model: { auditability_read_model: { assurance_read_model: { trust_read_model: { intelligence_trust: { trust_score: 80 } } } } } } } }); assert(full > partial) });
  suite('T54'); await test('T54: limite 70 continuous', () => { assertEqual(getConfMetrics().classifyContinuityStatus(70), 'continuous', '') });
  suite('T55'); await test('T55: buildCertificationContinuity campos', () => { const r = svc.aioiCertificationContinuityService.buildCertificationContinuity(SAMPLE_CRM); assert('continuity_score' in r && 'continuity_status' in r) });
  suite('T56'); await test('T56: classifyEnterpriseConformanceLevel enterprise_conformant', () => { assertEqual(getConfMetrics().classifyEnterpriseConformanceLevel(92), 'enterprise_conformant', '') });
  suite('T57'); await test('T57: classifyEnterpriseConformanceLevel conformant', () => { assertEqual(getConfMetrics().classifyEnterpriseConformanceLevel(75), 'conformant', '') });
  suite('T58'); await test('T58: classifyEnterpriseConformanceLevel developing', () => { assertEqual(getConfMetrics().classifyEnterpriseConformanceLevel(55), 'developing', '') });
  suite('T59'); await test('T59: classifyEnterpriseConformanceLevel emerging', () => { assertEqual(getConfMetrics().classifyEnterpriseConformanceLevel(30), 'emerging', '') });
  suite('T60'); await test('T60: ENTERPRISE_CONFORMANCE_WEIGHTS 0.25', () => { const w = svc.aioiEnterpriseConformanceService.ENTERPRISE_CONFORMANCE_WEIGHTS; assertEqual(w.intelligenceConformance, 0.25, ''); assertEqual(w.standardsCoverage, 0.25, ''); assertEqual(w.certificationContinuity, 0.25, ''); assertEqual(w.enterpriseCertification, 0.25, '') });
  suite('T61'); await test('T61: buildEnterpriseConformance', () => { const r = svc.aioiEnterpriseConformanceService.buildEnterpriseConformance({ conformanceScore: 80, coverageScore: 85, continuityScore: 82, enterpriseCertificationScore: 83 }); assert(r.enterprise_conformance_score >= 70 && r.enterprise_conformance_level) });
  suite('T62'); await test('T62: computeEnterpriseConformanceScore range', () => { const s = svc.aioiEnterpriseConformanceService.computeEnterpriseConformanceScore({ conformanceScore: 80, coverageScore: 80, continuityScore: 80, enterpriseCertificationScore: 80 }); assert(s >= 0 && s <= 100) });
  suite('T63'); await test('T63: getEnterpriseConformance ok', async () => { const r = await svc.aioiEnterpriseConformanceService.getEnterpriseConformance(COMPANY_ID); assert(r.ok && r.enterprise_conformance.enterprise_conformance_level) });
  suite('T64'); await test('T64: companyId inválido enterprise', async () => { const r = await svc.aioiEnterpriseConformanceService.getEnterpriseConformance('bad-id'); assert(!r.ok) });
  suite('T65'); await test('T65: recordEnterpriseConformanceAnalyzed', () => { cm = getConfMetrics(); cm.recordEnterpriseConformanceAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().enterprise_conformance_count >= 1) });
  suite('T66'); await test('T66: zero writes enterprise', () => { assertNoWrites(mock._client._calls) });
  suite('T67'); await test('T67: limite 90 enterprise_conformant', () => { assertEqual(getConfMetrics().classifyEnterpriseConformanceLevel(90), 'enterprise_conformant', '') });
  suite('T68'); await test('T68: determinístico enterprise', () => { const inp = { conformanceScore: 80, coverageScore: 75, continuityScore: 82, enterpriseCertificationScore: 78 }; assertEqual(svc.aioiEnterpriseConformanceService.computeEnterpriseConformanceScore(inp), svc.aioiEnterpriseConformanceService.computeEnterpriseConformanceScore(inp), '') });
  suite('T69'); await test('T69: pesos iguais soma ponderada', () => { assertEqual(svc.aioiEnterpriseConformanceService.computeEnterpriseConformanceScore({ conformanceScore: 100, coverageScore: 100, continuityScore: 100, enterpriseCertificationScore: 100 }), 100, '') });
  suite('T70'); await test('T70: níveis permitidos enterprise', () => { const allowed = ['emerging', 'developing', 'conformant', 'enterprise_conformant']; for (const s of [30, 55, 75, 92]) assert(allowed.includes(getConfMetrics().classifyEnterpriseConformanceLevel(s))) });
  suite('T71'); await test('T71: getConformanceReadModel ok', async () => { const r = await getCachedConf(); assert(r.ok && r.conformance_read_model) });
  suite('T72'); await test('T72: estrutura obrigatória read model', async () => { const r = await getCachedConf(); const crm = r.conformance_read_model; assert(crm.certification_read_model && crm.intelligence_conformance && crm.standards_coverage && crm.certification_continuity && crm.enterprise_conformance) });
  suite('T73'); await test('T73: companyId inválido read model', async () => { const r = await svc.aioiConformanceReadModelService.getConformanceReadModel('invalid'); assert(!r.ok) });
  suite('T74'); await test('T74: anti-duplication build* local', () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiConformanceReadModelService.js'), 'utf8')); assert(code.includes('buildIntelligenceConformance') && code.includes('buildStandardsCoverage')); assert(!code.includes('getIntelligenceConformance(') && !code.includes('getStandardsCoverage(')) });
  suite('T75'); await test('T75: getCertificationReadModel uma vez', () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiConformanceReadModelService.js'), 'utf8')); assertEqual((code.match(/getCertificationReadModel/g) || []).length, 1, 'single crm call') });
  suite('T76'); await test('T76: sem LLM/IA P3.7', () => { const files = ['aioiIntelligenceConformanceService.js', 'aioiStandardsCoverageService.js', 'aioiCertificationContinuityService.js', 'aioiEnterpriseConformanceService.js', 'aioiConformanceReadModelService.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('openai') && !code.includes('generateText'), f); } });
  suite('T77'); await test('T77: sem forecast novo', () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiConformanceReadModelService.js'), 'utf8')); assert(!code.includes('getBacklogForecast') && !code.includes('BacklogForecast')) });
  suite('T78'); await test('T78: Promise.all agregador', () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiConformanceReadModelService.js'), 'utf8')); assert(code.includes('Promise.all')) });
  suite('T79'); await test('T79: certification_read_model nested', async () => { const r = await getCachedConf(); assert(r.conformance_read_model.certification_read_model.sustainability_read_model) });
  suite('T80'); await test('T80: intelligence_conformance campos', async () => { const r = await getCachedConf(); const ic = r.conformance_read_model.intelligence_conformance; assert('conformance_score' in ic && 'conformance_status' in ic) });
  suite('T81'); await test('T81: standards_coverage campos', async () => { const r = await getCachedConf(); const sc = r.conformance_read_model.standards_coverage; assert('coverage_score' in sc && 'coverage_status' in sc) });
  suite('T82'); await test('T82: certification_continuity campos', async () => { const r = await getCachedConf(); const cc = r.conformance_read_model.certification_continuity; assert('continuity_score' in cc && 'continuity_status' in cc) });
  suite('T83'); await test('T83: enterprise_conformance campos', async () => { const r = await getCachedConf(); const ec = r.conformance_read_model.enterprise_conformance; assert('enterprise_conformance_score' in ec && 'enterprise_conformance_level' in ec) });
  suite('T84'); await test('T84: composição exclusiva P3.6', () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiConformanceReadModelService.js'), 'utf8')); assert(code.includes('certificationReadModel') && !code.includes('getSustainabilityReadModel')) });
  suite('T85'); await test('T85: recordConformanceRequested/Completed', () => { cm = getConfMetrics(); if (_svcCache) _svcCache.aioiConformanceMetrics = cm; cm.resetSessionCounters(); cm.recordConformanceRequested(COMPANY_ID); cm.recordConformanceCompleted(COMPANY_ID, 42); const c = cm.getSessionCounters(); assertEqual(c.conformance_requests, 1, ''); assertEqual(c.avg_query_latency_ms, 42, '') });
  suite('T86'); await test('T86: enterprise_conformance composto', async () => { const r = await getCachedConf(); const ec = r.conformance_read_model.enterprise_conformance; assert(ec.enterprise_conformance_score >= 0 && ec.enterprise_conformance_level) });
  suite('T87'); await test('T87: certification nested srm', async () => { const r = await getCachedConf(); assert(r.conformance_read_model.certification_read_model.enterprise_certification) });
  suite('T88'); await test('T88: determinístico read model scores', () => { const r1 = svc.aioiIntelligenceConformanceService.buildIntelligenceConformance(SAMPLE_CRM); const r2 = svc.aioiIntelligenceConformanceService.buildIntelligenceConformance(SAMPLE_CRM); assertEqual(r1.conformance_score, r2.conformance_score, '') });
  suite('T89'); await test('T89: 17 domínios standards full sample', () => { assert(svc.aioiStandardsCoverageService.computeStandardsCoverageScore(SAMPLE_CRM) >= 85) });
  suite('T90'); await test('T90: 7 pilares conformance full sample', () => { assert(svc.aioiIntelligenceConformanceService.computeConformanceScore(SAMPLE_CRM) >= 70) });
  suite('T91'); await test('T91: 7 estágios continuity full sample', () => { assert(svc.aioiCertificationContinuityService.computeCertificationContinuityScore(SAMPLE_CRM) >= 70) });
  suite('T92'); await test('T92: _extractConformanceSignals value governance', () => { assertEqual(getConfMetrics()._extractConformanceSignals(SAMPLE_CRM).valueGovernanceScore, 85, '') });
  suite('T93'); await test('T93: limite 40 partially_conformant', () => { assertEqual(getConfMetrics().classifyConformanceStatus(40), 'partially_conformant', '') });
  suite('T94'); await test('T94: limite 40 developing', () => { assertEqual(getConfMetrics().classifyEnterpriseConformanceLevel(40), 'developing', '') });
  suite('T95'); await test('T95: composição P3.6 enterprise', () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiEnterpriseConformanceService.js'), 'utf8')); assert(code.includes('certificationReadModel') && !code.includes('getCertificationReadiness')) });
  suite('T96'); await test('T96: INSERT bloqueado', () => { cm = getConfMetrics(); let threw = false; try { cm.assertReadOnlySql('INSERT INTO x VALUES (1)'); } catch (e) { threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', ''); } assert(threw) });
  suite('T97'); await test('T97: UPDATE bloqueado', () => { cm = getConfMetrics(); let threw = false; try { cm.assertReadOnlySql('UPDATE x SET y=1'); } catch (e) { threw = true; } assert(threw) });
  suite('T98'); await test('T98: DELETE bloqueado', () => { cm = getConfMetrics(); let threw = false; try { cm.assertReadOnlySql('DELETE FROM x'); } catch (e) { threw = true; } assert(threw) });
  suite('T99'); await test('T99: RLS company_id + bypass false', async () => { await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID); const t = mock._client._calls.find(c => c.sql.includes('app.current_company_id')); const b = mock._client._calls.filter(c => c.sql.includes('app.bypass_rls')); assert(t && t.params[0] === COMPANY_ID); assert(b.length >= 1) });
  suite('T100'); await test('T100: tenant B benchmark only', async () => { const mockB = createReadinessDbMock(buildIoes().map(i => ({ ...i, company_id: COMPANY_ID_B })), buildSnapshots().map(s => ({ ...s, company_id: COMPANY_ID_B }))); patchDb(mockB); _svcCache = null; clearAioiModuleCache(); const svcB = loadP37(); const bench = await svcB.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID_B); assert(bench.ok && bench.benchmark); const t = mockB._client._calls.filter(c => c.sql.includes('app.current_company_id')).find(c => c.params && c.params[0] === COMPANY_ID_B); assert(t, 'RLS tenant B') });
  restoreDb();
  suite('T101'); await test('T101: recordConformanceRequested log', () => { cm = getConfMetrics(); cm.resetSessionCounters(); cm.recordConformanceRequested(COMPANY_ID); assert(cm.getSessionCounters().conformance_requests === 1) });
  suite('T102'); await test('T102: recordConformanceAnalyzed log', () => { cm = getConfMetrics(); cm.recordConformanceAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().conformance_analysis_count >= 1) });
  suite('T103'); await test('T103: recordStandardsCoverageAnalyzed log', () => { cm = getConfMetrics(); cm.recordStandardsCoverageAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().standards_coverage_count >= 1) });
  suite('T104'); await test('T104: recordCertificationContinuityAnalyzed log', () => { cm = getConfMetrics(); cm.recordCertificationContinuityAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().continuity_analysis_count >= 1) });
  suite('T105'); await test('T105: recordEnterpriseConformanceAnalyzed log', () => { cm = getConfMetrics(); cm.recordEnterpriseConformanceAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().enterprise_conformance_count >= 1) });
  suite('T106'); await test('T106: getSessionCounters campos', () => { cm = getConfMetrics(); cm.resetSessionCounters(); cm.recordEnterpriseConformanceAnalyzed(COMPANY_ID); const c = cm.getSessionCounters(); assert(c.enterprise_conformance_count >= 1 && 'avg_query_latency_ms' in c); assert('conformance_requests' in c && 'conformance_analysis_count' in c) });
  suite('T107'); await test('T107: clampScore', () => { assertEqual(getConfMetrics().clampScore(150), 100, '') });
  suite('T108'); await test('T108: TRUNCATE bloqueado', () => { cm = getConfMetrics(); let threw = false; try { cm.assertReadOnlySql('TRUNCATE TABLE x'); } catch (e) { threw = true; } assert(threw) });
  suite('T109'); await test('T109: ON CONFLICT bloqueado', () => { cm = getConfMetrics(); let threw = false; try { cm.assertReadOnlySql('INSERT INTO x VALUES (1) ON CONFLICT DO NOTHING'); } catch (e) { threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', ''); } assert(threw) });
  suite('T110'); await test('T110: anti-duplication composição P3.6', () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiConformanceReadModelService.js'), 'utf8')); assert(code.includes('certificationReadModel') && !code.includes('getIntelligenceHealth')); assert(code.includes('_extractConformanceSignals')) });
  suite('T111'); await test('T111: soberanos ausentes P3.7', () => { const files = ['aioiConformanceMetrics.js', 'aioiIntelligenceConformanceService.js', 'aioiStandardsCoverageService.js', 'aioiCertificationContinuityService.js', 'aioiEnterpriseConformanceService.js', 'aioiConformanceReadModelService.js']; const forbidden = ['operationalDecisionEngine', 'operationalLearningService', 'workflowOrchestrator', 'actionRuntimeOrchestrator', 'computePriorityScore', 'classificationConsumer', 'aioiOutboxConsumerService']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); for (const bad of forbidden) assert(!code.includes(bad), `${f} contém ${bad}`); } });
  console.log(`\n${'='.repeat(60)}`);
  console.log(`AIOI-P3.7 Conformance Tests: ${_passed} passed, ${_failed} failed`);
  console.log(`${'='.repeat(60)}`);
  if (_failed === 0) {
    console.log('\nAIOI_P3_7_ENTERPRISE_INTELLIGENCE_CONFORMANCE_STANDARDS_PASS\n');
  } else {
    process.exitCode = 1;
  }
}

runTests().catch(err => {
  console.error('FATAL:', err);
  process.exitCode = 1;
});
