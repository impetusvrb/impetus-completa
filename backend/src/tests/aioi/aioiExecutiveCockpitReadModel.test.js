'use strict';

/**
 * AIOI-P4.4 — Testes automatizados da Enterprise Executive Cockpit Read Model Layer
 * T1–T146 | node src/tests/aioi/aioiExecutiveCockpitReadModel.test.js
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

const P44_EXPORTS = [
  'aioiVisualizationReadModelService', 'aioiCockpitMetrics',
  'aioiExecutiveSummaryService', 'aioiStrategicOverviewService',
  'aioiEnterpriseCockpitReadinessService', 'aioiExecutiveCockpitReadModelService',
  'aioiBenchmarkAnalysisService'
];

function clearAioiModuleCache() {
  for (const key of Object.keys(require.cache)) {
    if (key.includes('/services/aioi/')) delete require.cache[key];
  }
}

let _svcCache = null;

function loadP44() {
  if (_svcCache) return _svcCache;
  const loaded = {};
  for (const mod of P44_EXPORTS) {
    loaded[mod] = require(`${SERVICES_PATH}/${mod}`);
  }
  _svcCache = loaded;
  return loaded;
}

function reloadP44() {
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
    'aioiAutonomyReadModelService', 'aioiConsumptionReadModelService',
    'aioiVisualizationReadModelService'
  ];
  for (const mod of chainPreload) require(`${SERVICES_PATH}/${mod}`);
  return loadP44();
}

function getCockpitMetrics() {
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiCockpitMetrics`)];
  if (_svcCache) delete _svcCache.aioiCockpitMetrics;
  const m = require(`${SERVICES_PATH}/aioiCockpitMetrics`);
  if (_svcCache) _svcCache.aioiCockpitMetrics = m;
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


const SAMPLE_VRM = {
  consumption_read_model: SAMPLE_CONS_RM,
  executive_presentation: { presentation_score: 84, presentation_status: 'presentation_ready' },
  visualization_consistency: { consistency_score: 85, consistency_status: 'consistent' },
  visualization_coverage: { coverage_score: 96, coverage_status: 'comprehensive' },
  enterprise_visualization_readiness: { visualization_score: 87, visualization_level: 'visualization_ready' }
};

const EMPTY_VRM = {
  consumption_read_model: EMPTY_CONS_RM,
  executive_presentation: { presentation_score: 30, presentation_status: 'fragmented' },
  visualization_consistency: { consistency_score: 25, consistency_status: 'inconsistent' },
  visualization_coverage: { coverage_score: 20, coverage_status: 'limited' },
  enterprise_visualization_readiness: { visualization_score: 30, visualization_level: 'emerging' }
};

const PARTIAL_VRM_TRUST = {
  consumption_read_model: PARTIAL_TRUST_ONLY,
  executive_presentation: { presentation_score: 40, presentation_status: 'partial' },
  visualization_consistency: { consistency_score: 35, consistency_status: 'partial' },
  visualization_coverage: { coverage_score: 30, coverage_status: 'limited' },
  enterprise_visualization_readiness: { visualization_score: 35, visualization_level: 'emerging' }
};

const PARTIAL_VRM_TRUST_80 = {
  consumption_read_model: PARTIAL_TRUST_80,
  executive_presentation: { presentation_score: 45, presentation_status: 'partial' },
  visualization_consistency: { consistency_score: 40, consistency_status: 'partial' },
  visualization_coverage: { coverage_score: 35, coverage_status: 'limited' },
  enterprise_visualization_readiness: { visualization_score: 40, visualization_level: 'developing' }
};

async function runTests() {
  let cm = getCockpitMetrics();
  cm.resetSessionCounters();
  const mock = createReadinessDbMock();
  patchDb(mock);
  const svc = reloadP44();
  let cachedCockpit = null;
  async function getCachedCockpit() {
    if (!cachedCockpit) {
      cachedCockpit = await svc.aioiExecutiveCockpitReadModelService.getExecutiveCockpitReadModel(COMPANY_ID);
    }
    return cachedCockpit;
  }

  suite('T1'); await test('T1: classifyExecutiveSummary summary_ready', async () => { assertEqual(getCockpitMetrics().classifyExecutiveSummary(80), 'summary_ready', '') });
  suite('T2'); await test('T2: classifyExecutiveSummary partial', async () => { assertEqual(getCockpitMetrics().classifyExecutiveSummary(55), 'partial', '') });
  suite('T3'); await test('T3: classifyExecutiveSummary limited', async () => { assertEqual(getCockpitMetrics().classifyExecutiveSummary(30), 'limited', '') });
  suite('T4'); await test('T4: SUMMARY_PILLARS 10', async () => { assertEqual(svc.aioiExecutiveSummaryService.SUMMARY_PILLARS.length, 10, '') });
  suite('T5'); await test('T5: buildExecutiveSummary', async () => { const r = svc.aioiExecutiveSummaryService.buildExecutiveSummary(SAMPLE_VRM); assert(r.summary_score >= 70 && r.summary_status === 'summary_ready') });
  suite('T6'); await test('T6: computeExecutiveSummaryScore range', async () => { const s = svc.aioiExecutiveSummaryService.computeExecutiveSummaryScore(SAMPLE_VRM); assert(s >= 0 && s <= 100) });
  suite('T7'); await test('T7: getExecutiveSummary via read model', async () => { const r = await getCachedCockpit(); assert(r.ok && r.executive_cockpit_read_model.executive_summary.summary_status) });
  suite('T8'); await test('T8: companyId inválido summary', async () => { const r = await svc.aioiExecutiveSummaryService.getExecutiveSummary('bad'); assert(!r.ok) });
  suite('T9'); await test('T9: composição P4.3 visualizationReadModel', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiExecutiveSummaryService.js'), 'utf8')); assert(code.includes('visualizationReadModel') && !code.includes('getConsumptionReadModel')) });
  suite('T10'); await test('T10: determinístico summary', async () => { assertEqual(svc.aioiExecutiveSummaryService.computeExecutiveSummaryScore(SAMPLE_VRM), svc.aioiExecutiveSummaryService.computeExecutiveSummaryScore(SAMPLE_VRM), '') });
  suite('T11'); await test('T11: recordExecutiveSummaryAnalyzed', async () => { cm = getCockpitMetrics(); cm.resetSessionCounters(); cm.recordExecutiveSummaryAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().executive_summary_count >= 1) });
  suite('T12'); await test('T12: zero writes summary path', async () => { await getCachedCockpit(); assertNoWrites(mock._client._calls) });
  suite('T13'); await test('T13: limite 70 summary_ready', async () => { assertEqual(getCockpitMetrics().classifyExecutiveSummary(70), 'summary_ready', '') });
  suite('T14'); await test('T14: empty vrm score baixo', async () => { assert(svc.aioiExecutiveSummaryService.computeExecutiveSummaryScore(EMPTY_VRM) <= 40) });
  suite('T15'); await test('T15: status permitidos summary', async () => { const allowed = ['limited', 'partial', 'summary_ready']; for (const s of [80, 50, 20]) assert(allowed.includes(getCockpitMetrics().classifyExecutiveSummary(s))) });
  suite('T16'); await test('T16: _extractCockpitSignals trust', async () => { assertEqual(getCockpitMetrics()._extractCockpitSignals(SAMPLE_VRM).trustScore, 80, '') });
  suite('T17'); await test('T17: _extractCockpitSignals visualization readiness', async () => { assertEqual(getCockpitMetrics()._extractCockpitSignals(SAMPLE_VRM).visualizationReadinessScore, 87, '') });
  suite('T18'); await test('T18: _extractCockpitSignals consumption', async () => { assertEqual(getCockpitMetrics()._extractCockpitSignals(SAMPLE_VRM).consumptionScore, 86, '') });
  suite('T19'); await test('T19: pilares incluem visualization_readiness', async () => { assert(svc.aioiExecutiveSummaryService.SUMMARY_PILLARS.includes('visualization_readiness')) });
  suite('T20'); await test('T20: buildExecutiveSummary campos', async () => { const r = svc.aioiExecutiveSummaryService.buildExecutiveSummary(SAMPLE_VRM); assert('summary_score' in r && 'summary_status' in r) });
  suite('T21'); await test('T21: pilares incluem governance_excellence', async () => { assert(svc.aioiExecutiveSummaryService.SUMMARY_PILLARS.includes('governance_excellence')) });
  suite('T22'); await test('T22: pilares incluem autonomy', async () => { assert(svc.aioiExecutiveSummaryService.SUMMARY_PILLARS.includes('autonomy')) });
  suite('T23'); await test('T23: classifyStrategicOverview overview_ready', async () => { assertEqual(getCockpitMetrics().classifyStrategicOverview(80), 'overview_ready', '') });
  suite('T24'); await test('T24: classifyStrategicOverview partial', async () => { assertEqual(getCockpitMetrics().classifyStrategicOverview(55), 'partial', '') });
  suite('T25'); await test('T25: classifyStrategicOverview limited', async () => { assertEqual(getCockpitMetrics().classifyStrategicOverview(30), 'limited', '') });
  suite('T26'); await test('T26: STRATEGIC_OVERVIEW_STAGES 14', async () => { assertEqual(svc.aioiStrategicOverviewService.STRATEGIC_OVERVIEW_STAGES.length, 14, '') });
  suite('T27'); await test('T27: buildStrategicOverview', async () => { const r = svc.aioiStrategicOverviewService.buildStrategicOverview(SAMPLE_VRM); assert(r.overview_score >= 70 && r.overview_status === 'overview_ready') });
  suite('T28'); await test('T28: computeStrategicOverviewScore range', async () => { const s = svc.aioiStrategicOverviewService.computeStrategicOverviewScore(SAMPLE_VRM); assert(s >= 0 && s <= 100) });
  suite('T29'); await test('T29: getStrategicOverview ok', async () => { const r = await svc.aioiStrategicOverviewService.getStrategicOverview(COMPANY_ID); assert(r.ok && r.strategic_overview.overview_status) });
  suite('T30'); await test('T30: companyId inválido overview', async () => { const r = await svc.aioiStrategicOverviewService.getStrategicOverview('x'); assert(!r.ok) });
  suite('T31'); await test('T31: empty vrm overview baixo', async () => { assert(svc.aioiStrategicOverviewService.computeStrategicOverviewScore(EMPTY_VRM) <= 40) });
  suite('T32'); await test('T32: recordStrategicOverviewAnalyzed', async () => { cm = getCockpitMetrics(); cm.recordStrategicOverviewAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().strategic_overview_count >= 1) });
  suite('T33'); await test('T33: zero writes overview', async () => { assertNoWrites(mock._client._calls) });
  suite('T34'); await test('T34: limite 70 overview_ready', async () => { assertEqual(getCockpitMetrics().classifyStrategicOverview(70), 'overview_ready', '') });
  suite('T35'); await test('T35: determinístico overview', async () => { assertEqual(svc.aioiStrategicOverviewService.computeStrategicOverviewScore(SAMPLE_VRM), svc.aioiStrategicOverviewService.computeStrategicOverviewScore(SAMPLE_VRM), '') });
  suite('T36'); await test('T36: cadeia trust→visualization_readiness', async () => { const stages = svc.aioiStrategicOverviewService.STRATEGIC_OVERVIEW_STAGES; assertEqual(stages[0], 'trust', ''); assertEqual(stages[13], 'visualization_readiness', '') });
  suite('T37'); await test('T37: status permitidos overview', async () => { const allowed = ['limited', 'partial', 'overview_ready']; for (const s of [80, 50, 20]) assert(allowed.includes(getCockpitMetrics().classifyStrategicOverview(s))) });
  suite('T38'); await test('T38: composição P4.3 overview', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiStrategicOverviewService.js'), 'utf8')); assert(code.includes('visualizationReadModel')) });
  suite('T39'); await test('T39: partial vrm só trust', async () => { assert(svc.aioiStrategicOverviewService.computeStrategicOverviewScore(PARTIAL_VRM_TRUST) < 70) });
  suite('T40'); await test('T40: full vs partial overview', async () => { const full = svc.aioiStrategicOverviewService.computeStrategicOverviewScore(SAMPLE_VRM); const partial = svc.aioiStrategicOverviewService.computeStrategicOverviewScore(PARTIAL_VRM_TRUST_80); assert(full > partial) });
  suite('T41'); await test('T41: limite 40 partial overview', async () => { assertEqual(getCockpitMetrics().classifyStrategicOverview(40), 'partial', '') });
  suite('T42'); await test('T42: buildStrategicOverview campos', async () => { const r = svc.aioiStrategicOverviewService.buildStrategicOverview(SAMPLE_VRM); assert('overview_score' in r && 'overview_status' in r) });
  suite('T43'); await test('T43: estágio consumption index 12', async () => { assertEqual(svc.aioiStrategicOverviewService.STRATEGIC_OVERVIEW_STAGES[12], 'consumption', '') });
  suite('T44'); await test('T44: estágio visualization_readiness index 13', async () => { assertEqual(svc.aioiStrategicOverviewService.STRATEGIC_OVERVIEW_STAGES[13], 'visualization_readiness', '') });
  suite('T45'); await test('T45: classifyEnterpriseCockpitReadiness cockpit_ready', async () => { assertEqual(getCockpitMetrics().classifyEnterpriseCockpitReadiness(92), 'cockpit_ready', '') });
  suite('T46'); await test('T46: classifyEnterpriseCockpitReadiness executive_ready', async () => { assertEqual(getCockpitMetrics().classifyEnterpriseCockpitReadiness(75), 'executive_ready', '') });
  suite('T47'); await test('T47: classifyEnterpriseCockpitReadiness developing', async () => { assertEqual(getCockpitMetrics().classifyEnterpriseCockpitReadiness(55), 'developing', '') });
  suite('T48'); await test('T48: classifyEnterpriseCockpitReadiness emerging', async () => { assertEqual(getCockpitMetrics().classifyEnterpriseCockpitReadiness(30), 'emerging', '') });
  suite('T49'); await test('T49: ENTERPRISE_COCKPIT_WEIGHTS 0.25', async () => { const w = svc.aioiEnterpriseCockpitReadinessService.ENTERPRISE_COCKPIT_WEIGHTS; assertEqual(w.executiveSummary, 0.25, ''); assertEqual(w.strategicOverview, 0.25, ''); assertEqual(w.visualizationCoverage, 0.25, ''); assertEqual(w.visualizationReadiness, 0.25, '') });
  suite('T50'); await test('T50: buildEnterpriseCockpitReadiness', async () => { const r = svc.aioiEnterpriseCockpitReadinessService.buildEnterpriseCockpitReadiness({ summaryScore: 80, overviewScore: 85, visualizationCoverageScore: 82, visualizationReadinessScore: 83 }); assert(r.cockpit_score >= 70 && r.cockpit_level) });
  suite('T51'); await test('T51: computeEnterpriseCockpitReadinessScore range', async () => { const s = svc.aioiEnterpriseCockpitReadinessService.computeEnterpriseCockpitReadinessScore({ summaryScore: 80, overviewScore: 80, visualizationCoverageScore: 80, visualizationReadinessScore: 80 }); assert(s >= 0 && s <= 100) });
  suite('T52'); await test('T52: getEnterpriseCockpitReadiness ok', async () => { const r = await svc.aioiEnterpriseCockpitReadinessService.getEnterpriseCockpitReadiness(COMPANY_ID); assert(r.ok && r.enterprise_cockpit_readiness.cockpit_level) });
  suite('T53'); await test('T53: companyId inválido cockpit readiness', async () => { const r = await svc.aioiEnterpriseCockpitReadinessService.getEnterpriseCockpitReadiness('bad-id'); assert(!r.ok) });
  suite('T54'); await test('T54: recordEnterpriseCockpitReadinessAnalyzed', async () => { cm = getCockpitMetrics(); cm.recordEnterpriseCockpitReadinessAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().enterprise_cockpit_readiness_count >= 1) });
  suite('T55'); await test('T55: zero writes cockpit readiness', async () => { assertNoWrites(mock._client._calls) });
  suite('T56'); await test('T56: limite 90 cockpit_ready', async () => { assertEqual(getCockpitMetrics().classifyEnterpriseCockpitReadiness(90), 'cockpit_ready', '') });
  suite('T57'); await test('T57: determinístico cockpit readiness', async () => { const inp = { summaryScore: 80, overviewScore: 75, visualizationCoverageScore: 82, visualizationReadinessScore: 78 }; assertEqual(svc.aioiEnterpriseCockpitReadinessService.computeEnterpriseCockpitReadinessScore(inp), svc.aioiEnterpriseCockpitReadinessService.computeEnterpriseCockpitReadinessScore(inp), '') });
  suite('T58'); await test('T58: pesos iguais soma ponderada', async () => { assertEqual(svc.aioiEnterpriseCockpitReadinessService.computeEnterpriseCockpitReadinessScore({ summaryScore: 100, overviewScore: 100, visualizationCoverageScore: 100, visualizationReadinessScore: 100 }), 100, '') });
  suite('T59'); await test('T59: níveis permitidos cockpit', async () => { const allowed = ['emerging', 'developing', 'executive_ready', 'cockpit_ready']; for (const s of [30, 55, 75, 92]) assert(allowed.includes(getCockpitMetrics().classifyEnterpriseCockpitReadiness(s))) });
  suite('T60'); await test('T60: getExecutiveCockpitReadModel ok', async () => { const r = await getCachedCockpit(); assert(r.ok && r.executive_cockpit_read_model) });
  suite('T61'); await test('T61: estrutura obrigatória read model', async () => { const r = await getCachedCockpit(); const ecrm = r.executive_cockpit_read_model; assert(ecrm.visualization_read_model && ecrm.executive_summary && ecrm.strategic_overview && ecrm.enterprise_cockpit_readiness) });
  suite('T62'); await test('T62: companyId inválido read model', async () => { const r = await svc.aioiExecutiveCockpitReadModelService.getExecutiveCockpitReadModel('invalid'); assert(!r.ok) });
  suite('T63'); await test('T63: anti-duplication build* local', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiExecutiveCockpitReadModelService.js'), 'utf8')); assert(code.includes('buildExecutiveSummary') && code.includes('buildStrategicOverview')); assert(!code.includes('getExecutiveSummary(') && !code.includes('getStrategicOverview(')) });
  suite('T64'); await test('T64: getVisualizationReadModel uma vez', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiExecutiveCockpitReadModelService.js'), 'utf8')); assertEqual((code.match(/getVisualizationReadModel/g) || []).length, 1, 'single vrm call') });
  suite('T65'); await test('T65: sem LLM/IA P4.4', async () => { const files = ['aioiExecutiveSummaryService.js', 'aioiStrategicOverviewService.js', 'aioiEnterpriseCockpitReadinessService.js', 'aioiExecutiveCockpitReadModelService.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('openai') && !code.includes('generateText'), f); } });
  suite('T66'); await test('T66: sem forecast novo', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiExecutiveCockpitReadModelService.js'), 'utf8')); assert(!code.includes('getBacklogForecast') && !code.includes('BacklogForecast')) });
  suite('T67'); await test('T67: Promise.all agregador', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiExecutiveCockpitReadModelService.js'), 'utf8')); assert(code.includes('Promise.all')) });
  suite('T68'); await test('T68: visualization_read_model nested', async () => { const r = await getCachedCockpit(); assert(r.executive_cockpit_read_model.visualization_read_model.consumption_read_model) });
  suite('T69'); await test('T69: executive_summary campos', async () => { const r = await getCachedCockpit(); const es = r.executive_cockpit_read_model.executive_summary; assert('summary_score' in es && 'summary_status' in es) });
  suite('T70'); await test('T70: strategic_overview campos', async () => { const r = await getCachedCockpit(); const so = r.executive_cockpit_read_model.strategic_overview; assert('overview_score' in so && 'overview_status' in so) });
  suite('T71'); await test('T71: enterprise_cockpit_readiness campos', async () => { const r = await getCachedCockpit(); const ecr = r.executive_cockpit_read_model.enterprise_cockpit_readiness; assert('cockpit_score' in ecr && 'cockpit_level' in ecr) });
  suite('T72'); await test('T72: composição exclusiva P4.3', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiExecutiveCockpitReadModelService.js'), 'utf8')); assert(code.includes('visualizationReadModel') && !code.includes('getConsumptionReadModel')) });
  suite('T73'); await test('T73: recordCockpitRequested/Completed', async () => { cm = getCockpitMetrics(); if (_svcCache) _svcCache.aioiCockpitMetrics = cm; cm.resetSessionCounters(); cm.recordCockpitRequested(COMPANY_ID); cm.recordCockpitCompleted(COMPANY_ID, 42); const c = cm.getSessionCounters(); assertEqual(c.cockpit_requests, 1, ''); assertEqual(c.avg_query_latency_ms, 42, '') });
  suite('T74'); await test('T74: enterprise_cockpit_readiness composto', async () => { const r = await getCachedCockpit(); const ecr = r.executive_cockpit_read_model.enterprise_cockpit_readiness; assert(ecr.cockpit_score >= 0 && ecr.cockpit_level) });
  suite('T75'); await test('T75: visualization_coverage via vrm nested', async () => { const r = await getCachedCockpit(); assert(r.executive_cockpit_read_model.visualization_read_model.visualization_coverage) });
  suite('T76'); await test('T76: determinístico read model scores', async () => { const r1 = svc.aioiExecutiveSummaryService.buildExecutiveSummary(SAMPLE_VRM); const r2 = svc.aioiExecutiveSummaryService.buildExecutiveSummary(SAMPLE_VRM); assertEqual(r1.summary_score, r2.summary_score, '') });
  suite('T77'); await test('T77: 10 pilares summary full sample', async () => { assert(svc.aioiExecutiveSummaryService.computeExecutiveSummaryScore(SAMPLE_VRM) >= 70) });
  suite('T78'); await test('T78: 14 estágios overview full sample', async () => { assert(svc.aioiStrategicOverviewService.computeStrategicOverviewScore(SAMPLE_VRM) >= 70) });
  suite('T79'); await test('T79: _extractCockpitSignals governance excellence', async () => { assertEqual(getCockpitMetrics()._extractCockpitSignals(SAMPLE_VRM).governanceExcellenceScore, 84, '') });
  suite('T80'); await test('T80: limite 40 partial summary', async () => { assertEqual(getCockpitMetrics().classifyExecutiveSummary(40), 'partial', '') });
  suite('T81'); await test('T81: limite 40 developing cockpit', async () => { assertEqual(getCockpitMetrics().classifyEnterpriseCockpitReadiness(40), 'developing', '') });
  suite('T82'); await test('T82: composição P4.3 cockpit readiness', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiEnterpriseCockpitReadinessService.js'), 'utf8')); assert(code.includes('visualizationReadModel') && !code.includes('getExecutivePresentation')) });
  suite('T83'); await test('T83: sem dashboard/widget/react', async () => { const files = ['aioiExecutiveCockpitReadModelService.js', 'aioiExecutiveSummaryService.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('createDashboard') && !code.includes('renderWidget') && !code.includes('React') && !code.includes('buildCockpitUI'), f); } });
  suite('T84'); await test('T84: sem cockpit visual', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiExecutiveCockpitReadModelService.js'), 'utf8')); assert(!code.includes('renderChart') && !code.includes('Chart.js')) });
  suite('T85'); await test('T85: _extractCockpitSignals visualization coverage', async () => { assertEqual(getCockpitMetrics()._extractCockpitSignals(SAMPLE_VRM).visualizationCoverageScore, 96, '') });
  suite('T86'); await test('T86: pilares incluem consumption', async () => { assert(svc.aioiExecutiveSummaryService.SUMMARY_PILLARS.includes('consumption')) });
  suite('T87'); await test('T87: estágio governance_excellence index 8', async () => { assertEqual(svc.aioiStrategicOverviewService.STRATEGIC_OVERVIEW_STAGES[8], 'governance_excellence', '') });
  suite('T88'); await test('T88: estágio sovereignty index 10', async () => { assertEqual(svc.aioiStrategicOverviewService.STRATEGIC_OVERVIEW_STAGES[10], 'sovereignty', '') });
  suite('T89'); await test('T89: enterprise_visualization_readiness nested', async () => { const r = await getCachedCockpit(); assert(r.executive_cockpit_read_model.visualization_read_model.enterprise_visualization_readiness) });
  suite('T90'); await test('T90: cockpit_level executive_ready ou superior', async () => { const r = await getCachedCockpit(); assert(['executive_ready', 'cockpit_ready'].includes(r.executive_cockpit_read_model.enterprise_cockpit_readiness.cockpit_level)) });
  suite('T91'); await test('T91: INSERT bloqueado', async () => { cm = getCockpitMetrics(); let threw = false; try { cm.assertReadOnlySql('INSERT INTO x VALUES (1)'); } catch (e) { threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', ''); } assert(threw) });
  suite('T92'); await test('T92: UPDATE bloqueado', async () => { cm = getCockpitMetrics(); let threw = false; try { cm.assertReadOnlySql('UPDATE x SET y=1'); } catch (e) { threw = true; } assert(threw) });
  suite('T93'); await test('T93: DELETE bloqueado', async () => { cm = getCockpitMetrics(); let threw = false; try { cm.assertReadOnlySql('DELETE FROM x'); } catch (e) { threw = true; } assert(threw) });
  suite('T94'); await test('T94: RLS company_id + bypass false', async () => { await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID); const t = mock._client._calls.find(c => c.sql.includes('app.current_company_id')); const b = mock._client._calls.filter(c => c.sql.includes('app.bypass_rls')); assert(t && t.params[0] === COMPANY_ID); assert(b.length >= 1) });
  suite('T95'); await test('T95: tenant B benchmark only', async () => { const mockB = createReadinessDbMock(buildIoes().map(i => ({ ...i, company_id: COMPANY_ID_B })), buildSnapshots().map(s => ({ ...s, company_id: COMPANY_ID_B }))); patchDb(mockB); _svcCache = null; clearAioiModuleCache(); const svcB = loadP44(); const bench = await svcB.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID_B); assert(bench.ok && bench.benchmark); const t = mockB._client._calls.filter(c => c.sql.includes('app.current_company_id')).find(c => c.params && c.params[0] === COMPANY_ID_B); assert(t, 'RLS tenant B') });
  suite('T96'); await test('T96: recordCockpitRequested log', async () => { cm = getCockpitMetrics(); cm.resetSessionCounters(); cm.recordCockpitRequested(COMPANY_ID); assert(cm.getSessionCounters().cockpit_requests === 1) });
  suite('T97'); await test('T97: recordExecutiveSummaryAnalyzed log', async () => { cm = getCockpitMetrics(); cm.recordExecutiveSummaryAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().executive_summary_count >= 1) });
  suite('T98'); await test('T98: recordStrategicOverviewAnalyzed log', async () => { cm = getCockpitMetrics(); cm.recordStrategicOverviewAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().strategic_overview_count >= 1) });
  suite('T99'); await test('T99: recordEnterpriseCockpitReadinessAnalyzed log', async () => { cm = getCockpitMetrics(); cm.recordEnterpriseCockpitReadinessAnalyzed(COMPANY_ID); assert(cm.getSessionCounters().enterprise_cockpit_readiness_count >= 1) });
  suite('T100'); await test('T100: getSessionCounters campos', async () => { cm = getCockpitMetrics(); cm.resetSessionCounters(); cm.recordEnterpriseCockpitReadinessAnalyzed(COMPANY_ID); const c = cm.getSessionCounters(); assert(c.enterprise_cockpit_readiness_count >= 1 && 'avg_query_latency_ms' in c); assert('cockpit_requests' in c && 'executive_summary_count' in c) });
  restoreDb();
  suite('T101'); await test('T101: clampScore', async () => { assertEqual(getCockpitMetrics().clampScore(150), 100, '') });
  suite('T102'); await test('T102: TRUNCATE bloqueado', async () => { cm = getCockpitMetrics(); let threw = false; try { cm.assertReadOnlySql('TRUNCATE TABLE x'); } catch (e) { threw = true; } assert(threw) });
  suite('T103'); await test('T103: ON CONFLICT bloqueado', async () => { cm = getCockpitMetrics(); let threw = false; try { cm.assertReadOnlySql('INSERT INTO x VALUES (1) ON CONFLICT DO NOTHING'); } catch (e) { threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', ''); } assert(threw) });
  suite('T104'); await test('T104: MERGE bloqueado', async () => { cm = getCockpitMetrics(); let threw = false; try { cm.assertReadOnlySql('MERGE INTO x'); } catch (e) { threw = true; } assert(threw) });
  suite('T105'); await test('T105: anti-duplication composição P4.3', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiExecutiveCockpitReadModelService.js'), 'utf8')); assert(code.includes('visualizationReadModel') && !code.includes('getExecutiveSummary')); assert(code.includes('buildEnterpriseCockpitReadiness')) });
  suite('T106'); await test('T106: sem getConsumptionReadModel direto', async () => { const files = ['aioiExecutiveSummaryService.js', 'aioiStrategicOverviewService.js', 'aioiEnterpriseCockpitReadinessService.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('getConsumptionReadModel'), f); } });
  suite('T107'); await test('T107: sem getAutonomyReadModel direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiExecutiveCockpitReadModelService.js'), 'utf8')); assert(!code.includes('getAutonomyReadModel')) });
  suite('T108'); await test('T108: CREATE bloqueado', async () => { cm = getCockpitMetrics(); let threw = false; try { cm.assertReadOnlySql('CREATE TABLE x (id int)'); } catch (e) { threw = true; } assert(threw) });
  suite('T109'); await test('T109: GRANT bloqueado', async () => { cm = getCockpitMetrics(); let threw = false; try { cm.assertReadOnlySql('GRANT ALL ON x TO y'); } catch (e) { threw = true; } assert(threw) });
  suite('T110'); await test('T110: soberanos ausentes P4.4', async () => { const files = ['aioiCockpitMetrics.js', 'aioiExecutiveSummaryService.js', 'aioiStrategicOverviewService.js', 'aioiEnterpriseCockpitReadinessService.js', 'aioiExecutiveCockpitReadModelService.js']; const forbidden = ['operationalDecisionEngine', 'operationalLearningService', 'workflowOrchestrator', 'actionRuntimeOrchestrator', 'computePriorityScore', 'classificationConsumer', 'aioiOutboxConsumerService']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); for (const bad of forbidden) assert(!code.includes(bad), `${f} contém ${bad}`); } });
  suite('T111'); await test('T111: sem fan-out getVisualizationReadModel', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiExecutiveCockpitReadModelService.js'), 'utf8')); assertEqual((code.match(/getVisualizationReadModel/g) || []).length, 1, 'no fan-out') });
  suite('T112'); await test('T112: sem getConformanceReadModel direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiExecutiveCockpitReadModelService.js'), 'utf8')); assert(!code.includes('getConformanceReadModel')) });
  suite('T113'); await test('T113: pilares incluem institutionalization', async () => { assert(svc.aioiExecutiveSummaryService.SUMMARY_PILLARS.includes('institutionalization')) });
  suite('T114'); await test('T114: REVOKE bloqueado', async () => { cm = getCockpitMetrics(); let threw = false; try { cm.assertReadOnlySql('REVOKE ALL ON x FROM y'); } catch (e) { threw = true; } assert(threw) });
  suite('T115'); await test('T115: sem getCertificationReadModel direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiExecutiveCockpitReadModelService.js'), 'utf8')); assert(!code.includes('getCertificationReadModel')) });
  suite('T116'); await test('T116: _extractCockpitSignals certification', async () => { assertEqual(getCockpitMetrics()._extractCockpitSignals(SAMPLE_VRM).certificationScore, 86, '') });
  suite('T117'); await test('T117: estágio certification index 6', async () => { assertEqual(svc.aioiStrategicOverviewService.STRATEGIC_OVERVIEW_STAGES[6], 'certification', '') });
  suite('T118'); await test('T118: regressão P4.3 visualization read model intacto', async () => { const r = await getCachedCockpit(); assert(r.executive_cockpit_read_model.visualization_read_model.executive_presentation) });
  suite('T119'); await test('T119: regressão P4.3 enterprise visualization readiness', async () => { const r = await getCachedCockpit(); assert(r.executive_cockpit_read_model.visualization_read_model.enterprise_visualization_readiness.visualization_level) });
  suite('T120'); await test('T120: sem getSustainabilityReadModel direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiExecutiveCockpitReadModelService.js'), 'utf8')); assert(!code.includes('getSustainabilityReadModel')) });
  suite('T121'); await test('T121: recordCockpitCompleted log', async () => { cm = getCockpitMetrics(); cm.recordCockpitCompleted(COMPANY_ID, 50); assert(cm.getSessionCounters().avg_query_latency_ms === 50) });
  suite('T122'); await test('T122: pilares incluem sovereignty', async () => { assert(svc.aioiExecutiveSummaryService.SUMMARY_PILLARS.includes('sovereignty')) });
  suite('T123'); await test('T123: sem execução operacional P4.4', async () => { const files = ['aioiExecutiveCockpitReadModelService.js', 'aioiEnterpriseCockpitReadinessService.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('executeDecision') && !code.includes('runWorkflow'), f); } });
  suite('T124'); await test('T124: sem scoring novo P4.4', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiCockpitMetrics.js'), 'utf8')); assert(!code.includes('computePriorityScore') && !code.includes('mlModel')) });
  suite('T125'); await test('T125: cockpit layer read only', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiExecutiveCockpitReadModelService.js'), 'utf8')); assert(code.includes('visualizationReadModel') && !code.includes('INSERT') && !code.includes('UPDATE')) });
  suite('T126'); await test('T126: sem getSovereigntyReadModel direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiExecutiveCockpitReadModelService.js'), 'utf8')); assert(!code.includes('getSovereigntyReadModel')) });
  suite('T127'); await test('T127: sem getInstitutionalizationReadModel direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiExecutiveCockpitReadModelService.js'), 'utf8')); assert(!code.includes('getInstitutionalizationReadModel')) });
  suite('T128'); await test('T128: estágio value_governance index 4', async () => { assertEqual(svc.aioiStrategicOverviewService.STRATEGIC_OVERVIEW_STAGES[4], 'value_governance', '') });
  suite('T129'); await test('T129: estágio conformance index 7', async () => { assertEqual(svc.aioiStrategicOverviewService.STRATEGIC_OVERVIEW_STAGES[7], 'conformance', '') });
  suite('T130'); await test('T130: pilares incluem trust', async () => { assert(svc.aioiExecutiveSummaryService.SUMMARY_PILLARS.includes('trust')) });
  suite('T131'); await test('T131: regressão P4.3 consumption nested', async () => { const r = await getCachedCockpit(); assert(r.executive_cockpit_read_model.visualization_read_model.consumption_read_model.enterprise_consumption) });
  suite('T132'); await test('T132: regressão P4.3 visualization coverage', async () => { const r = await getCachedCockpit(); assert(r.executive_cockpit_read_model.visualization_read_model.visualization_coverage.coverage_status) });
  suite('T133'); await test('T133: sem APIs frontend', async () => { const files = ['aioiExecutiveCockpitReadModelService.js', 'aioiCockpitMetrics.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('express.Router') && !code.includes('app.get('), f); } });
  suite('T134'); await test('T134: sem getExecutivePresentation direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiExecutiveCockpitReadModelService.js'), 'utf8')); assert(!code.includes('getExecutivePresentation')) });
  suite('T135'); await test('T135: sem getVisualizationCoverage direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiExecutiveCockpitReadModelService.js'), 'utf8')); assert(!code.includes('getVisualizationCoverage')) });
  suite('T136'); await test('T136: _extractCockpitSignals autonomy', async () => { assertEqual(getCockpitMetrics()._extractCockpitSignals(SAMPLE_VRM).autonomyScore, 86, '') });
  suite('T137'); await test('T137: estágio autonomy index 11', async () => { assertEqual(svc.aioiStrategicOverviewService.STRATEGIC_OVERVIEW_STAGES[11], 'autonomy', '') });
  suite('T138'); await test('T138: pilares incluem readiness', async () => { assert(svc.aioiExecutiveSummaryService.SUMMARY_PILLARS.includes('readiness')) });
  suite('T139'); await test('T139: UPSERT bloqueado', async () => { cm = getCockpitMetrics(); let threw = false; try { cm.assertReadOnlySql('UPSERT INTO x VALUES (1)'); } catch (e) { threw = true; } assert(threw) });
  suite('T140'); await test('T140: ALTER bloqueado', async () => { cm = getCockpitMetrics(); let threw = false; try { cm.assertReadOnlySql('ALTER TABLE x ADD y int'); } catch (e) { threw = true; } assert(threw) });
  suite('T141'); await test('T141: DROP bloqueado', async () => { cm = getCockpitMetrics(); let threw = false; try { cm.assertReadOnlySql('DROP TABLE x'); } catch (e) { threw = true; } assert(threw) });
  suite('T142'); await test('T142: sem getVisualizationConsistency direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiExecutiveCockpitReadModelService.js'), 'utf8')); assert(!code.includes('getVisualizationConsistency')) });
  suite('T143'); await test('T143: regressão P4.3 visualization consistency', async () => { const r = await getCachedCockpit(); assert(r.executive_cockpit_read_model.visualization_read_model.visualization_consistency.consistency_status) });
  suite('T144'); await test('T144: buildStrategicOverview local agregador', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiExecutiveCockpitReadModelService.js'), 'utf8')); assert(code.includes('buildStrategicOverview')) });
  suite('T145'); await test('T145: buildExecutiveSummary local agregador', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiExecutiveCockpitReadModelService.js'), 'utf8')); assert(code.includes('buildExecutiveSummary')) });
  suite('T146'); await test('T146: cockpit read model soberano', async () => { const r = await getCachedCockpit(); assert(r.executive_cockpit_read_model.enterprise_cockpit_readiness.cockpit_score >= 70) });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`AIOI-P4.4 Cockpit Tests: ${_passed} passed, ${_failed} failed`);
  console.log(`${'='.repeat(60)}`);
  if (_failed === 0) {
    console.log('\nAIOI_P4_4_ENTERPRISE_EXECUTIVE_COCKPIT_READ_MODEL_PASS\n');
  } else {
    process.exitCode = 1;
  }
}

runTests().catch(err => {
  console.error('FATAL:', err);
  process.exitCode = 1;
});
