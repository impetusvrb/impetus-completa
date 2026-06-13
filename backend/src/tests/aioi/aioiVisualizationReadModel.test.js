'use strict';

/**
 * AIOI-P4.3 — Testes automatizados da Enterprise Intelligence Visualization Readiness Layer
 * T1–T141 | node src/tests/aioi/aioiVisualizationReadModel.test.js
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

const P43_EXPORTS = [
  'aioiConsumptionReadModelService', 'aioiVisualizationMetrics',
  'aioiExecutivePresentationService', 'aioiVisualizationConsistencyService',
  'aioiVisualizationCoverageService', 'aioiEnterpriseVisualizationReadinessService',
  'aioiVisualizationReadModelService', 'aioiBenchmarkAnalysisService'
];

function clearAioiModuleCache() {
  for (const key of Object.keys(require.cache)) {
    if (key.includes('/services/aioi/')) delete require.cache[key];
  }
}

let _svcCache = null;

function loadP43() {
  if (_svcCache) return _svcCache;
  const loaded = {};
  for (const mod of P43_EXPORTS) {
    loaded[mod] = require(`${SERVICES_PATH}/${mod}`);
  }
  _svcCache = loaded;
  return loaded;
}

function reloadP43() {
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
    'aioiAutonomyReadModelService', 'aioiConsumptionReadModelService'
  ];
  for (const mod of chainPreload) require(`${SERVICES_PATH}/${mod}`);
  return loadP43();
}

function getVisMetrics() {
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiVisualizationMetrics`)];
  if (_svcCache) delete _svcCache.aioiVisualizationMetrics;
  const m = require(`${SERVICES_PATH}/aioiVisualizationMetrics`);
  if (_svcCache) _svcCache.aioiVisualizationMetrics = m;
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
const SAMPLE_CONS_RM = {
  autonomy_read_model: SAMPLE_ARM,
  executive_visibility: { visibility_score: 84, visibility_status: 'visible' },
  decision_consumption: { consumption_score: 85, consumption_status: 'consumable' },
  intelligence_accessibility: { accessibility_score: 91, accessibility_status: 'accessible' },
  enterprise_consumption: { consumption_score: 86, consumption_level: 'executive_ready' }
};

const EMPTY_CONS_RM = {
  autonomy_read_model: EMPTY_ARM,
  executive_visibility: { visibility_score: 30, visibility_status: 'opaque' },
  decision_consumption: { consumption_score: 25, consumption_status: 'fragmented' },
  intelligence_accessibility: { accessibility_score: 20, accessibility_status: 'restricted' },
  enterprise_consumption: { consumption_score: 30, consumption_level: 'emerging' }
};

const PARTIAL_TRUST_ONLY = {
  autonomy_read_model: {
    sovereignty_read_model: {
      institutionalization_read_model: {
        governance_excellence_read_model: {
          conformance_read_model: {
            certification_read_model: {
              sustainability_read_model: {
                value_governance_read_model: {
                  readiness_read_model: {
                    auditability_read_model: {
                      assurance_read_model: {
                        trust_read_model: { intelligence_trust: { trust_score: 75 } }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

const PARTIAL_TRUST_80 = {
  autonomy_read_model: {
    sovereignty_read_model: {
      institutionalization_read_model: {
        governance_excellence_read_model: {
          conformance_read_model: {
            certification_read_model: {
              sustainability_read_model: {
                value_governance_read_model: {
                  readiness_read_model: {
                    auditability_read_model: {
                      assurance_read_model: {
                        trust_read_model: { intelligence_trust: { trust_score: 80 } }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

async function runTests() {
  let vm = getVisMetrics();
  vm.resetSessionCounters();
  const mock = createReadinessDbMock();
  patchDb(mock);
  const svc = reloadP43();
  let cachedVis = null;
  async function getCachedVis() {
    if (!cachedVis) {
      cachedVis = await svc.aioiVisualizationReadModelService.getVisualizationReadModel(COMPANY_ID);
    }
    return cachedVis;
  }

  suite('T1'); await test('T1: classifyExecutivePresentation presentation_ready', async () => { assertEqual(getVisMetrics().classifyExecutivePresentation(80), 'presentation_ready', '') });
  suite('T2'); await test('T2: classifyExecutivePresentation partial', async () => { assertEqual(getVisMetrics().classifyExecutivePresentation(55), 'partial', '') });
  suite('T3'); await test('T3: classifyExecutivePresentation fragmented', async () => { assertEqual(getVisMetrics().classifyExecutivePresentation(30), 'fragmented', '') });
  suite('T4'); await test('T4: PRESENTATION_PILLARS 13', async () => { assertEqual(svc.aioiExecutivePresentationService.PRESENTATION_PILLARS.length, 13, '') });
  suite('T5'); await test('T5: buildExecutivePresentation', async () => { const r = svc.aioiExecutivePresentationService.buildExecutivePresentation(SAMPLE_CONS_RM); assert(r.presentation_score >= 70 && r.presentation_status === 'presentation_ready') });
  suite('T6'); await test('T6: computeExecutivePresentationScore range', async () => { const s = svc.aioiExecutivePresentationService.computeExecutivePresentationScore(SAMPLE_CONS_RM); assert(s >= 0 && s <= 100) });
  suite('T7'); await test('T7: getExecutivePresentation via read model', async () => { const r = await getCachedVis(); assert(r.ok && r.visualization_read_model.executive_presentation.presentation_status) });
  suite('T8'); await test('T8: companyId inválido presentation', async () => { const r = await svc.aioiExecutivePresentationService.getExecutivePresentation('bad'); assert(!r.ok) });
  suite('T9'); await test('T9: composição P4.2 consumptionReadModel', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiExecutivePresentationService.js'), 'utf8')); assert(code.includes('consumptionReadModel') && !code.includes('getAutonomyReadModel')) });
  suite('T10'); await test('T10: determinístico presentation', async () => { assertEqual(svc.aioiExecutivePresentationService.computeExecutivePresentationScore(SAMPLE_CONS_RM), svc.aioiExecutivePresentationService.computeExecutivePresentationScore(SAMPLE_CONS_RM), '') });
  suite('T11'); await test('T11: recordExecutivePresentationAnalyzed', async () => { vm = getVisMetrics(); vm.resetSessionCounters(); vm.recordExecutivePresentationAnalyzed(COMPANY_ID); assert(vm.getSessionCounters().executive_presentation_count >= 1) });
  suite('T12'); await test('T12: zero writes presentation path', async () => { await getCachedVis(); assertNoWrites(mock._client._calls) });
  suite('T13'); await test('T13: limite 70 presentation_ready', async () => { assertEqual(getVisMetrics().classifyExecutivePresentation(70), 'presentation_ready', '') });
  suite('T14'); await test('T14: empty crm score baixo', async () => { assert(svc.aioiExecutivePresentationService.computeExecutivePresentationScore(EMPTY_CONS_RM) <= 40) });
  suite('T15'); await test('T15: status permitidos presentation', async () => { const allowed = ['fragmented', 'partial', 'presentation_ready']; for (const s of [80, 50, 20]) assert(allowed.includes(getVisMetrics().classifyExecutivePresentation(s))) });
  suite('T16'); await test('T16: _extractVisualizationSignals trust', async () => { assertEqual(getVisMetrics()._extractVisualizationSignals(SAMPLE_CONS_RM).trustScore, 80, '') });
  suite('T17'); await test('T17: _extractVisualizationSignals consumption', async () => { assertEqual(getVisMetrics()._extractVisualizationSignals(SAMPLE_CONS_RM).consumptionScore, 86, '') });
  suite('T18'); await test('T18: _extractVisualizationSignals autonomy', async () => { assertEqual(getVisMetrics()._extractVisualizationSignals(SAMPLE_CONS_RM).autonomyScore, 86, '') });
  suite('T19'); await test('T19: pilares incluem consumption', async () => { assert(svc.aioiExecutivePresentationService.PRESENTATION_PILLARS.includes('consumption')) });
  suite('T20'); await test('T20: buildExecutivePresentation campos', async () => { const r = svc.aioiExecutivePresentationService.buildExecutivePresentation(SAMPLE_CONS_RM); assert('presentation_score' in r && 'presentation_status' in r) });
  suite('T21'); await test('T21: pilares incluem sovereignty', async () => { assert(svc.aioiExecutivePresentationService.PRESENTATION_PILLARS.includes('sovereignty')) });
  suite('T22'); await test('T22: classifyVisualizationConsistency consistent', async () => { assertEqual(getVisMetrics().classifyVisualizationConsistency(80), 'consistent', '') });
  suite('T23'); await test('T23: classifyVisualizationConsistency partial', async () => { assertEqual(getVisMetrics().classifyVisualizationConsistency(55), 'partial', '') });
  suite('T24'); await test('T24: classifyVisualizationConsistency inconsistent', async () => { assertEqual(getVisMetrics().classifyVisualizationConsistency(30), 'inconsistent', '') });
  suite('T25'); await test('T25: VISUALIZATION_CONSISTENCY_STAGES 13', async () => { assertEqual(svc.aioiVisualizationConsistencyService.VISUALIZATION_CONSISTENCY_STAGES.length, 13, '') });
  suite('T26'); await test('T26: buildVisualizationConsistency', async () => { const r = svc.aioiVisualizationConsistencyService.buildVisualizationConsistency(SAMPLE_CONS_RM); assert(r.consistency_score >= 70 && r.consistency_status === 'consistent') });
  suite('T27'); await test('T27: computeVisualizationConsistencyScore range', async () => { const s = svc.aioiVisualizationConsistencyService.computeVisualizationConsistencyScore(SAMPLE_CONS_RM); assert(s >= 0 && s <= 100) });
  suite('T28'); await test('T28: getVisualizationConsistency ok', async () => { const r = await svc.aioiVisualizationConsistencyService.getVisualizationConsistency(COMPANY_ID); assert(r.ok && r.visualization_consistency.consistency_status) });
  suite('T29'); await test('T29: companyId inválido consistency', async () => { const r = await svc.aioiVisualizationConsistencyService.getVisualizationConsistency('x'); assert(!r.ok) });
  suite('T30'); await test('T30: empty crm consistency baixo', async () => { assert(svc.aioiVisualizationConsistencyService.computeVisualizationConsistencyScore(EMPTY_CONS_RM) <= 40) });
  suite('T31'); await test('T31: recordVisualizationConsistencyAnalyzed', async () => { vm = getVisMetrics(); vm.recordVisualizationConsistencyAnalyzed(COMPANY_ID); assert(vm.getSessionCounters().visualization_consistency_count >= 1) });
  suite('T32'); await test('T32: zero writes consistency', async () => { assertNoWrites(mock._client._calls) });
  suite('T33'); await test('T33: limite 70 consistent', async () => { assertEqual(getVisMetrics().classifyVisualizationConsistency(70), 'consistent', '') });
  suite('T34'); await test('T34: determinístico consistency', async () => { assertEqual(svc.aioiVisualizationConsistencyService.computeVisualizationConsistencyScore(SAMPLE_CONS_RM), svc.aioiVisualizationConsistencyService.computeVisualizationConsistencyScore(SAMPLE_CONS_RM), '') });
  suite('T35'); await test('T35: cadeia trust→consumption', async () => { const stages = svc.aioiVisualizationConsistencyService.VISUALIZATION_CONSISTENCY_STAGES; assertEqual(stages[0], 'trust', ''); assertEqual(stages[12], 'consumption', '') });
  suite('T36'); await test('T36: status permitidos consistency', async () => { const allowed = ['inconsistent', 'partial', 'consistent']; for (const s of [80, 50, 20]) assert(allowed.includes(getVisMetrics().classifyVisualizationConsistency(s))) });
  suite('T37'); await test('T37: composição P4.2 consistency', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiVisualizationConsistencyService.js'), 'utf8')); assert(code.includes('consumptionReadModel')) });
  suite('T38'); await test('T38: partial crm só trust', async () => { assert(svc.aioiVisualizationConsistencyService.computeVisualizationConsistencyScore(PARTIAL_TRUST_ONLY) < 70) });
  suite('T39'); await test('T39: full vs partial consistency', async () => { const full = svc.aioiVisualizationConsistencyService.computeVisualizationConsistencyScore(SAMPLE_CONS_RM); const partial = svc.aioiVisualizationConsistencyService.computeVisualizationConsistencyScore(PARTIAL_TRUST_80); assert(full > partial) });
  suite('T40'); await test('T40: limite 40 partial consistency', async () => { assertEqual(getVisMetrics().classifyVisualizationConsistency(40), 'partial', '') });
  suite('T41'); await test('T41: buildVisualizationConsistency campos', async () => { const r = svc.aioiVisualizationConsistencyService.buildVisualizationConsistency(SAMPLE_CONS_RM); assert('consistency_score' in r && 'consistency_status' in r) });
  suite('T42'); await test('T42: estágio consumption index 12', async () => { assertEqual(svc.aioiVisualizationConsistencyService.VISUALIZATION_CONSISTENCY_STAGES[12], 'consumption', '') });
  suite('T43'); await test('T43: classifyVisualizationCoverage comprehensive', async () => { assertEqual(getVisMetrics().classifyVisualizationCoverage(80), 'comprehensive', '') });
  suite('T44'); await test('T44: classifyVisualizationCoverage partial', async () => { assertEqual(getVisMetrics().classifyVisualizationCoverage(55), 'partial', '') });
  suite('T45'); await test('T45: classifyVisualizationCoverage limited', async () => { assertEqual(getVisMetrics().classifyVisualizationCoverage(30), 'limited', '') });
  suite('T46'); await test('T46: VISUALIZATION_COVERAGE_DOMAINS 23', async () => { assertEqual(svc.aioiVisualizationCoverageService.VISUALIZATION_COVERAGE_DOMAINS.length, 23, '') });
  suite('T47'); await test('T47: buildVisualizationCoverage', async () => { const r = svc.aioiVisualizationCoverageService.buildVisualizationCoverage(SAMPLE_CONS_RM); assert(r.coverage_score >= 70 && r.coverage_status === 'comprehensive') });
  suite('T48'); await test('T48: computeVisualizationCoverageScore range', async () => { const s = svc.aioiVisualizationCoverageService.computeVisualizationCoverageScore(SAMPLE_CONS_RM); assert(s >= 0 && s <= 100) });
  suite('T49'); await test('T49: getVisualizationCoverage ok', async () => { const r = await svc.aioiVisualizationCoverageService.getVisualizationCoverage(COMPANY_ID); assert(r.ok && r.visualization_coverage.coverage_status) });
  suite('T50'); await test('T50: companyId inválido coverage', async () => { const r = await svc.aioiVisualizationCoverageService.getVisualizationCoverage('invalid'); assert(!r.ok) });
  suite('T51'); await test('T51: empty crm coverage baixo', async () => { assert(svc.aioiVisualizationCoverageService.computeVisualizationCoverageScore(EMPTY_CONS_RM) <= 40) });
  suite('T52'); await test('T52: recordVisualizationCoverageAnalyzed', async () => { vm = getVisMetrics(); vm.recordVisualizationCoverageAnalyzed(COMPANY_ID); assert(vm.getSessionCounters().visualization_coverage_count >= 1) });
  suite('T53'); await test('T53: domínio consumption', async () => { assert(svc.aioiVisualizationCoverageService.VISUALIZATION_COVERAGE_DOMAINS.includes('consumption')) });
  suite('T54'); await test('T54: domínio sovereignty', async () => { assert(svc.aioiVisualizationCoverageService.VISUALIZATION_COVERAGE_DOMAINS.includes('sovereignty')) });
  suite('T55'); await test('T55: determinístico coverage', async () => { assertEqual(svc.aioiVisualizationCoverageService.computeVisualizationCoverageScore(SAMPLE_CONS_RM), svc.aioiVisualizationCoverageService.computeVisualizationCoverageScore(SAMPLE_CONS_RM), '') });
  suite('T56'); await test('T56: limite 70 comprehensive', async () => { assertEqual(getVisMetrics().classifyVisualizationCoverage(70), 'comprehensive', '') });
  suite('T57'); await test('T57: buildVisualizationCoverage campos', async () => { const r = svc.aioiVisualizationCoverageService.buildVisualizationCoverage(SAMPLE_CONS_RM); assert('coverage_score' in r && 'coverage_status' in r) });
  suite('T58'); await test('T58: 23 domínios coverage full sample', async () => { assert(svc.aioiVisualizationCoverageService.computeVisualizationCoverageScore(SAMPLE_CONS_RM) >= 90) });
  suite('T59'); await test('T59: classifyEnterpriseVisualizationReadiness cockpit_ready', async () => { assertEqual(getVisMetrics().classifyEnterpriseVisualizationReadiness(92), 'cockpit_ready', '') });
  suite('T60'); await test('T60: classifyEnterpriseVisualizationReadiness visualization_ready', async () => { assertEqual(getVisMetrics().classifyEnterpriseVisualizationReadiness(75), 'visualization_ready', '') });
  suite('T61'); await test('T61: classifyEnterpriseVisualizationReadiness developing', async () => { assertEqual(getVisMetrics().classifyEnterpriseVisualizationReadiness(55), 'developing', '') });
  suite('T62'); await test('T62: classifyEnterpriseVisualizationReadiness emerging', async () => { assertEqual(getVisMetrics().classifyEnterpriseVisualizationReadiness(30), 'emerging', '') });
  suite('T63'); await test('T63: ENTERPRISE_VISUALIZATION_WEIGHTS 0.25', async () => { const w = svc.aioiEnterpriseVisualizationReadinessService.ENTERPRISE_VISUALIZATION_WEIGHTS; assertEqual(w.executivePresentation, 0.25, ''); assertEqual(w.visualizationConsistency, 0.25, ''); assertEqual(w.visualizationCoverage, 0.25, ''); assertEqual(w.enterpriseConsumption, 0.25, '') });
  suite('T64'); await test('T64: buildEnterpriseVisualizationReadiness', async () => { const r = svc.aioiEnterpriseVisualizationReadinessService.buildEnterpriseVisualizationReadiness({ presentationScore: 80, consistencyScore: 85, coverageScore: 82, enterpriseConsumptionScore: 83 }); assert(r.visualization_score >= 70 && r.visualization_level) });
  suite('T65'); await test('T65: computeEnterpriseVisualizationReadinessScore range', async () => { const s = svc.aioiEnterpriseVisualizationReadinessService.computeEnterpriseVisualizationReadinessScore({ presentationScore: 80, consistencyScore: 80, coverageScore: 80, enterpriseConsumptionScore: 80 }); assert(s >= 0 && s <= 100) });
  suite('T66'); await test('T66: getEnterpriseVisualizationReadiness ok', async () => { const r = await svc.aioiEnterpriseVisualizationReadinessService.getEnterpriseVisualizationReadiness(COMPANY_ID); assert(r.ok && r.enterprise_visualization_readiness.visualization_level) });
  suite('T67'); await test('T67: companyId inválido enterprise viz', async () => { const r = await svc.aioiEnterpriseVisualizationReadinessService.getEnterpriseVisualizationReadiness('bad-id'); assert(!r.ok) });
  suite('T68'); await test('T68: recordEnterpriseVisualizationReadinessAnalyzed', async () => { vm = getVisMetrics(); vm.recordEnterpriseVisualizationReadinessAnalyzed(COMPANY_ID); assert(vm.getSessionCounters().enterprise_visualization_readiness_count >= 1) });
  suite('T69'); await test('T69: zero writes enterprise viz', async () => { assertNoWrites(mock._client._calls) });
  suite('T70'); await test('T70: limite 90 cockpit_ready', async () => { assertEqual(getVisMetrics().classifyEnterpriseVisualizationReadiness(90), 'cockpit_ready', '') });
  suite('T71'); await test('T71: determinístico enterprise viz', async () => { const inp = { presentationScore: 80, consistencyScore: 75, coverageScore: 82, enterpriseConsumptionScore: 78 }; assertEqual(svc.aioiEnterpriseVisualizationReadinessService.computeEnterpriseVisualizationReadinessScore(inp), svc.aioiEnterpriseVisualizationReadinessService.computeEnterpriseVisualizationReadinessScore(inp), '') });
  suite('T72'); await test('T72: pesos iguais soma ponderada', async () => { assertEqual(svc.aioiEnterpriseVisualizationReadinessService.computeEnterpriseVisualizationReadinessScore({ presentationScore: 100, consistencyScore: 100, coverageScore: 100, enterpriseConsumptionScore: 100 }), 100, '') });
  suite('T73'); await test('T73: níveis permitidos enterprise viz', async () => { const allowed = ['emerging', 'developing', 'visualization_ready', 'cockpit_ready']; for (const s of [30, 55, 75, 92]) assert(allowed.includes(getVisMetrics().classifyEnterpriseVisualizationReadiness(s))) });
  suite('T74'); await test('T74: getVisualizationReadModel ok', async () => { const r = await getCachedVis(); assert(r.ok && r.visualization_read_model) });
  suite('T75'); await test('T75: estrutura obrigatória read model', async () => { const r = await getCachedVis(); const vrm = r.visualization_read_model; assert(vrm.consumption_read_model && vrm.executive_presentation && vrm.visualization_consistency && vrm.visualization_coverage && vrm.enterprise_visualization_readiness) });
  suite('T76'); await test('T76: companyId inválido read model', async () => { const r = await svc.aioiVisualizationReadModelService.getVisualizationReadModel('invalid'); assert(!r.ok) });
  suite('T77'); await test('T77: anti-duplication build* local', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiVisualizationReadModelService.js'), 'utf8')); assert(code.includes('buildExecutivePresentation') && code.includes('buildVisualizationConsistency')); assert(!code.includes('getExecutivePresentation(') && !code.includes('getVisualizationConsistency(')) });
  suite('T78'); await test('T78: getConsumptionReadModel uma vez', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiVisualizationReadModelService.js'), 'utf8')); assertEqual((code.match(/getConsumptionReadModel/g) || []).length, 1, 'single crm call') });
  suite('T79'); await test('T79: sem LLM/IA P4.3', async () => { const files = ['aioiExecutivePresentationService.js', 'aioiVisualizationConsistencyService.js', 'aioiVisualizationCoverageService.js', 'aioiEnterpriseVisualizationReadinessService.js', 'aioiVisualizationReadModelService.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('openai') && !code.includes('generateText'), f); } });
  suite('T80'); await test('T80: sem forecast novo', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiVisualizationReadModelService.js'), 'utf8')); assert(!code.includes('getBacklogForecast') && !code.includes('BacklogForecast')) });
  suite('T81'); await test('T81: Promise.all agregador', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiVisualizationReadModelService.js'), 'utf8')); assert(code.includes('Promise.all')) });
  suite('T82'); await test('T82: consumption_read_model nested', async () => { const r = await getCachedVis(); assert(r.visualization_read_model.consumption_read_model.autonomy_read_model) });
  suite('T83'); await test('T83: executive_presentation campos', async () => { const r = await getCachedVis(); const ep = r.visualization_read_model.executive_presentation; assert('presentation_score' in ep && 'presentation_status' in ep) });
  suite('T84'); await test('T84: visualization_consistency campos', async () => { const r = await getCachedVis(); const vc = r.visualization_read_model.visualization_consistency; assert('consistency_score' in vc && 'consistency_status' in vc) });
  suite('T85'); await test('T85: visualization_coverage campos', async () => { const r = await getCachedVis(); const vc = r.visualization_read_model.visualization_coverage; assert('coverage_score' in vc && 'coverage_status' in vc) });
  suite('T86'); await test('T86: enterprise_visualization_readiness campos', async () => { const r = await getCachedVis(); const ev = r.visualization_read_model.enterprise_visualization_readiness; assert('visualization_score' in ev && 'visualization_level' in ev) });
  suite('T87'); await test('T87: composição exclusiva P4.2', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiVisualizationReadModelService.js'), 'utf8')); assert(code.includes('consumptionReadModel') && !code.includes('getAutonomyReadModel')) });
  suite('T88'); await test('T88: recordVisualizationRequested/Completed', async () => { vm = getVisMetrics(); if (_svcCache) _svcCache.aioiVisualizationMetrics = vm; vm.resetSessionCounters(); vm.recordVisualizationRequested(COMPANY_ID); vm.recordVisualizationCompleted(COMPANY_ID, 42); const c = vm.getSessionCounters(); assertEqual(c.visualization_requests, 1, ''); assertEqual(c.avg_query_latency_ms, 42, '') });
  suite('T89'); await test('T89: enterprise_visualization_readiness composto', async () => { const r = await getCachedVis(); const ev = r.visualization_read_model.enterprise_visualization_readiness; assert(ev.visualization_score >= 0 && ev.visualization_level) });
  suite('T90'); await test('T90: enterprise_consumption via crm nested', async () => { const r = await getCachedVis(); assert(r.visualization_read_model.consumption_read_model.enterprise_consumption) });
  suite('T91'); await test('T91: determinístico read model scores', async () => { const r1 = svc.aioiExecutivePresentationService.buildExecutivePresentation(SAMPLE_CONS_RM); const r2 = svc.aioiExecutivePresentationService.buildExecutivePresentation(SAMPLE_CONS_RM); assertEqual(r1.presentation_score, r2.presentation_score, '') });
  suite('T92'); await test('T92: 13 pilares presentation full sample', async () => { assert(svc.aioiExecutivePresentationService.computeExecutivePresentationScore(SAMPLE_CONS_RM) >= 70) });
  suite('T93'); await test('T93: 13 estágios consistency full sample', async () => { assert(svc.aioiVisualizationConsistencyService.computeVisualizationConsistencyScore(SAMPLE_CONS_RM) >= 70) });
  suite('T94'); await test('T94: _extractVisualizationSignals governance excellence', async () => { assertEqual(getVisMetrics()._extractVisualizationSignals(SAMPLE_CONS_RM).governanceExcellenceScore, 84, '') });
  suite('T95'); await test('T95: limite 40 partial presentation', async () => { assertEqual(getVisMetrics().classifyExecutivePresentation(40), 'partial', '') });
  suite('T96'); await test('T96: limite 40 developing enterprise viz', async () => { assertEqual(getVisMetrics().classifyEnterpriseVisualizationReadiness(40), 'developing', '') });
  suite('T97'); await test('T97: composição P4.2 enterprise viz', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiEnterpriseVisualizationReadinessService.js'), 'utf8')); assert(code.includes('consumptionReadModel') && !code.includes('getExecutiveVisibility')) });
  suite('T98'); await test('T98: sem dashboard/widget/cockpit', async () => { const files = ['aioiVisualizationReadModelService.js', 'aioiExecutivePresentationService.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('createDashboard') && !code.includes('renderWidget') && !code.includes('buildCockpit'), f); } });
  suite('T99'); await test('T99: domínio governance coverage', async () => { assert(svc.aioiVisualizationCoverageService.VISUALIZATION_COVERAGE_DOMAINS.includes('governance')) });
  suite('T100'); await test('T100: domínio autonomy coverage', async () => { assert(svc.aioiVisualizationCoverageService.VISUALIZATION_COVERAGE_DOMAINS.includes('autonomy')) });
  restoreDb();
  suite('T101'); await test('T101: INSERT bloqueado', async () => { vm = getVisMetrics(); let threw = false; try { vm.assertReadOnlySql('INSERT INTO x VALUES (1)'); } catch (e) { threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', ''); } assert(threw) });
  suite('T102'); await test('T102: UPDATE bloqueado', async () => { vm = getVisMetrics(); let threw = false; try { vm.assertReadOnlySql('UPDATE x SET y=1'); } catch (e) { threw = true; } assert(threw) });
  suite('T103'); await test('T103: DELETE bloqueado', async () => { vm = getVisMetrics(); let threw = false; try { vm.assertReadOnlySql('DELETE FROM x'); } catch (e) { threw = true; } assert(threw) });
  suite('T104'); await test('T104: RLS company_id + bypass false', async () => { await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID); const t = mock._client._calls.find(c => c.sql.includes('app.current_company_id')); const b = mock._client._calls.filter(c => c.sql.includes('app.bypass_rls')); assert(t && t.params[0] === COMPANY_ID); assert(b.length >= 1) });
  suite('T105'); await test('T105: tenant B benchmark only', async () => { const mockB = createReadinessDbMock(buildIoes().map(i => ({ ...i, company_id: COMPANY_ID_B })), buildSnapshots().map(s => ({ ...s, company_id: COMPANY_ID_B }))); patchDb(mockB); _svcCache = null; clearAioiModuleCache(); const svcB = loadP43(); const bench = await svcB.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID_B); assert(bench.ok && bench.benchmark); const t = mockB._client._calls.filter(c => c.sql.includes('app.current_company_id')).find(c => c.params && c.params[0] === COMPANY_ID_B); assert(t, 'RLS tenant B') });
  suite('T106'); await test('T106: recordVisualizationRequested log', async () => { vm = getVisMetrics(); vm.resetSessionCounters(); vm.recordVisualizationRequested(COMPANY_ID); assert(vm.getSessionCounters().visualization_requests === 1) });
  suite('T107'); await test('T107: recordExecutivePresentationAnalyzed log', async () => { vm = getVisMetrics(); vm.recordExecutivePresentationAnalyzed(COMPANY_ID); assert(vm.getSessionCounters().executive_presentation_count >= 1) });
  suite('T108'); await test('T108: recordVisualizationConsistencyAnalyzed log', async () => { vm = getVisMetrics(); vm.recordVisualizationConsistencyAnalyzed(COMPANY_ID); assert(vm.getSessionCounters().visualization_consistency_count >= 1) });
  suite('T109'); await test('T109: recordVisualizationCoverageAnalyzed log', async () => { vm = getVisMetrics(); vm.recordVisualizationCoverageAnalyzed(COMPANY_ID); assert(vm.getSessionCounters().visualization_coverage_count >= 1) });
  suite('T110'); await test('T110: recordEnterpriseVisualizationReadinessAnalyzed log', async () => { vm = getVisMetrics(); vm.recordEnterpriseVisualizationReadinessAnalyzed(COMPANY_ID); assert(vm.getSessionCounters().enterprise_visualization_readiness_count >= 1) });
  suite('T111'); await test('T111: getSessionCounters campos', async () => { vm = getVisMetrics(); vm.resetSessionCounters(); vm.recordEnterpriseVisualizationReadinessAnalyzed(COMPANY_ID); const c = vm.getSessionCounters(); assert(c.enterprise_visualization_readiness_count >= 1 && 'avg_query_latency_ms' in c); assert('visualization_requests' in c && 'executive_presentation_count' in c) });
  suite('T112'); await test('T112: clampScore', async () => { assertEqual(getVisMetrics().clampScore(150), 100, '') });
  suite('T113'); await test('T113: TRUNCATE bloqueado', async () => { vm = getVisMetrics(); let threw = false; try { vm.assertReadOnlySql('TRUNCATE TABLE x'); } catch (e) { threw = true; } assert(threw) });
  suite('T114'); await test('T114: ON CONFLICT bloqueado', async () => { vm = getVisMetrics(); let threw = false; try { vm.assertReadOnlySql('INSERT INTO x VALUES (1) ON CONFLICT DO NOTHING'); } catch (e) { threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', ''); } assert(threw) });
  suite('T115'); await test('T115: MERGE bloqueado', async () => { vm = getVisMetrics(); let threw = false; try { vm.assertReadOnlySql('MERGE INTO x'); } catch (e) { threw = true; } assert(threw) });
  suite('T116'); await test('T116: anti-duplication composição P4.2', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiVisualizationReadModelService.js'), 'utf8')); assert(code.includes('consumptionReadModel') && !code.includes('getExecutivePresentation')); assert(code.includes('buildEnterpriseVisualizationReadiness')) });
  suite('T117'); await test('T117: sem getAutonomyReadModel direto', async () => { const files = ['aioiExecutivePresentationService.js', 'aioiVisualizationConsistencyService.js', 'aioiVisualizationCoverageService.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('getAutonomyReadModel'), f); } });
  suite('T118'); await test('T118: sem getSovereigntyReadModel direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiVisualizationReadModelService.js'), 'utf8')); assert(!code.includes('getSovereigntyReadModel')) });
  suite('T119'); await test('T119: CREATE bloqueado', async () => { vm = getVisMetrics(); let threw = false; try { vm.assertReadOnlySql('CREATE TABLE x (id int)'); } catch (e) { threw = true; } assert(threw) });
  suite('T120'); await test('T120: GRANT bloqueado', async () => { vm = getVisMetrics(); let threw = false; try { vm.assertReadOnlySql('GRANT ALL ON x TO y'); } catch (e) { threw = true; } assert(threw) });
  suite('T121'); await test('T121: soberanos ausentes P4.3', async () => { const files = ['aioiVisualizationMetrics.js', 'aioiExecutivePresentationService.js', 'aioiVisualizationConsistencyService.js', 'aioiVisualizationCoverageService.js', 'aioiEnterpriseVisualizationReadinessService.js', 'aioiVisualizationReadModelService.js']; const forbidden = ['operationalDecisionEngine', 'operationalLearningService', 'workflowOrchestrator', 'actionRuntimeOrchestrator', 'computePriorityScore', 'classificationConsumer', 'aioiOutboxConsumerService']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); for (const bad of forbidden) assert(!code.includes(bad), `${f} contém ${bad}`); } });
  suite('T122'); await test('T122: sem fan-out getConsumptionReadModel', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiVisualizationReadModelService.js'), 'utf8')); assertEqual((code.match(/getConsumptionReadModel/g) || []).length, 1, 'no fan-out') });
  suite('T123'); await test('T123: sem getConformanceReadModel direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiVisualizationReadModelService.js'), 'utf8')); assert(!code.includes('getConformanceReadModel')) });
  suite('T124'); await test('T124: domínio certification coverage', async () => { assert(svc.aioiVisualizationCoverageService.VISUALIZATION_COVERAGE_DOMAINS.includes('certification')) });
  suite('T125'); await test('T125: pilares incluem governance_excellence', async () => { assert(svc.aioiExecutivePresentationService.PRESENTATION_PILLARS.includes('governance_excellence')) });
  suite('T126'); await test('T126: REVOKE bloqueado', async () => { vm = getVisMetrics(); let threw = false; try { vm.assertReadOnlySql('REVOKE ALL ON x FROM y'); } catch (e) { threw = true; } assert(threw) });
  suite('T127'); await test('T127: sem getCertificationReadModel direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiVisualizationReadModelService.js'), 'utf8')); assert(!code.includes('getCertificationReadModel')) });
  suite('T128'); await test('T128: limite 40 partial coverage', async () => { assertEqual(getVisMetrics().classifyVisualizationCoverage(40), 'partial', '') });
  suite('T129'); await test('T129: _extractVisualizationSignals certification', async () => { assertEqual(getVisMetrics()._extractVisualizationSignals(SAMPLE_CONS_RM).certificationScore, 86, '') });
  suite('T130'); await test('T130: estágio governance_excellence index 8', async () => { assertEqual(svc.aioiVisualizationConsistencyService.VISUALIZATION_CONSISTENCY_STAGES[8], 'governance_excellence', '') });
  suite('T131'); await test('T131: domínio conformance coverage', async () => { assert(svc.aioiVisualizationCoverageService.VISUALIZATION_COVERAGE_DOMAINS.includes('conformance')) });
  suite('T132'); await test('T132: regressão P4.2 consumption read model intacto', async () => { const r = await getCachedVis(); assert(r.visualization_read_model.consumption_read_model.executive_visibility) });
  suite('T133'); await test('T133: regressão P4.2 enterprise consumption', async () => { const r = await getCachedVis(); assert(r.visualization_read_model.consumption_read_model.enterprise_consumption.consumption_level) });
  suite('T134'); await test('T134: sem getSustainabilityReadModel direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiVisualizationReadModelService.js'), 'utf8')); assert(!code.includes('getSustainabilityReadModel')) });
  suite('T135'); await test('T135: domínio institutionalization coverage', async () => { assert(svc.aioiVisualizationCoverageService.VISUALIZATION_COVERAGE_DOMAINS.includes('institutionalization')) });
  suite('T136'); await test('T136: recordVisualizationCompleted log', async () => { vm = getVisMetrics(); vm.recordVisualizationCompleted(COMPANY_ID, 50); assert(vm.getSessionCounters().avg_query_latency_ms === 50) });
  suite('T137'); await test('T137: domínio governance_excellence coverage', async () => { assert(svc.aioiVisualizationCoverageService.VISUALIZATION_COVERAGE_DOMAINS.includes('governance_excellence')) });
  suite('T138'); await test('T138: pilares incluem institutionalization', async () => { assert(svc.aioiExecutivePresentationService.PRESENTATION_PILLARS.includes('institutionalization')) });
  suite('T139'); await test('T139: sem execução operacional P4.3', async () => { const files = ['aioiVisualizationReadModelService.js', 'aioiEnterpriseVisualizationReadinessService.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('executeDecision') && !code.includes('runWorkflow'), f); } });
  suite('T140'); await test('T140: sem scoring novo P4.3', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiVisualizationMetrics.js'), 'utf8')); assert(!code.includes('computePriorityScore') && !code.includes('mlModel')) });
  suite('T141'); await test('T141: visualization layer read only', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiVisualizationReadModelService.js'), 'utf8')); assert(code.includes('consumptionReadModel') && !code.includes('INSERT') && !code.includes('UPDATE')) });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`AIOI-P4.3 Visualization Tests: ${_passed} passed, ${_failed} failed`);
  console.log(`${'='.repeat(60)}`);
  if (_failed === 0) {
    console.log('\nAIOI_P4_3_ENTERPRISE_INTELLIGENCE_VISUALIZATION_READINESS_PASS\n');
  } else {
    process.exitCode = 1;
  }
}

runTests().catch(err => {
  console.error('FATAL:', err);
  process.exitCode = 1;
});
