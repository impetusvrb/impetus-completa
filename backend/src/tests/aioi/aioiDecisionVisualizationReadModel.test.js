'use strict';

/**
 * AIOI-P4.5 — Testes automatizados da Enterprise Decision Visualization Model Layer
 * T1–T151 | node src/tests/aioi/aioiDecisionVisualizationReadModel.test.js
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

const P45_EXPORTS = [
  'aioiExecutiveCockpitReadModelService', 'aioiDecisionVisualizationMetrics',
  'aioiDecisionPerspectiveService', 'aioiDecisionConsistencyService',
  'aioiDecisionVisualizationCoverageService', 'aioiEnterpriseDecisionVisualizationService',
  'aioiDecisionVisualizationReadModelService', 'aioiBenchmarkAnalysisService'
];

function clearAioiModuleCache() {
  for (const key of Object.keys(require.cache)) {
    if (key.includes('/services/aioi/')) delete require.cache[key];
  }
}

let _svcCache = null;

function loadP45() {
  if (_svcCache) return _svcCache;
  const loaded = {};
  for (const mod of P45_EXPORTS) {
    loaded[mod] = require(`${SERVICES_PATH}/${mod}`);
  }
  _svcCache = loaded;
  return loaded;
}

function reloadP45() {
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
    'aioiVisualizationReadModelService', 'aioiExecutiveCockpitReadModelService'
  ];
  for (const mod of chainPreload) require(`${SERVICES_PATH}/${mod}`);
  return loadP45();
}

function getDvMetrics() {
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiDecisionVisualizationMetrics`)];
  if (_svcCache) delete _svcCache.aioiDecisionVisualizationMetrics;
  const m = require(`${SERVICES_PATH}/aioiDecisionVisualizationMetrics`);
  if (_svcCache) _svcCache.aioiDecisionVisualizationMetrics = m;
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


const SAMPLE_ECRM = {
  visualization_read_model: SAMPLE_VRM,
  executive_summary: { summary_score: 85, summary_status: 'summary_ready' },
  strategic_overview: { overview_score: 84, overview_status: 'overview_ready' },
  enterprise_cockpit_readiness: { cockpit_score: 86, cockpit_level: 'executive_ready' }
};

const EMPTY_ECRM = {
  visualization_read_model: {
    consumption_read_model: { autonomy_read_model: EMPTY_ARM }
  },
  executive_summary: {},
  strategic_overview: {},
  enterprise_cockpit_readiness: {}
};

const PARTIAL_ECRM_TRUST = {
  visualization_read_model: PARTIAL_VRM_TRUST,
  executive_summary: { summary_score: 40, summary_status: 'partial' },
  strategic_overview: { overview_score: 35, overview_status: 'limited' },
  enterprise_cockpit_readiness: { cockpit_score: 35, cockpit_level: 'emerging' }
};

const PARTIAL_ECRM_TRUST_80 = {
  visualization_read_model: PARTIAL_VRM_TRUST_80,
  executive_summary: { summary_score: 45, summary_status: 'partial' },
  strategic_overview: { overview_score: 40, overview_status: 'partial' },
  enterprise_cockpit_readiness: { cockpit_score: 40, cockpit_level: 'developing' }
};

async function runTests() {
  let dm = getDvMetrics();
  dm.resetSessionCounters();
  const mock = createReadinessDbMock();
  patchDb(mock);
  const svc = reloadP45();
  let cachedDv = null;
  async function getCachedDv() {
    if (!cachedDv) {
      cachedDv = await svc.aioiDecisionVisualizationReadModelService.getDecisionVisualizationReadModel(COMPANY_ID);
    }
    return cachedDv;
  }

  suite('T1'); await test('T1: classifyDecisionPerspective decision_ready', async () => { assertEqual(getDvMetrics().classifyDecisionPerspective(80), 'decision_ready', '') });
  suite('T2'); await test('T2: classifyDecisionPerspective partial', async () => { assertEqual(getDvMetrics().classifyDecisionPerspective(55), 'partial', '') });
  suite('T3'); await test('T3: classifyDecisionPerspective fragmented', async () => { assertEqual(getDvMetrics().classifyDecisionPerspective(30), 'fragmented', '') });
  suite('T4'); await test('T4: PERSPECTIVE_COMPONENTS 4', async () => { assertEqual(svc.aioiDecisionPerspectiveService.PERSPECTIVE_COMPONENTS.length, 4, '') });
  suite('T5'); await test('T5: buildDecisionPerspective', async () => { const r = svc.aioiDecisionPerspectiveService.buildDecisionPerspective(SAMPLE_ECRM); assert(r.perspective_score >= 70 && r.perspective_status === 'decision_ready') });
  suite('T6'); await test('T6: computeDecisionPerspectiveScore range', async () => { const s = svc.aioiDecisionPerspectiveService.computeDecisionPerspectiveScore(SAMPLE_ECRM); assert(s >= 0 && s <= 100) });
  suite('T7'); await test('T7: getDecisionPerspective via read model', async () => { const r = await getCachedDv(); assert(r.ok && r.decision_visualization_read_model.decision_perspective.perspective_status) });
  suite('T8'); await test('T8: companyId inválido perspective', async () => { const r = await svc.aioiDecisionPerspectiveService.getDecisionPerspective('bad'); assert(!r.ok) });
  suite('T9'); await test('T9: composição P4.4 executiveCockpitReadModel', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiDecisionPerspectiveService.js'), 'utf8')); assert(code.includes('executiveCockpitReadModel') && !code.includes('getVisualizationReadModel')) });
  suite('T10'); await test('T10: determinístico perspective', async () => { assertEqual(svc.aioiDecisionPerspectiveService.computeDecisionPerspectiveScore(SAMPLE_ECRM), svc.aioiDecisionPerspectiveService.computeDecisionPerspectiveScore(SAMPLE_ECRM), '') });
  suite('T11'); await test('T11: recordDecisionPerspectiveAnalyzed', async () => { dm = getDvMetrics(); dm.resetSessionCounters(); dm.recordDecisionPerspectiveAnalyzed(COMPANY_ID); assert(dm.getSessionCounters().decision_perspective_count >= 1) });
  suite('T12'); await test('T12: zero writes perspective path', async () => { await getCachedDv(); assertNoWrites(mock._client._calls) });
  suite('T13'); await test('T13: limite 70 decision_ready', async () => { assertEqual(getDvMetrics().classifyDecisionPerspective(70), 'decision_ready', '') });
  suite('T14'); await test('T14: empty ecrm score baixo', async () => { assert(svc.aioiDecisionPerspectiveService.computeDecisionPerspectiveScore(EMPTY_ECRM) <= 40) });
  suite('T15'); await test('T15: status permitidos perspective', async () => { const allowed = ['fragmented', 'partial', 'decision_ready']; for (const s of [80, 50, 20]) assert(allowed.includes(getDvMetrics().classifyDecisionPerspective(s))) });
  suite('T16'); await test('T16: _extractDecisionVisualizationSignals executive summary', async () => { assertEqual(getDvMetrics()._extractDecisionVisualizationSignals(SAMPLE_ECRM).executiveSummaryScore, 85, '') });
  suite('T17'); await test('T17: _extractDecisionVisualizationSignals cockpit readiness', async () => { assertEqual(getDvMetrics()._extractDecisionVisualizationSignals(SAMPLE_ECRM).cockpitReadinessScore, 86, '') });
  suite('T18'); await test('T18: _extractDecisionVisualizationSignals visualization readiness', async () => { assertEqual(getDvMetrics()._extractDecisionVisualizationSignals(SAMPLE_ECRM).visualizationReadinessScore, 87, '') });
  suite('T19'); await test('T19: componentes incluem cockpit_readiness', async () => { assert(svc.aioiDecisionPerspectiveService.PERSPECTIVE_COMPONENTS.includes('cockpit_readiness')) });
  suite('T20'); await test('T20: buildDecisionPerspective campos', async () => { const r = svc.aioiDecisionPerspectiveService.buildDecisionPerspective(SAMPLE_ECRM); assert('perspective_score' in r && 'perspective_status' in r) });
  suite('T21'); await test('T21: componentes incluem strategic_overview', async () => { assert(svc.aioiDecisionPerspectiveService.PERSPECTIVE_COMPONENTS.includes('strategic_overview')) });
  suite('T22'); await test('T22: componentes incluem visualization_readiness', async () => { assert(svc.aioiDecisionPerspectiveService.PERSPECTIVE_COMPONENTS.includes('visualization_readiness')) });
  suite('T23'); await test('T23: classifyDecisionConsistency consistent', async () => { assertEqual(getDvMetrics().classifyDecisionConsistency(80), 'consistent', '') });
  suite('T24'); await test('T24: classifyDecisionConsistency partial', async () => { assertEqual(getDvMetrics().classifyDecisionConsistency(55), 'partial', '') });
  suite('T25'); await test('T25: classifyDecisionConsistency inconsistent', async () => { assertEqual(getDvMetrics().classifyDecisionConsistency(30), 'inconsistent', '') });
  suite('T26'); await test('T26: DECISION_CONSISTENCY_STAGES 11', async () => { assertEqual(svc.aioiDecisionConsistencyService.DECISION_CONSISTENCY_STAGES.length, 11, '') });
  suite('T27'); await test('T27: buildDecisionConsistency', async () => { const r = svc.aioiDecisionConsistencyService.buildDecisionConsistency(SAMPLE_ECRM); assert(r.consistency_score >= 70 && r.consistency_status === 'consistent') });
  suite('T28'); await test('T28: computeDecisionConsistencyScore range', async () => { const s = svc.aioiDecisionConsistencyService.computeDecisionConsistencyScore(SAMPLE_ECRM); assert(s >= 0 && s <= 100) });
  suite('T29'); await test('T29: getDecisionConsistency ok', async () => { const r = await svc.aioiDecisionConsistencyService.getDecisionConsistency(COMPANY_ID); assert(r.ok && r.decision_consistency.consistency_status) });
  suite('T30'); await test('T30: companyId inválido consistency', async () => { const r = await svc.aioiDecisionConsistencyService.getDecisionConsistency('x'); assert(!r.ok) });
  suite('T31'); await test('T31: empty ecrm consistency baixo', async () => { assert(svc.aioiDecisionConsistencyService.computeDecisionConsistencyScore(EMPTY_ECRM) <= 40) });
  suite('T32'); await test('T32: recordDecisionConsistencyAnalyzed', async () => { dm = getDvMetrics(); dm.recordDecisionConsistencyAnalyzed(COMPANY_ID); assert(dm.getSessionCounters().decision_consistency_count >= 1) });
  suite('T33'); await test('T33: zero writes consistency', async () => { assertNoWrites(mock._client._calls) });
  suite('T34'); await test('T34: limite 70 consistent', async () => { assertEqual(getDvMetrics().classifyDecisionConsistency(70), 'consistent', '') });
  suite('T35'); await test('T35: determinístico consistency', async () => { assertEqual(svc.aioiDecisionConsistencyService.computeDecisionConsistencyScore(SAMPLE_ECRM), svc.aioiDecisionConsistencyService.computeDecisionConsistencyScore(SAMPLE_ECRM), '') });
  suite('T36'); await test('T36: cadeia trust→cockpit_readiness', async () => { const stages = svc.aioiDecisionConsistencyService.DECISION_CONSISTENCY_STAGES; assertEqual(stages[0], 'trust', ''); assertEqual(stages[10], 'cockpit_readiness', '') });
  suite('T37'); await test('T37: status permitidos consistency', async () => { const allowed = ['inconsistent', 'partial', 'consistent']; for (const s of [80, 50, 20]) assert(allowed.includes(getDvMetrics().classifyDecisionConsistency(s))) });
  suite('T38'); await test('T38: composição P4.4 consistency', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiDecisionConsistencyService.js'), 'utf8')); assert(code.includes('executiveCockpitReadModel')) });
  suite('T39'); await test('T39: partial ecrm só trust', async () => { assert(svc.aioiDecisionConsistencyService.computeDecisionConsistencyScore(PARTIAL_ECRM_TRUST) < 70) });
  suite('T40'); await test('T40: full vs partial consistency', async () => { const full = svc.aioiDecisionConsistencyService.computeDecisionConsistencyScore(SAMPLE_ECRM); const partial = svc.aioiDecisionConsistencyService.computeDecisionConsistencyScore(PARTIAL_ECRM_TRUST_80); assert(full > partial) });
  suite('T41'); await test('T41: limite 40 partial consistency', async () => { assertEqual(getDvMetrics().classifyDecisionConsistency(40), 'partial', '') });
  suite('T42'); await test('T42: buildDecisionConsistency campos', async () => { const r = svc.aioiDecisionConsistencyService.buildDecisionConsistency(SAMPLE_ECRM); assert('consistency_score' in r && 'consistency_status' in r) });
  suite('T43'); await test('T43: estágio visualization_readiness index 9', async () => { assertEqual(svc.aioiDecisionConsistencyService.DECISION_CONSISTENCY_STAGES[9], 'visualization_readiness', '') });
  suite('T44'); await test('T44: estágio consumption index 8', async () => { assertEqual(svc.aioiDecisionConsistencyService.DECISION_CONSISTENCY_STAGES[8], 'consumption', '') });
  suite('T45'); await test('T45: classifyDecisionVisualizationCoverage comprehensive', async () => { assertEqual(getDvMetrics().classifyDecisionVisualizationCoverage(80), 'comprehensive', '') });
  suite('T46'); await test('T46: classifyDecisionVisualizationCoverage partial', async () => { assertEqual(getDvMetrics().classifyDecisionVisualizationCoverage(55), 'partial', '') });
  suite('T47'); await test('T47: classifyDecisionVisualizationCoverage limited', async () => { assertEqual(getDvMetrics().classifyDecisionVisualizationCoverage(30), 'limited', '') });
  suite('T48'); await test('T48: DECISION_VISUALIZATION_COVERAGE_DOMAINS 14', async () => { assertEqual(svc.aioiDecisionVisualizationCoverageService.DECISION_VISUALIZATION_COVERAGE_DOMAINS.length, 14, '') });
  suite('T49'); await test('T49: buildDecisionVisualizationCoverage', async () => { const r = svc.aioiDecisionVisualizationCoverageService.buildDecisionVisualizationCoverage(SAMPLE_ECRM); assert(r.coverage_score >= 70 && r.coverage_status === 'comprehensive') });
  suite('T50'); await test('T50: computeDecisionVisualizationCoverageScore range', async () => { const s = svc.aioiDecisionVisualizationCoverageService.computeDecisionVisualizationCoverageScore(SAMPLE_ECRM); assert(s >= 0 && s <= 100) });
  suite('T51'); await test('T51: getDecisionVisualizationCoverage ok', async () => { const r = await svc.aioiDecisionVisualizationCoverageService.getDecisionVisualizationCoverage(COMPANY_ID); assert(r.ok && r.decision_visualization_coverage.coverage_status) });
  suite('T52'); await test('T52: companyId inválido coverage', async () => { const r = await svc.aioiDecisionVisualizationCoverageService.getDecisionVisualizationCoverage('invalid'); assert(!r.ok) });
  suite('T53'); await test('T53: empty ecrm coverage baixo', async () => { assert(svc.aioiDecisionVisualizationCoverageService.computeDecisionVisualizationCoverageScore(EMPTY_ECRM) <= 40) });
  suite('T54'); await test('T54: recordDecisionVisualizationCoverageAnalyzed', async () => { dm = getDvMetrics(); dm.recordDecisionVisualizationCoverageAnalyzed(COMPANY_ID); assert(dm.getSessionCounters().decision_visualization_coverage_count >= 1) });
  suite('T55'); await test('T55: domínio executive_summary', async () => { assert(svc.aioiDecisionVisualizationCoverageService.DECISION_VISUALIZATION_COVERAGE_DOMAINS.includes('executive_summary')) });
  suite('T56'); await test('T56: domínio cockpit_readiness', async () => { assert(svc.aioiDecisionVisualizationCoverageService.DECISION_VISUALIZATION_COVERAGE_DOMAINS.includes('cockpit_readiness')) });
  suite('T57'); await test('T57: determinístico coverage', async () => { assertEqual(svc.aioiDecisionVisualizationCoverageService.computeDecisionVisualizationCoverageScore(SAMPLE_ECRM), svc.aioiDecisionVisualizationCoverageService.computeDecisionVisualizationCoverageScore(SAMPLE_ECRM), '') });
  suite('T58'); await test('T58: limite 70 comprehensive', async () => { assertEqual(getDvMetrics().classifyDecisionVisualizationCoverage(70), 'comprehensive', '') });
  suite('T59'); await test('T59: buildDecisionVisualizationCoverage campos', async () => { const r = svc.aioiDecisionVisualizationCoverageService.buildDecisionVisualizationCoverage(SAMPLE_ECRM); assert('coverage_score' in r && 'coverage_status' in r) });
  suite('T60'); await test('T60: 14 domínios coverage full sample', async () => { assert(svc.aioiDecisionVisualizationCoverageService.computeDecisionVisualizationCoverageScore(SAMPLE_ECRM) >= 90) });
  suite('T61'); await test('T61: classifyEnterpriseDecisionVisualization visualization_ready', async () => { assertEqual(getDvMetrics().classifyEnterpriseDecisionVisualization(92), 'visualization_ready', '') });
  suite('T62'); await test('T62: classifyEnterpriseDecisionVisualization executive_visualization_ready', async () => { assertEqual(getDvMetrics().classifyEnterpriseDecisionVisualization(75), 'executive_visualization_ready', '') });
  suite('T63'); await test('T63: classifyEnterpriseDecisionVisualization developing', async () => { assertEqual(getDvMetrics().classifyEnterpriseDecisionVisualization(55), 'developing', '') });
  suite('T64'); await test('T64: classifyEnterpriseDecisionVisualization emerging', async () => { assertEqual(getDvMetrics().classifyEnterpriseDecisionVisualization(30), 'emerging', '') });
  suite('T65'); await test('T65: ENTERPRISE_DECISION_VISUALIZATION_WEIGHTS 0.25', async () => { const w = svc.aioiEnterpriseDecisionVisualizationService.ENTERPRISE_DECISION_VISUALIZATION_WEIGHTS; assertEqual(w.decisionPerspective, 0.25, ''); assertEqual(w.decisionConsistency, 0.25, ''); assertEqual(w.visualizationCoverage, 0.25, ''); assertEqual(w.cockpitReadiness, 0.25, '') });
  suite('T66'); await test('T66: buildEnterpriseDecisionVisualization', async () => { const r = svc.aioiEnterpriseDecisionVisualizationService.buildEnterpriseDecisionVisualization({ perspectiveScore: 80, consistencyScore: 85, visualizationCoverageScore: 82, cockpitReadinessScore: 83 }); assert(r.visualization_score >= 70 && r.visualization_level) });
  suite('T67'); await test('T67: computeEnterpriseDecisionVisualizationScore range', async () => { const s = svc.aioiEnterpriseDecisionVisualizationService.computeEnterpriseDecisionVisualizationScore({ perspectiveScore: 80, consistencyScore: 80, visualizationCoverageScore: 80, cockpitReadinessScore: 80 }); assert(s >= 0 && s <= 100) });
  suite('T68'); await test('T68: getEnterpriseDecisionVisualization ok', async () => { const r = await svc.aioiEnterpriseDecisionVisualizationService.getEnterpriseDecisionVisualization(COMPANY_ID); assert(r.ok && r.enterprise_decision_visualization.visualization_level) });
  suite('T69'); await test('T69: companyId inválido enterprise dv', async () => { const r = await svc.aioiEnterpriseDecisionVisualizationService.getEnterpriseDecisionVisualization('bad-id'); assert(!r.ok) });
  suite('T70'); await test('T70: recordEnterpriseDecisionVisualizationAnalyzed', async () => { dm = getDvMetrics(); dm.recordEnterpriseDecisionVisualizationAnalyzed(COMPANY_ID); assert(dm.getSessionCounters().enterprise_decision_visualization_count >= 1) });
  suite('T71'); await test('T71: zero writes enterprise dv', async () => { assertNoWrites(mock._client._calls) });
  suite('T72'); await test('T72: limite 90 visualization_ready', async () => { assertEqual(getDvMetrics().classifyEnterpriseDecisionVisualization(90), 'visualization_ready', '') });
  suite('T73'); await test('T73: determinístico enterprise dv', async () => { const inp = { perspectiveScore: 80, consistencyScore: 75, visualizationCoverageScore: 82, cockpitReadinessScore: 78 }; assertEqual(svc.aioiEnterpriseDecisionVisualizationService.computeEnterpriseDecisionVisualizationScore(inp), svc.aioiEnterpriseDecisionVisualizationService.computeEnterpriseDecisionVisualizationScore(inp), '') });
  suite('T74'); await test('T74: pesos iguais soma ponderada', async () => { assertEqual(svc.aioiEnterpriseDecisionVisualizationService.computeEnterpriseDecisionVisualizationScore({ perspectiveScore: 100, consistencyScore: 100, visualizationCoverageScore: 100, cockpitReadinessScore: 100 }), 100, '') });
  suite('T75'); await test('T75: níveis permitidos enterprise dv', async () => { const allowed = ['emerging', 'developing', 'executive_visualization_ready', 'visualization_ready']; for (const s of [30, 55, 75, 92]) assert(allowed.includes(getDvMetrics().classifyEnterpriseDecisionVisualization(s))) });
  suite('T76'); await test('T76: getDecisionVisualizationReadModel ok', async () => { const r = await getCachedDv(); assert(r.ok && r.decision_visualization_read_model) });
  suite('T77'); await test('T77: estrutura obrigatória read model', async () => { const r = await getCachedDv(); const dvrm = r.decision_visualization_read_model; assert(dvrm.executive_cockpit_read_model && dvrm.decision_perspective && dvrm.decision_consistency && dvrm.decision_visualization_coverage && dvrm.enterprise_decision_visualization) });
  suite('T78'); await test('T78: companyId inválido read model', async () => { const r = await svc.aioiDecisionVisualizationReadModelService.getDecisionVisualizationReadModel('invalid'); assert(!r.ok) });
  suite('T79'); await test('T79: anti-duplication build* local', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiDecisionVisualizationReadModelService.js'), 'utf8')); assert(code.includes('buildDecisionPerspective') && code.includes('buildDecisionConsistency')); assert(!code.includes('getDecisionPerspective(') && !code.includes('getDecisionConsistency(')) });
  suite('T80'); await test('T80: getExecutiveCockpitReadModel uma vez', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiDecisionVisualizationReadModelService.js'), 'utf8')); assertEqual((code.match(/getExecutiveCockpitReadModel/g) || []).length, 1, 'single ecrm call') });
  suite('T81'); await test('T81: sem LLM/IA P4.5', async () => { const files = ['aioiDecisionPerspectiveService.js', 'aioiDecisionConsistencyService.js', 'aioiDecisionVisualizationCoverageService.js', 'aioiEnterpriseDecisionVisualizationService.js', 'aioiDecisionVisualizationReadModelService.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('openai') && !code.includes('generateText'), f); } });
  suite('T82'); await test('T82: sem forecast novo', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiDecisionVisualizationReadModelService.js'), 'utf8')); assert(!code.includes('getBacklogForecast') && !code.includes('BacklogForecast')) });
  suite('T83'); await test('T83: Promise.all agregador', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiDecisionVisualizationReadModelService.js'), 'utf8')); assert(code.includes('Promise.all')) });
  suite('T84'); await test('T84: executive_cockpit_read_model nested', async () => { const r = await getCachedDv(); assert(r.decision_visualization_read_model.executive_cockpit_read_model.visualization_read_model) });
  suite('T85'); await test('T85: decision_perspective campos', async () => { const r = await getCachedDv(); const dp = r.decision_visualization_read_model.decision_perspective; assert('perspective_score' in dp && 'perspective_status' in dp) });
  suite('T86'); await test('T86: decision_consistency campos', async () => { const r = await getCachedDv(); const dc = r.decision_visualization_read_model.decision_consistency; assert('consistency_score' in dc && 'consistency_status' in dc) });
  suite('T87'); await test('T87: decision_visualization_coverage campos', async () => { const r = await getCachedDv(); const dvc = r.decision_visualization_read_model.decision_visualization_coverage; assert('coverage_score' in dvc && 'coverage_status' in dvc) });
  suite('T88'); await test('T88: enterprise_decision_visualization campos', async () => { const r = await getCachedDv(); const edv = r.decision_visualization_read_model.enterprise_decision_visualization; assert('visualization_score' in edv && 'visualization_level' in edv) });
  suite('T89'); await test('T89: composição exclusiva P4.4', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiDecisionVisualizationReadModelService.js'), 'utf8')); assert(code.includes('executiveCockpitReadModel') && !code.includes('getVisualizationReadModel')) });
  suite('T90'); await test('T90: recordDecisionVisualizationRequested/Completed', async () => { dm = getDvMetrics(); if (_svcCache) _svcCache.aioiDecisionVisualizationMetrics = dm; dm.resetSessionCounters(); dm.recordDecisionVisualizationRequested(COMPANY_ID); dm.recordDecisionVisualizationCompleted(COMPANY_ID, 42); const c = dm.getSessionCounters(); assertEqual(c.decision_visualization_requests, 1, ''); assertEqual(c.avg_query_latency_ms, 42, '') });
  suite('T91'); await test('T91: enterprise_decision_visualization composto', async () => { const r = await getCachedDv(); const edv = r.decision_visualization_read_model.enterprise_decision_visualization; assert(edv.visualization_score >= 0 && edv.visualization_level) });
  suite('T92'); await test('T92: cockpit_readiness via ecrm nested', async () => { const r = await getCachedDv(); assert(r.decision_visualization_read_model.executive_cockpit_read_model.enterprise_cockpit_readiness) });
  suite('T93'); await test('T93: determinístico read model scores', async () => { const r1 = svc.aioiDecisionPerspectiveService.buildDecisionPerspective(SAMPLE_ECRM); const r2 = svc.aioiDecisionPerspectiveService.buildDecisionPerspective(SAMPLE_ECRM); assertEqual(r1.perspective_score, r2.perspective_score, '') });
  suite('T94'); await test('T94: 4 componentes perspective full sample', async () => { assert(svc.aioiDecisionPerspectiveService.computeDecisionPerspectiveScore(SAMPLE_ECRM) >= 70) });
  suite('T95'); await test('T95: 11 estágios consistency full sample', async () => { assert(svc.aioiDecisionConsistencyService.computeDecisionConsistencyScore(SAMPLE_ECRM) >= 70) });
  suite('T96'); await test('T96: INSERT bloqueado', async () => { dm = getDvMetrics(); let threw = false; try { dm.assertReadOnlySql('INSERT INTO x VALUES (1)'); } catch (e) { threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', ''); } assert(threw) });
  suite('T97'); await test('T97: UPDATE bloqueado', async () => { dm = getDvMetrics(); let threw = false; try { dm.assertReadOnlySql('UPDATE x SET y=1'); } catch (e) { threw = true; } assert(threw) });
  suite('T98'); await test('T98: DELETE bloqueado', async () => { dm = getDvMetrics(); let threw = false; try { dm.assertReadOnlySql('DELETE FROM x'); } catch (e) { threw = true; } assert(threw) });
  suite('T99'); await test('T99: RLS company_id + bypass false', async () => { await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID); const t = mock._client._calls.find(c => c.sql.includes('app.current_company_id')); const b = mock._client._calls.filter(c => c.sql.includes('app.bypass_rls')); assert(t && t.params[0] === COMPANY_ID); assert(b.length >= 1) });
  suite('T100'); await test('T100: tenant B benchmark only', async () => { const mockB = createReadinessDbMock(buildIoes().map(i => ({ ...i, company_id: COMPANY_ID_B })), buildSnapshots().map(s => ({ ...s, company_id: COMPANY_ID_B }))); patchDb(mockB); _svcCache = null; clearAioiModuleCache(); const svcB = loadP45(); const bench = await svcB.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID_B); assert(bench.ok && bench.benchmark); const t = mockB._client._calls.filter(c => c.sql.includes('app.current_company_id')).find(c => c.params && c.params[0] === COMPANY_ID_B); assert(t, 'RLS tenant B') });
  restoreDb();
  suite('T101'); await test('T101: recordDecisionVisualizationRequested log', async () => { dm = getDvMetrics(); dm.resetSessionCounters(); dm.recordDecisionVisualizationRequested(COMPANY_ID); assert(dm.getSessionCounters().decision_visualization_requests === 1) });
  suite('T102'); await test('T102: recordDecisionPerspectiveAnalyzed log', async () => { dm = getDvMetrics(); dm.recordDecisionPerspectiveAnalyzed(COMPANY_ID); assert(dm.getSessionCounters().decision_perspective_count >= 1) });
  suite('T103'); await test('T103: recordDecisionConsistencyAnalyzed log', async () => { dm = getDvMetrics(); dm.recordDecisionConsistencyAnalyzed(COMPANY_ID); assert(dm.getSessionCounters().decision_consistency_count >= 1) });
  suite('T104'); await test('T104: recordDecisionVisualizationCoverageAnalyzed log', async () => { dm = getDvMetrics(); dm.recordDecisionVisualizationCoverageAnalyzed(COMPANY_ID); assert(dm.getSessionCounters().decision_visualization_coverage_count >= 1) });
  suite('T105'); await test('T105: recordEnterpriseDecisionVisualizationAnalyzed log', async () => { dm = getDvMetrics(); dm.recordEnterpriseDecisionVisualizationAnalyzed(COMPANY_ID); assert(dm.getSessionCounters().enterprise_decision_visualization_count >= 1) });
  suite('T106'); await test('T106: getSessionCounters campos', async () => { dm = getDvMetrics(); dm.resetSessionCounters(); dm.recordEnterpriseDecisionVisualizationAnalyzed(COMPANY_ID); const c = dm.getSessionCounters(); assert(c.enterprise_decision_visualization_count >= 1 && 'avg_query_latency_ms' in c); assert('decision_visualization_requests' in c && 'decision_perspective_count' in c) });
  suite('T107'); await test('T107: clampScore', async () => { assertEqual(getDvMetrics().clampScore(150), 100, '') });
  suite('T108'); await test('T108: TRUNCATE bloqueado', async () => { dm = getDvMetrics(); let threw = false; try { dm.assertReadOnlySql('TRUNCATE TABLE x'); } catch (e) { threw = true; } assert(threw) });
  suite('T109'); await test('T109: ON CONFLICT bloqueado', async () => { dm = getDvMetrics(); let threw = false; try { dm.assertReadOnlySql('INSERT INTO x VALUES (1) ON CONFLICT DO NOTHING'); } catch (e) { threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', ''); } assert(threw) });
  suite('T110'); await test('T110: MERGE bloqueado', async () => { dm = getDvMetrics(); let threw = false; try { dm.assertReadOnlySql('MERGE INTO x'); } catch (e) { threw = true; } assert(threw) });
  suite('T111'); await test('T111: anti-duplication composição P4.4', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiDecisionVisualizationReadModelService.js'), 'utf8')); assert(code.includes('executiveCockpitReadModel') && !code.includes('getDecisionPerspective')); assert(code.includes('buildEnterpriseDecisionVisualization')) });
  suite('T112'); await test('T112: sem getVisualizationReadModel direto', async () => { const files = ['aioiDecisionPerspectiveService.js', 'aioiDecisionConsistencyService.js', 'aioiDecisionVisualizationCoverageService.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('getVisualizationReadModel'), f); } });
  suite('T113'); await test('T113: sem getConsumptionReadModel direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiDecisionVisualizationReadModelService.js'), 'utf8')); assert(!code.includes('getConsumptionReadModel')) });
  suite('T114'); await test('T114: CREATE bloqueado', async () => { dm = getDvMetrics(); let threw = false; try { dm.assertReadOnlySql('CREATE TABLE x (id int)'); } catch (e) { threw = true; } assert(threw) });
  suite('T115'); await test('T115: GRANT bloqueado', async () => { dm = getDvMetrics(); let threw = false; try { dm.assertReadOnlySql('GRANT ALL ON x TO y'); } catch (e) { threw = true; } assert(threw) });
  suite('T116'); await test('T116: soberanos ausentes P4.5', async () => { const files = ['aioiDecisionVisualizationMetrics.js', 'aioiDecisionPerspectiveService.js', 'aioiDecisionConsistencyService.js', 'aioiDecisionVisualizationCoverageService.js', 'aioiEnterpriseDecisionVisualizationService.js', 'aioiDecisionVisualizationReadModelService.js']; const forbidden = ['operationalDecisionEngine', 'operationalLearningService', 'workflowOrchestrator', 'actionRuntimeOrchestrator', 'computePriorityScore', 'classificationConsumer', 'aioiOutboxConsumerService']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); for (const bad of forbidden) assert(!code.includes(bad), `${f} contém ${bad}`); } });
  suite('T117'); await test('T117: sem fan-out getExecutiveCockpitReadModel', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiDecisionVisualizationReadModelService.js'), 'utf8')); assertEqual((code.match(/getExecutiveCockpitReadModel/g) || []).length, 1, 'no fan-out') });
  suite('T118'); await test('T118: sem getConformanceReadModel direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiDecisionVisualizationReadModelService.js'), 'utf8')); assert(!code.includes('getConformanceReadModel')) });
  suite('T119'); await test('T119: domínio trust coverage', async () => { assert(svc.aioiDecisionVisualizationCoverageService.DECISION_VISUALIZATION_COVERAGE_DOMAINS.includes('trust')) });
  suite('T120'); await test('T120: estágio governance_excellence index 4', async () => { assertEqual(svc.aioiDecisionConsistencyService.DECISION_CONSISTENCY_STAGES[4], 'governance_excellence', '') });
  suite('T121'); await test('T121: REVOKE bloqueado', async () => { dm = getDvMetrics(); let threw = false; try { dm.assertReadOnlySql('REVOKE ALL ON x FROM y'); } catch (e) { threw = true; } assert(threw) });
  suite('T122'); await test('T122: sem getCertificationReadModel direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiDecisionVisualizationReadModelService.js'), 'utf8')); assert(!code.includes('getCertificationReadModel')) });
  suite('T123'); await test('T123: limite 40 partial coverage', async () => { assertEqual(getDvMetrics().classifyDecisionVisualizationCoverage(40), 'partial', '') });
  suite('T124'); await test('T124: _extractDecisionVisualizationSignals trust', async () => { assertEqual(getDvMetrics()._extractDecisionVisualizationSignals(SAMPLE_ECRM).trustScore, 80, '') });
  suite('T125'); await test('T125: estágio sovereignty index 6', async () => { assertEqual(svc.aioiDecisionConsistencyService.DECISION_CONSISTENCY_STAGES[6], 'sovereignty', '') });
  suite('T126'); await test('T126: regressão P4.4 executive cockpit read model intacto', async () => { const r = await getCachedDv(); assert(r.decision_visualization_read_model.executive_cockpit_read_model.executive_summary) });
  suite('T127'); await test('T127: regressão P4.4 enterprise cockpit readiness', async () => { const r = await getCachedDv(); assert(r.decision_visualization_read_model.executive_cockpit_read_model.enterprise_cockpit_readiness.cockpit_level) });
  suite('T128'); await test('T128: sem getSustainabilityReadModel direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiDecisionVisualizationReadModelService.js'), 'utf8')); assert(!code.includes('getSustainabilityReadModel')) });
  suite('T129'); await test('T129: recordDecisionVisualizationCompleted log', async () => { dm = getDvMetrics(); dm.recordDecisionVisualizationCompleted(COMPANY_ID, 50); assert(dm.getSessionCounters().avg_query_latency_ms === 50) });
  suite('T130'); await test('T130: domínio governance_excellence coverage', async () => { assert(svc.aioiDecisionVisualizationCoverageService.DECISION_VISUALIZATION_COVERAGE_DOMAINS.includes('governance_excellence')) });
  suite('T131'); await test('T131: sem execução operacional P4.5', async () => { const files = ['aioiDecisionVisualizationReadModelService.js', 'aioiEnterpriseDecisionVisualizationService.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('executeDecision') && !code.includes('runWorkflow'), f); } });
  suite('T132'); await test('T132: sem scoring novo P4.5', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiDecisionVisualizationMetrics.js'), 'utf8')); assert(!code.includes('computePriorityScore') && !code.includes('mlModel')) });
  suite('T133'); await test('T133: decision layer read only', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiDecisionVisualizationReadModelService.js'), 'utf8')); assert(code.includes('executiveCockpitReadModel') && !code.includes('INSERT') && !code.includes('UPDATE')) });
  suite('T134'); await test('T134: sem dashboard/widget/react/vue', async () => { const files = ['aioiDecisionVisualizationReadModelService.js', 'aioiDecisionPerspectiveService.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('createDashboard') && !code.includes('React') && !code.includes('Vue') && !code.includes('Chart.js'), f); } });
  suite('T135'); await test('T135: sem APIs UI', async () => { const files = ['aioiDecisionVisualizationReadModelService.js', 'aioiDecisionVisualizationMetrics.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('express.Router') && !code.includes('app.get('), f); } });
  suite('T136'); await test('T136: sem getExecutiveSummary direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiDecisionVisualizationReadModelService.js'), 'utf8')); assert(!code.includes('getExecutiveSummary')) });
  suite('T137'); await test('T137: _extractDecisionVisualizationSignals strategic overview', async () => { assertEqual(getDvMetrics()._extractDecisionVisualizationSignals(SAMPLE_ECRM).strategicOverviewScore, 84, '') });
  suite('T138'); await test('T138: estágio autonomy index 7', async () => { assertEqual(svc.aioiDecisionConsistencyService.DECISION_CONSISTENCY_STAGES[7], 'autonomy', '') });
  suite('T139'); await test('T139: domínio consumption coverage', async () => { assert(svc.aioiDecisionVisualizationCoverageService.DECISION_VISUALIZATION_COVERAGE_DOMAINS.includes('consumption')) });
  suite('T140'); await test('T140: UPSERT bloqueado', async () => { dm = getDvMetrics(); let threw = false; try { dm.assertReadOnlySql('UPSERT INTO x VALUES (1)'); } catch (e) { threw = true; } assert(threw) });
  suite('T141'); await test('T141: ALTER bloqueado', async () => { dm = getDvMetrics(); let threw = false; try { dm.assertReadOnlySql('ALTER TABLE x ADD y int'); } catch (e) { threw = true; } assert(threw) });
  suite('T142'); await test('T142: DROP bloqueado', async () => { dm = getDvMetrics(); let threw = false; try { dm.assertReadOnlySql('DROP TABLE x'); } catch (e) { threw = true; } assert(threw) });
  suite('T143'); await test('T143: regressão P4.4 strategic overview', async () => { const r = await getCachedDv(); assert(r.decision_visualization_read_model.executive_cockpit_read_model.strategic_overview.overview_status) });
  suite('T144'); await test('T144: buildDecisionPerspective local agregador', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiDecisionVisualizationReadModelService.js'), 'utf8')); assert(code.includes('buildDecisionPerspective')) });
  suite('T145'); await test('T145: buildDecisionConsistency local agregador', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiDecisionVisualizationReadModelService.js'), 'utf8')); assert(code.includes('buildDecisionConsistency')) });
  suite('T146'); await test('T146: decision visualization read model soberano', async () => { const r = await getCachedDv(); assert(r.decision_visualization_read_model.enterprise_decision_visualization.visualization_score >= 70) });
  suite('T147'); await test('T147: sem getAutonomyReadModel direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiDecisionVisualizationReadModelService.js'), 'utf8')); assert(!code.includes('getAutonomyReadModel')) });
  suite('T148'); await test('T148: domínio visualization_consistency coverage', async () => { assert(svc.aioiDecisionVisualizationCoverageService.DECISION_VISUALIZATION_COVERAGE_DOMAINS.includes('visualization_consistency')) });
  suite('T149'); await test('T149: composição P4.4 enterprise dv', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiEnterpriseDecisionVisualizationService.js'), 'utf8')); assert(code.includes('executiveCockpitReadModel') && !code.includes('getDecisionPerspective')) });
  suite('T150'); await test('T150: limite 40 developing enterprise dv', async () => { assertEqual(getDvMetrics().classifyEnterpriseDecisionVisualization(40), 'developing', '') });
  suite('T151'); await test('T151: limite 40 partial perspective', async () => { assertEqual(getDvMetrics().classifyDecisionPerspective(40), 'partial', '') });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`AIOI-P4.5 Decision Visualization Tests: ${_passed} passed, ${_failed} failed`);
  console.log(`${'='.repeat(60)}`);
  if (_failed === 0) {
    console.log('\nAIOI_P4_5_ENTERPRISE_DECISION_VISUALIZATION_MODEL_PASS\n');
  } else {
    process.exitCode = 1;
  }
}

runTests().catch(err => {
  console.error('FATAL:', err);
  process.exitCode = 1;
});
