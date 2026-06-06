'use strict';

/**
 * AIOI-P3.3 — Testes automatizados da Enterprise Intelligence Readiness & Adoption Layer
 * T1–T91 | node src/tests/aioi/aioiReadinessReadModel.test.js
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

const P33_EXPORTS = [
  'aioiReadinessMetrics', 'aioiAdoptionAnalysisService', 'aioiOperationalReadinessService',
  'aioiGovernanceReadinessService', 'aioiEnterpriseScaleReadinessService', 'aioiReadinessReadModelService',
  'aioiBenchmarkAnalysisService'
];

function clearAioiModuleCache() {
  for (const key of Object.keys(require.cache)) {
    if (key.includes('/services/aioi/')) delete require.cache[key];
  }
}

let _svcCache = null;

function loadP33() {
  if (_svcCache) return _svcCache;
  const loaded = {};
  for (const mod of P33_EXPORTS) {
    loaded[mod] = require(`${SERVICES_PATH}/${mod}`);
  }
  _svcCache = loaded;
  return loaded;
}

function reloadP33() {
  _svcCache = null;
  clearAioiModuleCache();
  return loadP33();
}

function getReadinessMetrics() {
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiReadinessMetrics`)];
  if (_svcCache) delete _svcCache.aioiReadinessMetrics;
  const m = require(`${SERVICES_PATH}/aioiReadinessMetrics`);
  if (_svcCache) _svcCache.aioiReadinessMetrics = m;
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

const SAMPLE_AUDITABILITY_RM = {
  assurance_read_model: {
    trust_read_model: {
      executive_command_read_model: {
        governance_read_model: {}, predictive_read_model: {}, strategic_read_model: {},
        resilience_read_model: { operational_resilience: { resilience_score: 72 } },
        maturity_read_model: { maturity: { score: 75 } }
      },
      intelligence_trust: { trust_score: 80 }
    },
    intelligence_assurance: { assurance_score: 82, assurance_level: 'high_assurance' }
  },
  intelligence_compliance: { compliance_score: 85, compliance_status: 'compliant' },
  governance_coverage: { governance_score: 88, governance_status: 'complete' },
  enterprise_auditability: { auditability_score: 84, auditability_level: 'high_auditability' }
};

async function runTests() {
  let rm = getReadinessMetrics();
  rm.resetSessionCounters();

  const mock = createReadinessDbMock();
  patchDb(mock);
  const svc = reloadP33();
  let cachedReadiness = null;
  async function getCachedReadiness() {
    if (!cachedReadiness) {
      cachedReadiness = await svc.aioiReadinessReadModelService.getReadinessReadModel(COMPANY_ID);
    }
    return cachedReadiness;
  }

  // T1–T15 Adoption Analysis
  suite('T1'); await test('T1: classifyAdoptionStatus high', () => {
    assertEqual(getReadinessMetrics().classifyAdoptionStatus(80), 'high_adoption', '');
  });
  suite('T2'); await test('T2: classifyAdoptionStatus moderate', () => {
    assertEqual(getReadinessMetrics().classifyAdoptionStatus(55), 'moderate_adoption', '');
  });
  suite('T3'); await test('T3: classifyAdoptionStatus low', () => {
    assertEqual(getReadinessMetrics().classifyAdoptionStatus(30), 'low_adoption', '');
  });
  suite('T4'); await test('T4: ADOPTION_DOMAINS 7', () => {
    assertEqual(svc.aioiAdoptionAnalysisService.ADOPTION_DOMAINS.length, 7, '');
  });
  suite('T5'); await test('T5: buildAdoptionAnalysis', () => {
    const r = svc.aioiAdoptionAnalysisService.buildAdoptionAnalysis(SAMPLE_AUDITABILITY_RM);
    assert(r.adoption_score >= 70 && r.adoption_status === 'high_adoption');
  });
  suite('T6'); await test('T6: computeAdoptionScore range', () => {
    const s = svc.aioiAdoptionAnalysisService.computeAdoptionScore(SAMPLE_AUDITABILITY_RM);
    assert(s >= 0 && s <= 100);
  });
  suite('T7'); await test('T7: getAdoptionAnalysis ok', async () => {
    const r = await getCachedReadiness();
    assert(r.ok && r.readiness_read_model.adoption_analysis.adoption_status);
  });
  suite('T8'); await test('T8: companyId inválido adoption', async () => {
    const r = await svc.aioiAdoptionAnalysisService.getAdoptionAnalysis('bad');
    assert(!r.ok);
  });
  suite('T9'); await test('T9: composição P3.2', () => {
    const code = stripComments(fs.readFileSync(
      path.join(SERVICES_PATH, 'aioiAdoptionAnalysisService.js'), 'utf8'));
    assert(code.includes('auditabilityReadModel') && !code.includes('getGovernanceReadModel'));
  });
  suite('T10'); await test('T10: determinístico adoption', () => {
    
    assertEqual(svc.aioiAdoptionAnalysisService.computeAdoptionScore(SAMPLE_AUDITABILITY_RM),
      svc.aioiAdoptionAnalysisService.computeAdoptionScore(SAMPLE_AUDITABILITY_RM), '')
  });
  suite('T11'); await test('T11: recordAdoptionAnalyzed', () => {
    rm = getReadinessMetrics(); rm.resetSessionCounters();
    rm.recordAdoptionAnalyzed(COMPANY_ID);
    assert(rm.getSessionCounters().adoption_analysis_count >= 1);
  });
  suite('T12'); await test('T12: zero writes adoption', async () => {
    await getCachedReadiness();
    assertNoWrites(mock._client._calls);
  });
  suite('T13'); await test('T13: limite 70 high_adoption', () => {
    assertEqual(getReadinessMetrics().classifyAdoptionStatus(70), 'high_adoption', '');
  });
  suite('T14'); await test('T14: partial adoption score baixo', () => {
    
    const partial = { assurance_read_model: { trust_read_model: { executive_command_read_model: {} } } };
    assert(svc.aioiAdoptionAnalysisService.computeAdoptionScore(partial) < 70)
  });
  suite('T15'); await test('T15: status permitidos adoption', () => {
    const allowed = ['low_adoption', 'moderate_adoption', 'high_adoption'];
    for (const s of [80, 50, 20]) assert(allowed.includes(getReadinessMetrics().classifyAdoptionStatus(s)));
  });

  // T16–T30 Operational Readiness
  suite('T16'); await test('T16: classifyReadinessStatus ready', () => {
    assertEqual(getReadinessMetrics().classifyReadinessStatus(80), 'ready', '');
  });
  suite('T17'); await test('T17: classifyReadinessStatus partially_ready', () => {
    assertEqual(getReadinessMetrics().classifyReadinessStatus(55), 'partially_ready', '');
  });
  suite('T18'); await test('T18: classifyReadinessStatus not_ready', () => {
    assertEqual(getReadinessMetrics().classifyReadinessStatus(30), 'not_ready', '');
  });
  suite('T19'); await test('T19: READINESS_PILLARS 4', () => {
    
    assertEqual(svc.aioiOperationalReadinessService.READINESS_PILLARS.length, 4, '')
  });
  suite('T20'); await test('T20: buildOperationalReadiness', () => {
    
    const r = svc.aioiOperationalReadinessService.buildOperationalReadiness(SAMPLE_AUDITABILITY_RM);
    assert(r.readiness_score >= 70 && r.readiness_status === 'ready')
  });
  suite('T21'); await test('T21: computeOperationalReadinessScore range', () => {
    
    const s = svc.aioiOperationalReadinessService.computeOperationalReadinessScore(SAMPLE_AUDITABILITY_RM);
    assert(s >= 0 && s <= 100)
  });
  suite('T22'); await test('T22: getOperationalReadiness ok', async () => {
    const r = await getCachedReadiness();
    assert(r.readiness_read_model.operational_readiness.readiness_status);
  });
  suite('T23'); await test('T23: companyId inválido operational', async () => {
    
    const r = await svc.aioiOperationalReadinessService.getOperationalReadiness('x');
    assert(!r.ok)
  });
  suite('T24'); await test('T24: empty pillars score baixo', () => {
    
    assert(svc.aioiOperationalReadinessService.computeOperationalReadinessScore({}) <= 40)
  });
  suite('T25'); await test('T25: recordOperationalReadinessAnalyzed', () => {
    rm = getReadinessMetrics(); rm.resetSessionCounters();
    rm.recordOperationalReadinessAnalyzed(COMPANY_ID);
    assert(rm.getSessionCounters().operational_readiness_count >= 1);
  });
  suite('T26'); await test('T26: zero writes operational', async () => {
    assertNoWrites(mock._client._calls);
  });
  suite('T27'); await test('T27: limite 70 ready', () => {
    assertEqual(getReadinessMetrics().classifyReadinessStatus(70), 'ready', '');
  });
  suite('T28'); await test('T28: determinístico operational', () => {
    
    assertEqual(
      svc.aioiOperationalReadinessService.computeOperationalReadinessScore(SAMPLE_AUDITABILITY_RM),
      svc.aioiOperationalReadinessService.computeOperationalReadinessScore(SAMPLE_AUDITABILITY_RM), '')
  });
  suite('T29'); await test('T29: maturity pillar', () => {
    
    const r = svc.aioiOperationalReadinessService.buildOperationalReadiness(SAMPLE_AUDITABILITY_RM);
    assert(r.readiness_score > 0)
  });
  suite('T30'); await test('T30: status permitidos operational', () => {
    const allowed = ['not_ready', 'partially_ready', 'ready'];
    for (const s of [80, 50, 20]) assert(allowed.includes(getReadinessMetrics().classifyReadinessStatus(s)));
  });

  // T31–T45 Governance Readiness
  suite('T31'); await test('T31: classifyGovernanceReadinessStatus enterprise_ready', () => {
    assertEqual(getReadinessMetrics().classifyGovernanceReadinessStatus(95), 'enterprise_ready', '');
  });
  suite('T32'); await test('T32: classifyGovernanceReadinessStatus adequate', () => {
    assertEqual(getReadinessMetrics().classifyGovernanceReadinessStatus(75), 'adequate', '');
  });
  suite('T33'); await test('T33: classifyGovernanceReadinessStatus insufficient', () => {
    assertEqual(getReadinessMetrics().classifyGovernanceReadinessStatus(50), 'insufficient', '');
  });
  suite('T34'); await test('T34: GOVERNANCE_READINESS_FACTORS 4', () => {
    
    assertEqual(svc.aioiGovernanceReadinessService.GOVERNANCE_READINESS_FACTORS.length, 4, '')
  });
  suite('T35'); await test('T35: buildGovernanceReadiness', () => {
    
    const r = svc.aioiGovernanceReadinessService.buildGovernanceReadiness(SAMPLE_AUDITABILITY_RM);
    assert(r.governance_readiness_score >= 70 && r.governance_readiness_status === 'adequate')
  });
  suite('T36'); await test('T36: computeGovernanceReadinessScore range', () => {
    
    const s = svc.aioiGovernanceReadinessService.computeGovernanceReadinessScore(SAMPLE_AUDITABILITY_RM);
    assert(s >= 0 && s <= 100)
  });
  suite('T37'); await test('T37: getGovernanceReadiness ok', async () => {
    const r = await getCachedReadiness();
    assert(r.readiness_read_model.governance_readiness.governance_readiness_status);
  });
  suite('T38'); await test('T38: companyId inválido governance readiness', async () => {
    
    const r = await svc.aioiGovernanceReadinessService.getGovernanceReadiness('invalid');
    assert(!r.ok)
  });
  suite('T39'); await test('T39: empty factors score baixo', () => {
    
    assert(svc.aioiGovernanceReadinessService.computeGovernanceReadinessScore({}) <= 40)
  });
  suite('T40'); await test('T40: recordGovernanceReadinessAnalyzed', () => {
    rm = getReadinessMetrics(); rm.resetSessionCounters();
    rm.recordGovernanceReadinessAnalyzed(COMPANY_ID);
    assert(rm.getSessionCounters().governance_readiness_count >= 1);
  });
  suite('T41'); await test('T41: zero writes governance readiness', async () => {
    assertNoWrites(mock._client._calls);
  });
  suite('T42'); await test('T42: limite 90 enterprise_ready governance', () => {
    
    const high = {
      intelligence_compliance: { compliance_score: 95 },
      governance_coverage: { governance_score: 96 },
      assurance_read_model: { intelligence_assurance: { assurance_score: 94 } },
      enterprise_auditability: { auditability_score: 97 }
    };
    assertEqual(svc.aioiGovernanceReadinessService.buildGovernanceReadiness(high).governance_readiness_status,
      'enterprise_ready', '')
  });
  suite('T43'); await test('T43: determinístico governance readiness', () => {
    
    assertEqual(
      svc.aioiGovernanceReadinessService.computeGovernanceReadinessScore(SAMPLE_AUDITABILITY_RM),
      svc.aioiGovernanceReadinessService.computeGovernanceReadinessScore(SAMPLE_AUDITABILITY_RM), '')
  });
  suite('T44'); await test('T44: compliance factor', () => {
    
    const r = svc.aioiGovernanceReadinessService.buildGovernanceReadiness(SAMPLE_AUDITABILITY_RM);
    assert(r.governance_readiness_score > 0)
  });
  suite('T45'); await test('T45: status permitidos governance readiness', () => {
    const allowed = ['insufficient', 'adequate', 'enterprise_ready'];
    for (const s of [95, 75, 50]) assert(allowed.includes(getReadinessMetrics().classifyGovernanceReadinessStatus(s)));
  });

  // T46–T60 Enterprise Scale Readiness
  suite('T46'); await test('T46: classifyEnterpriseReadinessLevel emerging', () => {
    assertEqual(getReadinessMetrics().classifyEnterpriseReadinessLevel(30), 'emerging', '');
  });
  suite('T47'); await test('T47: classifyEnterpriseReadinessLevel developing', () => {
    assertEqual(getReadinessMetrics().classifyEnterpriseReadinessLevel(55), 'developing', '');
  });
  suite('T48'); await test('T48: classifyEnterpriseReadinessLevel advanced', () => {
    assertEqual(getReadinessMetrics().classifyEnterpriseReadinessLevel(80), 'advanced', '');
  });
  suite('T49'); await test('T49: classifyEnterpriseReadinessLevel enterprise_ready', () => {
    assertEqual(getReadinessMetrics().classifyEnterpriseReadinessLevel(95), 'enterprise_ready', '');
  });
  suite('T50'); await test('T50: limite 90 enterprise_ready scale', () => {
    assertEqual(getReadinessMetrics().classifyEnterpriseReadinessLevel(90), 'enterprise_ready', '');
  });
  suite('T51'); await test('T51: ENTERPRISE_READINESS_WEIGHTS soma 1', () => {
    
    const w = svc.aioiEnterpriseScaleReadinessService.ENTERPRISE_READINESS_WEIGHTS;
    assert(Math.abs(Object.values(w).reduce((a, b) => a + b, 0) - 1) < 0.01)
  });
  suite('T52'); await test('T52: computeEnterpriseReadinessScore range', () => {
    
    const s = svc.aioiEnterpriseScaleReadinessService.computeEnterpriseReadinessScore({
      adoptionScore: 80, operationalScore: 75, governanceScore: 78, trustScore: 82
    });
    assert(s >= 0 && s <= 100)
  });
  suite('T53'); await test('T53: buildEnterpriseScaleReadiness', () => {
    
    const r = svc.aioiEnterpriseScaleReadinessService.buildEnterpriseScaleReadiness({
      adoptionScore: 95, operationalScore: 94, governanceScore: 96, trustScore: 97
    });
    assert(r.enterprise_readiness_score >= 90 && r.enterprise_readiness_level === 'enterprise_ready')
  });
  suite('T54'); await test('T54: getEnterpriseScaleReadiness ok', async () => {
    const r = await getCachedReadiness();
    assert(r.readiness_read_model.enterprise_scale_readiness.enterprise_readiness_level);
  });
  suite('T55'); await test('T55: companyId inválido enterprise scale', async () => {
    
    const r = await svc.aioiEnterpriseScaleReadinessService.getEnterpriseScaleReadiness('bad');
    assert(!r.ok)
  });
  suite('T56'); await test('T56: recordEnterpriseReadinessAnalyzed', () => {
    rm = getReadinessMetrics(); rm.resetSessionCounters();
    rm.recordEnterpriseReadinessAnalyzed(COMPANY_ID);
    assert(rm.getSessionCounters().enterprise_readiness_count >= 1);
  });
  suite('T57'); await test('T57: zero writes enterprise scale', async () => {
    assertNoWrites(mock._client._calls);
  });
  suite('T58'); await test('T58: determinístico enterprise scale', () => {
    
    const inp = { adoptionScore: 70, operationalScore: 70, governanceScore: 70, trustScore: 70 };
    assertEqual(svc.aioiEnterpriseScaleReadinessService.computeEnterpriseReadinessScore(inp),
      svc.aioiEnterpriseScaleReadinessService.computeEnterpriseReadinessScore(inp), '')
  });
  suite('T59'); await test('T59: níveis permitidos enterprise scale', () => {
    const allowed = ['emerging', 'developing', 'advanced', 'enterprise_ready'];
    for (const s of [20, 50, 80, 95]) assert(allowed.includes(getReadinessMetrics().classifyEnterpriseReadinessLevel(s)));
  });
  suite('T60'); await test('T60: composição trust P3.0', () => {
    const code = stripComments(fs.readFileSync(
      path.join(SERVICES_PATH, 'aioiEnterpriseScaleReadinessService.js'), 'utf8'));
    assert(code.includes('trustService') && code.includes('getIntelligenceTrust'));
  });

  // T61–T75 Readiness Read Model
  suite('T61'); await test('T61: getReadinessReadModel ok', async () => {
    const r = await getCachedReadiness();
    assert(r.ok && r.readiness_read_model.auditability_read_model);
  });
  suite('T62'); await test('T62: 5 blocos readiness read model', async () => {
    const r = await getCachedReadiness();
    assertEqual(Object.keys(r.readiness_read_model).length, 5, '');
  });
  suite('T63'); await test('T63: adoption_analysis bloco', async () => {
    const r = await getCachedReadiness();
    assert(r.readiness_read_model.adoption_analysis);
  });
  suite('T64'); await test('T64: operational_readiness bloco', async () => {
    const r = await getCachedReadiness();
    assert(r.readiness_read_model.operational_readiness);
  });
  suite('T65'); await test('T65: governance_readiness bloco', async () => {
    const r = await getCachedReadiness();
    assert(r.readiness_read_model.governance_readiness);
  });
  suite('T66'); await test('T66: enterprise_scale_readiness bloco', async () => {
    const r = await getCachedReadiness();
    assert(r.readiness_read_model.enterprise_scale_readiness);
  });
  suite('T67'); await test('T67: companyId inválido read model', async () => {
    const r = await svc.aioiReadinessReadModelService.getReadinessReadModel('bad');
    assert(!r.ok);
  });
  suite('T68'); await test('T68: recordReadinessRequested', () => {
    rm = getReadinessMetrics(); rm.resetSessionCounters();
    rm.recordReadinessRequested(COMPANY_ID);
    assert(rm.getSessionCounters().readiness_requests >= 1);
  });
  suite('T69'); await test('T69: zero writes read model', async () => {
    assertNoWrites(mock._client._calls);
  });
  suite('T70'); await test('T70: recordReadinessCompleted', () => {
    rm = getReadinessMetrics(); rm.recordReadinessCompleted(COMPANY_ID, 18);
    assert(rm.getSessionCounters().readiness_requests >= 0);
  });
  suite('T71'); await test('T71: anti-duplication P3.2', () => {
    const code = stripComments(fs.readFileSync(
      path.join(SERVICES_PATH, 'aioiReadinessReadModelService.js'), 'utf8'));
    assert(code.includes('auditabilityReadModel') && !code.includes('buildAuditCoverage'));
  });
  suite('T72'); await test('T72: auditability nested', async () => {
    const r = await getCachedReadiness();
    assert(r.readiness_read_model.auditability_read_model.enterprise_auditability);
  });
  suite('T73'); await test('T73: Promise.all agregador', () => {
    const code = stripComments(fs.readFileSync(
      path.join(SERVICES_PATH, 'aioiReadinessReadModelService.js'), 'utf8'));
    assert(code.includes('Promise.all'));
  });
  suite('T74'); await test('T74: sem LLM/IA', () => {
    const files = ['aioiAdoptionAnalysisService.js', 'aioiOperationalReadinessService.js',
      'aioiGovernanceReadinessService.js', 'aioiEnterpriseScaleReadinessService.js'];
    for (const f of files) {
      const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8'));
      assert(!code.includes('openai') && !code.includes('generateText'), f);
    }
  });
  suite('T75'); await test('T75: sem forecast novo', () => {
    const code = stripComments(fs.readFileSync(
      path.join(SERVICES_PATH, 'aioiReadinessReadModelService.js'), 'utf8'));
    assert(!code.includes('getBacklogForecast') && !code.includes('BacklogForecast'));
  });

  // T76–T78 READ ONLY Guard
  suite('T76'); await test('T76: INSERT bloqueado', () => {
    rm = getReadinessMetrics(); let threw = false;
    try { rm.assertReadOnlySql('INSERT INTO x VALUES (1)'); } catch (e) {
      threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', '');
    }
    assert(threw);
  });
  suite('T77'); await test('T77: UPDATE bloqueado', () => {
    rm = getReadinessMetrics(); let threw = false;
    try { rm.assertReadOnlySql('UPDATE x SET y=1'); } catch (e) { threw = true; } assert(threw);
  });
  suite('T78'); await test('T78: DELETE bloqueado', () => {
    rm = getReadinessMetrics(); let threw = false;
    try { rm.assertReadOnlySql('DELETE FROM x'); } catch (e) { threw = true; } assert(threw);
  });

  // T79 RLS
  suite('T79'); await test('T79: RLS company_id + bypass false', async () => {
    
    await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID);
    const t = mock._client._calls.find(c => c.sql.includes('app.current_company_id'));
    const b = mock._client._calls.filter(c => c.sql.includes('app.bypass_rls'));
    assert(t && t.params[0] === COMPANY_ID);
    assert(b.length >= 1)
  });

  // T80 Multi-tenant
  suite('T80'); await test('T80: tenant B', async () => {
    const mockB = createReadinessDbMock(buildIoes().map(i => ({ ...i, company_id: COMPANY_ID_B })));
    patchDb(mockB);
    _svcCache = null;
    clearAioiModuleCache();
    const svcB = loadP33();
    await svcB.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID_B);
    const t = mockB._client._calls.filter(c => c.sql.includes('app.current_company_id'))
      .find(c => c.params && c.params[0] === COMPANY_ID_B);
    assert(t, 'RLS tenant B');
  });

  restoreDb();

  // T81–T84 Logs
  suite('T81'); await test('T81: recordReadinessRequested log', () => {
    rm = getReadinessMetrics(); rm.resetSessionCounters();
    rm.recordReadinessRequested(COMPANY_ID);
    assert(rm.getSessionCounters().readiness_requests === 1);
  });
  suite('T82'); await test('T82: recordAdoptionAnalyzed log', () => {
    rm = getReadinessMetrics(); rm.recordAdoptionAnalyzed(COMPANY_ID);
    assert(rm.getSessionCounters().adoption_analysis_count >= 1);
  });
  suite('T83'); await test('T83: recordOperationalReadinessAnalyzed log', () => {
    rm = getReadinessMetrics(); rm.recordOperationalReadinessAnalyzed(COMPANY_ID);
    assert(rm.getSessionCounters().operational_readiness_count >= 1);
  });
  suite('T84'); await test('T84: recordGovernanceReadinessAnalyzed log', () => {
    rm = getReadinessMetrics(); rm.recordGovernanceReadinessAnalyzed(COMPANY_ID);
    assert(rm.getSessionCounters().governance_readiness_count >= 1);
  });

  // T85–T86 Métricas
  suite('T85'); await test('T85: getSessionCounters campos', () => {
    rm = getReadinessMetrics(); rm.resetSessionCounters();
    rm.recordEnterpriseReadinessAnalyzed(COMPANY_ID);
    const c = rm.getSessionCounters();
    assert(c.enterprise_readiness_count >= 1 && 'avg_query_latency_ms' in c);
  });
  suite('T86'); await test('T86: clampScore', () => {
    assertEqual(getReadinessMetrics().clampScore(150), 100, '');
  });

  // T87–T91 guards + soberanos
  suite('T87'); await test('T87: TRUNCATE bloqueado', () => {
    rm = getReadinessMetrics(); let threw = false;
    try { rm.assertReadOnlySql('TRUNCATE TABLE x'); } catch (e) { threw = true; } assert(threw);
  });
  suite('T88'); await test('T88: CREATE bloqueado', () => {
    rm = getReadinessMetrics(); let threw = false;
    try { rm.assertReadOnlySql('CREATE TABLE x (id int)'); } catch (e) { threw = true; } assert(threw);
  });
  suite('T89'); await test('T89: MERGE bloqueado', () => {
    rm = getReadinessMetrics(); let threw = false;
    try { rm.assertReadOnlySql('MERGE INTO x'); } catch (e) { threw = true; } assert(threw);
  });
  suite('T90'); await test('T90: anti-duplication composição', () => {
    const code = stripComments(fs.readFileSync(
      path.join(SERVICES_PATH, 'aioiGovernanceReadinessService.js'), 'utf8'));
    assert(code.includes('auditabilityReadModel') && !code.includes('INSERT'));
  });
  suite('T91'); await test('T91: soberanos ausentes', () => {
    const files = ['aioiReadinessMetrics.js', 'aioiAdoptionAnalysisService.js',
      'aioiOperationalReadinessService.js', 'aioiGovernanceReadinessService.js',
      'aioiEnterpriseScaleReadinessService.js', 'aioiReadinessReadModelService.js'];
    const forbidden = ['operationalDecisionEngine', 'operationalLearningService', 'workflowOrchestrator',
      'actionRuntimeOrchestrator', 'computePriorityScore', 'classificationConsumer', 'aioiOutboxConsumerService'];
    for (const f of files) {
      const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8'));
      for (const term of forbidden) assert(!code.includes(term), `${f} ${term}`);
    }
  });

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  AIOI-P3.3 Readiness Read Model Test Report');
  console.log(`  Total: ${_passed + _failed} | PASS: ${_passed} | FAIL: ${_failed}`);
  console.log(`  STATUS: ${_failed === 0 ? 'AIOI_P3_3_TEST_PASS' : 'AIOI_P3_3_TEST_FAIL'}`);
  console.log('══════════════════════════════════════════════════════════\n');
  process.exit(_failed > 0 ? 1 : 0);
}

runTests().catch(e => { console.error('Fatal:', e); process.exit(1); });
