'use strict';

const crypto = require('crypto');

const EXECUTIVE_LEAK = /ebitda|faturamento|lucro|margem|receita|score corporativo|boardroom|indicadores_executivos|centro_custos|resumo_executivo|grafico_margem|hr_intelligence|esg_report|people_analytics/i;
const INDUSTRIAL_GENERIC = /grafico_producao_demanda|diagrama_industrial|centro_previsao|mapa_vazamentos|gargalos globais/i;
const SAFETY_SEMANTIC = /incident|acidente|apr|pt\b|loto|epi|epc|risco|hazard|seguranca|sst|comportamento inseguro|near.?miss|quase/i;

const PROFILE_FIXTURES = [
  {
    id: 'coord_safety',
    profile_code: 'coordinator_safety',
    role: 'coordenador',
    functional_area: 'safety',
    job_title: 'Coordenador de Segurança do Trabalho',
    hierarchy_level: 3
  },
  {
    id: 'supervisor_safety',
    profile_code: 'supervisor_safety',
    role: 'supervisor',
    functional_area: 'safety',
    job_title: 'Supervisor de Segurança',
    hierarchy_level: 4
  },
  {
    id: 'tech_safety',
    profile_code: 'coordinator_safety',
    role: 'coordenador',
    functional_area: 'safety',
    job_title: 'Técnico de Segurança do Trabalho',
    hierarchy_level: 3,
    note: 'technician maps via job_title → safety area → coordinator_safety profile'
  }
];

const MOCK_SIGNALS = {
  ok: true,
  operational: {
    open_incidents: 5,
    near_miss: 2,
    critical_incidents: 1,
    sector_breakdown: [{ sector: 'linha_1', count: 3 }],
    permits_overdue: 2,
    ppe_compliance_pct: 76
  },
  raw: { risk_rows: [{ id: 'r1', hazard: 'queda', severity: 4, probability: 3 }], weekly_trend: [] }
};

function stableHash(obj) {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex').slice(0, 16);
}

function buildBasePayload(user, config) {
  return {
    profile_code: config.profile_code,
    profile_config: config.profile_config,
    functional_area: config.functional_area,
    functional_axis: config.functional_axis || config.functional_area,
    visible_modules: config.profile_config?.visible_modules || [],
    kpis: [],
    profile_config_widgets: config.profile_config?.widgets,
    governance_freeze_state: { governance_locked: false },
    terminal_governance: { applied: true },
    sidebar_governance_runtime: { final_governance_locked: true, final_visible_modules: config.profile_config?.visible_modules }
  };
}

async function runProfilePipeline(user, opts = {}) {
  const dashboardProfileResolver = require('../../../src/services/dashboardProfileResolver');
  const facade = require('../../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');

  const config = dashboardProfileResolver.getDashboardConfigForUser({
    ...user,
    company_id: user.company_id || 'live_val_tenant',
    id: user.id || 'u1'
  });

  let payload = buildBasePayload(user, config);
  payload.profile_code = config.profile_code;
  payload.profile_config = config.profile_config;

  const cog = await facade.applyCognitiveFoundationToDashboard(
    { ...user, company_id: user.company_id || 'live_val_tenant' },
    payload,
    {
      force_cognitive_observability: true,
      force_composition: true,
      force_safety_consolidation: opts.force_consolidation === true,
      mock_signals: MOCK_SIGNALS,
      profile_code: config.profile_code
    }
  );

  return { config, payload: cog.payload, report: cog.cognitive_runtime_report };
}

function analyzeSstPayload(payload = {}, profileCode = '') {
  const sst = payload.sst_cognitive_runtime || {};
  const centers = payload.safety_cognitive_centers || [];
  const widgets = payload.widgets_promoted || [];
  const widgetIds = widgets.map((w) => String(w.id || w.widget_id)).filter(Boolean);
  const centerIds = centers.map((c) => c.center_id);
  const blob = JSON.stringify({ sst, centers, widgets, kpis: payload.kpis, summary: payload.summary });

  const safetyHits = (blob.match(new RegExp(SAFETY_SEMANTIC.source, 'gi')) || []).length;
  const execLeaks = EXECUTIVE_LEAK.test(blob);
  const industrialLeaks = INDUSTRIAL_GENERIC.test(blob);
  const visibleGeneric = widgetIds.filter((id) =>
    /resumo_executivo|operacoes|gargalos|indicadores_executivos|grafico_producao|centro_custos/i.test(id)
  );

  const expectedCenters = [
    'safety_incident_intelligence',
    'safety_permit_governance',
    'safety_ppe_compliance',
    'safety_hazard_heatmap'
  ];
  const centersPresent = expectedCenters.filter((id) => centerIds.includes(id));

  return {
    profile_code: profileCode,
    cockpit_mode: sst.cockpit_mode,
    consolidation_applied: sst.consolidation_applied === true,
    specialization_ratio: sst.specialization_ratio,
    genericity_ratio: sst.genericity_ratio,
    safety_cognitive_health: sst.safety_cognitive_health,
    center_count: centers.length,
    widget_count: widgets.length,
    widget_ids: widgetIds,
    center_ids: centerIds,
    centers_coverage: centersPresent.length / expectedCenters.length,
    safety_semantic_hits: safetyHits,
    executive_leak: execLeaks,
    industrial_generic_leak: industrialLeaks,
    visible_generic_widgets: visibleGeneric,
    density: sst.density || payload.cockpit_operational_metrics,
    decision_questions: (payload.safety_decision_support?.questions || []).map((q) => q.text),
    render_promoted: sst.render_promoted === true,
    fallback_preserved: sst.fallback_preserved !== false
  };
}

module.exports = {
  PROFILE_FIXTURES,
  MOCK_SIGNALS,
  stableHash,
  runProfilePipeline,
  analyzeSstPayload,
  EXECUTIVE_LEAK,
  SAFETY_SEMANTIC
};
