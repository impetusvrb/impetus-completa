'use strict';

/**
 * AIOI-P4.6 — Testes automatizados da Enterprise Interface Intelligence Model Layer
 * T1–T156 | node src/tests/aioi/aioiInterfaceIntelligenceReadModel.test.js
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

const P46_EXPORTS = [
  'aioiDecisionVisualizationReadModelService', 'aioiInterfaceIntelligenceMetrics',
  'aioiInterfacePerspectiveService', 'aioiInterfaceConsistencyService',
  'aioiInterfaceCoverageService', 'aioiEnterpriseInterfaceIntelligenceService',
  'aioiInterfaceIntelligenceReadModelService', 'aioiBenchmarkAnalysisService'
];

function clearAioiModuleCache() {
  for (const key of Object.keys(require.cache)) {
    if (key.includes('/services/aioi/')) delete require.cache[key];
  }
}

let _svcCache = null;

function loadP46() {
  if (_svcCache) return _svcCache;
  const loaded = {};
  for (const mod of P46_EXPORTS) {
    loaded[mod] = require(`${SERVICES_PATH}/${mod}`);
  }
  _svcCache = loaded;
  return loaded;
}

function reloadP46() {
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
    'aioiVisualizationReadModelService', 'aioiExecutiveCockpitReadModelService',
    'aioiDecisionVisualizationReadModelService'
  ];
  for (const mod of chainPreload) require(`${SERVICES_PATH}/${mod}`);
  return loadP46();
}

function getIiMetrics() {
  delete require.cache[require.resolve(`${SERVICES_PATH}/aioiInterfaceIntelligenceMetrics`)];
  if (_svcCache) delete _svcCache.aioiInterfaceIntelligenceMetrics;
  const m = require(`${SERVICES_PATH}/aioiInterfaceIntelligenceMetrics`);
  if (_svcCache) _svcCache.aioiInterfaceIntelligenceMetrics = m;
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


const SAMPLE_DVRM = {
  executive_cockpit_read_model: SAMPLE_ECRM,
  decision_perspective: { perspective_score: 85, perspective_status: 'decision_ready' },
  decision_consistency: { consistency_score: 84, consistency_status: 'consistent' },
  decision_visualization_coverage: { coverage_score: 93, coverage_status: 'comprehensive' },
  enterprise_decision_visualization: { visualization_score: 87, visualization_level: 'executive_visualization_ready' }
};

const EMPTY_DVRM = {
  executive_cockpit_read_model: EMPTY_ECRM,
  decision_perspective: {},
  decision_consistency: {},
  decision_visualization_coverage: {},
  enterprise_decision_visualization: {}
};

const PARTIAL_DVRM_TRUST = {
  executive_cockpit_read_model: PARTIAL_ECRM_TRUST,
  decision_perspective: { perspective_score: 40, perspective_status: 'partial' },
  decision_consistency: { consistency_score: 35, consistency_status: 'partial' },
  decision_visualization_coverage: { coverage_score: 30, coverage_status: 'limited' },
  enterprise_decision_visualization: { visualization_score: 35, visualization_level: 'emerging' }
};

const PARTIAL_DVRM_TRUST_80 = {
  executive_cockpit_read_model: PARTIAL_ECRM_TRUST_80,
  decision_perspective: { perspective_score: 45, perspective_status: 'partial' },
  decision_consistency: { consistency_score: 40, consistency_status: 'partial' },
  decision_visualization_coverage: { coverage_score: 35, coverage_status: 'limited' },
  enterprise_decision_visualization: { visualization_score: 40, visualization_level: 'developing' }
};

async function runTests() {
  let im = getIiMetrics();
  im.resetSessionCounters();
  const mock = createReadinessDbMock();
  patchDb(mock);
  const svc = reloadP46();
  let cachedIi = null;
  async function getCachedIi() {
    if (!cachedIi) {
      cachedIi = await svc.aioiInterfaceIntelligenceReadModelService.getInterfaceIntelligenceReadModel(COMPANY_ID);
    }
    return cachedIi;
  }

  suite('T1'); await test('T1: classifyInterfacePerspective interface_ready', async () => { assertEqual(getIiMetrics().classifyInterfacePerspective(80), 'interface_ready', '') });
  suite('T2'); await test('T2: classifyInterfacePerspective partial', async () => { assertEqual(getIiMetrics().classifyInterfacePerspective(55), 'partial', '') });
  suite('T3'); await test('T3: classifyInterfacePerspective fragmented', async () => { assertEqual(getIiMetrics().classifyInterfacePerspective(30), 'fragmented', '') });
  suite('T4'); await test('T4: PERSPECTIVE_COMPONENTS 4', async () => { assertEqual(svc.aioiInterfacePerspectiveService.PERSPECTIVE_COMPONENTS.length, 4, '') });
  suite('T5'); await test('T5: buildInterfacePerspective', async () => { const r = svc.aioiInterfacePerspectiveService.buildInterfacePerspective(SAMPLE_DVRM); assert(r.perspective_score >= 70 && r.perspective_status === 'interface_ready') });
  suite('T6'); await test('T6: computeInterfacePerspectiveScore range', async () => { const s = svc.aioiInterfacePerspectiveService.computeInterfacePerspectiveScore(SAMPLE_DVRM); assert(s >= 0 && s <= 100) });
  suite('T7'); await test('T7: getInterfacePerspective via read model', async () => { const r = await getCachedIi(); assert(r.ok && r.interface_intelligence_read_model.interface_perspective.perspective_status) });
  suite('T8'); await test('T8: companyId inválido perspective', async () => { const r = await svc.aioiInterfacePerspectiveService.getInterfacePerspective('bad'); assert(!r.ok) });
  suite('T9'); await test('T9: composição P4.5 decisionVisualizationReadModel', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInterfacePerspectiveService.js'), 'utf8')); assert(code.includes('decisionVisualizationReadModel') && !code.includes('getExecutiveCockpitReadModel')) });
  suite('T10'); await test('T10: determinístico perspective', async () => { assertEqual(svc.aioiInterfacePerspectiveService.computeInterfacePerspectiveScore(SAMPLE_DVRM), svc.aioiInterfacePerspectiveService.computeInterfacePerspectiveScore(SAMPLE_DVRM), '') });
  suite('T11'); await test('T11: recordInterfacePerspectiveAnalyzed', async () => { im = getIiMetrics(); im.resetSessionCounters(); im.recordInterfacePerspectiveAnalyzed(COMPANY_ID); assert(im.getSessionCounters().interface_perspective_count >= 1) });
  suite('T12'); await test('T12: zero writes perspective path', async () => { await getCachedIi(); assertNoWrites(mock._client._calls) });
  suite('T13'); await test('T13: limite 70 interface_ready', async () => { assertEqual(getIiMetrics().classifyInterfacePerspective(70), 'interface_ready', '') });
  suite('T14'); await test('T14: empty dvrm score baixo', async () => { assert(svc.aioiInterfacePerspectiveService.computeInterfacePerspectiveScore(EMPTY_DVRM) <= 40) });
  suite('T15'); await test('T15: status permitidos perspective', async () => { const allowed = ['fragmented', 'partial', 'interface_ready']; for (const s of [80, 50, 20]) assert(allowed.includes(getIiMetrics().classifyInterfacePerspective(s))) });
  suite('T16'); await test('T16: _extractInterfaceIntelligenceSignals decision perspective', async () => { assertEqual(getIiMetrics()._extractInterfaceIntelligenceSignals(SAMPLE_DVRM).decisionPerspectiveScore, 85, '') });
  suite('T17'); await test('T17: _extractInterfaceIntelligenceSignals enterprise decision viz', async () => { assertEqual(getIiMetrics()._extractInterfaceIntelligenceSignals(SAMPLE_DVRM).enterpriseDecisionVisualizationScore, 87, '') });
  suite('T18'); await test('T18: _extractInterfaceIntelligenceSignals decision consistency', async () => { assertEqual(getIiMetrics()._extractInterfaceIntelligenceSignals(SAMPLE_DVRM).decisionConsistencyScore, 84, '') });
  suite('T19'); await test('T19: componentes incluem enterprise_decision_visualization', async () => { assert(svc.aioiInterfacePerspectiveService.PERSPECTIVE_COMPONENTS.includes('enterprise_decision_visualization')) });
  suite('T20'); await test('T20: buildInterfacePerspective campos', async () => { const r = svc.aioiInterfacePerspectiveService.buildInterfacePerspective(SAMPLE_DVRM); assert('perspective_score' in r && 'perspective_status' in r) });
  suite('T21'); await test('T21: componentes incluem decision_consistency', async () => { assert(svc.aioiInterfacePerspectiveService.PERSPECTIVE_COMPONENTS.includes('decision_consistency')) });
  suite('T22'); await test('T22: componentes incluem decision_visualization_coverage', async () => { assert(svc.aioiInterfacePerspectiveService.PERSPECTIVE_COMPONENTS.includes('decision_visualization_coverage')) });
  suite('T23'); await test('T23: classifyInterfaceConsistency consistent', async () => { assertEqual(getIiMetrics().classifyInterfaceConsistency(80), 'consistent', '') });
  suite('T24'); await test('T24: classifyInterfaceConsistency partial', async () => { assertEqual(getIiMetrics().classifyInterfaceConsistency(55), 'partial', '') });
  suite('T25'); await test('T25: classifyInterfaceConsistency inconsistent', async () => { assertEqual(getIiMetrics().classifyInterfaceConsistency(30), 'inconsistent', '') });
  suite('T26'); await test('T26: INTERFACE_CONSISTENCY_STAGES 12', async () => { assertEqual(svc.aioiInterfaceConsistencyService.INTERFACE_CONSISTENCY_STAGES.length, 12, '') });
  suite('T27'); await test('T27: buildInterfaceConsistency', async () => { const r = svc.aioiInterfaceConsistencyService.buildInterfaceConsistency(SAMPLE_DVRM); assert(r.consistency_score >= 70 && r.consistency_status === 'consistent') });
  suite('T28'); await test('T28: computeInterfaceConsistencyScore range', async () => { const s = svc.aioiInterfaceConsistencyService.computeInterfaceConsistencyScore(SAMPLE_DVRM); assert(s >= 0 && s <= 100) });
  suite('T29'); await test('T29: getInterfaceConsistency ok', async () => { const r = await svc.aioiInterfaceConsistencyService.getInterfaceConsistency(COMPANY_ID); assert(r.ok && r.interface_consistency.consistency_status) });
  suite('T30'); await test('T30: companyId inválido consistency', async () => { const r = await svc.aioiInterfaceConsistencyService.getInterfaceConsistency('x'); assert(!r.ok) });
  suite('T31'); await test('T31: empty dvrm consistency baixo', async () => { assert(svc.aioiInterfaceConsistencyService.computeInterfaceConsistencyScore(EMPTY_DVRM) <= 40) });
  suite('T32'); await test('T32: recordInterfaceConsistencyAnalyzed', async () => { im = getIiMetrics(); im.recordInterfaceConsistencyAnalyzed(COMPANY_ID); assert(im.getSessionCounters().interface_consistency_count >= 1) });
  suite('T33'); await test('T33: zero writes consistency', async () => { assertNoWrites(mock._client._calls) });
  suite('T34'); await test('T34: limite 70 consistent', async () => { assertEqual(getIiMetrics().classifyInterfaceConsistency(70), 'consistent', '') });
  suite('T35'); await test('T35: determinístico consistency', async () => { assertEqual(svc.aioiInterfaceConsistencyService.computeInterfaceConsistencyScore(SAMPLE_DVRM), svc.aioiInterfaceConsistencyService.computeInterfaceConsistencyScore(SAMPLE_DVRM), '') });
  suite('T36'); await test('T36: cadeia trust→decision_visualization', async () => { const stages = svc.aioiInterfaceConsistencyService.INTERFACE_CONSISTENCY_STAGES; assertEqual(stages[0], 'trust', ''); assertEqual(stages[11], 'decision_visualization', '') });
  suite('T37'); await test('T37: status permitidos consistency', async () => { const allowed = ['inconsistent', 'partial', 'consistent']; for (const s of [80, 50, 20]) assert(allowed.includes(getIiMetrics().classifyInterfaceConsistency(s))) });
  suite('T38'); await test('T38: composição P4.5 consistency', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInterfaceConsistencyService.js'), 'utf8')); assert(code.includes('decisionVisualizationReadModel')) });
  suite('T39'); await test('T39: partial dvrm só trust', async () => { assert(svc.aioiInterfaceConsistencyService.computeInterfaceConsistencyScore(PARTIAL_DVRM_TRUST) < 70) });
  suite('T40'); await test('T40: full vs partial consistency', async () => { const full = svc.aioiInterfaceConsistencyService.computeInterfaceConsistencyScore(SAMPLE_DVRM); const partial = svc.aioiInterfaceConsistencyService.computeInterfaceConsistencyScore(PARTIAL_DVRM_TRUST_80); assert(full > partial) });
  suite('T41'); await test('T41: limite 40 partial consistency', async () => { assertEqual(getIiMetrics().classifyInterfaceConsistency(40), 'partial', '') });
  suite('T42'); await test('T42: buildInterfaceConsistency campos', async () => { const r = svc.aioiInterfaceConsistencyService.buildInterfaceConsistency(SAMPLE_DVRM); assert('consistency_score' in r && 'consistency_status' in r) });
  suite('T43'); await test('T43: estágio cockpit_readiness index 10', async () => { assertEqual(svc.aioiInterfaceConsistencyService.INTERFACE_CONSISTENCY_STAGES[10], 'cockpit_readiness', '') });
  suite('T44'); await test('T44: estágio decision_visualization index 11', async () => { assertEqual(svc.aioiInterfaceConsistencyService.INTERFACE_CONSISTENCY_STAGES[11], 'decision_visualization', '') });
  suite('T45'); await test('T45: estágio visualization_readiness index 9', async () => { assertEqual(svc.aioiInterfaceConsistencyService.INTERFACE_CONSISTENCY_STAGES[9], 'visualization_readiness', '') });
  suite('T46'); await test('T46: classifyInterfaceCoverage comprehensive', async () => { assertEqual(getIiMetrics().classifyInterfaceCoverage(80), 'comprehensive', '') });
  suite('T47'); await test('T47: classifyInterfaceCoverage partial', async () => { assertEqual(getIiMetrics().classifyInterfaceCoverage(55), 'partial', '') });
  suite('T48'); await test('T48: classifyInterfaceCoverage limited', async () => { assertEqual(getIiMetrics().classifyInterfaceCoverage(30), 'limited', '') });
  suite('T49'); await test('T49: INTERFACE_COVERAGE_DOMAINS 15', async () => { assertEqual(svc.aioiInterfaceCoverageService.INTERFACE_COVERAGE_DOMAINS.length, 15, '') });
  suite('T50'); await test('T50: buildInterfaceCoverage', async () => { const r = svc.aioiInterfaceCoverageService.buildInterfaceCoverage(SAMPLE_DVRM); assert(r.coverage_score >= 70 && r.coverage_status === 'comprehensive') });
  suite('T51'); await test('T51: computeInterfaceCoverageScore range', async () => { const s = svc.aioiInterfaceCoverageService.computeInterfaceCoverageScore(SAMPLE_DVRM); assert(s >= 0 && s <= 100) });
  suite('T52'); await test('T52: getInterfaceCoverage ok', async () => { const r = await svc.aioiInterfaceCoverageService.getInterfaceCoverage(COMPANY_ID); assert(r.ok && r.interface_coverage.coverage_status) });
  suite('T53'); await test('T53: companyId inválido coverage', async () => { const r = await svc.aioiInterfaceCoverageService.getInterfaceCoverage('invalid'); assert(!r.ok) });
  suite('T54'); await test('T54: empty dvrm coverage baixo', async () => { assert(svc.aioiInterfaceCoverageService.computeInterfaceCoverageScore(EMPTY_DVRM) <= 40) });
  suite('T55'); await test('T55: recordInterfaceCoverageAnalyzed', async () => { im = getIiMetrics(); im.recordInterfaceCoverageAnalyzed(COMPANY_ID); assert(im.getSessionCounters().interface_coverage_count >= 1) });
  suite('T56'); await test('T56: domínio decision_perspective', async () => { assert(svc.aioiInterfaceCoverageService.INTERFACE_COVERAGE_DOMAINS.includes('decision_perspective')) });
  suite('T57'); await test('T57: domínio enterprise_decision_visualization', async () => { assert(svc.aioiInterfaceCoverageService.INTERFACE_COVERAGE_DOMAINS.includes('enterprise_decision_visualization')) });
  suite('T58'); await test('T58: determinístico coverage', async () => { assertEqual(svc.aioiInterfaceCoverageService.computeInterfaceCoverageScore(SAMPLE_DVRM), svc.aioiInterfaceCoverageService.computeInterfaceCoverageScore(SAMPLE_DVRM), '') });
  suite('T59'); await test('T59: limite 70 comprehensive', async () => { assertEqual(getIiMetrics().classifyInterfaceCoverage(70), 'comprehensive', '') });
  suite('T60'); await test('T60: buildInterfaceCoverage campos', async () => { const r = svc.aioiInterfaceCoverageService.buildInterfaceCoverage(SAMPLE_DVRM); assert('coverage_score' in r && 'coverage_status' in r) });
  suite('T61'); await test('T61: 15 domínios coverage full sample', async () => { assert(svc.aioiInterfaceCoverageService.computeInterfaceCoverageScore(SAMPLE_DVRM) >= 90) });
  suite('T62'); await test('T62: classifyEnterpriseInterfaceIntelligence interface_ready', async () => { assertEqual(getIiMetrics().classifyEnterpriseInterfaceIntelligence(92), 'interface_ready', '') });
  suite('T63'); await test('T63: classifyEnterpriseInterfaceIntelligence enterprise_interface_ready', async () => { assertEqual(getIiMetrics().classifyEnterpriseInterfaceIntelligence(75), 'enterprise_interface_ready', '') });
  suite('T64'); await test('T64: classifyEnterpriseInterfaceIntelligence developing', async () => { assertEqual(getIiMetrics().classifyEnterpriseInterfaceIntelligence(55), 'developing', '') });
  suite('T65'); await test('T65: classifyEnterpriseInterfaceIntelligence emerging', async () => { assertEqual(getIiMetrics().classifyEnterpriseInterfaceIntelligence(30), 'emerging', '') });
  suite('T66'); await test('T66: ENTERPRISE_INTERFACE_INTELLIGENCE_WEIGHTS 0.25', async () => { const w = svc.aioiEnterpriseInterfaceIntelligenceService.ENTERPRISE_INTERFACE_INTELLIGENCE_WEIGHTS; assertEqual(w.interfacePerspective, 0.25, ''); assertEqual(w.interfaceConsistency, 0.25, ''); assertEqual(w.interfaceCoverage, 0.25, ''); assertEqual(w.enterpriseDecisionVisualization, 0.25, '') });
  suite('T67'); await test('T67: buildEnterpriseInterfaceIntelligence', async () => { const r = svc.aioiEnterpriseInterfaceIntelligenceService.buildEnterpriseInterfaceIntelligence({ perspectiveScore: 80, consistencyScore: 85, coverageScore: 82, enterpriseDecisionVisualizationScore: 83 }); assert(r.interface_score >= 70 && r.interface_level) });
  suite('T68'); await test('T68: computeEnterpriseInterfaceIntelligenceScore range', async () => { const s = svc.aioiEnterpriseInterfaceIntelligenceService.computeEnterpriseInterfaceIntelligenceScore({ perspectiveScore: 80, consistencyScore: 80, coverageScore: 80, enterpriseDecisionVisualizationScore: 80 }); assert(s >= 0 && s <= 100) });
  suite('T69'); await test('T69: getEnterpriseInterfaceIntelligence ok', async () => { const r = await svc.aioiEnterpriseInterfaceIntelligenceService.getEnterpriseInterfaceIntelligence(COMPANY_ID); assert(r.ok && r.enterprise_interface_intelligence.interface_level) });
  suite('T70'); await test('T70: companyId inválido enterprise ii', async () => { const r = await svc.aioiEnterpriseInterfaceIntelligenceService.getEnterpriseInterfaceIntelligence('bad-id'); assert(!r.ok) });
  suite('T71'); await test('T71: recordEnterpriseInterfaceIntelligenceAnalyzed', async () => { im = getIiMetrics(); im.recordEnterpriseInterfaceIntelligenceAnalyzed(COMPANY_ID); assert(im.getSessionCounters().enterprise_interface_intelligence_count >= 1) });
  suite('T72'); await test('T72: zero writes enterprise ii', async () => { assertNoWrites(mock._client._calls) });
  suite('T73'); await test('T73: limite 90 interface_ready', async () => { assertEqual(getIiMetrics().classifyEnterpriseInterfaceIntelligence(90), 'interface_ready', '') });
  suite('T74'); await test('T74: determinístico enterprise ii', async () => { const inp = { perspectiveScore: 80, consistencyScore: 75, coverageScore: 82, enterpriseDecisionVisualizationScore: 78 }; assertEqual(svc.aioiEnterpriseInterfaceIntelligenceService.computeEnterpriseInterfaceIntelligenceScore(inp), svc.aioiEnterpriseInterfaceIntelligenceService.computeEnterpriseInterfaceIntelligenceScore(inp), '') });
  suite('T75'); await test('T75: pesos iguais soma ponderada', async () => { assertEqual(svc.aioiEnterpriseInterfaceIntelligenceService.computeEnterpriseInterfaceIntelligenceScore({ perspectiveScore: 100, consistencyScore: 100, coverageScore: 100, enterpriseDecisionVisualizationScore: 100 }), 100, '') });
  suite('T76'); await test('T76: níveis permitidos enterprise ii', async () => { const allowed = ['emerging', 'developing', 'enterprise_interface_ready', 'interface_ready']; for (const s of [30, 55, 75, 92]) assert(allowed.includes(getIiMetrics().classifyEnterpriseInterfaceIntelligence(s))) });
  suite('T77'); await test('T77: getInterfaceIntelligenceReadModel ok', async () => { const r = await getCachedIi(); assert(r.ok && r.interface_intelligence_read_model) });
  suite('T78'); await test('T78: estrutura obrigatória read model', async () => { const r = await getCachedIi(); const iirm = r.interface_intelligence_read_model; assert(iirm.decision_visualization_read_model && iirm.interface_perspective && iirm.interface_consistency && iirm.interface_coverage && iirm.enterprise_interface_intelligence) });
  suite('T79'); await test('T79: companyId inválido read model', async () => { const r = await svc.aioiInterfaceIntelligenceReadModelService.getInterfaceIntelligenceReadModel('invalid'); assert(!r.ok) });
  suite('T80'); await test('T80: anti-duplication build* local', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInterfaceIntelligenceReadModelService.js'), 'utf8')); assert(code.includes('buildInterfacePerspective') && code.includes('buildInterfaceConsistency')); assert(!code.includes('getInterfacePerspective(') && !code.includes('getInterfaceConsistency(')) });
  suite('T81'); await test('T81: getDecisionVisualizationReadModel uma vez', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInterfaceIntelligenceReadModelService.js'), 'utf8')); assertEqual((code.match(/getDecisionVisualizationReadModel/g) || []).length, 1, 'single dvrm call') });
  suite('T82'); await test('T82: sem LLM/IA P4.6', async () => { const files = ['aioiInterfacePerspectiveService.js', 'aioiInterfaceConsistencyService.js', 'aioiInterfaceCoverageService.js', 'aioiEnterpriseInterfaceIntelligenceService.js', 'aioiInterfaceIntelligenceReadModelService.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('openai') && !code.includes('generateText'), f); } });
  suite('T83'); await test('T83: sem forecast novo', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInterfaceIntelligenceReadModelService.js'), 'utf8')); assert(!code.includes('getBacklogForecast') && !code.includes('BacklogForecast')) });
  suite('T84'); await test('T84: Promise.all agregador', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInterfaceIntelligenceReadModelService.js'), 'utf8')); assert(code.includes('Promise.all')) });
  suite('T85'); await test('T85: decision_visualization_read_model nested', async () => { const r = await getCachedIi(); assert(r.interface_intelligence_read_model.decision_visualization_read_model.executive_cockpit_read_model) });
  suite('T86'); await test('T86: interface_perspective campos', async () => { const r = await getCachedIi(); const ip = r.interface_intelligence_read_model.interface_perspective; assert('perspective_score' in ip && 'perspective_status' in ip) });
  suite('T87'); await test('T87: interface_consistency campos', async () => { const r = await getCachedIi(); const ic = r.interface_intelligence_read_model.interface_consistency; assert('consistency_score' in ic && 'consistency_status' in ic) });
  suite('T88'); await test('T88: interface_coverage campos', async () => { const r = await getCachedIi(); const ic = r.interface_intelligence_read_model.interface_coverage; assert('coverage_score' in ic && 'coverage_status' in ic) });
  suite('T89'); await test('T89: enterprise_interface_intelligence campos', async () => { const r = await getCachedIi(); const eii = r.interface_intelligence_read_model.enterprise_interface_intelligence; assert('interface_score' in eii && 'interface_level' in eii) });
  suite('T90'); await test('T90: composição exclusiva P4.5', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInterfaceIntelligenceReadModelService.js'), 'utf8')); assert(code.includes('decisionVisualizationReadModel') && !code.includes('getExecutiveCockpitReadModel')) });
  suite('T91'); await test('T91: recordInterfaceIntelligenceRequested/Completed', async () => { im = getIiMetrics(); if (_svcCache) _svcCache.aioiInterfaceIntelligenceMetrics = im; im.resetSessionCounters(); im.recordInterfaceIntelligenceRequested(COMPANY_ID); im.recordInterfaceIntelligenceCompleted(COMPANY_ID, 42); const c = im.getSessionCounters(); assertEqual(c.interface_intelligence_requests, 1, ''); assertEqual(c.avg_query_latency_ms, 42, '') });
  suite('T92'); await test('T92: enterprise_interface_intelligence composto', async () => { const r = await getCachedIi(); const eii = r.interface_intelligence_read_model.enterprise_interface_intelligence; assert(eii.interface_score >= 0 && eii.interface_level) });
  suite('T93'); await test('T93: determinístico read model scores', async () => { const r1 = svc.aioiInterfacePerspectiveService.buildInterfacePerspective(SAMPLE_DVRM); const r2 = svc.aioiInterfacePerspectiveService.buildInterfacePerspective(SAMPLE_DVRM); assertEqual(r1.perspective_score, r2.perspective_score, '') });
  suite('T94'); await test('T94: 4 componentes perspective full sample', async () => { assert(svc.aioiInterfacePerspectiveService.computeInterfacePerspectiveScore(SAMPLE_DVRM) >= 70) });
  suite('T95'); await test('T95: 12 estágios consistency full sample', async () => { assert(svc.aioiInterfaceConsistencyService.computeInterfaceConsistencyScore(SAMPLE_DVRM) >= 70) });
  suite('T96'); await test('T96: sem dashboard/widget/react/vue/angular', async () => { const files = ['aioiInterfaceIntelligenceReadModelService.js', 'aioiInterfacePerspectiveService.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('createDashboard') && !code.includes('React') && !code.includes('Vue') && !code.includes('Angular'), f); } });
  suite('T97'); await test('T97: interface_level executive ou superior', async () => { const r = await getCachedIi(); assert(['enterprise_interface_ready', 'interface_ready'].includes(r.interface_intelligence_read_model.enterprise_interface_intelligence.interface_level)) });
  suite('T98'); await test('T98: INSERT bloqueado', async () => { im = getIiMetrics(); let threw = false; try { im.assertReadOnlySql('INSERT INTO x VALUES (1)'); } catch (e) { threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', ''); } assert(threw) });
  suite('T133'); await test('T133: sem getConsumptionReadModel direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInterfaceIntelligenceReadModelService.js'), 'utf8')); assert(!code.includes('getConsumptionReadModel')) });
  suite('T99'); await test('T99: UPDATE bloqueado', async () => { im = getIiMetrics(); let threw = false; try { im.assertReadOnlySql('UPDATE x SET y=1'); } catch (e) { threw = true; } assert(threw) });
  restoreDb();
  suite('T100'); await test('T100: DELETE bloqueado', async () => { im = getIiMetrics(); let threw = false; try { im.assertReadOnlySql('DELETE FROM x'); } catch (e) { threw = true; } assert(threw) });
  suite('T101'); await test('T101: RLS company_id + bypass false', async () => { await svc.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID); const t = mock._client._calls.find(c => c.sql.includes('app.current_company_id')); const b = mock._client._calls.filter(c => c.sql.includes('app.bypass_rls')); assert(t && t.params[0] === COMPANY_ID); assert(b.length >= 1) });
  suite('T102'); await test('T102: tenant B benchmark only', async () => { const mockB = createReadinessDbMock(buildIoes().map(i => ({ ...i, company_id: COMPANY_ID_B })), buildSnapshots().map(s => ({ ...s, company_id: COMPANY_ID_B }))); patchDb(mockB); _svcCache = null; clearAioiModuleCache(); const svcB = loadP46(); const bench = await svcB.aioiBenchmarkAnalysisService.getBenchmarkAnalysis(COMPANY_ID_B); assert(bench.ok && bench.benchmark); const t = mockB._client._calls.filter(c => c.sql.includes('app.current_company_id')).find(c => c.params && c.params[0] === COMPANY_ID_B); assert(t, 'RLS tenant B') });
  suite('T103'); await test('T103: recordInterfaceIntelligenceRequested log', async () => { im = getIiMetrics(); im.resetSessionCounters(); im.recordInterfaceIntelligenceRequested(COMPANY_ID); assert(im.getSessionCounters().interface_intelligence_requests === 1) });
  suite('T104'); await test('T104: recordInterfacePerspectiveAnalyzed log', async () => { im = getIiMetrics(); im.recordInterfacePerspectiveAnalyzed(COMPANY_ID); assert(im.getSessionCounters().interface_perspective_count >= 1) });
  suite('T105'); await test('T105: recordInterfaceConsistencyAnalyzed log', async () => { im = getIiMetrics(); im.recordInterfaceConsistencyAnalyzed(COMPANY_ID); assert(im.getSessionCounters().interface_consistency_count >= 1) });
  suite('T106'); await test('T106: recordInterfaceCoverageAnalyzed log', async () => { im = getIiMetrics(); im.recordInterfaceCoverageAnalyzed(COMPANY_ID); assert(im.getSessionCounters().interface_coverage_count >= 1) });
  suite('T107'); await test('T107: recordEnterpriseInterfaceIntelligenceAnalyzed log', async () => { im = getIiMetrics(); im.recordEnterpriseInterfaceIntelligenceAnalyzed(COMPANY_ID); assert(im.getSessionCounters().enterprise_interface_intelligence_count >= 1) });
  suite('T108'); await test('T108: getSessionCounters campos', async () => { im = getIiMetrics(); im.resetSessionCounters(); im.recordEnterpriseInterfaceIntelligenceAnalyzed(COMPANY_ID); const c = im.getSessionCounters(); assert(c.enterprise_interface_intelligence_count >= 1 && 'avg_query_latency_ms' in c); assert('interface_intelligence_requests' in c && 'interface_perspective_count' in c) });
  suite('T109'); await test('T109: clampScore', async () => { assertEqual(getIiMetrics().clampScore(150), 100, '') });
  suite('T110'); await test('T110: TRUNCATE bloqueado', async () => { im = getIiMetrics(); let threw = false; try { im.assertReadOnlySql('TRUNCATE TABLE x'); } catch (e) { threw = true; } assert(threw) });
  suite('T111'); await test('T111: ON CONFLICT bloqueado', async () => { im = getIiMetrics(); let threw = false; try { im.assertReadOnlySql('INSERT INTO x VALUES (1) ON CONFLICT DO NOTHING'); } catch (e) { threw = true; assertEqual(e.message, 'READ_ONLY_LAYER_VIOLATION', ''); } assert(threw) });
  suite('T112'); await test('T112: MERGE bloqueado', async () => { im = getIiMetrics(); let threw = false; try { im.assertReadOnlySql('MERGE INTO x'); } catch (e) { threw = true; } assert(threw) });
  suite('T113'); await test('T113: anti-duplication composição P4.5', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInterfaceIntelligenceReadModelService.js'), 'utf8')); assert(code.includes('decisionVisualizationReadModel') && !code.includes('getInterfacePerspective')); assert(code.includes('buildEnterpriseInterfaceIntelligence')) });
  suite('T114'); await test('T114: sem getExecutiveCockpitReadModel direto', async () => { const files = ['aioiInterfacePerspectiveService.js', 'aioiInterfaceConsistencyService.js', 'aioiInterfaceCoverageService.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('getExecutiveCockpitReadModel'), f); } });
  suite('T115'); await test('T115: sem getVisualizationReadModel direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInterfaceIntelligenceReadModelService.js'), 'utf8')); assert(!code.includes('getVisualizationReadModel')) });
  suite('T116'); await test('T116: CREATE bloqueado', async () => { im = getIiMetrics(); let threw = false; try { im.assertReadOnlySql('CREATE TABLE x (id int)'); } catch (e) { threw = true; } assert(threw) });
  suite('T117'); await test('T117: GRANT bloqueado', async () => { im = getIiMetrics(); let threw = false; try { im.assertReadOnlySql('GRANT ALL ON x TO y'); } catch (e) { threw = true; } assert(threw) });
  suite('T118'); await test('T118: soberanos ausentes P4.6', async () => { const files = ['aioiInterfaceIntelligenceMetrics.js', 'aioiInterfacePerspectiveService.js', 'aioiInterfaceConsistencyService.js', 'aioiInterfaceCoverageService.js', 'aioiEnterpriseInterfaceIntelligenceService.js', 'aioiInterfaceIntelligenceReadModelService.js']; const forbidden = ['operationalDecisionEngine', 'operationalLearningService', 'workflowOrchestrator', 'actionRuntimeOrchestrator', 'computePriorityScore', 'classificationConsumer', 'aioiOutboxConsumerService']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); for (const bad of forbidden) assert(!code.includes(bad), `${f} contém ${bad}`); } });
  suite('T119'); await test('T119: sem fan-out getDecisionVisualizationReadModel', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInterfaceIntelligenceReadModelService.js'), 'utf8')); assertEqual((code.match(/getDecisionVisualizationReadModel/g) || []).length, 1, 'no fan-out') });
  suite('T120'); await test('T120: sem getConformanceReadModel direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInterfaceIntelligenceReadModelService.js'), 'utf8')); assert(!code.includes('getConformanceReadModel')) });
  suite('T121'); await test('T121: domínio trust coverage', async () => { assert(svc.aioiInterfaceCoverageService.INTERFACE_COVERAGE_DOMAINS.includes('trust')) });
  suite('T122'); await test('T122: estágio governance_excellence index 4', async () => { assertEqual(svc.aioiInterfaceConsistencyService.INTERFACE_CONSISTENCY_STAGES[4], 'governance_excellence', '') });
  suite('T123'); await test('T123: REVOKE bloqueado', async () => { im = getIiMetrics(); let threw = false; try { im.assertReadOnlySql('REVOKE ALL ON x FROM y'); } catch (e) { threw = true; } assert(threw) });
  suite('T124'); await test('T124: _extractInterfaceIntelligenceSignals trust', async () => { assertEqual(getIiMetrics()._extractInterfaceIntelligenceSignals(SAMPLE_DVRM).trustScore, 80, '') });
  suite('T125'); await test('T125: regressão P4.5 decision read model intacto', async () => { const r = await getCachedIi(); assert(r.interface_intelligence_read_model.decision_visualization_read_model.decision_perspective) });
  suite('T126'); await test('T126: regressão P4.5 enterprise decision visualization', async () => { const r = await getCachedIi(); assert(r.interface_intelligence_read_model.decision_visualization_read_model.enterprise_decision_visualization.visualization_level) });
  suite('T127'); await test('T127: sem getSustainabilityReadModel direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInterfaceIntelligenceReadModelService.js'), 'utf8')); assert(!code.includes('getSustainabilityReadModel')) });
  suite('T128'); await test('T128: recordInterfaceIntelligenceCompleted log', async () => { im = getIiMetrics(); im.recordInterfaceIntelligenceCompleted(COMPANY_ID, 50); assert(im.getSessionCounters().avg_query_latency_ms === 50) });
  suite('T129'); await test('T129: domínio governance_excellence coverage', async () => { assert(svc.aioiInterfaceCoverageService.INTERFACE_COVERAGE_DOMAINS.includes('governance_excellence')) });
  suite('T130'); await test('T130: sem execução operacional P4.6', async () => { const files = ['aioiInterfaceIntelligenceReadModelService.js', 'aioiEnterpriseInterfaceIntelligenceService.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('executeDecision') && !code.includes('runWorkflow'), f); } });
  suite('T131'); await test('T131: sem scoring novo P4.6', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInterfaceIntelligenceMetrics.js'), 'utf8')); assert(!code.includes('computePriorityScore') && !code.includes('mlModel')) });
  suite('T132'); await test('T132: interface layer read only', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInterfaceIntelligenceReadModelService.js'), 'utf8')); assert(code.includes('decisionVisualizationReadModel') && !code.includes('INSERT') && !code.includes('UPDATE')) });
  suite('T134'); await test('T134: sem APIs UI', async () => { const files = ['aioiInterfaceIntelligenceReadModelService.js', 'aioiInterfaceIntelligenceMetrics.js']; for (const f of files) { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, f), 'utf8')); assert(!code.includes('express.Router') && !code.includes('app.get('), f); } });
  suite('T135'); await test('T135: sem Chart.js/graph libraries', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInterfaceIntelligenceReadModelService.js'), 'utf8')); assert(!code.includes('Chart.js') && !code.includes('renderChart')) });
  suite('T136'); await test('T136: sem getDecisionPerspective direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInterfaceIntelligenceReadModelService.js'), 'utf8')); assert(!code.includes('getDecisionPerspective')) });
  suite('T137'); await test('T137: _extractInterfaceIntelligenceSignals cockpit readiness', async () => { assertEqual(getIiMetrics()._extractInterfaceIntelligenceSignals(SAMPLE_DVRM).cockpitReadinessScore, 86, '') });
  suite('T138'); await test('T138: estágio autonomy index 7', async () => { assertEqual(svc.aioiInterfaceConsistencyService.INTERFACE_CONSISTENCY_STAGES[7], 'autonomy', '') });
  suite('T139'); await test('T139: domínio consumption coverage', async () => { assert(svc.aioiInterfaceCoverageService.INTERFACE_COVERAGE_DOMAINS.includes('consumption')) });
  suite('T140'); await test('T140: UPSERT bloqueado', async () => { im = getIiMetrics(); let threw = false; try { im.assertReadOnlySql('UPSERT INTO x VALUES (1)'); } catch (e) { threw = true; } assert(threw) });
  suite('T141'); await test('T141: ALTER bloqueado', async () => { im = getIiMetrics(); let threw = false; try { im.assertReadOnlySql('ALTER TABLE x ADD y int'); } catch (e) { threw = true; } assert(threw) });
  suite('T142'); await test('T142: DROP bloqueado', async () => { im = getIiMetrics(); let threw = false; try { im.assertReadOnlySql('DROP TABLE x'); } catch (e) { threw = true; } assert(threw) });
  suite('T143'); await test('T143: regressão P4.5 decision consistency', async () => { const r = await getCachedIi(); assert(r.interface_intelligence_read_model.decision_visualization_read_model.decision_consistency.consistency_status) });
  suite('T144'); await test('T144: buildInterfacePerspective local agregador', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInterfaceIntelligenceReadModelService.js'), 'utf8')); assert(code.includes('buildInterfacePerspective')) });
  suite('T145'); await test('T145: buildInterfaceConsistency local agregador', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInterfaceIntelligenceReadModelService.js'), 'utf8')); assert(code.includes('buildInterfaceConsistency')) });
  suite('T146'); await test('T146: interface intelligence read model soberano', async () => { const r = await getCachedIi(); assert(r.interface_intelligence_read_model.enterprise_interface_intelligence.interface_score >= 70) });
  suite('T147'); await test('T147: sem getAutonomyReadModel direto', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInterfaceIntelligenceReadModelService.js'), 'utf8')); assert(!code.includes('getAutonomyReadModel')) });
  suite('T148'); await test('T148: domínio visualization_consistency coverage', async () => { assert(svc.aioiInterfaceCoverageService.INTERFACE_COVERAGE_DOMAINS.includes('visualization_consistency')) });
  suite('T149'); await test('T149: composição P4.5 enterprise ii', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiEnterpriseInterfaceIntelligenceService.js'), 'utf8')); assert(code.includes('decisionVisualizationReadModel') && !code.includes('getInterfacePerspective')) });
  suite('T150'); await test('T150: limite 40 developing enterprise ii', async () => { assertEqual(getIiMetrics().classifyEnterpriseInterfaceIntelligence(40), 'developing', '') });
  suite('T151'); await test('T151: limite 40 partial perspective', async () => { assertEqual(getIiMetrics().classifyInterfacePerspective(40), 'partial', '') });
  suite('T152'); await test('T152: sem cockpit visual', async () => { const code = stripComments(fs.readFileSync(path.join(SERVICES_PATH, 'aioiInterfaceIntelligenceReadModelService.js'), 'utf8')); assert(!code.includes('buildCockpitUI') && !code.includes('renderCockpit')) });
  suite('T153'); await test('T153: domínio executive_summary coverage', async () => { assert(svc.aioiInterfaceCoverageService.INTERFACE_COVERAGE_DOMAINS.includes('executive_summary')) });
  suite('T154'); await test('T154: estágio consumption index 8', async () => { assertEqual(svc.aioiInterfaceConsistencyService.INTERFACE_CONSISTENCY_STAGES[8], 'consumption', '') });
  suite('T155'); await test('T155: regressão P4.5 executive cockpit nested', async () => { const r = await getCachedIi(); assert(r.interface_intelligence_read_model.decision_visualization_read_model.executive_cockpit_read_model.enterprise_cockpit_readiness) });
  suite('T156'); await test('T156: componentes incluem decision_perspective', async () => { assert(svc.aioiInterfacePerspectiveService.PERSPECTIVE_COMPONENTS.includes('decision_perspective')) });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`AIOI-P4.6 Interface Intelligence Tests: ${_passed} passed, ${_failed} failed`);
  console.log(`${'='.repeat(60)}`);
  if (_failed === 0) {
    console.log('\nAIOI_P4_6_ENTERPRISE_INTERFACE_INTELLIGENCE_MODEL_PASS\n');
  } else {
    process.exitCode = 1;
  }
}

runTests().catch(err => {
  console.error('FATAL:', err);
  process.exitCode = 1;
});
