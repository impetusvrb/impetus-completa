'use strict';

/**
 * AIOI-P3.6 — Testes automatizados da Enterprise Intelligence Certification Layer
 * T1–T106 | node src/tests/aioi/aioiCertificationReadModel.test.js
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

const P36_EXPORTS = [
  'aioiCertificationMetrics', 'aioiCertificationReadinessService', 'aioiAccreditationCoverageService',
  'aioiIntelligenceMaturityCertificationService', 'aioiEnterpriseCertificationService',
  'aioiCertificationReadModelService', 'aioiSustainabilityReadModelService', 'aioiBenchmarkAnalysisService'
];

function clearAioiModuleCache() {
  for (const key of Object.keys(require.cache)) {
    if (key.includes('/services/aioi/')) delete require.cache[key];
  }
}

let _svcCache = null;

function loadP36() {
  if (_svcCache) return _svcCache;
  const loaded = {};
  for (const mod of P36_EXPORTS) {
    loaded[mod] = require(`${SERVICES_PATH}/${mod}`);
  }
  _svcCache = loaded;
  return loaded;
}

function reloadP36() {
  _svcCache = null;
  clearAioiModuleCache();
  return loadP36();
}

function getCertMetrics() {
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiCertificationMetrics`)];
  if (_svcCache) delete _svcCache.aioiCertificationMetrics;
  const m = require(`${SERVICES_PATH}/aioiCertificationMetrics`);
  if (_svcCache) _svcCache.aioiCertificationMetrics = m;
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

async function runTests() {
  let cm = getCertMetrics();
  cm.resetSessionCounters();

  const mock = createReadinessDbMock();
  patchDb(mock);
  const svc = reloadP36();
  let cachedCert = null;
  async function getCachedCert() {
    if (!cachedCert) {
      cachedCert = await svc.aioiCertificationReadModelService.getCertificationReadModel(COMPANY_ID);
    }
    return cachedCert;
  }
  suite('T1'); await test('T1: classifyCertificationReadiness certification_ready', () => { assertEqual(getCertMetrics().classifyCertificationReadiness(80), 'certification_ready', '') });
  suite('T2'); await test('T2: classifyCertificationReadiness partially_ready', () => { assertEqual(getCertMetrics().classifyCertificationReadiness(55), 'partially_ready', '') });
  suite('T3'); await test('T3: classifyCertificationReadiness not_ready', () => { assertEqual(getCertMetrics().classifyCertificationReadiness(30), 'not_ready', '') });
  suite('T4'); await test('T4: READINESS_PILLARS 6', () => { assertEqual(svc.aioiCertificationReadinessService.READINESS_PILLARS.length, 6, '') });
  suite('T5'); await test('T5: buildCertificationReadiness', () => { const r = svc.aioiCertificationReadinessService.buildCertificationReadiness(SAMPLE_SRM); assert(r.certification_readiness_score >= 70 && r.certification_readiness_status === 'certification_ready') });
  suite('T6'); await test('T6: computeCertificationReadinessScore range', () => { const s = svc.aioiCertificationReadinessService.computeCertificationReadinessScore(SAMPLE_SRM); assert(s >= 0 && s <= 100) });
  suite('T7'); await test('T7: getCertificationReadiness ok', async () => { const r = await getCachedCert(); assert(r.ok && r.certification_read_model.certification_readiness.certification_readiness_status) });
  suite('T8'); await test('T8: companyId inválido readiness', async () => { const r = await svc.aioiCertificationReadinessService.getCertificationReadiness('bad'); assert(!r.ok) });
  suite('T9'); await test('T9: composição P3.5 sustainabilityReadModel', () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiCertificationReadinessService.js'), 'utf8')); assert(code.includes('sustainabilityReadModel') && !code.includes('getTrustReadModel')) });
  suite('T10'); await test('T10: determinístico readiness', () => { assertEqual(svc.aioiCertificationReadinessService.computeCertificationReadinessScore(SAMPLE_SRM), svc.aioiCertificationReadinessService.computeCertificationReadinessScore(SAMPLE_SRM), '') });
  suite('T11'); await test('T11: recordCertificationReadinessAnalyzed', () => { cm = getCertMetrics(); cm.resetSessionCounters(); cm.recordCertificationReadinessAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().certification_readiness_count >= 1) });
  suite('T12'); await test('T12: zero writes readiness path', async () => { await getCachedCert(); assertNoWrites(mock._client._calls) });
  suite('T13'); await test('T13: limite 70 certification_ready', () => { assertEqual(getCertMetrics().classifyCertificationReadiness(70), 'certification_ready', '') });
  suite('T14'); await test('T14: empty srm score baixo', () => { assert(svc.aioiCertificationReadinessService.computeCertificationReadinessScore(EMPTY_SRM) <= 40) });
  suite('T15'); await test('T15: status permitidos readiness', () => { const allowed = ['not_ready', 'partially_ready', 'certification_ready']; for (const s of [80, 50, 20]) assert(allowed.includes(getCertMetrics().classifyCertificationReadiness(s))) });
  suite('T16'); await test('T16: _extractCertificationSignals trust', () => { assertEqual(getCertMetrics()._extractCertificationSignals(SAMPLE_SRM).trustScore, 80, '') });
  suite('T17'); await test('T17: _extractCertificationSignals sustainability', () => { assertEqual(getCertMetrics()._extractCertificationSignals(SAMPLE_SRM).sustainabilityScore, 83, '') });
  suite('T18'); await test('T18: _extractCertificationSignals value governance', () => { assertEqual(getCertMetrics()._extractCertificationSignals(SAMPLE_SRM).valueGovernanceScore, 85, '') });
  suite('T19'); await test('T19: pilares incluem sustainability', () => { assert(svc.aioiCertificationReadinessService.READINESS_PILLARS.includes('sustainability')) });
  suite('T20'); await test('T20: buildCertificationReadiness campos', () => { const r = svc.aioiCertificationReadinessService.buildCertificationReadiness(SAMPLE_SRM); assert('certification_readiness_score' in r && 'certification_readiness_status' in r) });
  suite('T21'); await test('T21: classifyCoverageStatus comprehensive', () => { assertEqual(getCertMetrics().classifyCoverageStatus(80), 'comprehensive', '') });
  suite('T22'); await test('T22: classifyCoverageStatus partial', () => { assertEqual(getCertMetrics().classifyCoverageStatus(55), 'partial', '') });
  suite('T23'); await test('T23: classifyCoverageStatus limited', () => { assertEqual(getCertMetrics().classifyCoverageStatus(30), 'limited', '') });
  suite('T24'); await test('T24: ACCREDITATION_DOMAINS 16', () => { assertEqual(svc.aioiAccreditationCoverageService.ACCREDITATION_DOMAINS.length, 16, '') });
  suite('T25'); await test('T25: buildAccreditationCoverage', () => { const r = svc.aioiAccreditationCoverageService.buildAccreditationCoverage(SAMPLE_SRM); assert(r.coverage_score >= 70 && r.coverage_status === 'comprehensive') });
  suite('T26'); await test('T26: computeAccreditationCoverageScore range', () => { const s = svc.aioiAccreditationCoverageService.computeAccreditationCoverageScore(SAMPLE_SRM); assert(s >= 0 && s <= 100) });
  suite('T27'); await test('T27: getAccreditationCoverage ok', async () => { const r = await svc.aioiAccreditationCoverageService.getAccreditationCoverage(COMPANY_ID); assert(r.ok && r.accreditation_coverage.coverage_status) });
  suite('T28'); await test('T28: companyId inválido coverage', async () => { const r = await svc.aioiAccreditationCoverageService.getAccreditationCoverage('x'); assert(!r.ok) });
  suite('T29'); await test('T29: empty srm coverage baixo', () => { assert(svc.aioiAccreditationCoverageService.computeAccreditationCoverageScore(EMPTY_SRM) <= 40) });
  suite('T30'); await test('T30: recordAccreditationCoverageAnalyzed', () => { cm = getCertMetrics(); cm.recordAccreditationCoverageAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().accreditation_coverage_count >= 1) });
  suite('T31'); await test('T31: zero writes coverage', () => { assertNoWrites(mock._client._calls) });
  suite('T32'); await test('T32: limite 70 comprehensive', () => { assertEqual(getCertMetrics().classifyCoverageStatus(70), 'comprehensive', '') });
  suite('T33'); await test('T33: determinístico coverage', () => { assertEqual(svc.aioiAccreditationCoverageService.computeAccreditationCoverageScore(SAMPLE_SRM), svc.aioiAccreditationCoverageService.computeAccreditationCoverageScore(SAMPLE_SRM), '') });
  suite('T34'); await test('T34: domínio value_governance', () => { assert(svc.aioiAccreditationCoverageService.ACCREDITATION_DOMAINS.includes('value_governance')) });
  suite('T35'); await test('T35: domínio sustainability', () => { assert(svc.aioiAccreditationCoverageService.ACCREDITATION_DOMAINS.includes('sustainability')) });
  suite('T36'); await test('T36: status permitidos coverage', () => { const allowed = ['limited', 'partial', 'comprehensive']; for (const s of [80, 50, 20]) assert(allowed.includes(getCertMetrics().classifyCoverageStatus(s))) });
  suite('T37'); await test('T37: composição P3.5 coverage', () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiAccreditationCoverageService.js'), 'utf8')); assert(code.includes('sustainabilityReadModel')) });
  suite('T38'); await test('T38: partial srm só trust domain', () => { const partial = { value_governance_read_model: { readiness_read_model: { auditability_read_model: { assurance_read_model: { trust_read_model: { intelligence_trust: { trust_score: 75 } } } } } } }; assert(svc.aioiAccreditationCoverageService.computeAccreditationCoverageScore(partial) < 70) });
  suite('T39'); await test('T39: limite 40 partial', () => { assertEqual(getCertMetrics().classifyCoverageStatus(40), 'partial', '') });
  suite('T40'); await test('T40: buildAccreditationCoverage campos', () => { const r = svc.aioiAccreditationCoverageService.buildAccreditationCoverage(SAMPLE_SRM); assert('coverage_score' in r && 'coverage_status' in r) });
  suite('T41'); await test('T41: classifyMaturityLevel level_5_certified', () => { assertEqual(getCertMetrics().classifyMaturityLevel(92), 'level_5_certified', '') });
  suite('T42'); await test('T42: classifyMaturityLevel level_4_trusted', () => { assertEqual(getCertMetrics().classifyMaturityLevel(75), 'level_4_trusted', '') });
  suite('T43'); await test('T43: classifyMaturityLevel level_3_governed', () => { assertEqual(getCertMetrics().classifyMaturityLevel(60), 'level_3_governed', '') });
  suite('T44'); await test('T44: classifyMaturityLevel level_2_managed', () => { assertEqual(getCertMetrics().classifyMaturityLevel(45), 'level_2_managed', '') });
  suite('T45'); await test('T45: classifyMaturityLevel level_1_foundational', () => { assertEqual(getCertMetrics().classifyMaturityLevel(30), 'level_1_foundational', '') });
  suite('T46'); await test('T46: MATURITY_LEVELS 5', () => { assertEqual(svc.aioiIntelligenceMaturityCertificationService.MATURITY_LEVELS.length, 5, '') });
  suite('T47'); await test('T47: buildIntelligenceMaturityCertification', () => { const r = svc.aioiIntelligenceMaturityCertificationService.buildIntelligenceMaturityCertification(SAMPLE_SRM); assert(r.maturity_score >= 70 && r.maturity_level) });
  suite('T48'); await test('T48: computeMaturityScore range', () => { const s = svc.aioiIntelligenceMaturityCertificationService.computeMaturityScore(SAMPLE_SRM); assert(s >= 0 && s <= 100) });
  suite('T49'); await test('T49: getIntelligenceMaturityCertification ok', async () => { const r = await svc.aioiIntelligenceMaturityCertificationService.getIntelligenceMaturityCertification(COMPANY_ID); assert(r.ok && r.intelligence_maturity_certification.maturity_level) });
  suite('T50'); await test('T50: companyId inválido maturity', async () => { const r = await svc.aioiIntelligenceMaturityCertificationService.getIntelligenceMaturityCertification('invalid'); assert(!r.ok) });
  suite('T51'); await test('T51: empty srm maturity baixo', () => { assert(svc.aioiIntelligenceMaturityCertificationService.computeMaturityScore(EMPTY_SRM) <= 40) });
  suite('T52'); await test('T52: recordMaturityCertificationAnalyzed', () => { cm = getCertMetrics(); cm.recordMaturityCertificationAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().maturity_certification_count >= 1) });
  suite('T53'); await test('T53: scores existentes apenas', () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiIntelligenceMaturityCertificationService.js'), 'utf8')); assert(code.includes('intelligence_health') && !code.includes('readQuery')) });
  suite('T54'); await test('T54: determinístico maturity', () => { assertEqual(svc.aioiIntelligenceMaturityCertificationService.computeMaturityScore(SAMPLE_SRM), svc.aioiIntelligenceMaturityCertificationService.computeMaturityScore(SAMPLE_SRM), '') });
  suite('T55'); await test('T55: níveis permitidos maturity', () => { const allowed = svc.aioiIntelligenceMaturityCertificationService.MATURITY_LEVELS; for (const s of [92, 75, 60, 45, 30]) assert(allowed.includes(getCertMetrics().classifyMaturityLevel(s))) });
  suite('T56'); await test('T56: classifyEnterpriseCertificationLevel enterprise_certified', () => { assertEqual(getCertMetrics().classifyEnterpriseCertificationLevel(92), 'enterprise_certified', '') });
  suite('T57'); await test('T57: classifyEnterpriseCertificationLevel certifiable', () => { assertEqual(getCertMetrics().classifyEnterpriseCertificationLevel(75), 'certifiable', '') });
  suite('T58'); await test('T58: classifyEnterpriseCertificationLevel qualified', () => { assertEqual(getCertMetrics().classifyEnterpriseCertificationLevel(55), 'qualified', '') });
  suite('T59'); await test('T59: classifyEnterpriseCertificationLevel emerging', () => { assertEqual(getCertMetrics().classifyEnterpriseCertificationLevel(30), 'emerging', '') });
  suite('T60'); await test('T60: ENTERPRISE_CERTIFICATION_WEIGHTS 0.25', () => { const w = svc.aioiEnterpriseCertificationService.ENTERPRISE_CERTIFICATION_WEIGHTS; assertEqual(w.certificationReadiness, 0.25, ''); assertEqual(w.accreditationCoverage, 0.25, ''); assertEqual(w.valueGovernance, 0.25, ''); assertEqual(w.sustainability, 0.25, '') });
  suite('T61'); await test('T61: buildEnterpriseCertification', () => { const r = svc.aioiEnterpriseCertificationService.buildEnterpriseCertification({ readinessScore: 80, coverageScore: 85, valueGovernanceScore: 82, sustainabilityScore: 83 }); assert(r.certification_score >= 70 && r.certification_level) });
  suite('T62'); await test('T62: computeEnterpriseCertificationScore range', () => { const s = svc.aioiEnterpriseCertificationService.computeEnterpriseCertificationScore({ readinessScore: 80, coverageScore: 80, valueGovernanceScore: 80, sustainabilityScore: 80 }); assert(s >= 0 && s <= 100) });
  suite('T63'); await test('T63: getEnterpriseCertification ok', async () => { const r = await svc.aioiEnterpriseCertificationService.getEnterpriseCertification(COMPANY_ID); assert(r.ok && r.enterprise_certification.certification_level) });
  suite('T64'); await test('T64: companyId inválido enterprise', async () => { const r = await svc.aioiEnterpriseCertificationService.getEnterpriseCertification('bad-id'); assert(!r.ok) });
  suite('T65'); await test('T65: recordEnterpriseCertificationAnalyzed', () => { cm = getCertMetrics(); cm.recordEnterpriseCertificationAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().enterprise_certification_count >= 1) });
  suite('T66'); await test('T66: zero writes enterprise', () => { assertNoWrites(mock._client._calls) });
  suite('T67'); await test('T67: limite 90 enterprise_certified', () => { assertEqual(getCertMetrics().classifyEnterpriseCertificationLevel(90), 'enterprise_certified', '') });
  suite('T68'); await test('T68: determinístico enterprise', () => { const inp = { readinessScore: 80, coverageScore: 75, valueGovernanceScore: 82, sustainabilityScore: 78 }; assertEqual(svc.aioiEnterpriseCertificationService.computeEnterpriseCertificationScore(inp), svc.aioiEnterpriseCertificationService.computeEnterpriseCertificationScore(inp), '') });
  suite('T69'); await test('T69: pesos iguais soma ponderada', () => { assertEqual(svc.aioiEnterpriseCertificationService.computeEnterpriseCertificationScore({ readinessScore: 100, coverageScore: 100, valueGovernanceScore: 100, sustainabilityScore: 100 }), 100, '') });
  suite('T70'); await test('T70: níveis permitidos enterprise', () => { const allowed = ['emerging', 'qualified', 'certifiable', 'enterprise_certified']; for (const s of [30, 55, 75, 92]) assert(allowed.includes(getCertMetrics().classifyEnterpriseCertificationLevel(s))) });
  suite('T71'); await test('T71: getCertificationReadModel ok', async () => { const r = await getCachedCert(); assert(r.ok && r.certification_read_model) });
  suite('T72'); await test('T72: estrutura obrigatória read model', async () => { const r = await getCachedCert(); const crm = r.certification_read_model; assert(crm.sustainability_read_model && crm.certification_readiness && crm.accreditation_coverage && crm.intelligence_maturity_certification && crm.enterprise_certification) });
  suite('T73'); await test('T73: companyId inválido read model', async () => { const r = await svc.aioiCertificationReadModelService.getCertificationReadModel('invalid'); assert(!r.ok) });
  suite('T74'); await test('T74: anti-duplication build* local', () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiCertificationReadModelService.js'), 'utf8')); assert(code.includes('buildCertificationReadiness') && code.includes('buildAccreditationCoverage')); assert(!code.includes('getCertificationReadiness(') && !code.includes('getAccreditationCoverage(')) });
  suite('T75'); await test('T75: getSustainabilityReadModel uma vez', () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiCertificationReadModelService.js'), 'utf8')); assertEqual((code.match(/getSustainabilityReadModel/g) || []).length, 1, 'single srm call') });
  suite('T76'); await test('T76: sem LLM/IA P3.6', () => { const files = ['aioiCertificationReadinessService.js', 'aioiAccreditationCoverageService.js', 'aioiIntelligenceMaturityCertificationService.js', 'aioiEnterpriseCertificationService.js', 'aioiCertificationReadModelService.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('openai') && !code.includes('generateText'), f); } });
  suite('T77'); await test('T77: sem forecast novo', () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiCertificationReadModelService.js'), 'utf8')); assert(!code.includes('getBacklogForecast') && !code.includes('BacklogForecast')) });
  suite('T78'); await test('T78: Promise.all agregador', () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiCertificationReadModelService.js'), 'utf8')); assert(code.includes('Promise.all')) });
  suite('T79'); await test('T79: sustainability_read_model nested', async () => { const r = await getCachedCert(); assert(r.certification_read_model.sustainability_read_model.value_governance_read_model) });
  suite('T80'); await test('T80: certification_readiness campos', async () => { const r = await getCachedCert(); const cr = r.certification_read_model.certification_readiness; assert('certification_readiness_score' in cr && 'certification_readiness_status' in cr) });
  suite('T81'); await test('T81: accreditation_coverage campos', async () => { const r = await getCachedCert(); const ac = r.certification_read_model.accreditation_coverage; assert('coverage_score' in ac && 'coverage_status' in ac) });
  suite('T82'); await test('T82: intelligence_maturity_certification campos', async () => { const r = await getCachedCert(); const mc = r.certification_read_model.intelligence_maturity_certification; assert('maturity_score' in mc && 'maturity_level' in mc) });
  suite('T83'); await test('T83: enterprise_certification campos', async () => { const r = await getCachedCert(); const ec = r.certification_read_model.enterprise_certification; assert('certification_score' in ec && 'certification_level' in ec) });
  suite('T84'); await test('T84: composição exclusiva P3.5', () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiCertificationReadModelService.js'), 'utf8')); assert(code.includes('sustainabilityReadModel') && !code.includes('getValueGovernanceReadModel')) });
  suite('T85'); await test('T85: recordCertificationRequested/Completed', () => { cm = getCertMetrics(); if (_svcCache) _svcCache.aioiCertificationMetrics = cm; cm.resetSessionCounters(); cm.recordCertificationRequested(COMPANY_ID); cm.recordCertificationCompleted(COMPANY_ID, 42); const c = cm.getSessionCounters(); assertEqual(c.certification_requests, 1, ''); assertEqual(c.avg_query_latency_ms, 42, '') });
  suite('T86'); await test('T86: enterprise_certification composto', async () => { const r = await getCachedCert(); const ec = r.certification_read_model.enterprise_certification; assert(ec.certification_score >= 0 && ec.certification_level) });
  suite('T87'); await test('T87: intelligence_health via srm', async () => { const r = await getCachedCert(); assert(r.certification_read_model.sustainability_read_model.intelligence_health) });
  suite('T88'); await test('T88: determinístico read model scores', () => { const r1 = svc.aioiCertificationReadinessService.buildCertificationReadiness(SAMPLE_SRM); const r2 = svc.aioiCertificationReadinessService.buildCertificationReadiness(SAMPLE_SRM); assertEqual(r1.certification_readiness_score, r2.certification_readiness_score, '') });
  suite('T89'); await test('T89: 16 domínios accreditation full sample', () => { assert(svc.aioiAccreditationCoverageService.computeAccreditationCoverageScore(SAMPLE_SRM) >= 90) });
  suite('T90'); await test('T90: 6 pilares readiness full sample', () => { assert(svc.aioiCertificationReadinessService.computeCertificationReadinessScore(SAMPLE_SRM) >= 70) });
  suite('T91'); await test('T91: INSERT bloqueado', () => { cm = getCertMetrics(); let threw = false; try { cm.assertReadOnlySql('INSERT INTO x VALUES (1)'); } catch (e) { threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', ''); } assert(threw) });
  suite('T92'); await test('T92: UPDATE bloqueado', () => { cm = getCertMetrics(); let threw = false; try { cm.assertReadOnlySql('UPDATE x SET y=1'); } catch (e) { threw = true; } assert(threw) });
  suite('T93'); await test('T93: DELETE bloqueado', () => { cm = getCertMetrics(); let threw = false; try { cm.assertReadOnlySql('DELETE FROM x'); } catch (e) { threw = true; } assert(threw) });
  suite('T94'); await test('T94: RLS company_id + bypass false', async () => { await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID); const t = mock._client._calls.find(c => c.sql.includes('app.current_company_id')); const b = mock._client._calls.filter(c => c.sql.includes('app.bypass_rls')); assert(t && t.params[0] === COMPANY_ID); assert(b.length >= 1) });
  suite('T95'); await test('T95: tenant B benchmark only', async () => { const mockB = createReadinessDbMock(buildIoes().map(i => ({ ...i, company_id: COMPANY_ID_B })), buildSnapshots().map(s => ({ ...s, company_id: COMPANY_ID_B }))); patchDb(mockB); _svcCache = null; clearAioiModuleCache(); const svcB = loadP36(); const bench = await svcB.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID_B); assert(bench.ok && bench.benchmark); const t = mockB._client._calls.filter(c => c.sql.includes('app.current_company_id')).find(c => c.params && c.params[0] === COMPANY_ID_B); assert(t, 'RLS tenant B') });
  restoreDb();
  suite('T96'); await test('T96: recordCertificationRequested log', () => { cm = getCertMetrics(); cm.resetSessionCounters(); cm.recordCertificationRequested(COMPANY_ID); assert(cm.getSessionCounters().certification_requests === 1) });
  suite('T97'); await test('T97: recordCertificationReadinessAnalyzed log', () => { cm = getCertMetrics(); cm.recordCertificationReadinessAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().certification_readiness_count >= 1) });
  suite('T98'); await test('T98: recordAccreditationCoverageAnalyzed log', () => { cm = getCertMetrics(); cm.recordAccreditationCoverageAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().accreditation_coverage_count >= 1) });
  suite('T99'); await test('T99: recordMaturityCertificationAnalyzed log', () => { cm = getCertMetrics(); cm.recordMaturityCertificationAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().maturity_certification_count >= 1) });
  suite('T100'); await test('T100: recordEnterpriseCertificationAnalyzed log', () => { cm = getCertMetrics(); cm.recordEnterpriseCertificationAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().enterprise_certification_count >= 1) });
  suite('T101'); await test('T101: getSessionCounters campos', () => { cm = getCertMetrics(); cm.resetSessionCounters(); cm.recordEnterpriseCertificationAnalyzed(COMPANY_ID); const c = cm.getSessionCounters(); assert(c.enterprise_certification_count >= 1 && 'avg_query_latency_ms' in c); assert('certification_requests' in c && 'certification_readiness_count' in c) });
  suite('T102'); await test('T102: clampScore', () => { assertEqual(getCertMetrics().clampScore(150), 100, '') });
  suite('T103'); await test('T103: TRUNCATE bloqueado', () => { cm = getCertMetrics(); let threw = false; try { cm.assertReadOnlySql('TRUNCATE TABLE x'); } catch (e) { threw = true; } assert(threw) });
  suite('T104'); await test('T104: ON CONFLICT bloqueado', () => { cm = getCertMetrics(); let threw = false; try { cm.assertReadOnlySql('INSERT INTO x VALUES (1) ON CONFLICT DO NOTHING'); } catch (e) { threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', ''); } assert(threw) });
  suite('T105'); await test('T105: anti-duplication composição P3.5', () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiCertificationReadModelService.js'), 'utf8')); assert(code.includes('sustainabilityReadModel') && !code.includes('getIntelligenceHealth')); assert(code.includes('_extractCertificationSignals')) });
  suite('T106'); await test('T106: soberanos ausentes P3.6', () => { const files = ['aioiCertificationMetrics.js', 'aioiCertificationReadinessService.js', 'aioiAccreditationCoverageService.js', 'aioiIntelligenceMaturityCertificationService.js', 'aioiEnterpriseCertificationService.js', 'aioiCertificationReadModelService.js']; const forbidden = ['operationalDecisionEngine', 'operationalLearningService', 'workflowOrchestrator', 'actionRuntimeOrchestrator', 'computePriorityScore', 'classificationConsumer', 'aioiOutboxConsumerService']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); for (const bad of forbidden) assert(!code.includes(bad), `${f} contém ${bad}`); } });
  console.log(`\n${'='.repeat(60)}`);
  console.log(`AIOI-P3.6 Certification Tests: ${_passed} passed, ${_failed} failed`);
  console.log(`${'='.repeat(60)}`);
  if (_failed === 0) {
    console.log('\nAIOI_P3_6_ENTERPRISE_INTELLIGENCE_CERTIFICATION_PASS\n');
  } else {
    process.exitCode = 1;
  }
}

runTests().catch(err => {
  console.error('FATAL:', err);
  process.exitCode = 1;
});
